/**
 * 사이트 전역 설정.
 *
 * ⚠️ 배포 전 반드시 교체해야 하는 값에는 TODO 표시가 있습니다.
 *    특히 사업자/대리점 정보와 광고심의 번호는 **실제 본인 법인의 값**을 넣어야 합니다.
 *    타사 번호를 그대로 사용하는 것은 명의 도용이며 보험업법 위반입니다.
 */

export const site = {
  // ── 기본 정보 ─────────────────────────────────────────────
  name: '보험비교플러스',
  // GitHub Pages 프로젝트 페이지 기준. 커스텀 도메인 연결 시 도메인으로 교체.
  origin: 'https://noahmkt.github.io',
  basePath: '/insure', // 도메인 루트에 배포하면 '' 로 변경
  locale: 'ko_KR',
  themeColor: '#1B64DA',

  // ── 검색엔진 소유확인 (TODO: 본인 값으로 교체) ─────────────
  verification: {
    naver: '', // 네이버 서치어드바이저 → 사이트 소유확인 메타태그 값
    google: '', // Google Search Console 메타태그 값
    bing: '',
  },

  // ── 상담 신청(리드) 전송 설정 ──────────────────────────────
  lead: {
    // TODO: 실제 리드 수집 엔드포인트로 교체 (예: 자체 API, Google Apps Script, Formspree 등)
    // 비워두면 폼은 전송 대신 안내 모달만 표시합니다(데모 안전 모드).
    endpoint: '',
    method: 'POST',
  },

  // ── 사업자 정보 (TODO: 전부 본인 법인 실제 값으로 교체) ────
  business: {
    companyName: '(주)〇〇〇금융서비스',
    agencyName: '보험비교플러스',
    agencyRegNo: '0000000000', // 보험대리점 등록번호
    bizRegNo: '000-00-00000', // 사업자등록번호
    ceo: '〇〇〇',
    privacyOfficer: '〇〇〇',
    tel: '000-0000-0000',
    consultHours: '평일 09:00 ~ 18:00',
    // 광고 심의 정보 — 실제 심의를 받은 뒤 번호와 유효기간을 기재하세요.
    adReviewNo: '제00-00-000호',
    adReviewPeriod: '0000년00월00일 ~ 0000년00월00일',
  },
};

/** 절대 URL 생성 */
export function url(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${site.origin}${site.basePath}${p === '/' ? '/' : p}`;
}

/** 사이트 내부 경로(HTML href용) */
export function href(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${site.basePath}${p}`;
}
