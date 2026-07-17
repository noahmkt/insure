import type { StaffRole } from './types';
import { ROLE_STAFF_ID } from './rbac';

/**
 * 관리자 API 클라이언트 — 백엔드 /api/v1/admin/* 호출.
 * 실패(백엔드 미기동·미구현 엔드포인트·권한 오류) 시 목데이터 폴백(개발 편의).
 * 데모 RBAC: x-staff-id / x-staff-role 헤더 (운영 환경에서는 SSO + 서버측 RBAC 가드).
 */

const BASE = '/api/v1/admin';
const TIMEOUT_MS = 2500;

export type Source = 'server' | 'mock';

export interface ApiResult<T> {
  data: T;
  source: Source;
}

async function request<T>(path: string, role: StaffRole, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-staff-id': ROLE_STAFF_ID[role],
        'x-staff-role': role,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** GET — 실패 시 목데이터 폴백 */
export async function getWithFallback<T>(
  path: string,
  role: StaffRole,
  fallback: () => T,
): Promise<ApiResult<T>> {
  try {
    const data = await request<T>(path, role);
    return { data, source: 'server' };
  } catch {
    return { data: fallback(), source: 'mock' };
  }
}

/** POST — 실패 시 로컬(목) 처리 결과 반환 */
export async function postWithFallback<T>(
  path: string,
  role: StaffRole,
  body: unknown,
  fallback: () => T,
): Promise<ApiResult<T>> {
  try {
    const data = await request<T>(path, role, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data, source: 'server' };
  } catch {
    return { data: fallback(), source: 'mock' };
  }
}
