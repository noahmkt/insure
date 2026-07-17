import type {
  AuditLog,
  Consultation,
  DashboardMetrics,
  MatchingParamRow,
  MatrixRow,
  ReviewDocument,
  RuleVersion,
  StaffMember,
} from './types';

/**
 * 목데이터 — 백엔드(/api/v1/admin/*) 호출 실패 시 개발 편의용 폴백.
 * 주의: 고객 식별정보는 전부 마스킹(CI 기반 운영 — 주민등록번호 원문은 어디에도 존재하지 않음).
 */

export const mockDashboard: DashboardMetrics = {
  newSignups7d: 1284,
  linkSuccessRate: 0.914,
  discoveredCount: 3420,
  discoveredExpectedAmount: 187450000,
  discoveredBasis:
    '매칭 룰 silson-v1 · 세대별 공제 파라미터(정액공제·자기부담률·회당 한도) 적용, CLAIMABLE 판정 건만 합산',
  hiddenBenefitConfirmedAmount: 52300000,
  consultationRequests: 214,
  claimConversionRate: 0.376,
  accuracyErrorRate: 0.162,
};

export const mockStaff: StaffMember[] = [
  { id: 's-01', name: '박상담', role: 'CONSULTANT' },
  { id: 's-02', name: '이상담', role: 'CONSULTANT' },
  { id: 's-03', name: '최손사', role: 'ADJUSTER' },
];

export const mockConsultations: Consultation[] = [
  {
    id: 'c-1024',
    customerMasked: '김○○',
    kind: '보험점검',
    status: 'REQUESTED',
    requestedAt: '2026-07-16 14:02',
    thirdPartyConsentId: 'consent3-9081',
    consentAttached: false,
  },
  {
    id: 'c-1023',
    customerMasked: '박○○',
    kind: '청구지원',
    status: 'REQUESTED',
    requestedAt: '2026-07-16 11:47',
    thirdPartyConsentId: 'consent3-9074',
    consentAttached: false,
  },
  {
    id: 'c-1019',
    customerMasked: '이○○',
    kind: '환급점검',
    status: 'ASSIGNED',
    requestedAt: '2026-07-15 17:20',
    assignedStaffId: 's-01',
    assignedStaffName: '박상담',
    thirdPartyConsentId: 'consent3-9052',
    consentAttached: true,
  },
  {
    id: 'c-1012',
    customerMasked: '정○○',
    kind: '보험점검',
    status: 'IN_PROGRESS',
    requestedAt: '2026-07-14 09:05',
    assignedStaffId: 's-02',
    assignedStaffName: '이상담',
    thirdPartyConsentId: 'consent3-9017',
    consentAttached: true,
  },
  {
    id: 'c-1001',
    customerMasked: '한○○',
    kind: '청구지원',
    status: 'DONE',
    requestedAt: '2026-07-11 16:38',
    assignedStaffId: 's-01',
    assignedStaffName: '박상담',
    thirdPartyConsentId: 'consent3-8963',
    consentAttached: true,
  },
];

export const mockDocuments: ReviewDocument[] = [
  {
    id: 'd-501',
    claimId: 'clm-2201',
    customerMasked: '김○○',
    docType: '진료비 영수증',
    uploadedAt: '2026-07-16 10:12',
    status: 'PENDING',
    adjusterFlag: false,
    checklist: [
      { label: '발급 기관명·발급일 확인', checked: false },
      { label: '진료일이 청구 대상 기간 내인지 확인', checked: false },
      { label: '금액(급여/비급여 구분) 판독 가능', checked: false },
    ],
  },
  {
    id: 'd-502',
    claimId: 'clm-2201',
    customerMasked: '김○○',
    docType: '진료비 세부내역서',
    uploadedAt: '2026-07-16 10:13',
    status: 'PENDING',
    adjusterFlag: true,
    checklist: [
      { label: '비급여 항목 세부 코드 확인', checked: false },
      { label: '3대 비급여(도수·주사·MRI) 해당 여부', checked: false },
    ],
  },
  {
    id: 'd-497',
    claimId: 'clm-2188',
    customerMasked: '이○○',
    docType: '입퇴원확인서',
    uploadedAt: '2026-07-15 15:40',
    status: 'FIX_REQUESTED',
    adjusterFlag: false,
    checklist: [
      { label: '입원·퇴원일 기재 확인', checked: true },
      { label: '병원 직인 확인', checked: false },
    ],
  },
  {
    id: 'd-488',
    claimId: 'clm-2170',
    customerMasked: '정○○',
    docType: '진단서',
    uploadedAt: '2026-07-14 13:02',
    status: 'REVIEWED',
    adjusterFlag: true,
    checklist: [
      { label: '질병분류기호(KCD) 기재', checked: true },
      { label: '발급일 3개월 이내', checked: true },
    ],
  },
];

export const mockMatrix: MatrixRow[] = [
  { id: 'm-01', insurer: '삼성화재', claimType: '통원', amountBand: '10만원 이하', requiredDocs: '진료비 영수증' },
  { id: 'm-02', insurer: '삼성화재', claimType: '통원', amountBand: '10만원 초과', requiredDocs: '진료비 영수증, 진료비 세부내역서' },
  { id: 'm-03', insurer: '삼성화재', claimType: '입원', amountBand: '전체', requiredDocs: '진료비 영수증, 진단서(또는 입퇴원확인서), 세부내역서' },
  { id: 'm-04', insurer: '현대해상', claimType: '통원', amountBand: '3만원 이하', requiredDocs: '진료비 영수증(간편청구)' },
  { id: 'm-05', insurer: '현대해상', claimType: '약제', amountBand: '전체', requiredDocs: '약제비 영수증, 처방전' },
  { id: 'm-06', insurer: 'DB손해보험', claimType: '입원', amountBand: '100만원 초과', requiredDocs: '진단서, 입퇴원확인서, 세부내역서, 수술확인서(해당 시)' },
];

/** docs/05-matching-rules-v1.md §2 공제 파라미터 v1 근사치 */
export const mockParams: MatchingParamRow[] = [
  { id: 'p-01', generation: '1세대', claimType: '통원', category: '통합', deductibleFixed: '5,000 (일괄)', copayRate: '0%', limitAmount: '회당 100,000', note: '회사별 상이 — 담보 데이터 없으면 UNDETERMINED' },
  { id: 'p-02', generation: '2세대', claimType: '통원', category: '통합', deductibleFixed: '10,000 / 15,000 / 15,000 / 20,000', copayRate: '0%', limitAmount: '회당 250,000', note: '처방약제 별도 8,000 공제' },
  { id: 'p-03', generation: '3세대', claimType: '통원', category: '급여+비급여(기본형)', deductibleFixed: '10,000 / 15,000 / 15,000 / 20,000', copayRate: '급여 10% · 비급여 20%', limitAmount: '회당 250,000', note: '특약 대상 비급여 30%' },
  { id: 'p-04', generation: '4세대', claimType: '통원', category: '급여', deductibleFixed: '10,000 / 10,000 / 20,000 / 20,000', copayRate: '20%', limitAmount: '회당 200,000', note: '' },
  { id: 'p-05', generation: '4세대', claimType: '통원', category: '비급여', deductibleFixed: '30,000 (일괄)', copayRate: '30%', limitAmount: '회당 200,000', note: '상급·종합 급여 공제 20,000' },
  { id: 'p-06', generation: '2세대', claimType: '입원', category: '통합', deductibleFixed: '0', copayRate: '10% (선택형 20%)', limitAmount: '연간 50,000,000', note: '' },
  { id: 'p-07', generation: '3세대', claimType: '입원', category: '급여/비급여(기본형)', deductibleFixed: '0', copayRate: '10% / 20%', limitAmount: '연간 50,000,000', note: '' },
  { id: 'p-08', generation: '4세대', claimType: '입원', category: '급여 / 비급여', deductibleFixed: '0', copayRate: '20% / 30%', limitAmount: '연간 50,000,000', note: '' },
  { id: 'p-09', generation: '2세대', claimType: '약제', category: '통합', deductibleFixed: '8,000', copayRate: '0%', limitAmount: '통원 한도 내', note: '' },
  { id: 'p-10', generation: '3세대', claimType: '약제', category: '급여/비급여', deductibleFixed: '8,000', copayRate: '급여 10% · 비급여 20%', limitAmount: '통원 한도 내', note: '' },
  { id: 'p-11', generation: '4세대', claimType: '약제', category: '급여 / 비급여', deductibleFixed: '급여 8,000 / 비급여 30,000', copayRate: '20% / 30%', limitAmount: '통원 한도 내', note: '' },
];

export const mockRuleVersions: RuleVersion[] = [
  {
    version: 'silson-v1',
    publishedAt: '2026-06-01 10:00',
    author: '운영자(op-01)',
    note: '표준약관 기반 초기 근사치 — 손해사정사 검수 완료',
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'a-3121',
    staffLabel: 's-01 박상담(상담사)',
    action: 'VIEW_MEDICAL',
    targetUserMasked: 'u-9021 김○○',
    targetResource: 'medical.medical_records',
    occurredAt: '2026-07-16 15:21',
  },
  {
    id: 'a-3120',
    staffLabel: 's-03 최손사(손해사정사)',
    action: 'VIEW_DOCUMENT',
    targetUserMasked: 'u-8834 이○○',
    targetResource: 'claims.documents/d-497',
    occurredAt: '2026-07-16 14:03',
  },
  {
    id: 'a-3117',
    staffLabel: 'op-01 운영자',
    action: 'ASSIGN_CONSULTATION(③동의 증적 첨부)',
    targetUserMasked: 'u-8834 이○○',
    targetResource: 'consultations/c-1019',
    occurredAt: '2026-07-15 17:22',
  },
  {
    id: 'a-3111',
    staffLabel: 's-02 이상담(상담사)',
    action: 'VIEW_MEDICAL',
    targetUserMasked: 'u-8710 정○○',
    targetResource: 'medical.medical_records',
    occurredAt: '2026-07-15 11:48',
  },
];
