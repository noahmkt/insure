import { AuditService } from './admin/audit.service';
import { ClaimsService } from './claims/claims.service';
import { ConsentsService } from './consents/consents.service';
import { ConsultationsService } from './consultations/consultations.service';
import { ESTIMATE_DISCLAIMER } from './common/policy';
import { RefundsService } from './refunds/refunds.service';
import { StoreService } from './store/store.service';
import { SyncService } from './sync/sync.service';
import { UsersService } from './users/users.service';

/**
 * 핵심 플로우 통합 테스트 — 하드 룰이 코드 레벨에서 강제되는지 검증한다.
 */

function setup() {
  const store = new StoreService();
  const users = new UsersService(store);
  const consents = new ConsentsService(store);
  const sync = new SyncService(store, consents);
  const refunds = new RefundsService(store, consents);
  const claims = new ClaimsService(store);
  const consultations = new ConsultationsService(store, consents);
  const audit = new AuditService(store);
  const { accessToken: userId } = users.verify('KAKAO', 'demo-token');
  return { store, users, consents, sync, refunds, claims, consultations, audit, userId };
}

describe('온보딩 → 발굴 플로우', () => {
  it('민감정보 동의 없이 진료내역 연동은 403 (하드 룰 3)', async () => {
    const { sync, userId } = setup();
    await expect(sync.syncMedical(userId)).rejects.toMatchObject({
      response: { code: 'CONSENT_REQUIRED' },
    });
  });

  it('동의 후 연동 → 예측액 DTO 전건에 면책 문구가 포함된다 (하드 룰 7)', async () => {
    const { consents, sync, refunds, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncContracts(userId);
    await sync.syncMedical(userId);

    const dtos = refunds.estimated(userId);
    expect(dtos.length).toBeGreaterThan(0);
    for (const dto of dtos) {
      expect(dto.disclaimer).toBe(ESTIMATE_DISCLAIMER);
      if (dto.estimate) {
        expect(dto.estimate.label).toBe('예상 환급액'); // '예상' 접두 강제
        expect(dto.estimate.formula.length).toBeGreaterThan(0); // 산출 근거 필수
      }
      if (dto.verdict === 'UNDETERMINED') {
        expect(dto.estimate).toBeUndefined(); // 금액 미표기, "검토 필요"만
        expect(dto.reviewNeeded).toBe(true);
      }
    }
  });

  it('확정액(숨은보험금)은 예측 DTO 와 분리되고 면책 문구 대상이 아니다 (§2)', async () => {
    const { consents, sync, refunds, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncContracts(userId);
    const confirmed = refunds.confirmed(userId);
    expect(confirmed.length).toBe(1);
    expect(confirmed[0].label).toBe('확정 금액');
    expect((confirmed[0] as any).disclaimer).toBeUndefined();
    expect((confirmed[0] as any).estimate).toBeUndefined();
  });
});

describe('간편청구 라우팅', () => {
  async function withData() {
    const ctx = setup();
    ctx.consents.grant(ctx.userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await ctx.sync.syncContracts(ctx.userId);
    await ctx.sync.syncMedical(ctx.userId);
    return ctx;
  }

  it('실손24 연계 병원만 선택하면 A(SILSON24) 라우팅', async () => {
    const { store, claims, userId } = await withData();
    const linked = store.medicalRecords.filter(
      (r) => r.userId === userId && r.hospitalName === '연세이비인후과의원',
    );
    const { route } = claims.routeCheck(userId, linked.map((r) => r.id));
    expect(route).toBe('SILSON24');
  });

  it('미연계 병원 포함 시 B(MANUAL) 라우팅 + 체크리스트 + 패키지', async () => {
    const { store, claims, userId } = await withData();
    const manual = store.medicalRecords.filter(
      (r) => r.userId === userId && r.hospitalName === '서울정형외과',
    );
    const contract = store.contracts.find((c) => c.contractType === 'SILSON');
    const claim = claims.create(userId, manual.map((r) => r.id), contract!.id);
    expect(claim.route).toBe('MANUAL');

    const checklist = claims.checklist(userId, claim.id);
    expect(checklist.requiredDocs.length).toBeGreaterThan(0);

    const pkg = claims.package(userId, claim.id);
    expect(pkg.notice).toContain('직접');
    expect(pkg.notice).toContain('대행하지 않습니다'); // 하드 룰 1
  });

  it('지급 확인은 SUBMITTED_BY_USER(본인 제출 신고) 이후에만 가능하다', async () => {
    const { store, claims, userId } = await withData();
    const records = store.medicalRecords.filter((r) => r.userId === userId).slice(0, 1);
    const claim = claims.create(userId, records.map((r) => r.id));

    expect(() => claims.confirmPaid(userId, claim.id, 30000)).toThrow();

    claims.updateStatus(userId, claim.id, 'SUBMITTED_BY_USER');
    const paid = claims.confirmPaid(userId, claim.id, 30000);
    expect(paid.status).toBe('PAID');
    expect(paid.actualPaidAmount).toBe(30000); // 정확도 루프 축적
  });
});

describe('상담(리드)와 동의 4층', () => {
  it('제3자 제공 동의 없이 상담 신청은 409 (하드 룰 4)', () => {
    const { consultations, userId } = setup();
    expect(() => consultations.request(userId, 'POLICY_REVIEW')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'THIRD_PARTY_CONSENT_REQUIRED' }) }),
    );
  });

  it('신청 시점 동의는 해당 건 context 증적과 함께 기록되고 상담 건에 연결된다', () => {
    const { consents, consultations, userId } = setup();
    const c = consultations.request(userId, 'POLICY_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });
    const history = consents.history(userId);
    const grant = history.find((h) => h.consentType === 'THIRD_PARTY');
    expect(grant?.context).toBe(`CONSULT_REQUEST:${c.id}`);
    expect(c.thirdPartyConsentId).toBe(grant?.id);
  });

  it('컨텍스트 없는 포괄 제3자 동의는 400 (포괄 동의 금지)', () => {
    const { consents, userId } = setup();
    expect(() =>
      consents.grant(userId, 'THIRD_PARTY', 'consent-thirdparty-v1', 'CHECKBOX'),
    ).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'BLANKET_CONSENT_FORBIDDEN' }) }),
    );
  });

  it('철회는 append-only 이력으로 남고 이후 게이트가 닫힌다', () => {
    const { consents, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    expect(consents.hasActive(userId, 'SENSITIVE_HEALTH')).toBe(true);
    const { impacts } = consents.withdraw(userId, 'SENSITIVE_HEALTH');
    expect(impacts).toContain('파기');
    expect(consents.hasActive(userId, 'SENSITIVE_HEALTH')).toBe(false);
    expect(consents.history(userId).length).toBe(2); // GRANT + WITHDRAW 모두 보존
  });
});

describe('관리자 민감정보 접근 통제', () => {
  it('배정되지 않은 담당자의 열람은 거부된다', () => {
    const { audit, userId } = setup();
    expect(() => audit.assertCanViewSensitive('staff-1', userId)).toThrow();
  });

  it('배정 담당자 열람은 허용되며 감사 로그가 남는다', () => {
    const { store, audit, consultations, userId } = setup();
    const c = consultations.request(userId, 'ADJUSTER_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });
    c.assignedStaffId = 'staff-1';
    audit.assertCanViewSensitive('staff-1', userId);
    audit.record('staff-1', 'VIEW_MEDICAL', userId, 'medical.medical_records');
    expect(store.auditLogs.length).toBe(1);
    expect(store.auditLogs[0].action).toBe('VIEW_MEDICAL');
  });
});
