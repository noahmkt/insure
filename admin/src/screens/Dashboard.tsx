import { getWithFallback } from '../api';
import { mockDashboard } from '../mock';
import type { DashboardMetrics, StaffRole } from '../types';
import { PredictedAmount, SourceBadge, pct, useLoad, won } from '../ui';

export function Dashboard({ role }: { role: StaffRole }) {
  const { data, source } = useLoad<DashboardMetrics>(
    () => getWithFallback('/dashboard', role, () => mockDashboard),
    [role],
  );

  if (!data) return <p className="loading">불러오는 중…</p>;

  return (
    <section>
      <header className="screen-head">
        <h2>대시보드</h2>
        <SourceBadge source={source} />
      </header>

      <div className="card-grid">
        <div className="card metric">
          <h3>신규 가입 (7일)</h3>
          <p className="metric-value">{new Intl.NumberFormat('ko-KR').format(data.newSignups7d)}명</p>
        </div>
        <div className="card metric">
          <h3>데이터 연동 성공률</h3>
          <p className="metric-value">{pct(data.linkSuccessRate)}</p>
        </div>
        <div className="card metric">
          <h3>발굴 건수 / 예상 금액</h3>
          <p className="metric-value">{new Intl.NumberFormat('ko-KR').format(data.discoveredCount)}건</p>
          <PredictedAmount amount={data.discoveredExpectedAmount} basis={data.discoveredBasis} />
        </div>
        <div className="card metric">
          <h3>숨은보험금 (확정액)</h3>
          <p className="metric-value">{won(data.hiddenBenefitConfirmedAmount)}</p>
          <p className="hint">
            보험사 조회 결과 <strong>확정</strong>된 금액 — 예측(예상) 금액과 별도 집계·별도 표기합니다.
          </p>
        </div>
        <div className="card metric">
          <h3>전문가 상담 신청</h3>
          <p className="metric-value">{new Intl.NumberFormat('ko-KR').format(data.consultationRequests)}건</p>
          <p className="hint">고객 신청 기반 — 상품 권유 아웃바운드 아님</p>
        </div>
        <div className="card metric">
          <h3>청구 전환율</h3>
          <p className="metric-value">{pct(data.claimConversionRate)}</p>
          <p className="hint">최종 청구 제출은 고객 본인이 직접 수행(대행 없음)</p>
        </div>
        <div className="card metric">
          <h3>예측 오차율</h3>
          <p className="metric-value">{pct(data.accuracyErrorRate)}</p>
          <p className="hint">예측 vs 실지급 오차 — 목표 ±20% 이내 (silson-v1)</p>
        </div>
      </div>
    </section>
  );
}
