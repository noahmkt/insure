import { BenefitCategory, ClaimType, HospitalTier, SilsonGeneration } from '../domain/types';

/**
 * 실손 1~4세대 공제 파라미터 v1 (docs/05-matching-rules-v1.md)
 * — 표준약관 기반 근사치. 운영 시 core.matching_parameters 테이블로 외부화되어
 *   관리자 UI에서 수정하며, 여기의 값은 시드/폴백 기본값이다.
 * — 값 확정 전 손해사정사 검수 필수. 불확실 케이스는 엔진이 UNDETERMINED로 처리.
 */

export const RULE_VERSION = 'silson-v1';

export interface DeductibleRule {
  /** 정액 공제(요양기관 종별) */
  deductibleByTier: Partial<Record<HospitalTier, number>>;
  /** 자기부담률 (0.1 = 10%) */
  coinsuranceRate: number;
  /** 회당 보장 한도(통원·약제). 입원은 연간 한도로 별도 관리 */
  perVisitLimit?: number;
}

type ParamKey = `${SilsonGeneration}:${ClaimType}:${BenefitCategory}`;

const ALL_TIERS = (amount: number): Partial<Record<HospitalTier, number>> => ({
  CLINIC: amount,
  HOSPITAL: amount,
  GENERAL: amount,
  TERTIARY: amount,
  PHARMACY: amount,
});

export const SILSON_PARAMS: Record<ParamKey, DeductibleRule | undefined> = {
  // ── 1세대 (구실손, ~2009.09): 회사별 편차 큼 — 담보 데이터 없으면 엔진이 UNDETERMINED
  '1:OUTPATIENT:COVERED': { deductibleByTier: ALL_TIERS(5000), coinsuranceRate: 0, perVisitLimit: 100000 },
  '1:OUTPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(5000), coinsuranceRate: 0, perVisitLimit: 100000 },
  '1:INPATIENT:COVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0 },
  '1:INPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0 },
  '1:PHARMACY:COVERED': undefined, // 상품별 상이 → UNDETERMINED
  '1:PHARMACY:UNCOVERED': undefined,

  // ── 2세대 (표준화, 2009.10~2017.03)
  '2:OUTPATIENT:COVERED': {
    deductibleByTier: { CLINIC: 10000, HOSPITAL: 15000, GENERAL: 15000, TERTIARY: 20000 },
    coinsuranceRate: 0,
    perVisitLimit: 250000,
  },
  '2:OUTPATIENT:UNCOVERED': {
    deductibleByTier: { CLINIC: 10000, HOSPITAL: 15000, GENERAL: 15000, TERTIARY: 20000 },
    coinsuranceRate: 0,
    perVisitLimit: 250000,
  },
  '2:INPATIENT:COVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.1 },
  '2:INPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.1 },
  '2:PHARMACY:COVERED': { deductibleByTier: ALL_TIERS(8000), coinsuranceRate: 0, perVisitLimit: 250000 },
  '2:PHARMACY:UNCOVERED': { deductibleByTier: ALL_TIERS(8000), coinsuranceRate: 0, perVisitLimit: 250000 },

  // ── 3세대 (신실손, 2017.04~2021.06) 기본형
  '3:OUTPATIENT:COVERED': {
    deductibleByTier: { CLINIC: 10000, HOSPITAL: 15000, GENERAL: 15000, TERTIARY: 20000 },
    coinsuranceRate: 0.1,
    perVisitLimit: 250000,
  },
  '3:OUTPATIENT:UNCOVERED': {
    deductibleByTier: { CLINIC: 10000, HOSPITAL: 15000, GENERAL: 15000, TERTIARY: 20000 },
    coinsuranceRate: 0.2,
    perVisitLimit: 250000,
  },
  '3:INPATIENT:COVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.1 },
  '3:INPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.2 },
  '3:PHARMACY:COVERED': { deductibleByTier: ALL_TIERS(8000), coinsuranceRate: 0.1, perVisitLimit: 250000 },
  '3:PHARMACY:UNCOVERED': { deductibleByTier: ALL_TIERS(8000), coinsuranceRate: 0.2, perVisitLimit: 250000 },

  // ── 4세대 (2021.07~)
  '4:OUTPATIENT:COVERED': {
    deductibleByTier: { CLINIC: 10000, HOSPITAL: 10000, GENERAL: 20000, TERTIARY: 20000 },
    coinsuranceRate: 0.2,
    perVisitLimit: 200000,
  },
  '4:OUTPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(30000), coinsuranceRate: 0.3, perVisitLimit: 200000 },
  '4:INPATIENT:COVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.2 },
  '4:INPATIENT:UNCOVERED': { deductibleByTier: ALL_TIERS(0), coinsuranceRate: 0.3 },
  '4:PHARMACY:COVERED': { deductibleByTier: ALL_TIERS(8000), coinsuranceRate: 0.2, perVisitLimit: 200000 },
  '4:PHARMACY:UNCOVERED': { deductibleByTier: ALL_TIERS(30000), coinsuranceRate: 0.3, perVisitLimit: 200000 },
};

export function lookupParam(
  generation: SilsonGeneration,
  claimType: ClaimType,
  category: BenefitCategory,
): DeductibleRule | undefined {
  return SILSON_PARAMS[`${generation}:${claimType}:${category}`];
}
