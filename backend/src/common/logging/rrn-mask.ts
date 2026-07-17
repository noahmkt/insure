/**
 * 하드 룰 2: 주민등록번호는 어떤 저장소·로그·백업·APM 트레이스에도 잔존해서는 안 된다.
 * 모든 로그 출력은 이 필터를 거친다. (정기 스캔 배치는 인프라 레벨에서 별도 수행)
 */

// 주민등록번호 패턴: 생년월일 6자리 + (-) + 성별/세기 1자리(1~8) + 6자리
const RRN_PATTERN = /\b\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[-\s]?[1-8]\d{6}\b/g;

export function maskRrn(text: string): string {
  return text.replace(RRN_PATTERN, (m) => {
    const digits = m.replace(/[-\s]/g, '');
    return `${digits.slice(0, 6)}-*******`;
  });
}

/** 객체/에러 등 임의 값을 로그로 내보내기 전 재귀 마스킹 */
export function maskRrnDeep(value: unknown): unknown {
  if (typeof value === 'string') return maskRrn(value);
  if (Array.isArray(value)) return value.map(maskRrnDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskRrnDeep(v);
    return out;
  }
  return value;
}
