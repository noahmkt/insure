/** 도메인 타입 — docs/04-api-spec.md §9, docs/02-wireframes.md §7 기준 */

export type StaffRole = 'OPERATOR' | 'CONSULTANT' | 'ADJUSTER' | 'AUDITOR';

export interface DashboardMetrics {
  newSignups7d: number;
  linkSuccessRate: number; // 0~1
  discoveredCount: number;
  /** 예측 금액 합계 — 표기 시 반드시 "예상" 접두 + 산출 근거 + 면책 문구 */
  discoveredExpectedAmount: number;
  discoveredBasis: string;
  /** 확정액(숨은보험금) — 예측액과 혼용 표기 금지, 별도 집계 */
  hiddenBenefitConfirmedAmount: number;
  consultationRequests: number;
  claimConversionRate: number; // 0~1
  accuracyErrorRate: number; // 예측 vs 실지급 오차율 (0~1)
}

export type ConsultationStatus = 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE';

export interface Consultation {
  id: string;
  customerMasked: string; // 예: 김○○ — 원문 식별정보 미보유(CI 기반)
  kind: string; // 보험점검 / 청구지원 / 환급점검
  status: ConsultationStatus;
  requestedAt: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  /** ③ 제3자 제공 동의 증적 ID — 상담 신청 클릭 시점에 수집된 동의 */
  thirdPartyConsentId: string;
  consentAttached: boolean; // 배정(리드 전달) 시 자동 첨부됨
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

export type ReviewStatus = 'PENDING' | 'FIX_REQUESTED' | 'REVIEWED';

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface ReviewDocument {
  id: string;
  claimId: string;
  customerMasked: string;
  docType: string;
  uploadedAt: string;
  status: ReviewStatus;
  /** 손해사정사 검토 필요 플래그 */
  adjusterFlag: boolean;
  checklist: ChecklistItem[];
}

export interface MatrixRow {
  id: string;
  insurer: string;
  claimType: '통원' | '입원' | '약제';
  amountBand: string;
  requiredDocs: string;
}

export interface MatchingParamRow {
  id: string;
  generation: '1세대' | '2세대' | '3세대' | '4세대';
  claimType: '통원' | '입원' | '약제';
  category: string; // 통합 / 급여 / 비급여 등
  deductibleFixed: string; // 정액공제 (의원/병원/종합/상급)
  copayRate: string; // 자기부담률
  limitAmount: string; // 회당·연간 한도
  note: string;
}

export interface RuleVersion {
  version: string;
  publishedAt: string;
  author: string;
  note: string;
}

export interface AuditLog {
  id: string;
  staffLabel: string;
  action: string;
  targetUserMasked: string;
  targetResource: string;
  occurredAt: string;
}
