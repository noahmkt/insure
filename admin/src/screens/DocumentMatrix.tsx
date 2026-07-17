import { useState } from 'react';
import { getWithFallback } from '../api';
import { mockMatrix } from '../mock';
import { isReadOnly } from '../rbac';
import type { MatrixRow, StaffRole } from '../types';
import { SourceBadge, useLoad } from '../ui';

const CLAIM_TYPES: MatrixRow['claimType'][] = ['통원', '입원', '약제'];

export function DocumentMatrix({ role }: { role: StaffRole }) {
  const { data, setData, source } = useLoad<MatrixRow[]>(
    () => getWithFallback('/document-matrix', role, () => mockMatrix.map((r) => ({ ...r }))),
    [role],
  );
  const [draft, setDraft] = useState<Omit<MatrixRow, 'id'>>({
    insurer: '',
    claimType: '통원',
    amountBand: '',
    requiredDocs: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  const editable = role === 'OPERATOR' && !isReadOnly(role);

  if (!data) return <p className="loading">불러오는 중…</p>;

  function updateRow(id: string, patch: Partial<MatrixRow>) {
    setData((data ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (!draft.insurer || !draft.amountBand || !draft.requiredDocs) {
      setMessage('보험사·금액구간·필요서류를 모두 입력하세요.');
      return;
    }
    const id = `m-${String(Date.now()).slice(-6)}`;
    setData([...(data ?? []), { id, ...draft }]);
    setDraft({ insurer: '', claimType: '통원', amountBand: '', requiredDocs: '' });
    setMessage(`행 추가됨 (${id}) — 저장 시 감사 로그에 변경 이력이 기록됩니다.`);
  }

  return (
    <section>
      <header className="screen-head">
        <h2>필요서류 매트릭스</h2>
        <SourceBadge source={source} />
      </header>

      <p className="notice">
        보험사 × 청구유형(통원/입원/약제) × 금액구간별 필요서류 정의. 고객 앱 간편청구 안내에
        사용됩니다. {editable ? '운영자 권한으로 편집 가능합니다.' : '현재 역할은 조회만 가능합니다.'}
      </p>

      {message && <p className="flash">{message}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>보험사</th>
            <th>청구유형</th>
            <th>금액구간</th>
            <th>필요서류</th>
            {editable && <th>삭제</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>{r.insurer}</td>
              <td>{r.claimType}</td>
              <td>{r.amountBand}</td>
              <td>
                {editable ? (
                  <input
                    className="input-wide"
                    value={r.requiredDocs}
                    onChange={(e) => updateRow(r.id, { requiredDocs: e.target.value })}
                  />
                ) : (
                  r.requiredDocs
                )}
              </td>
              {editable && (
                <td>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => setData((data ?? []).filter((x) => x.id !== r.id))}
                  >
                    삭제
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <div className="add-row">
          <h4>행 추가</h4>
          <div className="add-row-fields">
            <input
              placeholder="보험사"
              value={draft.insurer}
              onChange={(e) => setDraft({ ...draft, insurer: e.target.value })}
            />
            <select
              value={draft.claimType}
              onChange={(e) => setDraft({ ...draft, claimType: e.target.value as MatrixRow['claimType'] })}
            >
              {CLAIM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              placeholder="금액구간 (예: 10만원 이하)"
              value={draft.amountBand}
              onChange={(e) => setDraft({ ...draft, amountBand: e.target.value })}
            />
            <input
              className="input-wide"
              placeholder="필요서류 (쉼표 구분)"
              value={draft.requiredDocs}
              onChange={(e) => setDraft({ ...draft, requiredDocs: e.target.value })}
            />
            <button className="btn btn-primary" onClick={addRow}>
              추가
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
