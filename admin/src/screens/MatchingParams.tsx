import { useState } from 'react';
import { getWithFallback, postWithFallback } from '../api';
import { mockParams, mockRuleVersions } from '../mock';
import { isReadOnly } from '../rbac';
import type { MatchingParamRow, RuleVersion, StaffRole } from '../types';
import { SourceBadge, useLoad } from '../ui';

export function MatchingParams({ role }: { role: StaffRole }) {
  const { data, setData, source } = useLoad<MatchingParamRow[]>(
    () => getWithFallback('/matching-parameters', role, () => mockParams.map((r) => ({ ...r }))),
    [role],
  );
  const [versions, setVersions] = useState<RuleVersion[]>(mockRuleVersions);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editable = role === 'OPERATOR' && !isReadOnly(role);

  if (!data) return <p className="loading">불러오는 중…</p>;

  function updateRow(id: string, patch: Partial<MatchingParamRow>) {
    setData((data ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  async function publish() {
    const next = `silson-v${versions.length + 1}`;
    await postWithFallback('/matching-parameters', role, { version: next, rows: data }, () => null);
    setVersions([
      {
        version: next,
        publishedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        author: '운영자(op-01)',
        note: '관리자 UI 수정 발행 — 손해사정사 검수 대기',
      },
      ...versions,
    ]);
    setDirty(false);
    setMessage(
      `새 룰 버전 ${next} 발행됨 — 기존 매칭 결과는 재계산하되 이전 버전 이력은 보존됩니다. 값 확정 전 손해사정사 검수가 필요합니다.`,
    );
  }

  return (
    <section>
      <header className="screen-head">
        <h2>매칭 파라미터 (세대별 공제)</h2>
        <SourceBadge source={source} />
      </header>

      <p className="notice">
        실손 1~4세대 공제 파라미터(docs/05 매칭 룰 v1). 표준약관 기반 근사치로 회사·상품·특약별
        편차가 있으며, <strong>값 확정 전 손해사정사 검수 필수</strong>. 판단이 갈리는 케이스는 금액
        미표기(UNDETERMINED · "전문가 검토 추천") 처리됩니다. 모든 매칭 결과에는 룰 버전이 기록됩니다.
      </p>

      {message && <p className="flash">{message}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>세대</th>
            <th>청구유형</th>
            <th>구분</th>
            <th>정액공제 (의원/병원/종합/상급)</th>
            <th>자기부담률</th>
            <th>한도</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>{r.generation}</td>
              <td>{r.claimType}</td>
              <td>{r.category}</td>
              <td>
                {editable ? (
                  <input
                    className="input-wide"
                    value={r.deductibleFixed}
                    onChange={(e) => updateRow(r.id, { deductibleFixed: e.target.value })}
                  />
                ) : (
                  r.deductibleFixed
                )}
              </td>
              <td>
                {editable ? (
                  <input
                    value={r.copayRate}
                    onChange={(e) => updateRow(r.id, { copayRate: e.target.value })}
                  />
                ) : (
                  r.copayRate
                )}
              </td>
              <td>
                {editable ? (
                  <input
                    value={r.limitAmount}
                    onChange={(e) => updateRow(r.id, { limitAmount: e.target.value })}
                  />
                ) : (
                  r.limitAmount
                )}
              </td>
              <td className="cell-note">{r.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <div className="toolbar">
          <button className="btn btn-primary" disabled={!dirty} onClick={publish}>
            저장 (새 룰 버전 발행)
          </button>
          {dirty && <span className="hint">저장되지 않은 변경이 있습니다.</span>}
        </div>
      )}

      <div className="versions">
        <h4>룰 버전 이력</h4>
        <ul>
          {versions.map((v) => (
            <li key={v.version}>
              <strong>{v.version}</strong> · {v.publishedAt} · {v.author} — {v.note}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
