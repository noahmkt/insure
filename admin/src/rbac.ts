import type { StaffRole } from './types';

/** 역할별 메뉴 노출 — docs/04-api-spec.md §9 롤 매핑 기준 */
export type TabId =
  | 'dashboard'
  | 'consultations'
  | 'documents'
  | 'matrix'
  | 'params'
  | 'audit';

export interface TabDef {
  id: TabId;
  label: string;
  roles: StaffRole[];
}

export const TABS: TabDef[] = [
  { id: 'dashboard', label: '대시보드', roles: ['OPERATOR', 'CONSULTANT', 'ADJUSTER', 'AUDITOR'] },
  { id: 'consultations', label: '상담 큐', roles: ['OPERATOR', 'CONSULTANT'] },
  { id: 'documents', label: '서류 검토', roles: ['CONSULTANT', 'ADJUSTER'] },
  { id: 'matrix', label: '필요서류 매트릭스', roles: ['OPERATOR'] },
  { id: 'params', label: '매칭 파라미터', roles: ['OPERATOR'] },
  { id: 'audit', label: '감사 로그', roles: ['AUDITOR', 'OPERATOR'] },
];

export const ROLE_LABEL: Record<StaffRole, string> = {
  OPERATOR: '운영자',
  CONSULTANT: '상담사',
  ADJUSTER: '손해사정사',
  AUDITOR: '감사',
};

/** 데모용 역할별 스태프 ID (백엔드 x-staff-id 헤더) */
export const ROLE_STAFF_ID: Record<StaffRole, string> = {
  OPERATOR: 'op-01',
  CONSULTANT: 's-01',
  ADJUSTER: 's-03',
  AUDITOR: 'aud-01',
};

export function visibleTabs(role: StaffRole): TabDef[] {
  return TABS.filter((t) => t.roles.includes(role));
}

/** 감사(AUDITOR)는 전 화면 read-only — 어떤 변경 액션도 노출하지 않는다 */
export function isReadOnly(role: StaffRole): boolean {
  return role === 'AUDITOR';
}
