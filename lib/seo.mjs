import { site, url } from '../site.config.mjs';

/** HTML 이스케이프 — 메타태그 속성에 들어가는 모든 값에 적용 */
export function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON-LD 본문의 태그 제거(구조화 데이터에는 마크업이 들어가면 안 됨) */
export function plain(s = '') {
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 헤딩 앵커 id 생성.
 * 한글을 그대로 살린 슬러그 + 문서 내 순번으로 중복 충돌을 피한다.
 * 앵커가 의미를 가지면 답변 엔진이 특정 구간을 직접 인용·링크하기 쉬워진다.
 */
export function headingId(text, index) {
  const slug = plain(text)
    .toLowerCase()
    .replace(/[^\p{Script=Hangul}\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug ? `${slug}-${index}` : `${index}`;
}

/**
 * <head> 메타태그 일괄 생성.
 * SEO(검색), SNS 공유(OG/Twitter), 그리고 검색엔진 소유확인까지 한 곳에서 관리한다.
 */
export function metaTags({
  title,
  description,
  path,
  keywords = [],
  image,
  published,
  updated,
  type = 'website',
  section,
  tags: articleTags = [],
}) {
  const canonical = url(path);
  const img = image || url('/img/og-default.png');
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : '',
    `<link rel="canonical" href="${canonical}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    // 네이버는 별도 로봇 규칙을 두지 않지만, 수집 허용을 명시적으로 남겨 둔다.
    `<meta name="NaverBot" content="All">`,
    `<meta name="Yeti" content="All">`,
    `<meta name="language" content="ko">`,
    `<meta name="author" content="${esc(site.name)}">`,
    `<meta name="publisher" content="${esc(site.business.companyName)}">`,
    `<meta name="HandheldFriendly" content="true">`,
    `<meta name="referrer" content="no-referrer-when-downgrade">`,

    // Open Graph — 카카오톡·페이스북·네이버 공유 카드
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:locale" content="${site.locale}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    published ? `<meta property="article:published_time" content="${published}">` : '',
    updated ? `<meta property="article:modified_time" content="${updated}">` : '',
    type === 'article' ? `<meta property="article:author" content="${esc(site.name)}">` : '',
    section ? `<meta property="article:section" content="${esc(section)}">` : '',
    ...articleTags.map((t) => `<meta property="article:tag" content="${esc(t)}">`),

    // Twitter
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${img}">`,

    // 검색엔진 소유확인
    site.verification.naver
      ? `<meta name="naver-site-verification" content="${esc(site.verification.naver)}">`
      : '<!-- TODO: 네이버 서치어드바이저 소유확인 메타태그 -->',
    site.verification.google
      ? `<meta name="google-site-verification" content="${esc(site.verification.google)}">`
      : '<!-- TODO: Google Search Console 소유확인 메타태그 -->',
    site.verification.bing
      ? `<meta name="msvalidate.01" content="${esc(site.verification.bing)}">`
      : '',
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** JSON-LD 스크립트 태그로 감싸기 */
export function jsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

/** 조직 정보 — 사이트 신뢰도(E-E-A-T)와 지식 그래프 연결의 기준점 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'InsuranceAgency'],
    '@id': `${url('/')}#organization`,
    name: site.name,
    legalName: site.business.companyName,
    url: url('/'),
    logo: url('/img/logo.png'),
    telephone: site.business.tel,
    areaServed: { '@type': 'Country', name: '대한민국' },
    address: { '@type': 'PostalAddress', addressCountry: 'KR' },
    knowsLanguage: 'ko',
  };
}

/** 사이트 검색 액션 — 검색결과의 사이트링크 검색창 후보 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url('/')}#website`,
    name: site.name,
    url: url('/'),
    inLanguage: 'ko-KR',
    publisher: { '@id': `${url('/')}#organization` },
  };
}

/** 빵부스러기 — 검색결과 경로 표시 + 사이트 구조 전달 */
export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: url(it.path),
    })),
  };
}

/**
 * 글 스키마.
 * speakable 로 '한 줄 답변'을 지정해 음성/답변 엔진이 인용할 구간을 명시한다(AEO).
 */
export function articleSchema(a) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url(`/blog/${a.slug}/`)}#article`,
    headline: plain(a.h1).slice(0, 110),
    description: plain(a.description),
    inLanguage: 'ko-KR',
    datePublished: a.published,
    dateModified: a.updated,
    author: { '@type': 'Organization', name: site.name, url: url('/') },
    publisher: { '@id': `${url('/')}#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url(`/blog/${a.slug}/`) },
    articleSection: a.keyword,
    keywords: (a.keywords || [a.keyword]).join(', '),
    wordCount: countWords(a),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.answer-box__text', 'h1'],
    },
  };
}

/** FAQ 스키마 — 답변 엔진이 가장 직접적으로 인용하는 형식(AEO 핵심) */
export function faqSchema(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: plain(f.q),
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
    })),
  };
}

/** 상담 서비스 스키마 — 무엇을 제공하는 페이지인지 기계가 이해하게 한다 */
export function serviceSchema(category) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: `${category.name} 비교 상담`,
    provider: { '@id': `${url('/')}#organization` },
    areaServed: { '@type': 'Country', name: '대한민국' },
    description: plain(category.summary),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      description: '보험료 비교 및 맞춤 설계 상담은 무료입니다.',
    },
  };
}

/**
 * 용어 사전 스키마.
 * 보험 용어를 DefinedTermSet 아래 DefinedTerm 노드로 묶어 엔티티 관계를 명시한다.
 * "○○이란?" 형태의 질의에 대해 답변 엔진이 정의를 직접 집어가도록 하는 구조(AEO/GEO).
 */
export function definedTermSchema(term) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url(`/glossary/#${term.slug}`)}`,
    name: term.term,
    description: plain(term.definition),
    url: url(`/glossary/#${term.slug}`),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': `${url('/glossary/')}#set`,
      name: '보험 용어 사전',
      url: url('/glossary/'),
    },
  };
}

export function definedTermSetSchema(terms) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${url('/glossary/')}#set`,
    name: '보험 용어 사전',
    url: url('/glossary/'),
    inLanguage: 'ko-KR',
    publisher: { '@id': `${url('/')}#organization` },
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': url(`/glossary/#${t.slug}`),
      name: t.term,
      description: plain(t.definition),
    })),
  };
}

/** 절차형 콘텐츠 스키마 — "~하는 방법" 질의 대응 */
export function howToSchema({ name, description, steps }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: plain(name),
    description: plain(description),
    inLanguage: 'ko-KR',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: plain(s.name),
      text: plain(s.text),
    })),
  };
}

function countWords(a) {
  const text = [
    a.description,
    a.answer,
    ...(a.sections || []).flatMap((s) => [s.lead, ...(s.body || []), ...(s.list || [])]),
    ...(a.faq || []).flatMap((f) => [f.q, f.a]),
  ]
    .filter(Boolean)
    .join(' ');
  return plain(text).length;
}
