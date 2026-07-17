import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { User } from '../domain/types';
import { StoreService } from '../store/store.service';

/**
 * 회원/인증 (사양서 §5 온보딩)
 * - 본인인증(PASS/카카오) 결과 토큰 → CI 수신 → 계정 생성. 주민번호 입력·저장 없음(하드 룰 2).
 * - 데모: verificationToken 을 CI 로 간주해 해시 저장. 운영: 인증사 서버 검증 후 CI 수신,
 *   CI 원문은 KMS 암호화(enc_ci), 조회 키는 SHA-256 해시(ci_hash).
 * - 액세스 토큰: 데모에서는 userId 를 Bearer 로 사용. 운영: JWT 발급.
 */
@Injectable()
export class UsersService {
  constructor(private readonly store: StoreService) {}

  verify(provider: 'PASS' | 'KAKAO', verificationToken: string): {
    accessToken: string;
    isNewUser: boolean;
  } {
    const ciHash = createHash('sha256').update(`${provider}:${verificationToken}`).digest('hex');
    let user = this.store.users.find((u) => u.ciHash === ciHash && u.status === 'ACTIVE');
    const isNewUser = !user;
    if (!user) {
      user = {
        id: this.store.newId(),
        ciHash,
        name: '데모사용자',
        phone: '010-0000-0000',
        status: 'ACTIVE',
        createdAt: new Date(),
      };
      this.store.users.push(user);
    }
    return { accessToken: user.id, isNewUser };
  }

  /** Bearer 토큰(데모: userId) → 사용자 확인 */
  requireUser(authorization?: string): User {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    const user = this.store.users.find((u) => u.id === token && u.status === 'ACTIVE');
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
    }
    return user;
  }

  /**
   * 회원 탈퇴 — 즉시 파기(진료내역·계약·청구·리드·PII 소거) + 법정 보존분 분리.
   * 동의 이력·감사 로그는 법정 보존 대상으로 유지된다.
   */
  withdraw(userId: string): { purged: true } {
    this.store.purgeAccount(userId);
    return { purged: true };
  }
}
