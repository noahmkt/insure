import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AuditLog,
  Claim,
  ConfirmedBenefit,
  ConsentRecord,
  Consultation,
  Hospital,
  InsuranceContract,
  MedicalRecord,
  User,
} from '../domain/types';

/**
 * Phase 1 데모용 인메모리 저장소.
 * 운영 전환 시 docs/03-db-schema.md 의 PostgreSQL 스키마(core/medical 스키마 분리,
 * 필드 암호화, append-only 권한)로 교체된다. 서비스 계층은 이 인터페이스만 사용하므로
 * 저장소 교체가 로직에 영향을 주지 않는다.
 */
@Injectable()
export class StoreService {
  users: User[] = [];
  consents: ConsentRecord[] = [];
  contracts: InsuranceContract[] = [];
  medicalRecords: MedicalRecord[] = [];
  confirmedBenefits: ConfirmedBenefit[] = [];
  claims: Claim[] = [];
  consultations: Consultation[] = [];
  auditLogs: AuditLog[] = [];
  hospitals: Hospital[] = [
    // 실손24 연계 여부 = 간편청구 A/B 라우팅 분기 키
    { id: 'hosp-1', name: '서울정형외과', tier: 'HOSPITAL', silson24Linked: false },
    { id: 'hosp-2', name: '연세이비인후과의원', tier: 'CLINIC', silson24Linked: true },
    { id: 'hosp-3', name: '서울대학교병원', tier: 'TERTIARY', silson24Linked: true },
    { id: 'hosp-4', name: '튼튼약국', tier: 'PHARMACY', silson24Linked: false },
  ];

  private consentSeq = 0;
  private auditSeq = 0;

  newId(): string {
    return randomUUID();
  }

  /** 민감정보(진료내역) 파기 — ② 동의 철회·탈퇴 시 즉시 실행 (하드 룰 3·5) */
  purgeMedicalData(userId: string): void {
    this.medicalRecords = this.medicalRecords.filter((r) => r.userId !== userId);
  }

  /** 진행 중 상담 종료 — ③ 동의 철회·탈퇴 시 (하드 룰 4) */
  cancelActiveConsultations(userId: string): void {
    for (const c of this.consultations) {
      if (
        c.userId === userId &&
        (c.status === 'REQUESTED' || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS')
      ) {
        c.status = 'CANCELLED';
        c.assignedStaffId = undefined;
      }
    }
  }

  /**
   * 계정 파기 — 탈퇴 또는 ① 동의 철회 시.
   * 개인정보·민감정보·리드를 즉시 파기하고 PII 를 소거한다.
   * 동의 이력·감사 로그는 법정 보존 대상으로 append-only 유지(비식별 키만 잔존).
   */
  purgeAccount(userId: string): void {
    this.purgeMedicalData(userId);
    this.cancelActiveConsultations(userId);
    this.contracts = this.contracts.filter((c) => c.userId !== userId);
    this.confirmedBenefits = this.confirmedBenefits.filter((b) => b.userId !== userId);
    this.claims = this.claims.filter((c) => c.userId !== userId);
    this.consultations = this.consultations.filter((c) => c.userId !== userId);
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.status = 'WITHDRAWN';
      user.name = '';
      user.phone = '';
      user.ciHash = `withdrawn:${user.id}`; // 재가입 식별 불가 — 법정 보존분은 별도 구조로 분리(운영)
    }
  }

  nextConsentId(): number {
    return ++this.consentSeq;
  }

  nextAuditId(): number {
    return ++this.auditSeq;
  }
}
