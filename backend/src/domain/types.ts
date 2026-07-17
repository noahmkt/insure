/** 공통 도메인 타입 — DB 스키마(docs/03)와 1:1 대응 */

export type ClaimType = 'OUTPATIENT' | 'INPATIENT' | 'PHARMACY';
export type BenefitCategory = 'COVERED' | 'UNCOVERED'; // 급여 / 비급여
export type HospitalTier = 'CLINIC' | 'HOSPITAL' | 'GENERAL' | 'TERTIARY' | 'PHARMACY';
export type SilsonGeneration = 1 | 2 | 3 | 4;

export type ConsentType =
  | 'PERSONAL_INFO'
  | 'SENSITIVE_HEALTH'
  | 'THIRD_PARTY'
  | 'MARKETING';

export interface User {
  id: string;
  /** SHA-256(CI). 주민등록번호는 어떤 형태로도 저장하지 않는다(하드 룰 2). */
  ciHash: string;
  name: string; // 실제 저장은 암호화 필드(enc_name) — 데모 구현에서는 평문 보관 금지 대상 표시용
  phone: string;
  status: 'ACTIVE' | 'WITHDRAWN';
  createdAt: Date;
}

export interface ConsentRecord {
  id: number;
  userId: string;
  consentType: ConsentType;
  action: 'GRANT' | 'WITHDRAW';
  documentVersion: string;
  method: 'CHECKBOX' | 'SIGNATURE';
  /** ③ 제3자 제공 동의는 상담 신청 건과 연결된 증적을 남긴다 */
  context?: string;
  occurredAt: Date;
}

export interface InsuranceContract {
  id: string;
  userId: string;
  insurerCode: string;
  insurerName: string;
  productName: string;
  contractType: 'SILSON' | 'OTHER';
  silsonGeneration?: SilsonGeneration;
  coverageStart?: string; // ISO date
  coverageEnd?: string;
  monthlyPremium?: number;
  fetchedAt: Date;
}

export interface MedicalRecord {
  id: string;
  userId: string;
  hospitalId?: string;
  hospitalName: string;
  hospitalTier: HospitalTier;
  treatmentDate: string; // ISO date
  claimType: ClaimType;
  copayCovered: number; // 본인부담금(급여)
  copayUncovered: number; // 본인부담금(비급여)
  hasPrescription: boolean;
  source: string;
  fetchedAt: Date;
}

export interface Hospital {
  id: string;
  name: string;
  tier: HospitalTier;
  silson24Linked: boolean;
}

/** 숨은보험금 — 확정액. 예측(MatchingResult)과 절대 혼용 금지. */
export interface ConfirmedBenefit {
  id: string;
  userId: string;
  benefitType: 'MATURED' | 'SURRENDER' | 'DORMANT' | 'DIVIDEND' | 'OTHER';
  insurerName: string;
  amount: number;
  guideChannel: string;
  fetchedAt: Date;
}

export type MatchVerdict = 'CLAIMABLE' | 'NOT_CLAIMABLE' | 'UNDETERMINED';

export interface MatchingResult {
  medicalRecordId: string;
  contractId: string;
  verdict: MatchVerdict;
  /** CLAIMABLE 일 때만 존재. 표기 시 '예상' 접두 강제(표기 계층). */
  estimatedAmount?: number;
  /** 산출 근거 계산식. estimatedAmount 존재 시 필수. */
  formula?: string;
  reason?: string;
  ruleVersion: string;
}

export type ClaimRoute = 'SILSON24' | 'MANUAL';

export type ClaimStatus =
  | 'PREPARING'
  | 'IN_REVIEW'
  | 'READY_TO_SUBMIT'
  /** 제출은 항상 고객 본인 행위 — 시스템 제출 API는 존재하지 않는다(하드 룰 1) */
  | 'SUBMITTED_BY_USER'
  | 'PAID'
  | 'CANCELLED';

export interface Claim {
  id: string;
  userId: string;
  contractId?: string;
  route: ClaimRoute;
  status: ClaimStatus;
  medicalRecordIds: string[];
  actualPaidAmount?: number;
  paidConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation {
  id: string;
  userId: string;
  kind: 'POLICY_REVIEW' | 'ADJUSTER_REVIEW';
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedStaffId?: string;
  /** ③ 제3자 제공 동의 증적 — 리드 전달 시 자동 첨부(감사 대응) */
  thirdPartyConsentId: number;
  requestedAt: Date;
}

export interface AuditLog {
  id: number;
  staffId: string;
  action: string;
  targetUserId: string;
  targetResource: string;
  occurredAt: Date;
}
