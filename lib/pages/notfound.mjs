import { href } from '../../site.config.mjs';
import { layout } from '../layout.mjs';
import { categoryGrid } from '../components.mjs';
import { organizationSchema, websiteSchema } from '../seo.mjs';

/**
 * 404 페이지.
 * GitHub Pages 는 dist/404.html 을 자동으로 404 상태코드와 함께 반환한다.
 * 내용만 "없는 페이지"라고 쓰고 200 을 반환하는 소프트 404 는
 * 네이버가 불용문서로 처리해 사이트 신뢰도를 떨어뜨리므로 반드시 이 형태로 둔다.
 */
export function notFoundPage() {
  const body = `
<section class="section">
  <div class="inner inner--article" style="text-align:center">
    <h1 class="page-title">요청하신 페이지를 찾을 수 없습니다</h1>
    <p class="page-desc" style="margin-left:auto;margin-right:auto">
      주소가 변경되었거나 삭제된 페이지입니다. 아래에서 원하시는 보험을 선택해 주세요.
    </p>
    <p><a href="${href('/')}">홈으로 돌아가기</a> · <a href="${href('/blog/')}">보험 가이드 보기</a></p>
  </div>
</section>

<section class="section section--cats">
  <div class="inner">
    <h2 class="section__title">보험 종류별 비교</h2>
    ${categoryGrid()}
  </div>
</section>`;

  return layout({
    title: '페이지를 찾을 수 없습니다',
    description:
      '요청하신 페이지를 찾을 수 없습니다. 보험 종류별 비교 페이지와 보험 가이드에서 원하시는 정보를 찾아보세요.',
    path: '/404.html',
    // 404 는 색인 대상이 아니다
    noindex: true,
    schemas: [organizationSchema(), websiteSchema()],
    body,
  });
}
