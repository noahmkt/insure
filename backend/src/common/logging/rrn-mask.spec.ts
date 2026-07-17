import { maskRrn, maskRrnDeep } from './rrn-mask';

describe('주민등록번호 로그 마스킹 (하드 룰 2)', () => {
  it('하이픈 형식 주민번호를 마스킹한다', () => {
    expect(maskRrn('조회 요청: 900101-1234567 완료')).toBe(
      '조회 요청: 900101-******* 완료',
    );
  });

  it('하이픈 없는 13자리도 마스킹한다', () => {
    expect(maskRrn('9001011234567')).toBe('900101-*******');
  });

  it('주민번호가 아닌 숫자열은 건드리지 않는다', () => {
    expect(maskRrn('금액 1234567890123원')).toBe('금액 1234567890123원');
    expect(maskRrn('전화 010-1234-5678')).toBe('전화 010-1234-5678');
  });

  it('중첩 객체 내부 문자열도 마스킹한다', () => {
    const masked = maskRrnDeep({
      user: { memo: 'rrn=850505-2345678' },
      list: ['920202-1111111'],
    }) as any;
    expect(masked.user.memo).toBe('rrn=850505-*******');
    expect(masked.list[0]).toBe('920202-*******');
  });
});
