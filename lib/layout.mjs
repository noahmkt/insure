import { categories } from '../content/categories.mjs';
import { site, href, url } from '../site.config.mjs';
import { esc, metaTags, jsonLd } from './seo.mjs';
import { privacyModal } from './components.mjs';

/**
 * 공통 HTML 셸.
 * 모든 페이지가 동일한 메타 정책·헤더·푸터·동의 모달을 공유한다.
 */
export function layout({
  title,
  description,
  path,
  keywords = [],
  type = 'website',
  published,
  updated,
  schemas = [],
  breadcrumb = '',
  body,
  activeNav = '',
  section,
  tags = [],
  noindex = false,
}) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="${site.themeColor}">
    ${metaTags({ title, description, path, keywords, type, published, updated, section, tags, noindex })}

    <!-- 파비콘은 절대경로로 지정한다(네이버 검색결과 파비콘 노출 요건). rel 중복 금지. -->
    <link rel="shortcut icon" href="${url('/favicon.svg')}" type="image/svg+xml">
    <link rel="apple-touch-icon" href="${url('/img/og-default.png')}">
    <link rel="alternate" type="application/rss+xml" title="${esc(site.name)} 최신 글" href="${url('/rss.xml')}">
    <link rel="sitemap" type="application/xml" href="${url('/sitemap.xml')}">
    <link rel="stylesheet" href="${href('/css/style.css')}">

    ${schemas.map((s) => jsonLd(s)).join('\n    ')}
</head>
<body>
<a class="skip" href="#main">본문 바로가기</a>

<header class="header">
  <div class="inner">
    <a class="logo" href="${href('/')}">
      <span class="logo__mark" aria-hidden="true">비교</span>
      <span class="logo__text">${esc(site.name)}</span>
    </a>
    <nav class="nav" aria-label="보험 종류">
      <ul>
        ${categories
          .map(
            (c) =>
              `<li><a href="${href(`/${c.slug}/`)}"${activeNav === c.slug ? ' aria-current="page"' : ''}>${esc(c.name)}</a></li>`,
          )
          .join('\n        ')}
        <li><a href="${href('/blog/')}"${activeNav === 'blog' ? ' aria-current="page"' : ''}>보험 가이드</a></li>
        <li><a href="${href('/glossary/')}"${activeNav === 'glossary' ? ' aria-current="page"' : ''}>용어 사전</a></li>
      </ul>
    </nav>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="메뉴 열기">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

${breadcrumb}

<main class="main" id="main">
${body}
</main>

<footer class="footer">
  <div class="inner">
    <ul class="footer__notice">
      <li class="footer__strong">필수 안내사항</li>
      <li>※ 본 사이트는 보험 상품 비교·설계 상담을 안내하는 보험대리점 광고 페이지입니다.</li>
      <li>※ 본 광고는 광고심의기준을 준수하였으며 유효기간은 심의일로부터 1년입니다.
          (준법심의필 ${esc(site.business.adReviewNo)}, 유효기간 ${esc(site.business.adReviewPeriod)})</li>
      <li>※ 해당 모집종사자는 다수의 보험회사와 계약 체결 및 대리·중개하는 보험설계사(보험대리점)입니다.</li>
      <li class="footer__warn">※ 기존 보험계약을 해지하고 새로운 보험계약을 체결하는 과정에서</li>
      <li class="footer__warn">&nbsp;&nbsp;1) 질병 이력, 연령 증가 등으로 가입이 거절되거나 보험료가 인상될 수 있으며,</li>
      <li class="footer__warn">&nbsp;&nbsp;2) 가입 상품에 따라 새로운 면책기간 적용 및 보장 제한 등 불이익이 발생할 수 있습니다.</li>
      <li>※ 보험료 및 보장 내용은 나이·성별·가입 조건·보험사에 따라 달라지며, 실제 가입 조건은 청약 시 확정됩니다.</li>
    </ul>
    <p class="footer__biz">
      ${esc(site.name)} | ${esc(site.business.companyName)} ${esc(site.business.agencyName)} |
      대리점등록번호 ${esc(site.business.agencyRegNo)} | 사업자등록번호 ${esc(site.business.bizRegNo)} |
      대표 ${esc(site.business.ceo)} | 개인정보관리책임자 ${esc(site.business.privacyOfficer)} |
      대표번호 ${esc(site.business.tel)} | 상담시간 ${esc(site.business.consultHours)}
    </p>
    <p class="footer__copy">© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</p>
  </div>
</footer>

${privacyModal()}

<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>

<script>
window.SITE_CONFIG = ${JSON.stringify({
    leadEndpoint: site.lead.endpoint,
    leadMethod: site.lead.method,
  })};
</script>
<script src="${href('/js/site.js')}" defer></script>
</body>
</html>
`;
}

/** 빵부스러기 UI (스키마와 짝을 이룸) */
export function breadcrumbNav(items) {
  return `
<nav class="breadcrumb" aria-label="현재 위치">
  <div class="inner">
    <ol>
      ${items
        .map((it, i) =>
          i === items.length - 1
            ? `<li><span aria-current="page">${esc(it.name)}</span></li>`
            : `<li><a href="${href(it.path)}">${esc(it.name)}</a></li>`,
        )
        .join('\n      ')}
    </ol>
  </div>
</nav>`;
}
