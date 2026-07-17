import { randomUUID } from 'crypto';
import {
  ConfirmedBenefitRaw,
  ContractRaw,
  EasyAuthRequest,
  HealthStatus,
  InsuranceContractProvider,
  JobHandle,
  JobStatus,
  MedicalDataProvider,
  MedicalRecordRaw,
} from './provider.interfaces';

/**
 * CODEF 어댑터의 목(mock) 구현 — Phase 0 PoC/데모용.
 * 실제 구현은 CODEF 간편인증 플로우(요청 → 사용자 앱 푸시 동의 → 콜백 → 수신)를
 * 비동기 잡으로 처리하며, 이 파일과 동일한 인터페이스만 교체 구현하면 된다.
 */
export class CodefMockProvider
  implements MedicalDataProvider, InsuranceContractProvider
{
  readonly sourceId = 'CODEF';
  private jobs = new Map<string, JobStatus>();

  async startFetch(_ci: string, _auth: EasyAuthRequest): Promise<JobHandle> {
    // _ci 는 메모리에서만 사용하고 어떤 로그에도 남기지 않는다 (하드 룰 2)
    const jobId = randomUUID();
    this.jobs.set(jobId, 'DONE'); // 데모: 즉시 완료. 실제: WAITING_AUTH → 콜백 → DONE
    return { jobId, provider: this.sourceId };
  }

  async poll(job: JobHandle): Promise<JobStatus> {
    return this.jobs.get(job.jobId) ?? 'FAILED';
  }

  async fetchMedicalRecords(_job: JobHandle): Promise<MedicalRecordRaw[]> {
    return [
      {
        hospitalName: '서울정형외과',
        hospitalTier: 'HOSPITAL',
        treatmentDate: '2025-11-02',
        claimType: 'OUTPATIENT',
        copayCovered: 48000,
        copayUncovered: 0,
        hasPrescription: true,
      },
      {
        hospitalName: '연세이비인후과의원',
        hospitalTier: 'CLINIC',
        treatmentDate: '2026-03-14',
        claimType: 'OUTPATIENT',
        copayCovered: 21000,
        copayUncovered: 35000,
        hasPrescription: true,
      },
      {
        hospitalName: '튼튼약국',
        hospitalTier: 'PHARMACY',
        treatmentDate: '2026-03-14',
        claimType: 'PHARMACY',
        copayCovered: 12400,
        copayUncovered: 0,
        hasPrescription: false,
      },
      {
        // 공제액 이하 소액 건 — NOT_CLAIMABLE 데모
        hospitalName: '연세이비인후과의원',
        hospitalTier: 'CLINIC',
        treatmentDate: '2026-05-02',
        claimType: 'OUTPATIENT',
        copayCovered: 8000,
        copayUncovered: 0,
        hasPrescription: false,
      },
    ];
  }

  async fetchInsuranceContracts(_job: JobHandle): Promise<ContractRaw[]> {
    return [
      {
        insurerCode: 'SAMSUNG_FIRE',
        insurerName: '삼성화재',
        productName: '실손의료비보장보험',
        isSilson: true,
        subscribedOn: '2019-05-20', // → 3세대로 자동 태깅
        coverageStart: '2019-05-20',
        coverageEnd: '2039-05-20',
        monthlyPremium: 32000,
      },
      {
        insurerCode: 'HANWHA_LIFE',
        insurerName: '한화생명',
        productName: '종신보험',
        isSilson: false,
        coverageStart: '2015-02-01',
        monthlyPremium: 150000,
      },
    ];
  }

  async fetchConfirmedBenefits(_job: JobHandle): Promise<ConfirmedBenefitRaw[]> {
    return [
      {
        benefitType: 'DORMANT',
        insurerName: '○○생명',
        amount: 120000,
        guideChannel: '내보험찾아줌(https://cont.insure.or.kr) 또는 해당 보험사 앱',
      },
    ];
  }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true };
  }
}
