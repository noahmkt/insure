import { href } from '../../site.config.mjs';
import { layout, breadcrumbNav } from '../layout.mjs';
import { leadForm, articleCards } from '../components.mjs';
import {
  esc,
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
  serviceSchema,
  websiteSchema,
} from '../seo.mjs';

/** 카테고리 랜딩 — 해당 보험 종류의 허브 페이지(내부링크 집결지) */
export function categoryPage(cat, articles) {
  const crumbs = [
    { name: '홈', path: '/' },
    { name: cat.name, path: `/${cat.slug}/` },
  ];
  const related = articles.filter((a) => a.category === cat.slug);

  const faq = [
    {
      q: `${cat.name} 상담은 무료인가요?`,
      a: '네, 보험료 비교와 맞춤 설계 상담은 무료입니다. 상담 후 가입 여부는 고객님이 직접 결정하시면 됩니다.',
    },
    {
      q: `${cat.name} 보험료는 어떻게 정해지나요?`,
      a: '나이, 성별, 가입 담보와 한도, 건강 상태, 납입·보장 기간에 따라 산출됩니다. 같은 상품이라도 조건이 다르면 보험료가 달라지므로 본인 조건으로 확인하는 것이 정확합니다.',
    },
    {
      q: `이미 ${cat.name}에 가입되어 있어도 상담받을 수 있나요?`,
      a: '가능합니다. 기존 증권의 보장 범위와 중복 여부를 점검해 드립니다. 다만 기존 계약을 해지하고 새로 가입할 경우 연령 증가나 질병 이력으로 불이익이 생길 수 있어 신중한 검토가 필요합니다.',
    },
  ];

  const body = `
<section class="cat-hero">
  <div class="inner cat-hero__inner">
    <div class="cat-hero__copy">
      <p class="cat-hero__eyebrow"><span aria-hidden="true">${cat.icon}</span> ${esc(cat.fullName)}</p>
      <h1>${esc(cat.name)} 비교, 무엇을 먼저 봐야 할까요?</h1>
      <p class="cat-hero__lead">${esc(cat.summary)}</p>
      <p class="cat-hero__tag">${esc(cat.tagline)}</p>
    </div>
    <div class="cat-hero__form">
      ${leadForm({ variant: 'hero', category: cat.slug, id: `lead-${cat.slug}` })}
    </div>
  </div>
</section>

<section class="section">
  <div class="inner">
    <h2 class="section__title">${esc(cat.name)} 가입 전 확인할 것</h2>
    <ul class="check-list">
      <li><strong>보장 범위</strong> — 어떤 상황에서 얼마를 받는지, 지급 조건이 무엇인지 확인합니다.</li>
      <li><strong>면책·감액 기간</strong> — 가입 직후 보장되지 않거나 절반만 지급되는 기간이 있는지 확인합니다.</li>
      <li><strong>갱신형·비갱신형</strong> — 갱신형은 초기 보험료가 낮지만 갱신 시 오를 수 있습니다.</li>
      <li><strong>중복 가입 여부</strong> — 이미 같은 보장을 가진 증권이 있는지 먼저 점검합니다.</li>
      <li><strong>고지의무</strong> — 병력·복용 약을 사실대로 알리지 않으면 보험금 지급이 거절될 수 있습니다.</li>
    </ul>
  </div>
</section>

${
  related.length
    ? `<section class="section">
  <div class="inner">
    <h2 class="section__title">${esc(cat.name)} 관련 가이드</h2>
    ${articleCards(related)}
  </div>
</section>`
    : ''
}

<section class="section section--faq">
  <div class="inner">
    <h2 class="section__title">자주 묻는 질문</h2>
    ${faq
      .map(
        (f) => `<details class="faq__item">
      <summary>${esc(f.q)}</summary>
      <div class="faq__a"><p>${esc(f.a)}</p></div>
    </details>`,
      )
      .join('\n    ')}
  </div>
</section>

<section class="cta-band">
  <div class="inner">
    <h2>${esc(cat.name)} 보험료, 지금 비교해 보세요</h2>
    <p>성함과 연락처만 남기면 보험사별 조건을 비교해 안내해 드립니다.</p>
    ${leadForm({ variant: 'compact', category: cat.slug, id: `lead-${cat.slug}-end` })}
  </div>
</section>`;

  return layout({
    title: `${cat.name} 비교 | 보험사별 보장·보험료 비교 및 맞춤 설계`,
    description: `${cat.name} 보장 구조와 가입 전 확인사항을 정리했습니다. ${cat.summary} 여러 보험사 조건을 무료로 비교해 보세요.`,
    path: `/${cat.slug}/`,
    keywords: cat.keywords,
    activeNav: cat.slug,
    breadcrumb: breadcrumbNav(crumbs),
    schemas: [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(crumbs),
      serviceSchema(cat),
      faqSchema(faq),
    ],
    body,
  });
}

/** 보험 가이드(블로그) 목록 */
export function blogIndexPage(articles) {
  const crumbs = [
    { name: '홈', path: '/' },
    { name: '보험 가이드', path: '/blog/' },
  ];

  const body = `
<section class="section">
  <div class="inner">
    <h1 class="page-title">보험 가이드</h1>
    <p class="page-desc">
      보험 용어와 상품 구조를 쉽게 풀어 정리했습니다. 가입 전에 무엇을 확인해야 하는지,
      어떤 기준으로 비교해야 하는지 알려드립니다.
    </p>
    ${articleCards(articles)}
  </div>
</section>

<section class="cta-band">
  <div class="inner">
    <h2>궁금한 점은 상담으로 확인하세요</h2>
    <p>성함과 연락처만 남기면 조건에 맞는 보험료를 비교해 안내해 드립니다.</p>
    ${leadForm({ variant: 'compact', id: 'lead-blog' })}
  </div>
</section>`;

  return layout({
    title: '보험 가이드 | 보험 용어·상품 구조 쉽게 정리',
    description:
      '실손보험 세대별 차이, 암보험 진단비, 운전자보험 필요성 등 보험 가입 전 알아야 할 내용을 정리한 가이드 모음입니다.',
    path: '/blog/',
    keywords: ['보험 가이드', '보험 용어', '보험 비교 방법'],
    activeNav: 'blog',
    breadcrumb: breadcrumbNav(crumbs),
    schemas: [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(crumbs),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: '보험 가이드',
        hasPart: articles.map((a) => ({
          '@type': 'Article',
          headline: a.h1,
          url: `${href(`/blog/${a.slug}/`)}`,
          datePublished: a.published,
          dateModified: a.updated,
        })),
      },
    ],
    body,
  });
}
