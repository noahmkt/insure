import {
  BenefitCategory,
  InsuranceContract,
  MatchingResult,
  MedicalRecord,
} from '../domain/types';
import { STATUTE_OF_LIMITATIONS_YEARS } from '../common/policy';
import { lookupParam, RULE_VERSION } from './silson-params';

/**
 * 담보 매칭 엔진 (사양서 §7.1)
 * 입력: 진료건 × 실손계약 → 출력: 청구 가능 여부 / 예상 환급액 / 산출 근거 문자열
 *
 * 원칙:
 * - 판단이 갈리는 케이스는 금액을 내지 않고 UNDETERMINED("전문가 검토 추천")로 라벨링.
 * - 금액이 존재하면 산출 근거(formula)가 반드시 함께 존재한다(DB CHECK와 동일 계약).
 * - 순수 함수 — 부수효과 없음. 파라미터는 외부화(silson-params, 운영 시 DB 테이블).
 */

export function statuteExpiryDate(treatmentDate: string): Date {
  const d = new Date(treatmentDate + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + STATUTE_OF_LIMITATIONS_YEARS);
  return d;
}

export function matchRecord(
  record: MedicalRecord,
  contract: InsuranceContract,
  today: Date = new Date(),
): MatchingResult {
  const base = {
    medicalRecordId: record.id,
    contractId: contract.id,
    ruleVersion: RULE_VERSION,
  };

  // 1. 실손 계약이 아니면 매칭 대상 아님
  if (contract.contractType !== 'SILSON') {
    return { ...base, verdict: 'NOT_CLAIMABLE', reason: 'not_silson_contract' };
  }

  // 2. 보장기간 밖
  const t = record.treatmentDate;
  if (
    (contract.coverageStart && t < contract.coverageStart) ||
    (contract.coverageEnd && t > contract.coverageEnd)
  ) {
    return { ...base, verdict: 'NOT_CLAIMABLE', reason: 'outside_coverage_period' };
  }

  // 3. 소멸시효(진료일 + 3년) 경과 — 만료일 당일까지는 청구 가능(날짜 단위 비교)
  const expiryIso = statuteExpiryDate(t).toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);
  if (todayIso > expiryIso) {
    return { ...base, verdict: 'NOT_CLAIMABLE', reason: 'statute_expired' };
  }

  // 4. 세대 미상 → 판단불가 (전문가 검토 추천)
  const gen = contract.silsonGeneration;
  if (!gen) {
    return { ...base, verdict: 'UNDETERMINED', reason: 'unknown_generation' };
  }

  // 5~6. 급여/비급여 각각 공제 계산
  const parts: { category: BenefitCategory; amount: number }[] = [
    { category: 'COVERED', amount: record.copayCovered },
    { category: 'UNCOVERED', amount: record.copayUncovered },
  ].filter((p) => p.amount > 0) as { category: BenefitCategory; amount: number }[];

  if (parts.length === 0) {
    return { ...base, verdict: 'NOT_CLAIMABLE', reason: 'no_copay' };
  }

  // 회당 한도 적용 단위: 1~3세대는 급여+비급여 통합 담보(단일 한도), 4세대는 담보 분리(파트별 한도)
  const sharedLimit = gen <= 3;

  let total = 0;
  let sharedLimitValue: number | undefined;
  const formulaParts: string[] = [];

  for (const part of parts) {
    const rule = lookupParam(gen, record.claimType, part.category);
    if (!rule) {
      // 파라미터 부재(예: 1세대 특수 케이스) → 금액을 내지 않는다
      return { ...base, verdict: 'UNDETERMINED', reason: 'missing_parameter' };
    }
    const fixed = rule.deductibleByTier[record.hospitalTier];
    if (fixed === undefined) {
      return { ...base, verdict: 'UNDETERMINED', reason: 'missing_tier_deductible' };
    }
    const proportional = Math.floor(part.amount * rule.coinsuranceRate);
    const deduction = Math.max(fixed, proportional);
    let refund = Math.max(0, part.amount - deduction);

    const catLabel = part.category === 'COVERED' ? '급여' : '비급여';
    let partFormula =
      `${gen}세대 ${claimTypeLabel(record.claimType)}(${catLabel}): ` +
      `${fmt(part.amount)} − max(${fmt(fixed)}, ${fmt(part.amount)}×${rule.coinsuranceRate * 100}%) = ${fmt(refund)}`;

    if (sharedLimit) {
      if (rule.perVisitLimit !== undefined) sharedLimitValue = rule.perVisitLimit;
    } else if (rule.perVisitLimit !== undefined && refund > rule.perVisitLimit) {
      // 4세대: 파트(담보)별 한도 — 한도 발동 시 수식에 한도 항 포함 (§7.3 산출 근거 정합)
      partFormula += ` → 회당 한도 min(${fmt(rule.perVisitLimit)}, ${fmt(refund)}) = ${fmt(rule.perVisitLimit)}`;
      refund = rule.perVisitLimit;
    }

    total += refund;
    formulaParts.push(partFormula);
  }

  let formula = formulaParts.join(' + ');
  if (sharedLimit && sharedLimitValue !== undefined && total > sharedLimitValue) {
    // 2·3세대: 합산액에 회당 한도 1회 적용
    formula += ` → 회당 한도 min(${fmt(sharedLimitValue)}, ${fmt(total)}) = ${fmt(sharedLimitValue)}`;
    total = sharedLimitValue;
  }

  if (total <= 0) {
    return { ...base, verdict: 'NOT_CLAIMABLE', reason: 'below_deductible' };
  }

  return {
    ...base,
    verdict: 'CLAIMABLE',
    estimatedAmount: total,
    formula: `${formula} [rule ${RULE_VERSION}]`,
  };
}

function claimTypeLabel(t: MedicalRecord['claimType']): string {
  return t === 'OUTPATIENT' ? '통원' : t === 'INPATIENT' ? '입원' : '약제';
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}
