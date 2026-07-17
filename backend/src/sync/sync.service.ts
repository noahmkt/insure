import { Injectable } from '@nestjs/common';
import { ConsentsService } from '../consents/consents.service';
import { CodefMockProvider } from '../providers/codef.mock.provider';
import { StoreService } from '../store/store.service';
import { tagGeneration } from '../contracts/generation';

/**
 * 데이터 연동 잡 (사양서 §7.2)
 * 실제 구현은 비동기 잡 + 간편인증 콜백/폴링. 데모에서는 목 어댑터가 즉시 완료된다.
 * 캐싱 정책(진료내역 주 1회 / 계약 월 1회)은 fetchedAt 기준으로 판단한다.
 */
@Injectable()
export class SyncService {
  private readonly provider = new CodefMockProvider();

  constructor(
    private readonly store: StoreService,
    private readonly consents: ConsentsService,
  ) {}

  /** 내보험찾아줌: 보험계약 + 숨은보험금(확정액) */
  async syncContracts(userId: string): Promise<{ contracts: number; confirmedBenefits: number }> {
    const job = await this.provider.startFetch(this.ciFor(userId), { method: 'KAKAO' });

    const rawContracts = await this.provider.fetchInsuranceContracts(job);
    this.store.contracts = this.store.contracts.filter((c) => c.userId !== userId);
    for (const raw of rawContracts) {
      this.store.contracts.push({
        id: this.store.newId(),
        userId,
        insurerCode: raw.insurerCode,
        insurerName: raw.insurerName,
        productName: raw.productName,
        contractType: raw.isSilson ? 'SILSON' : 'OTHER',
        silsonGeneration: raw.isSilson
          ? raw.silsonGeneration ?? tagGeneration(raw.subscribedOn)
          : undefined,
        coverageStart: raw.coverageStart,
        coverageEnd: raw.coverageEnd,
        monthlyPremium: raw.monthlyPremium,
        fetchedAt: new Date(),
      });
    }

    const rawBenefits = await this.provider.fetchConfirmedBenefits(job);
    this.store.confirmedBenefits = this.store.confirmedBenefits.filter(
      (b) => b.userId !== userId,
    );
    for (const raw of rawBenefits) {
      this.store.confirmedBenefits.push({
        id: this.store.newId(),
        userId,
        fetchedAt: new Date(),
        ...raw,
      });
    }

    return { contracts: rawContracts.length, confirmedBenefits: rawBenefits.length };
  }

  /** 건보공단 진료내역 — 민감정보이므로 ② 동의 게이트 통과 필수 (하드 룰 3) */
  async syncMedical(userId: string): Promise<{ records: number }> {
    this.consents.assertSensitiveConsent(userId);

    const job = await this.provider.startFetch(this.ciFor(userId), { method: 'KAKAO' });
    const raws = await this.provider.fetchMedicalRecords(job);

    this.store.medicalRecords = this.store.medicalRecords.filter(
      (r) => r.userId !== userId,
    );
    for (const raw of raws) {
      const hospital = this.store.hospitals.find((h) => h.name === raw.hospitalName);
      this.store.medicalRecords.push({
        id: this.store.newId(),
        userId,
        hospitalId: hospital?.id,
        hospitalName: raw.hospitalName,
        hospitalTier: raw.hospitalTier,
        treatmentDate: raw.treatmentDate,
        claimType: raw.claimType,
        copayCovered: raw.copayCovered,
        copayUncovered: raw.copayUncovered,
        hasPrescription: raw.hasPrescription,
        source: this.provider.sourceId,
        fetchedAt: new Date(),
      });
    }
    return { records: raws.length };
  }

  /**
   * 어댑터에 넘길 CI. 운영: enc_ci 를 KMS 로 복호화해 메모리에서만 사용 후 폐기.
   * 주민번호가 필요한 소스라도 pass-through 로만 전달하며 저장·로깅하지 않는다(하드 룰 2).
   */
  private ciFor(userId: string): string {
    const user = this.store.users.find((u) => u.id === userId);
    return user ? `ci:${user.ciHash}` : '';
  }
}
