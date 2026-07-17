import { Injectable } from '@nestjs/common';
import { InsuranceContract } from '../domain/types';
import { StoreService } from '../store/store.service';

@Injectable()
export class ContractsService {
  constructor(private readonly store: StoreService) {}

  list(userId: string): InsuranceContract[] {
    return this.store.contracts.filter((c) => c.userId === userId);
  }

  /** 실손 중복 가입 감지 → 내 보험 탭 경고 배너 (사양서 §5 탭2) */
  duplicateSilsonAlert(userId: string): { duplicated: boolean; contracts: InsuranceContract[] } {
    const silson = this.list(userId).filter((c) => c.contractType === 'SILSON');
    return { duplicated: silson.length >= 2, contracts: silson.length >= 2 ? silson : [] };
  }
}
