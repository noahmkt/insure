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

  nextConsentId(): number {
    return ++this.consentSeq;
  }

  nextAuditId(): number {
    return ++this.auditSeq;
  }
}
