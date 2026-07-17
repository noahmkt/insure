import { useState } from 'react';
import { getWithFallback, postWithFallback } from '../api';
import { mockConsultations, mockStaff } from '../mock';
import { isReadOnly } from '../rbac';
import type { Consultation, ConsultationStatus, StaffRole } from '../types';
import { SourceBadge, StatusChip, useLoad } from '../ui';

const STATUS_LABEL: Record<ConsultationStatus, { label: string; tone: string }> = {
  REQUESTED: { label: '신청', tone: 'blue' },
  ASSIGNED: { label: '배정', tone: 'purple' },
  IN_PROGRESS: { label: '진행', tone: 'amber' },
  DONE: { label: '완료', tone: 'green' },
};

export function ConsultationQueue({ role }: { role: StaffRole }) {
  const { data, setData, source } = useLoad<Consultation[]>(
    () => getWithFallback('/consultations', role, () => mockConsultations.map((c) => ({ ...c }))),
    [role],
  );
  const [filter, setFilter] = useState<ConsultationStatus | 'ALL'>('ALL');
  const [message, setMessage] = useState<string | null>(null);

  const canAssign = role === 'OPERATOR' && !isReadOnly(role);

  async function assign(consultationId: string, staffId: string) {
    if (!staffId || !data) return;
    const staff = mockStaff.find((s) => s.id === staffId);
    const result = await postWithFallback(
      `/consultations/${consultationId}/assign`,
      role,
      { staffId },
      () => null,
    );
    setData(
      data.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              status: 'ASSIGNED' as const,
              assignedStaffId: staffId,
              assignedStaffName: staff?.name,
              consentAttached: true,
            }
          : c,
      ),
    );
    setMessage(
      `${consultationId} 배정 완료 — ③ 제3자 제공 동의 증적이 자동 첨부되고 감사 로그에 기록되었습니다.` +
        (result.source === 'mock' ? ' (목데이터 처리)' : ''),
    );
  }

  if (!data) return <p className="loading">불러오는 중…</p>;

  const rows = filter === 'ALL' ? data : data.filter((c) => c.status === filter);

  return (
    <section>
      <header className="screen-head">
        <h2>상담 큐</h2>
        <SourceBadge source={source} />
      </header>

      <p className="notice">
        본 목록은 고객이 직접 신청한 <strong>전문가 상담</strong> 건입니다. 상품 권유 목적의 연락은
        금지되며, 리드 전달(배정) 시 ③ 제3자 제공 동의 증적이 자동 첨부되어 감사 로그에 남습니다.
      </p>

      <div className="toolbar">
        <label>
          상태 필터{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as ConsultationStatus | 'ALL')}>
            <option value="ALL">전체</option>
            <option value="REQUESTED">신청</option>
            <option value="ASSIGNED">배정</option>
            <option value="IN_PROGRESS">진행</option>
            <option value="DONE">완료</option>
          </select>
        </label>
      </div>

      {message && <p className="flash">{message}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>번호</th>
            <th>고객</th>
            <th>유형</th>
            <th>신청일시</th>
            <th>상태</th>
            <th>담당자</th>
            <th>③동의 증적</th>
            {canAssign && <th>배정</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.customerMasked}</td>
              <td>{c.kind}</td>
              <td>{c.requestedAt}</td>
              <td>
                <StatusChip label={STATUS_LABEL[c.status].label} tone={STATUS_LABEL[c.status].tone} />
              </td>
              <td>{c.assignedStaffName ?? '—'}</td>
              <td>
                {c.consentAttached ? (
                  <span className="chip chip-green" title={`증적 ID: ${c.thirdPartyConsentId}`}>
                    자동 첨부됨
                  </span>
                ) : (
                  <span className="chip chip-muted" title="배정(리드 전달) 시 자동 첨부">
                    수집됨(신청 시점)
                  </span>
                )}
              </td>
              {canAssign && (
                <td>
                  {c.status === 'REQUESTED' ? (
                    <select defaultValue="" onChange={(e) => assign(c.id, e.target.value)}>
                      <option value="" disabled>
                        담당자 배정 ▾
                      </option>
                      {mockStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role === 'ADJUSTER' ? '손해사정사' : '상담사'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    '—'
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
