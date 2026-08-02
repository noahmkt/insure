import { categories } from '../content/categories.mjs';
import { site, href } from '../site.config.mjs';
import { esc } from './seo.mjs';

/**
 * 상담 신청 폼(리드 수집).
 *
 * variant:
 *   'hero'    — 메인 상단. 상품 선택 + 이름/성별/생년월일/연락처/문의
 *   'compact' — 게시글 본문 중간·하단. 이름 + 연락처 + 보험료 체크하기
 *
 * 개인정보 수집 동의 체크 없이는 전송되지 않으며(스크립트에서 검증),
 * 수집 항목·목적·보유기간은 동의 모달에 그대로 노출된다.
 */
export function leadForm({ variant = 'compact', category = '', id = 'lead', title, subtitle } = {}) {
  const options = categories
    .map(
      (c) =>
        `<option value="${esc(c.name)}"${c.slug === category ? ' selected' : ''}>${esc(c.name)}</option>`,
    )
    .join('\n            ');

  const heading = title || (variant === 'hero' ? '보험 신규 가입 상담 신청' : '내 보험료 확인하기');
  const sub =
    subtitle ||
    (variant === 'hero'
      ? '34개 보험사 상품을 한 번에 비교해 드립니다'
      : '이름과 연락처만 남기면 조건에 맞는 보험료를 비교해 알려드립니다');

  return `
<form class="lead lead--${variant}" id="${id}" data-lead-form novalidate>
  <div class="lead__head">
    <p class="lead__title">${esc(heading)}</p>
    <p class="lead__sub">${esc(sub)}</p>
  </div>
  <div class="lead__body">
    <label class="lead__field">
      <span class="lead__label">관심 상품</span>
      <select name="product" required>
        <option value="">상담 신청 상품 선택</option>
        ${options}
      </select>
    </label>

    <div class="lead__row">
      <label class="lead__field lead__field--grow">
        <span class="lead__label">성함</span>
        <input type="text" name="name" placeholder="이름" maxlength="20" autocomplete="name" required>
      </label>
      <div class="lead__gender" role="radiogroup" aria-label="성별">
        <input type="radio" id="${id}-m" name="gender" value="남" checked>
        <label for="${id}-m">남</label>
        <input type="radio" id="${id}-f" name="gender" value="여">
        <label for="${id}-f">여</label>
      </div>
    </div>

    ${
      variant === 'hero'
        ? `<label class="lead__field">
      <span class="lead__label">생년월일</span>
      <input type="tel" name="birth" placeholder="생년월일 6자리 (예: 900101)" maxlength="6" inputmode="numeric" pattern="[0-9]{6}">
    </label>`
        : ''
    }

    <label class="lead__field">
      <span class="lead__label">연락처</span>
      <input type="tel" name="phone" placeholder="'-' 없이 숫자만 입력" maxlength="11" inputmode="numeric" autocomplete="tel" required>
    </label>

    ${
      variant === 'hero'
        ? `<label class="lead__field">
      <span class="lead__label">문의 사항</span>
      <input type="text" name="memo" placeholder="문의 사항을 남겨주시면 빠른 안내가 가능합니다" maxlength="200">
    </label>`
        : ''
    }

    <div class="lead__consent">
      <label class="lead__check">
        <input type="checkbox" name="agree" required>
        <span>개인정보 수집·이용 동의 <em>(필수)</em></span>
      </label>
      <button type="button" class="lead__terms" data-open-privacy>자세히보기</button>
    </div>

    <button type="submit" class="lead__submit">보험료 체크하기</button>
    <p class="lead__note">상담은 무료이며, 신청 후 전문 상담사가 순차적으로 연락드립니다.</p>
  </div>

  <!-- 봇 차단용 허니팟: 사람에게는 보이지 않으며 값이 채워지면 전송을 무시합니다 -->
  <div class="lead__hp" aria-hidden="true">
    <label>이 항목은 비워두세요<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
  </div>
  <input type="hidden" name="page" value="">
  <input type="hidden" name="referrer" value="">
  <input type="hidden" name="keyword" value="">
</form>`;
}

/** 카테고리 바로가기 그리드 */
export function categoryGrid() {
  return `
<ul class="cat-grid">
  ${categories
    .map(
      (c) => `<li>
    <a href="${href(`/${c.slug}/`)}">
      <span class="cat-grid__icon" aria-hidden="true">${c.icon}</span>
      <strong>${esc(c.name)}</strong>
      <span class="cat-grid__tag">${esc(c.tagline)}</span>
    </a>
  </li>`,
    )
    .join('\n  ')}
</ul>`;
}

/** 글 카드 목록 */
export function articleCards(articles) {
  if (!articles.length) return '';
  return `
<ul class="card-list">
  ${articles
    .map(
      (a) => `<li class="card">
    <a href="${href(`/blog/${a.slug}/`)}">
      <span class="card__kw">${esc(a.keyword)}</span>
      <strong class="card__title">${esc(a.h1)}</strong>
      <span class="card__desc">${esc(a.description.slice(0, 90))}…</span>
      <time class="card__date" datetime="${a.updated}">${a.updated} 업데이트</time>
    </a>
  </li>`,
    )
    .join('\n  ')}
</ul>`;
}

/** 개인정보 수집·이용 동의 모달 (실제 수집 항목과 일치해야 함) */
export function privacyModal() {
  return `
<div class="modal" id="privacy-modal" hidden>
  <div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
    <button type="button" class="modal__close" data-close-privacy aria-label="닫기">×</button>
    <h2 id="privacy-title">개인(신용)정보 수집·이용 동의</h2>
    <section>
      <h3>1. 수집·이용 목적</h3>
      <ul>
        <li>보험 상품 비교 견적 산출 및 맞춤 설계 상담 제공</li>
        <li>상담 진행을 위한 본인 확인 및 연락</li>
        <li>고지사항 전달, 문의 및 불만 처리</li>
      </ul>
    </section>
    <section>
      <h3>2. 수집 항목</h3>
      <p>성명, 성별, 생년월일, 연락처, 관심 상품 및 문의 내용</p>
      <p class="modal__strong">※ 주민등록번호는 수집하지 않습니다.</p>
    </section>
    <section>
      <h3>3. 보유·이용 기간</h3>
      <p>동의일로부터 상담 종료 후 <strong>최대 3년</strong>까지 보유하며, 철회 요청 시 지체 없이 파기합니다.
      철회는 ${esc(site.business.tel)} 로 연락 주시면 처리됩니다.</p>
    </section>
    <section>
      <h3>4. 동의 거부 권리 및 불이익</h3>
      <p>동의를 거부할 권리가 있으며, 거부 시 보험료 비교·설계 상담 서비스 제공이 제한됩니다.</p>
    </section>
    <section>
      <h3>5. 수집·이용 주체</h3>
      <p>${esc(site.business.companyName)} (${esc(site.business.agencyName)})</p>
      <p>상품 권유 중지(Do-Not-Call)를 원하시면 언제든지 ${esc(site.business.tel)} 로 요청하실 수 있습니다.</p>
    </section>
  </div>
</div>`;
}
