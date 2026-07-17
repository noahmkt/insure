import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Claim, ClaimRoute, ClaimStatus } from '../domain/types';
import { StoreService } from '../store/store.service';
import { lookupChecklist, MatrixEntry } from './document-matrix';

/**
 * 간편청구 (사양서 §5 탭4)
 * - 라우팅 분기: 실손24 연계 병원 → A(SILSON24, 딥링크 안내만), 미연계 → B(MANUAL, 서류 패키지)
 * - [하드 룰 1] 이 서버에는 "제출" API 가 존재하지 않는다. SUBMITTED_BY_USER 상태는
 *   고객 본인이 보험사 채널에서 제출했음을 스스로 기록하는 전이만 허용된다.
 */
@Injectable()
export class ClaimsService {
  constructor(private readonly store: StoreService) {}

  /** A/B 라우팅 자동 판별 */
  routeCheck(userId: string, medicalRecordIds: string[]): {
    route: ClaimRoute;
    guide: string;
  } {
    const records = this.recordsOf(userId, medicalRecordIds);
    const allLinked = records.every((r) => {
      const hospital = this.store.hospitals.find((h) => h.id === r.hospitalId);
      return hospital?.silson24Linked === true;
    });
    return allLinked
      ? {
          route: 'SILSON24',
          guide:
            '이 병원은 서류 없이 실손24로 바로 청구할 수 있어요. 실손24 앱에서 진행하시고, 완료 후 상태를 알려주세요.',
        }
      : {
          route: 'MANUAL',
          guide:
            '필요서류 체크리스트를 준비해 드릴게요. 제출 준비 완료 패키지로 안내해 드리며, 최종 제출은 보험사 채널에서 직접 진행하시면 됩니다.',
        };
  }

  create(userId: string, medicalRecordIds: string[], contractId?: string): Claim {
    this.recordsOf(userId, medicalRecordIds); // 존재/소유 검증
    const { route } = this.routeCheck(userId, medicalRecordIds);
    const claim: Claim = {
      id: this.store.newId(),
      userId,
      contractId,
      route,
      status: 'PREPARING',
      medicalRecordIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.claims.push(claim);
    return claim;
  }

  /** 필요서류 체크리스트 자동 생성 — B(MANUAL) 플로우 전용 */
  checklist(userId: string, claimId: string): MatrixEntry {
    const claim = this.getOwned(userId, claimId);
    if (claim.route !== 'MANUAL') {
      throw new BadRequestException({
        code: 'CHECKLIST_NOT_APPLICABLE',
        message: '실손24 연계 병원 청구는 서류가 필요하지 않습니다.',
      });
    }
    const records = this.recordsOf(userId, claim.medicalRecordIds);
    const contract = this.store.contracts.find((c) => c.id === claim.contractId);
    const amount = records.reduce((s, r) => s + r.copayCovered + r.copayUncovered, 0);
    const entry = lookupChecklist(
      contract?.insurerCode ?? 'SAMSUNG_FIRE',
      records[0].claimType,
      amount,
    );
    if (!entry) {
      throw new NotFoundException({
        code: 'MATRIX_ENTRY_MISSING',
        message: '해당 보험사·유형의 필요서류 정보가 아직 등록되지 않았습니다.',
      });
    }
    return entry;
  }

  /**
   * 제출 준비 완료 패키지 — 접수 채널 안내 + 청구서 양식.
   * 제출 버튼은 고객이 보험사 채널에서 직접 누른다(하드 룰 1).
   */
  package(userId: string, claimId: string): {
    channelGuide: MatrixEntry['channelGuide'];
    formDownloadUrl: string;
    notice: string;
  } {
    const entry = this.checklist(userId, claimId);
    return {
      channelGuide: entry.channelGuide,
      formDownloadUrl: `/api/v1/claims/${claimId}/form.pdf`,
      notice:
        '최종 제출은 안내된 보험사 채널에서 고객님이 직접 진행해 주세요. 본 서비스는 제출을 대행하지 않습니다.',
    };
  }

  /** 상태 전이 — 사용자 신고 기반. 시스템이 제출을 수행하는 전이는 없다. */
  updateStatus(userId: string, claimId: string, status: ClaimStatus): Claim {
    const claim = this.getOwned(userId, claimId);
    const allowed: Record<ClaimStatus, ClaimStatus[]> = {
      PREPARING: ['IN_REVIEW', 'READY_TO_SUBMIT', 'SUBMITTED_BY_USER', 'CANCELLED'],
      IN_REVIEW: ['READY_TO_SUBMIT', 'CANCELLED'],
      READY_TO_SUBMIT: ['SUBMITTED_BY_USER', 'CANCELLED'],
      SUBMITTED_BY_USER: ['PAID', 'CANCELLED'],
      PAID: [],
      CANCELLED: [],
    };
    if (!allowed[claim.status].includes(status)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `${claim.status} → ${status} 전이는 허용되지 않습니다.`,
      });
    }
    claim.status = status;
    claim.updatedAt = new Date();
    return claim;
  }

  /** 지급 확인 + 실지급액 입력 → 예측 정확도 루프 축적 (§7.1) */
  confirmPaid(userId: string, claimId: string, actualPaidAmount: number): Claim {
    const claim = this.getOwned(userId, claimId);
    if (claim.status !== 'SUBMITTED_BY_USER') {
      throw new BadRequestException({
        code: 'NOT_SUBMITTED',
        message: '제출 완료로 표시된 청구만 지급 확인할 수 있습니다.',
      });
    }
    claim.status = 'PAID';
    claim.actualPaidAmount = actualPaidAmount;
    claim.paidConfirmedAt = new Date();
    claim.updatedAt = new Date();
    return claim;
  }

  listHospitals(userId: string) {
    const ids = new Set(
      this.store.medicalRecords.filter((r) => r.userId === userId).map((r) => r.hospitalId),
    );
    return this.store.hospitals.filter((h) => ids.has(h.id));
  }

  private getOwned(userId: string, claimId: string): Claim {
    const claim = this.store.claims.find((c) => c.id === claimId && c.userId === userId);
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: '청구건이 없습니다.' });
    return claim;
  }

  private recordsOf(userId: string, medicalRecordIds: string[]) {
    const records = this.store.medicalRecords.filter(
      (r) => r.userId === userId && medicalRecordIds.includes(r.id),
    );
    if (records.length !== medicalRecordIds.length) {
      throw new NotFoundException({
        code: 'MEDICAL_RECORD_NOT_FOUND',
        message: '선택한 진료건을 찾을 수 없습니다.',
      });
    }
    return records;
  }
}
