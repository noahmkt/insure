import { glossary } from '../../content/glossary.mjs';
import { layout, breadcrumbNav } from '../layout.mjs';
import { leadForm } from '../components.mjs';
import {
  esc,
  breadcrumbSchema,
  definedTermSetSchema,
  faqSchema,
  organizationSchema,
  websiteSchema,
} from '../seo.mjs';

/**
 * 보험 용어 사전.
 *
 * 엔티티 기반 페이지 — 각 용어를 DefinedTerm 노드로 노출해
 * "자기부담금이란?" 같은 정의형 질의에 답변 엔진이 정의문을 그대로 인용하도록 한다.
 * 정의 1문장만으로 답이 되게 쓰고, 상세 설명은 그 뒤에 둔다.
 */
export function glossaryPage() {
  const crumbs = [
    { name: '홈', path: '/' },
    { name: '보험 용어 사전', path: '/glossary/' },
  ];

  const groups = {};
  for (const t of glossary) (groups[t.category] ||= []).push(t);

  const body = `
<section class="section">
  <div class="inner inner--article">
    <h1 class="page-title">보험 용어 사전</h1>
    <p class="page-desc">
      보험 상담에서 자주 나오는 용어를 정의부터 정리했습니다.
      용어의 뜻을 알면 어떤 상품이 나에게 맞는지 스스로 판단할 수 있습니다.
    </p>

    <nav class="toc" aria-label="용어 목록">
      <h2>전체 용어 ${glossary.length}개</h2>
      <ol>
        ${glossary.map((t) => `<li><a href="#${t.slug}">${esc(t.term)}</a></li>`).join('\n        ')}
      </ol>
    </nav>

    ${Object.entries(groups)
      .map(
        ([cat, terms]) => `
    <section class="sec">
      <h2>${esc(cat)}</h2>
      ${terms
        .map(
          (t) => `
      <article class="term" id="${t.slug}">
        <h3 class="term__name">${esc(t.term)}</h3>
        <p class="term__def">${esc(t.definition)}</p>
        <p class="term__detail">${esc(t.detail)}</p>
      </article>`,
        )
        .join('\n      ')}
    </section>`,
      )
      .join('\n')}

    <aside class="disclaimer">
      <p>본 용어 설명은 일반적인 보험 제도와 표준약관을 기준으로 한 참고 자료입니다.
      실제 적용 조건은 가입한 보험사와 상품의 약관에 따라 달라질 수 있습니다.</p>
    </aside>
  </div>
</section>

<section class="cta-band">
  <div class="inner">
    <h2>용어는 알겠는데, 내 조건에는 뭐가 맞을까요?</h2>
    <p>성함과 연락처만 남기면 조건에 맞는 보험료를 비교해 안내해 드립니다.</p>
    ${leadForm({ variant: 'compact', id: 'lead-glossary' })}
  </div>
</section>`;

  return layout({
    title: '보험 용어 사전 | 자기부담금·면책기간·고지의무 등 핵심 용어 정리',
    description:
      '자기부담금, 면책기간, 감액기간, 갱신형, 고지의무, 유사암 등 보험 가입 전 반드시 알아야 할 용어를 정의와 함께 정리했습니다.',
    path: '/glossary/',
    keywords: glossary.map((t) => t.term),
    activeNav: 'glossary',
    breadcrumb: breadcrumbNav(crumbs),
    schemas: [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(crumbs),
      definedTermSetSchema(glossary),
      // 정의형 질의를 FAQ 형태로도 노출해 답변 엔진의 인용 경로를 하나 더 만든다
      faqSchema(glossary.map((t) => ({ q: `${t.term}이란 무엇인가요?`, a: t.definition }))),
    ],
    body,
  });
}
