import { getWithFallback } from '../api';
import { mockAuditLogs } from '../mock';
import type { AuditLog, StaffRole } from '../types';
import { SourceBadge, useLoad } from '../ui';

/** 백엔드 원본 스키마(staffId/targetUserId/Date) → 화면 표기용으로 정규화 */
function normalize(raw: unknown): AuditLog[] {
  if (!Array.isArray(raw)) return mockAuditLogs;
  return raw.map((r, i) => {
    const rec = r as Record<string, unknown>;
    return {
      id: String(rec.id ?? `a-${i}`),
      staffLabel: String(rec.staffLabel ?? rec.staffId ?? '—'),
      action: String(rec.action ?? '—'),
      targetUserMasked: String(rec.targetUserMasked ?? rec.targetUserId ?? '—'),
      targetResource: String(rec.targetResource ?? '—'),
      occurredAt: String(rec.occurredAt ?? '—').replace('T', ' ').slice(0, 16),
    };
  });
}

export function AuditLogs({ role }: { role: StaffRole }) {
  const { data, source } = useLoad<AuditLog[]>(
    async () => {
      const r = await getWithFallback<unknown>('/audit-logs', role, () => mockAuditLogs);
      return { data: normalize(r.data), source: r.source };
    },
    [role],
  );

  if (!data) return <p className="loading">불러오는 중…</p>;

  return (
    <section>
      <header className="screen-head">
        <h2>감사 로그</h2>
        <SourceBadge source={source} />
      </header>

      <p className="notice">
        민감정보 열람은 <strong>전건 기록</strong>됩니다 (누가 · 언제 · 어떤 고객 · 어떤 데이터).
        로그는 append-only이며 수정·삭제할 수 없습니다.
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>로그 ID</th>
            <th>담당자</th>
            <th>행위</th>
            <th>대상 고객</th>
            <th>대상 데이터</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {data.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.staffLabel}</td>
              <td>{log.action}</td>
              <td>{log.targetUserMasked}</td>
              <td>
                <code>{log.targetResource}</code>
              </td>
              <td>{log.occurredAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
