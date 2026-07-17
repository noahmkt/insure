import { useState } from 'react';
import { ROLE_LABEL, ROLE_STAFF_ID, TabId, isReadOnly, visibleTabs } from './rbac';
import type { StaffRole } from './types';
import { AuditLogs } from './screens/AuditLogs';
import { ConsultationQueue } from './screens/ConsultationQueue';
import { Dashboard } from './screens/Dashboard';
import { DocumentMatrix } from './screens/DocumentMatrix';
import { DocumentReview } from './screens/DocumentReview';
import { MatchingParams } from './screens/MatchingParams';

const ROLES: StaffRole[] = ['OPERATOR', 'CONSULTANT', 'ADJUSTER', 'AUDITOR'];

export default function App() {
  const [role, setRole] = useState<StaffRole>('OPERATOR');
  const [tab, setTab] = useState<TabId>('dashboard');

  const tabs = visibleTabs(role);

  function switchRole(next: StaffRole) {
    setRole(next);
    // 새 역할에 허용되지 않은 탭이면 첫 탭으로 이동
    if (!visibleTabs(next).some((t) => t.id === tab)) {
      setTab(visibleTabs(next)[0].id);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>내보험 찾기 · 운영 관리자</h1>
          <span className="env-tag">DEMO</span>
        </div>
        <div className="role-switcher">
          <span className="role-switcher-label">역할 전환 (RBAC 데모)</span>
          <div className="role-buttons">
            {ROLES.map((r) => (
              <button
                key={r}
                className={`role-btn ${r === role ? 'active' : ''}`}
                onClick={() => switchRole(r)}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <span className="staff-id">
            {ROLE_STAFF_ID[role]} · {ROLE_LABEL[role]}
            {isReadOnly(role) && <em className="readonly-tag">read-only</em>}
          </span>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${t.id === tab ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'dashboard' && <Dashboard role={role} />}
        {tab === 'consultations' && <ConsultationQueue role={role} />}
        {tab === 'documents' && <DocumentReview role={role} />}
        {tab === 'matrix' && <DocumentMatrix role={role} />}
        {tab === 'params' && <MatchingParams role={role} />}
        {tab === 'audit' && <AuditLogs role={role} />}
      </main>

      <footer className="footer">
        <p>
          본 서비스는 보험금 청구를 대행하지 않으며 성공보수를 받지 않습니다. 청구의 최종 제출은
          고객 본인이 직접 수행합니다. · 주민등록번호는 수집·저장하지 않습니다(CI 기반). · 민감정보
          열람은 전건 감사 로그에 기록되며 목적 외 이용이 금지됩니다.
        </p>
      </footer>
    </div>
  );
}
