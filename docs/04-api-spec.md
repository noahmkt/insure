# API 명세 — 앱 ↔ 백엔드 REST + 어댑터 인터페이스

- Base URL: `/api/v1` · 인증: 본인인증 후 발급되는 JWT(Bearer) · 전 구간 TLS 1.3
- 에러 포맷: `{ "error": { "code": "CONSENT_REQUIRED", "message": "...", "detail": {} } }`
- 공통 규칙: 예측액을 담는 모든 응답에는 `disclaimer` 필드가 직렬화 단계에서 강제 포함된다.

## 1. 인증/회원

| Method | Path | 설명 |
|---|---|---|
| POST | `/auth/verify` | 본인인증 결과 토큰 교환 → CI 수신 → 계정 생성/로그인. **주민번호 파라미터 없음** |
| POST | `/auth/refresh` | 토큰 갱신 |
| DELETE | `/users/me` | 회원 탈퇴 — 즉시 파기 처리 + 파기 완료 알림. 법정 보존분 분리 |

```jsonc
// POST /auth/verify  요청
{ "provider": "PASS", "verificationToken": "..." }
// 응답
{ "accessToken": "...", "isNewUser": true }
```

## 2. 동의 (4층)

| Method | Path | 설명 |
|---|---|---|
| GET | `/consents` | 내 동의 현황(유형별 최신 상태 + 이력) |
| POST | `/consents` | 동의 부여 `{type, documentVersion, method, context?}` |
| DELETE | `/consents/:type` | 철회 — 응답에 기능 영향 범위(`impacts`) 포함 |

- `type ∈ PERSONAL_INFO | SENSITIVE_HEALTH | THIRD_PARTY | MARKETING`
- `THIRD_PARTY` 는 상담 신청 플로우에서만 부여 가능(`context` 에 신청 건 연결). 포괄 부여 시 400.
- 민감정보 API(진료내역·매칭)는 `SENSITIVE_HEALTH` 유효 동의 없으면 `403 CONSENT_REQUIRED`.

## 3. 데이터 연동 (비동기 잡)

| Method | Path | 설명 |
|---|---|---|
| POST | `/sync/contracts` | 내보험찾아줌 조회 잡 시작(간편인증 플로우) |
| POST | `/sync/medical` | 건보공단 진료내역 조회 잡 시작 |
| GET | `/sync/jobs/:id` | 잡 상태 폴링 `{status, progress, error?}` |
| POST | `/sync/jobs/:id/callback` | 간편인증 완료 웹훅(어댑터 → 서버) |

- 캐싱 정책: 진료내역 주 1회 / 계약 월 1회 자동, 수동 갱신 즉시. 캐시 유효 시 `304`성 응답(`cached: true`).

## 4. 내 보험

| Method | Path | 설명 |
|---|---|---|
| GET | `/contracts` | 통합 리스트(보험사·상품·보장·납입기간·월 보험료, 실손 세대 태그) |
| GET | `/contracts/:id` | 상세(담보 요약, 자기부담률, 시작/만기일) |
| GET | `/contracts/alerts/duplicate-silson` | 실손 중복 가입 감지 결과 |

## 5. 환급금

| Method | Path | 설명 |
|---|---|---|
| GET | `/benefits/confirmed` | 숨은보험금(확정액) 리스트 + 수령 안내 채널 |
| GET | `/refunds/estimated` | 미청구 실비(예측액) — 정렬 `sort=amount|expiry` |

```jsonc
// GET /refunds/estimated 응답 (요소)
{
  "medicalRecordId": "…",
  "hospitalName": "서울정형외과",
  "treatmentDate": "2025-11-02",
  "copayTotal": 48000,
  "estimate": {                      // verdict=CLAIMABLE 일 때만 존재
    "label": "예상 환급액",           // '예상' 접두 강제
    "amount": 33000,
    "formula": "3세대 통원(급여): 48,000 - max(15,000, 48,000×10%) = 33,000",
    "ruleVersion": "silson-v1"
  },
  "verdict": "CLAIMABLE",            // NOT_CLAIMABLE | UNDETERMINED("검토 필요", 금액 미표기)
  "statuteExpiresOn": "2028-11-02",
  "disclaimer": "실제 지급액은 보험사 심사에 따라 달라질 수 있습니다."
}
```

## 6. 간편청구

| Method | Path | 설명 |
|---|---|---|
| GET | `/claims/hospitals` | 진료내역 기반 병원 리스트(+수동 추가 POST) |
| POST | `/claims/route-check` | 선택 진료건 → A/B 라우팅 판별 `{route: SILSON24|MANUAL, guide}` |
| POST | `/claims` | 청구건 생성(진료건 다중 선택) |
| GET | `/claims/:id/checklist` | 필요서류 체크리스트(매트릭스 기반 자동 생성) — MANUAL 전용 |
| POST | `/claims/:id/documents` | 서류 업로드(멀티파트) → OCR 결과 반환 |
| POST | `/claims/:id/review-request` | (선택) 전문가 검토 요청 → 손해사정사 큐 |
| GET | `/claims/:id/package` | 제출 준비 완료 패키지: 접수 채널 안내 + 작성된 청구서 다운로드 URL |
| PATCH | `/claims/:id/status` | 상태 갱신 — **`SUBMITTED_BY_USER` 는 고객 본인 입력만 허용** |
| POST | `/claims/:id/paid` | 지급 확인 + 실지급액 입력 → 정확도 루프 축적 |
| POST | `/claims/:id/sign` | 위임장·동의서 전자서명 |

- 서버에는 "제출" API가 존재하지 않는다. `SUBMITTED_BY_USER` 상태 전이는 사용자 신고 기반.

## 7. 상담 (리드)

| Method | Path | 설명 |
|---|---|---|
| POST | `/consultations` | 상담 신청 `{kind: POLICY_REVIEW|ADJUSTER_REVIEW, thirdPartyConsent:{documentVersion,method}}` |
| GET | `/consultations` | 내 상담 내역(배정 담당자·상태) |

- `thirdPartyConsent` 가 요청 본문에 없고 유효 동의도 없으면 `409 THIRD_PARTY_CONSENT_REQUIRED` — 동의는 신청 시점에만 수집.

## 8. 알림 / 마이

| Method | Path | 설명 |
|---|---|---|
| GET | `/notifications` | 알림 목록 / `PATCH /:id/read` |
| GET | `/me/vault` | 위임장·청구서류 보관함(자동 파기 예정일 포함) |

## 9. 관리자 API (`/admin`, RBAC: OPERATOR/CONSULTANT/ADJUSTER/AUDITOR)

| Method | Path | 롤 | 설명 |
|---|---|---|---|
| GET | `/admin/dashboard` | 전체 | 가입·연동성공률·발굴·상담·전환율 |
| GET | `/admin/consultations` | OPERATOR, CONSULTANT | 상담 큐 |
| POST | `/admin/consultations/:id/assign` | OPERATOR | 담당자 배정(리드 전달 시 ③동의 증적 자동 첨부) |
| GET | `/admin/claims/:id/documents/:docId/view` | 배정 담당자만 | 뷰어 전용(다운로드 금지) + 감사 로그 기록 |
| POST | `/admin/claims/:id/fix-request` | CONSULTANT, ADJUSTER | 보완 요청(고객 푸시) |
| CRUD | `/admin/document-matrix` | OPERATOR | 필요서류 매트릭스 |
| CRUD | `/admin/matching-parameters` | OPERATOR | 세대별 공제 파라미터(버전 이력) |
| GET | `/admin/audit-logs` | AUDITOR | 민감정보 열람 이력 |
| GET | `/admin/accuracy` | 전체 | 예측 vs 실지급 오차 대시보드 |

- 민감정보 열람은 "상담 신청 고객 건 + 배정 담당자"로 서버에서 강제. 모든 열람은 `audit_logs` 기록.

## 10. 어댑터 인터페이스 (내부)

어댑터 추상화 필수 — 스크래핑 → 공식 API 무중단 교체를 위해 인터페이스와 구현을 분리한다.

```typescript
/** 진료내역 소스 (Phase1: CODEF건보공단 → Phase3: 건강정보고속도로) */
interface MedicalDataProvider {
  readonly sourceId: string;                       // 'CODEF' | 'MYHEALTHWAY' | ...
  startFetch(ci: string, auth: EasyAuthRequest): Promise<JobHandle>;  // 간편인증 시작
  poll(job: JobHandle): Promise<JobStatus>;
  fetchMedicalRecords(job: JobHandle): Promise<MedicalRecordRaw[]>;   // 완료 후 수신
  healthCheck(): Promise<HealthStatus>;
}

/** 보험계약 소스 (Phase1: CODEF내보험찾아줌 → Phase3: 보험사/실손24 제휴) */
interface InsuranceContractProvider {
  readonly sourceId: string;
  startFetch(ci: string, auth: EasyAuthRequest): Promise<JobHandle>;
  poll(job: JobHandle): Promise<JobStatus>;
  fetchInsuranceContracts(job: JobHandle): Promise<ContractRaw[]>;
  fetchConfirmedBenefits(job: JobHandle): Promise<ConfirmedBenefitRaw[]>; // 숨은보험금
  healthCheck(): Promise<HealthStatus>;
}
```

- `ci` 는 호출 시 복호화되어 메모리에서만 사용. 어댑터가 주민번호를 요구하는 경우 pass-through 파라미터로만 전달하고 어떤 경로(로그·APM·백업)에도 기록하지 않는다.
- 소스별 헬스체크 실패 시: 사용자 안내 배너 + 재시도 큐. 코어 기능(기수신 데이터 열람)은 격리되어 계속 동작.
