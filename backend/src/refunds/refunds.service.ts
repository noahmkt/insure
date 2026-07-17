import { Injectable } from '@nestjs/common';
import { CONFIRMED_LABEL, ESTIMATE_DISCLAIMER, ESTIMATE_LABEL } from '../common/policy';
import { ConsentsService } from '../consents/consents.service';
import { MatchVerdict } from '../domain/types';
import { matchRecord, statuteExpiryDate } from '../matching/engine';
import { StoreService } from '../store/store.service';

/**
 * 환급금 조회 — 확정액(숨은보험금)과 예측액(미청구 실비)을 별도 DTO 로 분리한다(§2).
 * 예측액 DTO 는 disclaimer 필드가 항상 포함된다(하드 룰 7). UNDETERMINED 는 금액 미표기.
 */

export interface EstimatedRefundDto {
  medicalRecordId: string;
  hospitalName: string;
  treatmentDate: string;
  copayTotal: number;
  verdict: MatchVerdict;
  estimate?: {
    label: typeof ESTIMATE_LABEL; // '예상 환급액' — '예상' 접두 강제
    amount: number;
    formula: string;
    ruleVersion: string;
  };
  reviewNeeded: boolean; // UNDETERMINED → "검토 필요" 라벨만
  statuteExpiresOn: string;
  disclaimer: typeof ESTIMATE_DISCLAIMER; // 직렬화 단계 강제 포함
}

export interface ConfirmedBenefitDto {
  id: string;
  label: typeof CONFIRMED_LABEL;
  benefitType: string;
  insurerName: string;
  amount: number;
  guideChannel: string;
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly store: StoreService,
    private readonly consents: ConsentsService,
  ) {}

  /** 숨은보험금(확정액) — 매칭 엔진을 거치지 않으며 면책 문구 대상이 아니다 */
  confirmed(userId: string): ConfirmedBenefitDto[] {
    return this.store.confirmedBenefits
      .filter((b) => b.userId === userId)
      .map((b) => ({
        id: b.id,
        label: CONFIRMED_LABEL,
        benefitType: b.benefitType,
        insurerName: b.insurerName,
        amount: b.amount,
        guideChannel: b.guideChannel,
      }));
  }

  /** 미청구 실비(예측액) — 민감정보 동의 게이트 + 면책 문구 강제 */
  estimated(userId: string, sort: 'amount' | 'expiry' = 'amount'): EstimatedRefundDto[] {
    this.consents.assertSensitiveConsent(userId);

    const contracts = this.store.contracts.filter(
      (c) => c.userId === userId && c.contractType === 'SILSON',
    );
    const records = this.store.medicalRecords.filter((r) => r.userId === userId);

    const dtos: EstimatedRefundDto[] = records.map((record) => {
      // 실손 계약별 매칭 후 최적(예상액 최대) 결과 채택
      const results = contracts.map((c) => matchRecord(record, c));
      const best =
        results.find((r) => r.verdict === 'CLAIMABLE' && r.estimatedAmount) ??
        results.find((r) => r.verdict === 'UNDETERMINED') ??
        results[0] ?? {
          medicalRecordId: record.id,
          contractId: '',
          verdict: 'NOT_CLAIMABLE' as const,
          reason: 'no_silson_contract',
          ruleVersion: 'n/a',
        };
      const claimables = results.filter((r) => r.verdict === 'CLAIMABLE');
      const top = claimables.sort(
        (a, b) => (b.estimatedAmount ?? 0) - (a.estimatedAmount ?? 0),
      )[0] ?? best;

      return {
        medicalRecordId: record.id,
        hospitalName: record.hospitalName,
        treatmentDate: record.treatmentDate,
        copayTotal: record.copayCovered + record.copayUncovered,
        verdict: top.verdict,
        estimate:
          top.verdict === 'CLAIMABLE' && top.estimatedAmount && top.formula
            ? {
                label: ESTIMATE_LABEL,
                amount: top.estimatedAmount,
                formula: top.formula,
                ruleVersion: top.ruleVersion,
              }
            : undefined,
        reviewNeeded: top.verdict === 'UNDETERMINED',
        statuteExpiresOn: statuteExpiryDate(record.treatmentDate)
          .toISOString()
          .slice(0, 10),
        disclaimer: ESTIMATE_DISCLAIMER,
      };
    });

    return dtos.sort((a, b) =>
      sort === 'expiry'
        ? a.statuteExpiresOn.localeCompare(b.statuteExpiresOn)
        : (b.estimate?.amount ?? 0) - (a.estimate?.amount ?? 0),
    );
  }
}
