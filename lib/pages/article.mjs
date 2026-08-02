import { categoryBySlug } from '../../content/categories.mjs';
import { href } from '../../site.config.mjs';
import { layout, breadcrumbNav } from '../layout.mjs';
import { leadForm } from '../components.mjs';
import {
  esc,
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  headingId,
  howToSchema,
  organizationSchema,
  websiteSchema,
} from '../seo.mjs';

/**
 * 게시글 페이지.
 *
 * 구성 순서가 곧 최적화 전략이다:
 *   H1 → 한 줄 답변(AEO) → 핵심 수치(GEO 인용 소재) → 목차 → 본문 → FAQ → CTA
 * 답변 엔진은 상단의 자기완결적 문단을, 생성형 검색은 출처가 붙은 수치를 집어간다.
 */
export function articlePage(a, allArticles) {
  const cat = categoryBySlug[a.category];
  const crumbs = [
    { name: '홈', path: '/' },
    { name: '보험 가이드', path: '/blog/' },
    { name: a.keyword, path: `/blog/${a.slug}/` },
  ];

  // 헤딩 앵커는 한글 슬러그 + 순번 — 답변 엔진이 특정 구간을 직접 인용·링크하기 쉽게 한다
  const ids = a.sections.map((s, i) => headingId(s.h2, i));

  const toc = a.sections
    .map((s, i) => `<li><a href="#${ids[i]}">${esc(s.h2)}</a></li>`)
    .join('\n      ');

  const sections = a.sections
    .map(
      (s, i) => `
    <section class="sec" id="${ids[i]}">
      <h2>${esc(s.h2)}</h2>
      ${s.lead ? `<p class="sec__lead">${s.lead}</p>` : ''}
      ${(s.body || []).map((p) => `<p>${p}</p>`).join('\n      ')}
      ${
        s.list
          ? `<ul class="sec__list">\n        ${s.list.map((li) => `<li>${li}</li>`).join('\n        ')}\n      </ul>`
          : ''
      }
      ${s.table ? renderTable(s.table) : ''}
      ${s.note ? `<aside class="callout"><strong>확인하세요</strong><p>${s.note}</p></aside>` : ''}
    </section>`,
    )
    .join('\n');

  const facts = (a.facts || []).length
    ? `
    <aside class="facts" aria-label="핵심 수치">
      <h2 class="facts__title">한눈에 보는 핵심 수치</h2>
      <dl>
        ${a.facts
          .map(
            (f) => `<div class="facts__item">
          <dt>${esc(f.label)}</dt>
          <dd><strong>${esc(f.value)}</strong><span class="facts__src">출처: ${esc(f.source)}</span></dd>
        </div>`,
          )
          .join('\n        ')}
      </dl>
    </aside>`
    : '';

  const faq = `
    <section class="faq" id="faq">
      <h2>자주 묻는 질문</h2>
      ${a.faq
        .map(
          (f) => `<details class="faq__item">
        <summary>${esc(f.q)}</summary>
        <div class="faq__a"><p>${f.a}</p></div>
      </details>`,
        )
        .join('\n      ')}
    </section>`;

  const related = (a.related || [])
    .map((slug) => allArticles.find((x) => x.slug === slug))
    .filter(Boolean);

  const relatedBlock = related.length
    ? `
    <nav class="related" aria-label="함께 보면 좋은 글">
      <h2>함께 보면 좋은 글</h2>
      <ul>
        ${related
          .map((r) => `<li><a href="${href(`/blog/${r.slug}/`)}">${esc(r.h1)}</a></li>`)
          .join('\n        ')}
      </ul>
    </nav>`
    : '';

  const body = `
<article class="article">
  <div class="inner inner--article">
    <header class="article__head">
      <a class="article__cat" href="${href(`/${cat.slug}/`)}">${esc(cat.name)}</a>
      <h1>${esc(a.h1)}</h1>
      <p class="article__meta">
        <time datetime="${a.published}">${a.published} 작성</time>
        <span aria-hidden="true">·</span>
        <time datetime="${a.updated}">${a.updated} 최종 업데이트</time>
        ${a.readingMinutes ? `<span aria-hidden="true">·</span><span>약 ${a.readingMinutes}분</span>` : ''}
      </p>
    </header>

    <!-- AEO: 질문에 대한 직답을 본문 최상단에 자기완결 문장으로 배치 -->
    <div class="answer-box">
      <span class="answer-box__label">한 줄 답변</span>
      <p class="answer-box__text">${esc(a.answer)}</p>
    </div>

    ${facts}

    <nav class="toc" aria-label="목차">
      <h2>목차</h2>
      <ol>
      ${toc}
        <li><a href="#faq">자주 묻는 질문</a></li>
      </ol>
    </nav>

    ${sections}

    <div class="cta-inline">
      ${leadForm({ variant: 'compact', category: a.category, id: `lead-${a.slug}-mid` })}
    </div>

    ${faq}

    ${relatedBlock}

    <aside class="disclaimer">
      <p>본 글은 일반적인 보험 상품 구조를 설명한 참고 자료이며, 특정 상품의 가입을 권유하는 내용이 아닙니다.
      실제 보장 내용·보험료·가입 조건은 보험사와 상품, 가입자의 나이·성별·건강 상태에 따라 달라지며,
      정확한 내용은 약관과 상품설명서를 확인하시기 바랍니다.</p>
    </aside>
  </div>
</article>

<section class="cta-band">
  <div class="inner inner--article">
    <h2>내 조건에 맞는 ${esc(cat.name)} 보험료가 궁금하다면</h2>
    <p>이름과 연락처만 남겨주시면 여러 보험사 조건을 비교해 안내해 드립니다. 상담은 무료입니다.</p>
    ${leadForm({ variant: 'compact', category: a.category, id: `lead-${a.slug}-end` })}
  </div>
</section>`;

  return layout({
    title: a.title,
    description: a.description,
    path: `/blog/${a.slug}/`,
    keywords: a.keywords || [a.keyword],
    type: 'article',
    published: a.published,
    updated: a.updated,
    activeNav: 'blog',
    section: cat.name,
    tags: a.keywords || [a.keyword],
    breadcrumb: breadcrumbNav(crumbs),
    schemas: [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(crumbs),
      articleSchema(a),
      faqSchema(a.faq),
      // "~하는 방법" 유형의 글은 절차 스키마를 함께 노출한다
      ...(a.howTo ? [howToSchema(a.howTo)] : []),
    ],
    body,
  });
}

function renderTable(t) {
  return `
      <div class="table-wrap">
        <table>
          ${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}
          <thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${t.rows
              .map(
                (r) =>
                  `<tr>${r
                    .map((c, i) =>
                      i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`,
                    )
                    .join('')}</tr>`,
              )
              .join('\n            ')}
          </tbody>
        </table>
      </div>`;
}
