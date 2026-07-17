import { useState } from 'react';
import { getWithFallback, postWithFallback } from '../api';
import { mockDocuments } from '../mock';
import { isReadOnly } from '../rbac';
import type { ReviewDocument, ReviewStatus, StaffRole } from '../types';
import { SensitiveNotice, SourceBadge, StatusChip, useLoad } from '../ui';

const STATUS_LABEL: Record<ReviewStatus, { label: string; tone: string }> = {
  PENDING: { label: '검수 대기', tone: 'blue' },
  FIX_REQUESTED: { label: '보완 요청됨', tone: 'amber' },
  REVIEWED: { label: '검토 완료', tone: 'green' },
};

export function DocumentReview({ role }: { role: StaffRole }) {
  const { data, setData, source } = useLoad<ReviewDocument[]>(
    () => getWithFallback('/claims/documents/review-queue', role, () => mockDocuments.map((d) => ({ ...d, checklist: d.checklist.map((i) => ({ ...i })) }))),
    [role],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const readOnly = isReadOnly(role);
  const canFixRequest = !readOnly && (role === 'CONSULTANT' || role === 'ADJUSTER');
  const canToggleFlag = !readOnly && role === 'ADJUSTER';

  if (!data) return <p className="loading">불러오는 중…</p>;

  const selected = data.find((d) => d.id === selectedId) ?? null;

  function update(docId: string, patch: Partial<ReviewDocument>) {
    setData((data ?? []).map((d) => (d.id === docId ? { ...d, ...patch } : d)));
  }

  async function requestFix(doc: ReviewDocument) {
    const result = await postWithFallback(
      `/claims/${doc.claimId}/fix-request`,
      role,
      { docId: doc.id, reason: '판독 불가/기재 누락 항목 보완 필요' },
      () => null,
    );
    update(doc.id, { status: 'FIX_REQUESTED' });
    setMessage(
      `${doc.id} 보완 요청 — 고객 앱으로 푸시가 발송됩니다.` +
        (result.source === 'mock' ? ' (목데이터 처리)' : ''),
    );
  }

  function toggleChecklist(doc: ReviewDocument, idx: number) {
    if (readOnly) return;
    update(doc.id, {
      checklist: doc.checklist.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item)),
    });
  }

  return (
    <section>
      <header className="screen-head">
        <h2>서류 검토</h2>
        <SourceBadge source={source} />
      </header>

      <SensitiveNotice />

      <table className="table">
        <thead>
          <tr>
            <th>서류</th>
            <th>청구건</th>
            <th>고객</th>
            <th>종류</th>
            <th>업로드</th>
            <th>상태</th>
            <th>손해사정사 플래그</th>
            <th>열람</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id} className={d.id === selectedId ? 'row-selected' : ''}>
              <td>{d.id}</td>
              <td>{d.claimId}</td>
              <td>{d.customerMasked}</td>
              <td>{d.docType}</td>
              <td>{d.uploadedAt}</td>
              <td>
                <StatusChip label={STATUS_LABEL[d.status].label} tone={STATUS_LABEL[d.status].tone} />
              </td>
              <td>
                {d.adjusterFlag ? (
                  <span className="chip chip-red">손해사정사 검토 필요</span>
                ) : (
                  <span className="chip chip-muted">—</span>
                )}
              </td>
              <td>
                <button className="btn btn-small" onClick={() => setSelectedId(d.id)}>
                  뷰어 열기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {message && <p className="flash">{message}</p>}

      {selected && (
        <div className="viewer-panel">
          <header className="viewer-head">
            <h3>
              {selected.docType} — {selected.customerMasked} ({selected.claimId})
            </h3>
            <span className="chip chip-purple">뷰어 전용 · 다운로드 제공 안 함</span>
          </header>

          <div className="viewer-body" aria-label="문서 미리보기(뷰어 전용)">
            <p className="viewer-placeholder">문서 미리보기 (뷰어 전용 렌더링)</p>
            <p className="viewer-watermark">
              열람자 기록됨 · 다운로드/복사 불가 · 목적 외 이용 금지
            </p>
          </div>

          <div className="checklist">
            <h4>검수 체크리스트</h4>
            <ul>
              {selected.checklist.map((item, idx) => (
                <li key={item.label}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={readOnly}
                      onChange={() => toggleChecklist(selected, idx)}
                    />{' '}
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="viewer-actions">
            {canFixRequest && selected.status !== 'REVIEWED' && (
              <>
                <button className="btn btn-warn" onClick={() => requestFix(selected)}>
                  보완 요청 (고객 앱 푸시)
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!selected.checklist.every((i) => i.checked)}
                  title={
                    selected.checklist.every((i) => i.checked)
                      ? undefined
                      : '체크리스트를 모두 확인해야 검토 완료할 수 있습니다'
                  }
                  onClick={() => {
                    update(selected.id, { status: 'REVIEWED' });
                    setMessage(`${selected.id} 검토 완료로 표시했습니다.`);
                  }}
                >
                  검토 완료
                </button>
              </>
            )}
            {canToggleFlag && (
              <button
                className="btn"
                onClick={() => update(selected.id, { adjusterFlag: !selected.adjusterFlag })}
              >
                {selected.adjusterFlag ? '손해사정사 플래그 해제' : '손해사정사 검토 필요 플래그'}
              </button>
            )}
          </div>

          <p className="hint">
            검토 완료는 내부 검수 상태입니다. <strong>보험사 청구의 최종 제출은 고객 본인이 앱에서
            직접 진행</strong>하며, 관리자에게 제출 실행 기능은 제공되지 않습니다.
          </p>
        </div>
      )}
    </section>
  );
}
