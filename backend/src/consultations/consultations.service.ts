import { ConflictException, Injectable } from '@nestjs/common';
import { ConsentsService } from '../consents/consents.service';
import { Consultation } from '../domain/types';
import { StoreService } from '../store/store.service';

/**
 * 전문가 상담 (수익 전환점 1·2 — 사양서 §10)
 * [하드 룰 4] ③ 제3자 제공 동의는 상담 신청 버튼 클릭 시점에 명시적으로 받고,
 * 동의 증적(consent id)을 상담 건에 연결해 리드 전달 시 자동 첨부한다.
 * 문구 프레임은 "상품 권유"가 아닌 "전문가 상담 신청"을 유지한다(하드 룰 6).
 */
@Injectable()
export class ConsultationsService {
  constructor(
    private readonly store: StoreService,
    private readonly consents: ConsentsService,
  ) {}

  request(
    userId: string,
    kind: 'POLICY_REVIEW' | 'ADJUSTER_REVIEW',
    thirdPartyConsent?: { documentVersion: string; method: 'CHECKBOX' | 'SIGNATURE' },
  ): Consultation {
    if (!thirdPartyConsent) {
      throw new ConflictException({
        code: 'THIRD_PARTY_CONSENT_REQUIRED',
        message:
          '전문가 상담 연결에는 제3자 제공 동의가 필요합니다. 동의 내용은 신청 화면에서 확인해 주세요.',
      });
    }

    const consultationId = this.store.newId();
    // 동의는 반드시 이 신청 건 context 로만 부여된다 (포괄 동의 금지)
    const consent = this.consents.grant(
      userId,
      'THIRD_PARTY',
      thirdPartyConsent.documentVersion,
      thirdPartyConsent.method,
      `CONSULT_REQUEST:${consultationId}`,
    );

    const consultation: Consultation = {
      id: consultationId,
      userId,
      kind,
      status: 'REQUESTED',
      thirdPartyConsentId: consent.id,
      requestedAt: new Date(),
    };
    this.store.consultations.push(consultation);
    return consultation;
  }

  listMine(userId: string): Consultation[] {
    return this.store.consultations.filter((c) => c.userId === userId);
  }
}
