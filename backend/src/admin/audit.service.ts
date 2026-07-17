import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditLog } from '../domain/types';
import { StoreService } from '../store/store.service';

export type StaffRole = 'OPERATOR' | 'CONSULTANT' | 'ADJUSTER' | 'AUDITOR';

/**
 * 감사 로그 (사양서 §6, §9)
 * 민감정보 열람은 전건 기록(누가·언제·어떤 고객·어떤 데이터), append-only.
 * 민감정보 열람 권한: 상담 신청 고객 건 + 배정 담당자만 — 서버에서 강제.
 */
@Injectable()
export class AuditService {
  constructor(private readonly store: StoreService) {}

  record(staffId: string, action: string, targetUserId: string, targetResource: string): AuditLog {
    const log: AuditLog = {
      id: this.store.nextAuditId(),
      staffId,
      action,
      targetUserId,
      targetResource,
      occurredAt: new Date(),
    };
    this.store.auditLogs.push(log);
    return log;
  }

  /** 배정 담당자만 해당 고객 민감정보 열람 가능 */
  assertCanViewSensitive(staffId: string, targetUserId: string): void {
    const assigned = this.store.consultations.some(
      (c) => c.userId === targetUserId && c.assignedStaffId === staffId,
    );
    if (!assigned) {
      throw new ForbiddenException({
        code: 'NOT_ASSIGNED',
        message: '상담 배정된 담당자만 해당 고객의 민감정보를 열람할 수 있습니다.',
      });
    }
  }

  list(): AuditLog[] {
    return this.store.auditLogs;
  }
}
