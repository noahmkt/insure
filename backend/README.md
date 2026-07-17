# insure-backend — 백엔드 API 서버 (Phase 1 코어)

NestJS(TypeScript). 사양서 §4·§7의 핵심 모듈을 구현하고, 법적 하드 룰을 **코드 레벨에서 강제**한다.

## 실행

```bash
npm install
npm run build && npm test   # 컴파일 + 단위/플로우 테스트
npm run start:dev           # http://localhost:3000
docker compose up -d        # (선택) PostgreSQL — migrations/ 자동 적용
```

데모 인증: `POST /api/v1/auth/verify` 로 받은 `accessToken` 을 `Authorization: Bearer` 로 사용.
현재 저장소는 인메모리(`store/store.service.ts`)이며, 운영 전환 시 `migrations/001_init.sql`
스키마(PostgreSQL, core/medical 스키마·롤 분리)로 교체한다 — 서비스 계층은 저장소 인터페이스만 사용.

## 구조와 하드 룰 매핑

| 모듈 | 역할 | 강제되는 하드 룰 |
|---|---|---|
| `common/policy.ts` | 면책 문구·표기 정책 공통 상수 | 룰 7 (예측액 면책 문구·"예상" 접두) |
| `common/logging/rrn-mask.ts` | 로그 주민번호 마스킹 필터 (main.ts 전역 로거) | 룰 2 (주민번호 잔존 금지) |
| `matching/` | 담보 매칭 엔진 — 세대별 파라미터 외부화, 산출 근거 문자열, UNDETERMINED 라벨 | §7.1 (금액 있으면 근거 필수) |
| `providers/` | `MedicalDataProvider`/`InsuranceContractProvider` 인터페이스 + CODEF 목 구현 | §7.2 (어댑터 교체), 룰 2 (CI pass-through) |
| `consents/` | 동의 4층 append-only 이력, 민감정보 게이트, 포괄 ③동의 400 거부 | 룰 3·4·5 |
| `refunds/` | 확정액/예측액 DTO 분리, disclaimer 직렬화 강제 | §2, 룰 7 |
| `claims/` | A/B 라우팅, 서류 매트릭스 체크리스트, 제출 준비 패키지. **제출 API 없음** — `SUBMITTED_BY_USER` 는 본인 신고 전이 | 룰 1 |
| `consultations/` | 상담 신청 시점 ③동의 수집 + 증적 연결(리드 자동 첨부) | 룰 4·6 |
| `admin/` | 배정 담당자만 민감정보 열람 + 전건 감사 로그 | 룰 3, §9 |

## 테스트

- `matching/engine.spec.ts` — 세대별 공제 계산·한도·소멸시효·UNDETERMINED 경계 12케이스
- `flows.spec.ts` — 동의 게이트 403, 면책 문구 전건 포함, 라우팅 A/B, 상태 전이, 리드 동의 증적, 감사 로그
- `common/logging/rrn-mask.spec.ts` — 주민번호 마스킹(하이픈 유무·오탐 방지)
