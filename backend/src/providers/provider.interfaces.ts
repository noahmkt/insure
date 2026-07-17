import {
  ClaimType,
  ConfirmedBenefit,
  HospitalTier,
  SilsonGeneration,
} from '../domain/types';

/**
 * 데이터 연계 어댑터 계층 (사양서 §4, §7.2)
 * 스크래핑(CODEF/하이픈) → 건강정보고속도로/공식 제휴로 무중단 교체할 수 있도록
 * 소스 인터페이스와 구현을 분리한다. 서비스 계층은 이 인터페이스만 안다.
 *
 * [하드 룰 2] ci 는 호출 시 복호화되어 메모리에서만 사용한다. 어댑터가 주민번호를
 * 요구하는 경우 pass-through 파라미터로만 전달하며 로그·백업·APM 어디에도 남기지 않는다.
 */

export interface EasyAuthRequest {
  /** 간편인증 수단 (KAKAO/PASS/NAVER ...) */
  method: string;
}

export interface JobHandle {
  jobId: string;
  provider: string;
}

export type JobStatus = 'PENDING' | 'WAITING_AUTH' | 'FETCHING' | 'DONE' | 'FAILED';

export interface HealthStatus {
  healthy: boolean;
  detail?: string;
}

export interface MedicalRecordRaw {
  hospitalName: string;
  hospitalTier: HospitalTier;
  treatmentDate: string;
  claimType: ClaimType;
  copayCovered: number;
  copayUncovered: number;
  hasPrescription: boolean;
}

export interface ContractRaw {
  insurerCode: string;
  insurerName: string;
  productName: string;
  isSilson: boolean;
  /** 소스가 세대를 주지 않으면 가입일로 태깅한다 */
  silsonGeneration?: SilsonGeneration;
  subscribedOn?: string;
  coverageStart?: string;
  coverageEnd?: string;
  monthlyPremium?: number;
}

export type ConfirmedBenefitRaw = Omit<ConfirmedBenefit, 'id' | 'userId' | 'fetchedAt'>;

/** 진료내역 소스 (Phase1: CODEF 건보공단 → Phase3: 건강정보고속도로) */
export interface MedicalDataProvider {
  readonly sourceId: string;
  startFetch(ci: string, auth: EasyAuthRequest): Promise<JobHandle>;
  poll(job: JobHandle): Promise<JobStatus>;
  fetchMedicalRecords(job: JobHandle): Promise<MedicalRecordRaw[]>;
  healthCheck(): Promise<HealthStatus>;
}

/** 보험계약 소스 (Phase1: CODEF 내보험찾아줌 → Phase3: 보험사/실손24 공식 제휴) */
export interface InsuranceContractProvider {
  readonly sourceId: string;
  startFetch(ci: string, auth: EasyAuthRequest): Promise<JobHandle>;
  poll(job: JobHandle): Promise<JobStatus>;
  fetchInsuranceContracts(job: JobHandle): Promise<ContractRaw[]>;
  fetchConfirmedBenefits(job: JobHandle): Promise<ConfirmedBenefitRaw[]>;
  healthCheck(): Promise<HealthStatus>;
}
