/**
 * 전 시스템 공통 정책 상수 — 사양서 §7.3 금액 표기 정책 / §3 하드 룰 7.
 * 이 파일의 상수를 우회한 예측액 노출은 금지된다.
 */

/** 하드 룰 7: 모든 예측 금액 노출 화면에 고정되는 면책 문구 */
export const ESTIMATE_DISCLAIMER =
  '실제 지급액은 보험사 심사에 따라 달라질 수 있습니다.';

/** 예측액 라벨은 항상 '예상' 접두를 갖는다 (물결 표기 금지) */
export const ESTIMATE_LABEL = '예상 환급액';

/** 확정액(숨은보험금) 라벨 — 예측액과 절대 혼용하지 않는다 */
export const CONFIRMED_LABEL = '확정 금액';

/** 실손 청구권 소멸시효: 진료일 + 3년 */
export const STATUTE_OF_LIMITATIONS_YEARS = 3;
