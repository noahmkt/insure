# 보험 비교 리드젠 사이트

키워드별 콘텐츠로 검색 유입을 만들고, 전 페이지의 상담 폼으로 리드를 수집하는 정적 사이트입니다.
SEO(검색엔진) · AEO(답변엔진) · GEO(생성형 AI 검색) 최적화가 생성기에 내장되어 있어,
**키워드 데이터만 추가하면 최적화된 페이지가 자동 생성**됩니다.

## 빠른 시작

```bash
node scripts/build.mjs    # dist/ 에 정적 사이트 생성
node scripts/check-seo.mjs # SEO/AEO 요건 자동 검사
node scripts/serve.mjs     # http://localhost:4173/insure/ 미리보기
```

## 배포 전 반드시 할 일

`site.config.mjs` 하나만 채우면 전 페이지에 반영됩니다.

| 항목 | 설명 |
|---|---|
| `business.*` | **사업자 정보 전체** — 법인명, 대리점등록번호, 사업자등록번호, 대표자, 대표번호, 광고심의 번호 |
| `verification.naver` | 네이버 서치어드바이저 소유확인 값 |
| `verification.google` | Google Search Console 소유확인 값 |
| `lead.endpoint` | 상담 신청 데이터를 받을 서버 주소 (비워두면 전송하지 않는 데모 모드) |
| `sameAs` | 운영 중인 공식 채널 URL (네이버 사이트 연관채널) |
| `origin` / `basePath` | 배포 도메인. 커스텀 도메인 연결 시 `basePath`를 `''`로 |

> ⚠️ **사업자 정보는 반드시 본인 법인의 실제 값이어야 합니다.**
> 타사의 대리점등록번호·사업자번호·광고심의 번호를 사용하는 것은 명의 도용이며 보험업법 위반입니다.
> 광고심의 번호는 실제 심의를 받은 뒤 기재하세요.

## 구조

```
site.config.mjs        사이트 전역 설정 (여기만 고치면 전 페이지 반영)
content/
  categories.mjs       보험 종류 8종 — 네비게이션·카테고리 페이지·상담 폼 선택지의 원천
  articles/*.mjs       키워드별 게시글 (파일 하나 = 페이지 하나)
  glossary.mjs         보험 용어 사전
lib/
  seo.mjs              메타태그·구조화 데이터 빌더
  layout.mjs           공통 HTML 셸 (헤더·푸터·동의 모달)
  components.mjs       상담 폼, 카드, 카테고리 그리드
  pages/               홈·카테고리·게시글·용어집·404 템플릿
assets/                CSS·JS·이미지 (외부 요청 없는 단일 파일)
scripts/
  build.mjs            정적 사이트 생성
  check-seo.mjs        SEO/AEO 요건 검사 (CI에서 실패 시 배포 중단)
  serve.mjs            로컬 미리보기
  make-og.mjs          OG 이미지 생성 (playwright 필요)
docs/
  naver-exposure-guide.md   네이버 노출 실행 가이드
```

## 게시글 추가하기

`content/articles/` 에 파일 하나를 추가하면 끝입니다. 빌드가 알아서
페이지·사이트맵·RSS·llms.txt·내부링크에 반영합니다.

```js
export default {
  slug: 'url-경로',
  category: 'cancer',        // categories.mjs 의 slug
  keyword: '타깃 키워드',
  title: '검색결과 제목',      // 40자 이내 권장
  h1: '페이지 제목',
  description: '설명',        // 80자 초과분은 검색결과용으로 자동 축약
  published: '2026-08-01',
  updated: '2026-08-02',
  answer: '질문에 대한 40~90자 직답',   // AEO — 본문 최상단 + speakable
  facts: [{ label, value, source }],  // GEO — 인용 가능한 수치
  sections: [{ h2: '질문형 제목', lead: '직답', body: [], list: [], table: {}, note: '' }],
  faq: [{ q, a }],                    // FAQPage 스키마
  howTo: { name, description, steps: [{ name, text }] },  // 선택 — HowTo 스키마
  related: ['다른-slug'],
};
```

기존 글(`content/articles/silson-4generation.mjs`)이 스키마 설명 주석을 포함한 기준점입니다.

## 최적화 내역

### SEO
페이지별 고유 title·description, canonical 절대경로, Open Graph·Twitter 카드,
sitemap.xml(우선순위·lastmod), robots.txt, RSS, 시맨틱 헤딩 구조, 내부링크
(카테고리 허브 ↔ 게시글), 모바일 반응형, 외부 요청 없는 단일 CSS/JS.

### AEO — 답변 엔진 최적화
- 본문 최상단 **한 줄 답변** 박스 + `speakable` 스키마로 인용 구간 명시
- 질문형 H2 + 각 섹션 첫 문장에 직답 배치
- `FAQPage` 스키마 (게시글·용어집·홈·카테고리)
- 한글 슬러그 헤딩 앵커 — 답변 엔진이 특정 구간을 직접 링크
- 비교표·목록으로 발췌 가능성 제고

### GEO — 생성형 AI 검색 최적화
- 출처가 명시된 **핵심 수치 블록** (법령·감독기관 등 검증 가능한 출처만)
- `llms.txt` 자동 생성 — 사이트 구조와 용어 정의를 AI 크롤러에 요약 전달
- robots.txt에서 GPTBot·ClaudeBot·PerplexityBot·OAI-SearchBot 허용
- 용어 사전을 `DefinedTerm`/`DefinedTermSet` 엔티티로 구조화
- `dateModified` 로 최신성 신호, 자기완결적 문단 구성

### 전환
전 페이지 상담 CTA(관심상품·성함·성별·생년월일·연락처 → "보험료 체크하기"),
개인정보 수집·이용 동의 모달, 허니팟 봇 차단, 유입 경로·키워드 자동 기록.
**주민등록번호는 수집하지 않으며**, 검사기가 관련 필드·문구를 차단합니다.

## 검증

`node scripts/check-seo.mjs` 가 배포 전 자동 점검합니다 — title/description 길이·중복,
canonical, H1 개수, 파비콘 절대경로, OG 태그, JSON-LD 파싱 및 필수 스키마, 이미지 alt,
상담 폼·동의 체크박스, 주민번호 필드 부재, 사이트맵 누락, 네이버 노출 차단 태그 오설정.
GitHub Actions가 배포 전 실행하며 실패 시 배포를 중단합니다.

## 네이버 노출

`docs/naver-exposure-guide.md` 에 서치어드바이저 등록부터 스팸 회피까지 전 절차가 있습니다.
**코드에 이미 반영된 항목**과 **사람이 해야 하는 항목**이 구분되어 있습니다.
