import { useEffect, useState } from 'react';
import type { ApiResult, Source } from './api';

/** 공통 UI 조각 + 데이터 로딩 훅 */

export function useLoad<T>(loader: () => Promise<ApiResult<T>>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [source, setSource] = useState<Source | null>(null);

  useEffect(() => {
    let alive = true;
    loader().then((r) => {
      if (alive) {
        setData(r.data);
        setSource(r.source);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, source, setSource };
}

export function SourceBadge({ source }: { source: Source | null }) {
  if (!source) return <span className="badge badge-muted">불러오는 중…</span>;
  return source === 'server' ? (
    <span className="badge badge-server">서버 데이터</span>
  ) : (
    <span className="badge badge-mock">목데이터 폴백 (백엔드 미연결)</span>
  );
}

/** 민감정보(진료내역·서류) 화면 상단 고지 — 하드 룰 3 */
export function SensitiveNotice() {
  return (
    <div className="notice notice-sensitive" role="note">
      민감정보(진료내역) 화면입니다. <strong>모든 열람 기록이 감사 로그에 남습니다.</strong>{' '}
      상담 신청 고객 건 + 배정 담당자만 열람할 수 있으며, 목적 외 이용은 금지됩니다.
    </div>
  );
}

export function won(n: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(n)}원`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * 예측 금액 표기 규칙(하드 룰 7):
 * "예상" 접두 + 산출 근거 + 면책 문구. 확정액과 혼용 금지.
 */
export function PredictedAmount({ amount, basis }: { amount: number; basis: string }) {
  return (
    <div className="predicted">
      <div className="predicted-amount">
        <span className="prefix-estimate">예상</span> {won(amount)}
      </div>
      <details className="basis">
        <summary>산출 근거</summary>
        <p>{basis}</p>
      </details>
      <p className="disclaimer">실제 지급액은 보험사 심사에 따라 달라질 수 있습니다.</p>
    </div>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: string }) {
  return <span className={`chip chip-${tone}`}>{label}</span>;
}
