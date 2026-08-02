/**
 * 빌드 산출물 SEO/AEO/GEO 자동 점검.
 * 배포 전 `npm run build && npm run check` 로 회귀를 잡는다.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const dist = path.join(root, 'dist');

const problems = [];
const warnings = [];
let checked = 0;

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(dist, file);
}

async function checkPage(file) {
  const html = await readFile(file, 'utf8');
  const name = rel(file);
  checked++;

  const fail = (m) => problems.push(`${name}: ${m}`);
  const warn = (m) => warnings.push(`${name}: ${m}`);

  // ── 기본 SEO ────────────────────────────────────────
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (!title) fail('title 태그 없음');
  else if (title.length > 70) warn(`title 이 김 (${title.length}자) — 검색결과에서 잘릴 수 있음`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) fail('meta description 없음');
  else if (desc.length < 50) warn(`description 이 짧음 (${desc.length}자)`);
  else if (desc.length > 200) warn(`description 이 김 (${desc.length}자)`);

  if (!/<link rel="canonical" href="https?:\/\//.test(html)) fail('canonical 절대 URL 없음');
  if (!/<html lang="ko">/.test(html)) fail('html lang 속성 없음');
  if (!/name="viewport"/.test(html)) fail('viewport 메타 없음');

  const h1 = html.match(/<h1[^>]*>/g) || [];
  if (h1.length === 0) fail('H1 없음');
  if (h1.length > 1) fail(`H1 이 ${h1.length}개 — 페이지당 1개여야 함`);

  // ── 공유 카드 ───────────────────────────────────────
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) {
    if (!html.includes(`property="${p}"`)) fail(`${p} 없음`);
  }
  if (!html.includes('name="twitter:card"')) warn('twitter:card 없음');

  // ── 구조화 데이터 ───────────────────────────────────
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ldBlocks.length === 0) fail('JSON-LD 없음');
  const types = [];
  for (const [, raw] of ldBlocks) {
    try {
      const obj = JSON.parse(raw);
      types.push(...[].concat(obj['@type'] || []));
    } catch (e) {
      fail(`JSON-LD 파싱 실패: ${e.message}`);
    }
  }
  if (!types.some((t) => t === 'Organization' || t === 'InsuranceAgency'))
    warn('Organization 스키마 없음');

  // 게시글은 Article + FAQPage 필수 (AEO 핵심)
  if (name.startsWith('blog/') && name !== 'blog/index.html') {
    if (!types.includes('Article')) fail('Article 스키마 없음');
    if (!types.includes('FAQPage')) fail('FAQPage 스키마 없음 (AEO)');
    if (!types.includes('BreadcrumbList')) fail('BreadcrumbList 스키마 없음');
    if (!html.includes('answer-box__text')) fail('한 줄 답변 박스 없음 (AEO)');
    if (!/<meta property="article:modified_time"/.test(html)) fail('article:modified_time 없음');
  }

  // ── 접근성·이미지 ───────────────────────────────────
  const imgsWithoutAlt = [...html.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)];
  if (imgsWithoutAlt.length) fail(`alt 없는 img ${imgsWithoutAlt.length}개`);

  // ── 리드 폼 (전환) ──────────────────────────────────
  if (!html.includes('data-lead-form')) warn('상담 폼 없음 — 전환 경로 누락');
  else {
    if (!html.includes('name="agree"')) fail('개인정보 동의 체크박스 없음');
    if (!html.includes('보험료 체크하기')) warn('CTA 버튼 문구 없음');
  }

  // ── 하드 룰: 주민번호 수집 금지 ─────────────────────
  if (/주민(등록)?번호\s*(입력|수집)(?!하지)/.test(html.replace(/수집하지 않습니다/g, '')))
    fail('주민등록번호 수집 관련 문구 발견 — 수집 금지');
  if (/name="(jumin|rrn|ssn|residentNumber)"/i.test(html)) fail('주민번호 입력 필드 발견');

  // ── 내부링크 ────────────────────────────────────────
  const internalLinks = [...html.matchAll(/href="(\/insure\/[^"#]*)"/g)].map((m) => m[1]);
  if (internalLinks.length < 5) warn(`내부링크 ${internalLinks.length}개 — 너무 적음`);
}

async function checkSiteFiles() {
  const required = ['sitemap.xml', 'robots.txt', 'rss.xml', 'llms.txt', '.nojekyll'];
  for (const f of required) {
    try {
      await stat(path.join(dist, f));
    } catch {
      problems.push(`필수 파일 누락: ${f}`);
    }
  }

  const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8').catch(() => '');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const pages = (await htmlFiles(dist)).map((f) =>
    rel(f).replace(/index\.html$/, '').replace(/\\/g, '/'),
  );
  for (const p of pages) {
    const expect = `/${p}`.replace(/\/$/, '/');
    if (!locs.some((l) => l.endsWith(expect) || l.endsWith(expect.replace(/\/$/, '')))) {
      warnings.push(`사이트맵에 없는 페이지: ${p}`);
    }
  }

  const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8').catch(() => '');
  if (!robots.includes('Sitemap:')) problems.push('robots.txt 에 Sitemap 선언 없음');
  if (!robots.includes('Yeti')) warnings.push('robots.txt 에 네이버 로봇(Yeti) 규칙 없음');
  if (!/GPTBot|ClaudeBot|PerplexityBot/.test(robots))
    warnings.push('robots.txt 에 생성형 AI 크롤러 규칙 없음 (GEO)');
}

const files = await htmlFiles(dist);
for (const f of files) await checkPage(f);
await checkSiteFiles();

console.log(`\n검사 완료 — HTML ${checked}개\n`);
if (warnings.length) {
  console.log(`⚠️  경고 ${warnings.length}건`);
  warnings.forEach((w) => console.log(`   - ${w}`));
  console.log('');
}
if (problems.length) {
  console.log(`❌ 문제 ${problems.length}건`);
  problems.forEach((p) => console.log(`   - ${p}`));
  process.exit(1);
}
console.log('✅ 필수 항목 모두 통과');
