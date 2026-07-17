# 내보험 찾기 — 고객용 Flutter 앱 (스캐폴드)

실손보험 청구 간소화 서비스 "내보험 찾기"의 고객용 앱 스캐폴드입니다.
화면 구조는 `docs/02-wireframes.md`, API·DTO 는 `docs/04-api-spec.md` 를 따릅니다.

## 상태

- **스캐폴드 단계**: 화면 골격 + 공통 위젯 + API 클라이언트 스텁까지 구현.
- 네트워크 호출은 아직 연결하지 않았고, 각 화면은 스텁 데이터(Provider)로 렌더링됩니다.
  실제 연동 지점마다 `TODO(스캐폴드)` 주석으로 교체 위치를 표시했습니다.
- 플랫폼 디렉토리(`android/`, `ios/` 등)는 아직 생성하지 않았습니다(아래 실행 방법 참고).
- 이 스캐폴드는 Flutter SDK 가 없는 환경에서 작성되어 `flutter analyze` 를 아직 통과시키지
  않았습니다. 첫 빌드 시 사소한 정리(analyzer 경고)가 있을 수 있습니다.

## 실행 방법

```bash
cd app
flutter create . --platforms=android,ios   # 플랫폼 디렉토리 생성 (최초 1회)
flutter pub get
flutter run
```

백엔드는 `backend/` 를 `http://localhost:3000` 에서 실행해야 합니다
(API base: `http://localhost:3000/api/v1`, `lib/api/api_client.dart` 의 `ApiClient.baseUrl`).
에뮬레이터에서 호스트 머신에 접근하려면 Android 는 `10.0.2.2` 로 바꿔 주세요.

## 구조

```
lib/
├── main.dart                      # 앱 진입 + 하단 5탭 셸(홈/내 보험/환급금/간편청구/마이)
├── api/
│   ├── api_client.dart            # REST 클라이언트 스텁 (Bearer JWT, Riverpod provider)
│   └── models.dart                # docs/04 DTO — EstimatedRefund(disclaimer 필수),
│                                  #   ConfirmedBenefit(확정액, 별도 클래스), 동의 4층 enum 등
├── common/
│   ├── disclaimer_footer.dart     # 면책 문구 고정 컴포넌트 (예측액 화면 필수)
│   ├── amount_badge.dart          # 확정(채움)/예상(외곽선) 구분 뱃지 — 혼용 표기 금지
│   ├── estimate_card.dart         # 예상 환급액 카드: '예상' 접두 + 산출 근거 펼침 + D-day
│   └── format.dart                # 원화/날짜/D-day 포맷 유틸
└── features/
    ├── onboarding/onboarding_flow.dart  # 스플래시·소개3장·본인인증·동의①②·연동 마법사
    ├── home/home_screen.dart            # 히어로 카드(확정+예상), 진행 중 청구, CTA
    ├── contracts/contracts_screen.dart  # 보험 리스트, 중복 실손 배너, ③동의 모달(상담 신청 시점)
    ├── refunds/refunds_screen.dart      # 숨은보험금(확정) | 미청구 실비(예상) 세그먼트
    ├── claims/claims_screen.dart        # 간편청구 A/B 라우팅 분기
    └── my/my_screen.dart                # 동의내역 관리(4층 개별 철회), 보관함, 탈퇴
```

## 법적 하드 룰 반영 내역

| 룰 | 반영 위치 |
|---|---|
| 청구 대행·"제출" 실행 금지 | `claims_screen.dart` — 제출 버튼 없음. A: 실손24 딥링크 안내 + "청구 완료로 표시"(본인 신고 기반 상태 기록), B: 제출 준비 패키지까지만. "제출을 대행하지 않습니다" 고지 상시 노출. `api_client.dart` 에도 제출 API 없음(`markSubmittedByUser` 는 상태 신고) |
| 주민등록번호 원문 금지 | 전체 코드에 주민번호 필드·입력 화면·패턴 없음. `onboarding_flow.dart` 본인인증은 PASS/카카오 토큰 → 서버 CI 처리 |
| 민감정보 별도 동의 | `ConsentType.sensitiveHealth` 를 ①과 분리된 개별 체크(온보딩), 개별 철회(마이) |
| 동의 4층 분리, ③은 상담 신청 시점 | 온보딩은 ①②④만. ③은 `contracts_screen.dart` 의 "전문가에게 점검받기" 클릭 시 모달, `requestConsultation` 요청 본문에만 실림 |
| "전문가 상담 신청" 프레임 | 상담 관련 문구 전부 "전문가 상담/점검 신청". 상품 권유성 문구 없음 |
| 면책 문구 + '예상' 접두 + 산출 근거 | `DisclaimerFooter`(홈·환급금 예측 뷰 고정), `AmountBadge.estimated`('예상' 접두), `EstimateCard`(산출 근거 펼침 + 소멸시효 D-day). `EstimatedRefund.fromJson` 은 disclaimer 누락 응답을 거부 |
| 확정/예측 혼용 금지 | `ConfirmedBenefit` / `EstimatedRefund` 클래스 분리, `AmountBadge` 확정(채움)·예상(외곽선) 스타일 분리 |

## 다음 단계

1. `flutter create .` 후 `flutter analyze` / `flutter test` 통과 확인
2. 본인인증 SDK(PASS/카카오) 연동 → `ApiClient.verifyIdentity` 연결
3. 각 화면 스텁 Provider 를 `FutureProvider` + `ApiClient` 호출로 교체
4. 실손24 딥링크(`url_launcher`), 서류 촬영/업로드(OCR) 연동
