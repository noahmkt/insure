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

  it('PATCH 로는 PAID 진입 불가 — 실지급액 없는 종결을 막는다 (§7.1 정확도 루프)', async () => {
    const { store, claims, userId } = await withData();
    const records = store.medicalRecords.filter((r) => r.userId === userId).slice(0, 1);
    const claim = claims.create(userId, records.map((r) => r.id));
    claims.updateStatus(userId, claim.id, 'SUBMITTED_BY_USER');
    expect(() => claims.updateStatus(userId, claim.id, 'PAID')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'USE_PAID_ENDPOINT' }) }),
    );
  });

  it('IN_REVIEW 상태에서도 본인 제출 신고(SUBMITTED_BY_USER)가 가능하다', async () => {
    const { store, claims, userId } = await withData();
    const records = store.medicalRecords.filter((r) => r.userId === userId).slice(0, 1);
    const claim = claims.create(userId, records.map((r) => r.id));
    claims.updateStatus(userId, claim.id, 'IN_REVIEW');
    const updated = claims.updateStatus(userId, claim.id, 'SUBMITTED_BY_USER');
    expect(updated.status).toBe('SUBMITTED_BY_USER');
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

  it('② 민감정보 동의 철회 시 저장된 진료내역이 즉시 파기된다 (하드 룰 3·5)', async () => {
    const { store, consents, sync, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncMedical(userId);
    expect(store.medicalRecords.filter((r) => r.userId === userId).length).toBeGreaterThan(0);

    consents.withdraw(userId, 'SENSITIVE_HEALTH');
    expect(store.medicalRecords.filter((r) => r.userId === userId)).toHaveLength(0);
  });

  it('③ 제3자 제공 동의 철회 시 진행 중 상담이 종료된다 (하드 룰 4)', () => {
    const { consents, consultations, userId } = setup();
    const c = consultations.request(userId, 'POLICY_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });
    consents.withdraw(userId, 'THIRD_PARTY');
    expect(c.status).toBe('CANCELLED');
    expect(c.assignedStaffId).toBeUndefined();
  });

  it('① 수집·이용 동의 철회는 회원 탈퇴(계정 파기)를 동반한다', async () => {
    const { store, consents, sync, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncContracts(userId);
    await sync.syncMedical(userId);

    consents.withdraw(userId, 'PERSONAL_INFO');
    const user = store.users.find((u) => u.id === userId)!;
    expect(user.status).toBe('WITHDRAWN');
    expect(user.name).toBe(''); // PII 소거
    expect(user.phone).toBe('');
    expect(store.medicalRecords.filter((r) => r.userId === userId)).toHaveLength(0);
    expect(store.contracts.filter((c) => c.userId === userId)).toHaveLength(0);
  });

  it('탈퇴 시 청구건·상담(리드)·PII 까지 파기된다', async () => {
    const { store, users, consents, sync, claims, consultations, userId } = setup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncContracts(userId);
    await sync.syncMedical(userId);
    const records = store.medicalRecords.filter((r) => r.userId === userId).slice(0, 1);
    claims.create(userId, records.map((r) => r.id));
    consultations.request(userId, 'POLICY_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });

    users.withdraw(userId);
    expect(store.claims.filter((c) => c.userId === userId)).toHaveLength(0);
    expect(store.consultations.filter((c) => c.userId === userId)).toHaveLength(0);
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

describe('API 컨트롤러 레벨 게이트', () => {
  function controllerSetup() {
    const ctx = setup();
    const { ApiController } = require('./api.controller');
    const { ContractsService } = require('./contracts/contracts.service');
    const controller = new ApiController(
      ctx.users,
      ctx.consents,
      ctx.sync,
      new ContractsService(ctx.store),
      ctx.refunds,
      ctx.claims,
      ctx.consultations,
      ctx.audit,
      ctx.store,
    );
    return { ...ctx, controller };
  }

  it('공개 POST /consents 로 ③ 제3자 제공 동의를 직접 부여할 수 없다 (우회 차단)', () => {
    const { controller, userId } = controllerSetup();
    expect(() =>
      controller.grantConsent(
        { type: 'THIRD_PARTY', documentVersion: 'v1', method: 'CHECKBOX', context: 'CONSULT_REQUEST:fake' },
        `Bearer ${userId}`,
      ),
    ).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'BLANKET_CONSENT_FORBIDDEN' }) }),
    );
  });

  it('관리자 진료내역 열람은 대상 사용자의 ② 동의가 철회되면 403 (하드 룰 3)', async () => {
    const { controller, consents, sync, consultations, userId } = controllerSetup();
    consents.grant(userId, 'SENSITIVE_HEALTH', 'consent-sensitive-v1', 'CHECKBOX');
    await sync.syncMedical(userId);
    const c = consultations.request(userId, 'ADJUSTER_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });
    c.assignedStaffId = 'staff-1';

    // 동의 유효 + 배정 담당자 → 열람 가능
    expect(controller.viewMedical(userId, 'staff-1', 'ADJUSTER')).toBeDefined();

    consents.withdraw(userId, 'SENSITIVE_HEALTH');
    expect(() => controller.viewMedical(userId, 'staff-1', 'ADJUSTER')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'CONSENT_REQUIRED' }) }),
    );
  });

  it('③ 동의 철회 후 리드 배정 시도는 409 + 상담 종료 (하드 룰 4)', () => {
    const { controller, store, consents, consultations, userId } = controllerSetup();
    const c = consultations.request(userId, 'POLICY_REVIEW', {
      documentVersion: 'consent-thirdparty-v1',
      method: 'CHECKBOX',
    });
    // 철회가 상담을 이미 CANCELLED 처리하지만, 레이스 대비 배정 시점 재확인도 검증한다
    consents.withdraw(userId, 'THIRD_PARTY');
    c.status = 'REQUESTED'; // 배정 시점 게이트 단독 검증을 위해 상태 복원
    expect(() =>
      controller.assignConsultation(c.id, { staffId: 'staff-1' }, 'OPERATOR'),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'THIRD_PARTY_CONSENT_WITHDRAWN' }),
      }),
    );
    expect(store.consultations.find((x) => x.id === c.id)?.status).toBe('CANCELLED');
  });

  it('감사 로그는 AUDITOR 전용이다 (docs/04 §9)', () => {
    const { controller } = controllerSetup();
    expect(() => controller.auditLogs('OPERATOR')).toThrow();
    expect(controller.auditLogs('AUDITOR')).toEqual([]);
  });
});
