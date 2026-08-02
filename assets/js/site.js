/**
 * 사이트 클라이언트 스크립트 (의존성 없음)
 * - 모바일 내비게이션
 * - 개인정보 동의 모달
 * - 상담 신청 폼 검증 및 전송
 * - 유입 경로/키워드 수집 (리드 품질 분석용, 개인정보 아님)
 */
(function () {
  'use strict';

  var CONFIG = window.SITE_CONFIG || {};

  // ── 모바일 내비 ────────────────────────────────────────
  var toggle = document.querySelector('.nav__toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
  }

  // ── 개인정보 동의 모달 ─────────────────────────────────
  var modal = document.getElementById('privacy-modal');
  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-privacy]')) { e.preventDefault(); openModal(); }
    if (e.target.closest('[data-close-privacy]')) { closeModal(); }
    if (modal && e.target === modal) { closeModal(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ── 토스트 ─────────────────────────────────────────────
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(message, isError) {
    if (!toastEl) { alert(message); return; }
    toastEl.textContent = message;
    toastEl.className = 'toast' + (isError ? ' toast--error' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4000);
  }

  // ── 유입 정보 (리드 품질 분석용) ───────────────────────
  function trafficInfo() {
    var params = new URLSearchParams(location.search);
    return {
      page: location.pathname,
      referrer: document.referrer || '',
      // 광고·검색 유입 키워드 파라미터가 있으면 함께 기록
      keyword: params.get('keyword') || params.get('kw') || params.get('utm_term') || '',
    };
  }

  // ── 상담 신청 폼 ───────────────────────────────────────
  var forms = document.querySelectorAll('[data-lead-form]');
  Array.prototype.forEach.call(forms, function (form) {
    var info = trafficInfo();
    setHidden(form, 'page', info.page);
    setHidden(form, 'referrer', info.referrer);
    setHidden(form, 'keyword', info.keyword);

    // 연락처·생년월일은 숫자만 입력되도록
    Array.prototype.forEach.call(form.querySelectorAll('input[type="tel"]'), function (el) {
      el.addEventListener('input', function () {
        el.value = el.value.replace(/[^0-9]/g, '');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(form);
    });
  });

  function setHidden(form, name, value) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el) el.value = value;
  }

  function submitLead(form) {
    var data = Object.fromEntries(new FormData(form).entries());

    // 허니팟이 채워졌다면 봇 — 성공한 것처럼 보이게 하고 전송하지 않는다
    if (data.website) { toast('상담 신청이 접수되었습니다.'); form.reset(); return; }

    var name = (data.name || '').trim();
    var phone = (data.phone || '').replace(/[^0-9]/g, '');

    if (!data.product) return fail(form, 'select[name="product"]', '상담받을 상품을 선택해 주세요.');
    if (name.length < 2) return fail(form, 'input[name="name"]', '성함을 정확히 입력해 주세요.');
    if (!/^01[016789][0-9]{7,8}$/.test(phone))
      return fail(form, 'input[name="phone"]', '연락처를 정확히 입력해 주세요. (예: 01012345678)');
    if (data.birth && !/^[0-9]{6}$/.test(data.birth))
      return fail(form, 'input[name="birth"]', '생년월일 6자리를 입력해 주세요. (예: 900101)');
    if (!data.agree) return fail(form, 'input[name="agree"]', '개인정보 수집·이용에 동의해 주세요.');

    data.phone = phone;
    delete data.website;

    var button = form.querySelector('.lead__submit');
    var endpoint = CONFIG.leadEndpoint || '';

    if (!endpoint) {
      // 데모 안전 모드: 수집 엔드포인트가 설정되지 않았으면 전송하지 않는다.
      toast('데모 모드입니다. 실제 상담 접수는 설정 후 동작합니다.');
      console.info('[lead] 수집 엔드포인트 미설정. 전송 데이터:', data);
      form.reset();
      return;
    }

    button.disabled = true;
    button.textContent = '접수 중…';

    fetch(endpoint, {
      method: CONFIG.leadMethod || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        toast('상담 신청이 접수되었습니다. 순차적으로 연락드리겠습니다.');
        form.reset();
      })
      .catch(function () {
        toast('접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', true);
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = '보험료 체크하기';
      });
  }

  function fail(form, selector, message) {
    var el = form.querySelector(selector);
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.focus();
      el.addEventListener('input', function once() {
        el.removeAttribute('aria-invalid');
        el.removeEventListener('input', once);
      });
    }
    toast(message, true);
  }
})();
