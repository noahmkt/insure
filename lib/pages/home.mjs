import { categories } from '../../content/categories.mjs';
import { site, href } from '../../site.config.mjs';
import { layout } from '../layout.mjs';
import { leadForm, categoryGrid, articleCards } from '../components.mjs';
import { esc, organizationSchema, websiteSchema, faqSchema } from '../seo.mjs';

const HOME_FAQ = [
  {
    q: '보험비교사이트는 무료인가요?',
    a: '네. 보험료 비교와 맞춤 설계 상담은 전액 무료입니다. 상담 신청 후 전문 상담사가 여러 보험사의 조건을 비교해 안내해 드리며, 가입 여부는 고객님이 직접 결정하시면 됩니다.',
  },
  {
    q: '상담 신청하면 바로 가입해야 하나요?',
    a: '아닙니다. 상담은 보장 내용과 보험료를 비교해 보는 단계이며 가입 의무가 없습니다. 기존 보험 점검만 받아보시는 것도 가능합니다.',
  },
  {
    q: '보험료는 왜 사람마다 다른가요?',
    a: '보험료는 나이, 성별, 가입 담보와 한도, 건강 상태(고지사항), 직업, 납입·보장 기간에 따라 산출됩니다. 같은 상품이라도 조건이 다르면 보험료가 달라지므로 본인 조건으로 산출해 보는 것이 정확합니다.',
  },
  {
    q: '이미 가입한 보험이 있어도 상담받을 수 있나요?',
    a: '가능합니다. 기존 증권의 보장 범위와 중복 여부를 점검해 부족한 부분과 겹치는 부분을 정리해 드립니다. 다만 기존 계약 해지 후 새로 가입하면 연령 증가·질병 이력으로 불이익이 생길 수 있어 신중한 검토가 필요합니다.',
  },
  {
    q: '주민등록번호를 알려줘야 하나요?',
    a: '아닙니다. 상담 신청 단계에서는 성함·연락처·생년월일 등 최소한의 정보만 수집하며 주민등록번호는 수집하지 않습니다.',
  },
];

export function homePage(articles) {
  const latest = articles.slice(0, 6);

  const body = `
<section class="hero">
  <div class="inner hero__inner">
    <div class="hero__copy">
      <p class="hero__eyebrow">보험비교사이트</p>
      <h1>34개 보험사 보험료를<br>한 번에 비교하세요</h1>
      <p class="hero__lead">
        암보험·실손보험·운전자보험·치아보험까지.<br>
        같은 보장이라도 보험사마다 보험료가 다릅니다. 무료 상담으로 내 조건에 맞는 견적을 확인하세요.
      </p>
      <ul class="hero__points">
        <li>보험사별 보장·보험료 <strong>한 번에 비교</strong></li>
        <li>내 조건에 맞는 <strong>담보·특약 맞춤 설계</strong></li>
        <li>기존 가입 보험 <strong>중복·부족 점검</strong></li>
      </ul>
    </div>
    <div class="hero__form">
      ${leadForm({ variant: 'hero', id: 'lead-hero' })}
    </div>
  </div>
</section>

<section class="section section--cats">
  <div class="inner">
    <h2 class="section__title">보험 종류별 비교</h2>
    <p class="section__desc">관심 있는 보험을 선택하면 보장 구조와 가입 전 확인사항을 확인할 수 있습니다.</p>
    ${categoryGrid()}
  </div>
</section>

<section class="section section--why">
  <div class="inner">
    <h2 class="section__title">보험비교사이트가 왜 필요한가요?</h2>
    <p class="section__desc">
      보험사마다 보장 범위, 특약 구성, 보험료 산정 방식, 가입 연령, 병력 인수 기준이 다릅니다.
      한 곳만 보고 결정하면 같은 보장을 더 비싸게 사거나, 필요한 담보를 빠뜨리기 쉽습니다.
    </p>
    <ul class="why-list">
      <li>
        <h3>보험료 차이</h3>
        <p>동일한 보장이라도 보험사별 요율과 인수 기준이 달라 보험료 차이가 발생합니다.</p>
      </li>
      <li>
        <h3>담보 구성 차이</h3>
        <p>필요한 특약이 기본 탑재된 상품이 있는 반면, 별도 가입해야 하는 상품도 있습니다.</p>
      </li>
      <li>
        <h3>인수 기준 차이</h3>
        <p>같은 병력이라도 보험사에 따라 가입 가능 여부와 조건부 인수 기준이 다릅니다.</p>
      </li>
    </ul>
  </div>
</section>

<section class="section section--how">
  <div class="inner">
    <h2 class="section__title">상담은 이렇게 진행됩니다</h2>
    <ol class="steps">
      <li><span class="steps__n">1</span><h3>상담 신청</h3><p>성함과 연락처, 관심 상품을 남깁니다. 1분이면 충분합니다.</p></li>
      <li><span class="steps__n">2</span><h3>조건 확인</h3><p>상담사가 연락드려 나이·성별·건강 상태 등 견적에 필요한 조건을 확인합니다.</p></li>
      <li><span class="steps__n">3</span><h3>비교 견적</h3><p>여러 보험사의 보장과 보험료를 비교한 맞춤 견적을 안내드립니다.</p></li>
      <li><span class="steps__n">4</span><h3>결정</h3><p>비교 후 가입 여부는 고객님이 직접 결정하시면 됩니다. 가입 의무는 없습니다.</p></li>
    </ol>
  </div>
</section>

<section class="section section--guide">
  <div class="inner">
    <h2 class="section__title">보험 가입 전 알아두면 좋은 가이드</h2>
    <p class="section__desc">보험 용어와 구조를 먼저 이해하면 상담이 훨씬 수월해집니다.</p>
    ${articleCards(latest)}
    <p class="section__more"><a href="${href('/blog/')}">보험 가이드 전체 보기 →</a></p>
  </div>
</section>

<section class="section section--faq">
  <div class="inner">
    <h2 class="section__title">자주 묻는 질문</h2>
    ${HOME_FAQ.map(
      (f) => `<details class="faq__item">
      <summary>${esc(f.q)}</summary>
      <div class="faq__a"><p>${esc(f.a)}</p></div>
    </details>`,
    ).join('\n    ')}
  </div>
</section>

<section class="cta-band">
  <div class="inner">
    <h2>지금 내 보험료, 얼마인지 확인해 보세요</h2>
    <p>성함과 연락처만 남기면 조건에 맞는 보험료를 비교해 안내해 드립니다.</p>
    ${leadForm({ variant: 'compact', id: 'lead-bottom' })}
  </div>
</section>`;

  return layout({
    // 네이버 권장 40자 이내 — 핵심 키워드를 앞에 두고 브랜드명은 뒤에
    title: `보험비교사이트 | 34개 보험사 보험료 비교 — ${site.name}`,
    description:
      '암보험·실손보험·어린이보험·운전자보험·치아보험·간병인보험·펫보험·화재보험까지 34개 보험사 보험료를 한 번에 비교하세요. 무료 상담으로 내 조건에 맞는 맞춤 견적을 확인할 수 있습니다.',
    path: '/',
    keywords: [
      '보험비교사이트',
      '보험료 비교',
      '보험 비교',
      '암보험 비교',
      '실손보험 비교',
      '운전자보험 비교',
      '치아보험 비교',
      '보험 상담',
      '보험료 계산',
    ],
    schemas: [organizationSchema(), websiteSchema(), faqSchema(HOME_FAQ)],
    body,
  });
}

export { HOME_FAQ };
