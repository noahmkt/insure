import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConsentRecord, ConsentType } from '../domain/types';
import { StoreService } from '../store/store.service';

/**
 * 동의 4층 분리 (하드 룰 4)
 * - 수집·이용 / 민감정보 / 제3자 제공 / 마케팅. 포괄 동의 금지.
 * - 이력은 append-only: 철회도 새 레코드(action=WITHDRAW)로 쌓인다.
 * - ③(THIRD_PARTY)는 상담 신청 시점에만, 신청 건 context와 함께 부여 가능.
 */
@Injectable()
export class ConsentsService {
  constructor(private readonly store: StoreService) {}

  grant(
    userId: string,
    type: ConsentType,
    documentVersion: string,
    method: 'CHECKBOX' | 'SIGNATURE',
    context?: string,
  ): ConsentRecord {
    if (type === 'THIRD_PARTY' && !context) {
      // 포괄 제3자 제공 동의 금지 — 반드시 상담 신청 건과 연결된 증적 필요
      throw new BadRequestException({
        code: 'BLANKET_CONSENT_FORBIDDEN',
        message: '제3자 제공 동의는 상담 신청 시점에 해당 건에 한해 받을 수 있습니다.',
      });
    }
    const record: ConsentRecord = {
      id: this.store.nextConsentId(),
      userId,
      consentType: type,
      action: 'GRANT',
      documentVersion,
      method,
      context,
      occurredAt: new Date(),
    };
    this.store.consents.push(record);
    return record;
  }

  withdraw(userId: string, type: ConsentType): { impacts: string } {
    this.store.consents.push({
      id: this.store.nextConsentId(),
      userId,
      consentType: type,
      action: 'WITHDRAW',
      documentVersion: 'n/a',
      method: 'CHECKBOX',
      occurredAt: new Date(),
    });
    return { impacts: WITHDRAW_IMPACTS[type] };
  }

  /** 유형별 최신 액션이 GRANT 인지 */
  hasActive(userId: string, type: ConsentType): boolean {
    const history = this.store.consents.filter(
      (c) => c.userId === userId && c.consentType === type,
    );
    const latest = history[history.length - 1];
    return latest?.action === 'GRANT';
  }

  /** 민감정보 접근 전 게이트 — 하드 룰 3 */
  assertSensitiveConsent(userId: string): void {
    if (!this.hasActive(userId, 'SENSITIVE_HEALTH')) {
      throw new ForbiddenException({
        code: 'CONSENT_REQUIRED',
        message: '민감정보(건강·진료정보) 처리 동의가 필요합니다.',
      });
    }
  }

  history(userId: string): ConsentRecord[] {
    return this.store.consents.filter((c) => c.userId === userId);
  }
}

const WITHDRAW_IMPACTS: Record<ConsentType, string> = {
  PERSONAL_INFO: '철회 시 회원 탈퇴가 함께 진행됩니다.',
  SENSITIVE_HEALTH:
    '진료내역 연동과 미청구 발굴 기능이 중단되고, 저장된 진료내역은 파기됩니다.',
  THIRD_PARTY: '진행 중인 상담이 종료되며, 전달된 정보는 파기 요청됩니다.',
  MARKETING: '이벤트·혜택 알림이 중단됩니다. 서비스 알림은 계속 발송됩니다.',
};
