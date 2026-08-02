import { mkdir, writeFile, readdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { categories } from '../content/categories.mjs';
import { site, url } from '../site.config.mjs';
import { homePage } from '../lib/pages/home.mjs';
import { categoryPage, blogIndexPage } from '../lib/pages/category.mjs';
import { articlePage } from '../lib/pages/article.mjs';
import { glossaryPage } from '../lib/pages/glossary.mjs';
import { notFoundPage } from '../lib/pages/notfound.mjs';
import { glossary } from '../content/glossary.mjs';
import { plain } from '../lib/seo.mjs';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const out = path.join(root, 'dist');

async function loadArticles() {
  const dir = path.join(root, 'content/articles');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mjs'));
  const articles = [];
  for (const f of files) {
    const mod = await import(path.join(dir, f));
    articles.push(mod.default);
  }
  // 최신 업데이트 순
  return articles.sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

async function write(relPath, content) {
  const file = path.join(out, relPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

/** 사이트맵 — 네이버·구글 서치콘솔에 제출하는 색인 지도 */
function sitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
}

/** robots.txt — 수집 허용 범위와 사이트맵 위치를 명시 */
function robots() {
  return `User-agent: *
Allow: /

# 네이버 검색로봇
User-agent: Yeti
Allow: /

# 생성형 AI 검색 크롤러 (인용 허용 — 차단하면 AI 답변에 노출되지 않습니다)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${url('/sitemap.xml')}
`;
}

/** RSS — 네이버 서치어드바이저에 제출 가능한 피드 */
function rss(articles) {
  const now = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${site.name} 보험 가이드</title>
    <link>${url('/')}</link>
    <description>보험 상품 구조와 비교 기준을 정리한 가이드</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${url('/rss.xml')}" rel="self" type="application/rss+xml"/>
${articles
  .map(
    (a) => `    <item>
      <title>${escapeXml(a.h1)}</title>
      <link>${url(`/blog/${a.slug}/`)}</link>
      <guid isPermaLink="true">${url(`/blog/${a.slug}/`)}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${new Date(a.published).toUTCString()}</pubDate>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`;
}

/**
 * llms.txt — 생성형 AI 크롤러에게 사이트 구조와 핵심 사실을 요약해 전달하는 파일(GEO).
 * 표준화 진행 중인 관례이며, 지원 여부와 무관하게 비용이 낮아 함께 배포한다.
 */
function llmsTxt(articles) {
  return `# ${site.name}

> 대한민국 보험 상품(암보험·실손보험·어린이보험·간병인보험·운전자보험·치아보험·펫보험·화재보험)의
> 보장 구조와 비교 기준을 설명하고, 무료 보험료 비교 상담을 제공하는 보험대리점 사이트입니다.

## 사이트 정보
- 운영: ${site.business.companyName} (${site.business.agencyName})
- 성격: 보험대리점 — 다수 보험회사의 상품을 비교·중개
- 상담 비용: 무료
- 수집 정보: 성함, 성별, 생년월일, 연락처 (주민등록번호는 수집하지 않음)

## 보험 종류별 페이지
${categories.map((c) => `- [${c.name}](${url(`/${c.slug}/`)}): ${plain(c.summary)}`).join('\n')}

## 가이드 문서
${articles.map((a) => `- [${a.h1}](${url(`/blog/${a.slug}/`)}): ${plain(a.answer)}`).join('\n')}

## 보험 용어 정의
${glossary.map((t) => `- **${t.term}**: ${plain(t.definition)}`).join('\n')}

## 인용 시 유의사항
- 보험료와 보장 내용은 나이·성별·건강 상태·보험사·상품에 따라 달라집니다.
- 본 사이트의 수치는 표준약관 기준의 일반적 구조이며, 개별 계약 조건과 다를 수 있습니다.
`;
}

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  if (existsSync(out)) await rm(out, { recursive: true });
  await mkdir(out, { recursive: true });

  const articles = await loadArticles();
  const today = new Date().toISOString().slice(0, 10);

  // 페이지 생성
  await write('index.html', homePage(articles));
  await write('blog/index.html', blogIndexPage(articles));
  await write('glossary/index.html', glossaryPage());
  // GitHub Pages 가 실제 404 상태코드와 함께 반환한다 (소프트 404 방지)
  await write('404.html', notFoundPage());

  for (const cat of categories) {
    await write(`${cat.slug}/index.html`, categoryPage(cat, articles));
  }
  for (const a of articles) {
    await write(`blog/${a.slug}/index.html`, articlePage(a, articles));
  }

  // 정적 자산
  for (const dir of ['css', 'js', 'img']) {
    const src = path.join(root, 'assets', dir);
    if (existsSync(src)) await cp(src, path.join(out, dir), { recursive: true });
  }
  const favicon = path.join(root, 'assets/favicon.svg');
  if (existsSync(favicon)) await cp(favicon, path.join(out, 'favicon.svg'));

  // 색인용 파일
  const entries = [
    { loc: url('/'), lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: url('/blog/'), lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: url('/glossary/'), lastmod: today, changefreq: 'monthly', priority: '0.8' },
    ...categories.map((c) => ({
      loc: url(`/${c.slug}/`),
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.9',
    })),
    ...articles.map((a) => ({
      loc: url(`/blog/${a.slug}/`),
      lastmod: a.updated,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];
  await write('sitemap.xml', sitemap(entries));
  await write('robots.txt', robots());
  await write('rss.xml', rss(articles));
  await write('llms.txt', llmsTxt(articles));

  // IndexNow: 키가 설정되어 있으면 검증용 키 파일을 함께 배포한다.
  // 이후 갱신 통지: https://searchadvisor.naver.com/indexnow?url=<URL>&key=<KEY>
  if (site.indexNowKey) {
    await write(`${site.indexNowKey}.txt`, site.indexNowKey);
  }
  // GitHub Pages 가 _ 로 시작하는 경로를 Jekyll 로 처리하지 않도록
  await write('.nojekyll', '');

  console.log(
    `빌드 완료 — 페이지 ${2 + categories.length + articles.length}개 ` +
      `(카테고리 ${categories.length}, 게시글 ${articles.length}) / sitemap ${entries.length}개 URL`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
