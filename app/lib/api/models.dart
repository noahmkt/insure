/// docs/04-api-spec.md 의 DTO 를 반영한 모델 클래스.
///
/// [법적 하드 룰]
/// - 주민등록번호 필드는 어떤 모델에도 존재하지 않는다(CI 기반, 서버 관리).
/// - 예측액을 담는 [EstimatedRefund] 는 disclaimer 필드가 필수이며,
///   확정액 [ConfirmedBenefit] 과 클래스가 분리되어 있다.
library;

/// POST /auth/verify 응답. 주민번호 파라미터/필드 없음 — CI 는 서버에서만 처리.
class AuthResult {
  const AuthResult({required this.accessToken, required this.isNewUser});

  final String accessToken;
  final bool isNewUser;

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      accessToken: json['accessToken'] as String,
      isNewUser: json['isNewUser'] as bool? ?? false,
    );
  }
}

/// 동의 4층 유형 — 포괄 동의 없음. 각 층은 개별 부여/철회된다.
enum ConsentType {
  /// ① 개인정보 수집·이용 (필수)
  personalInfo('PERSONAL_INFO'),

  /// ② 민감정보(건강·진료) 처리 (데이터 연동에만 필요)
  sensitiveHealth('SENSITIVE_HEALTH'),

  /// ③ 제3자 제공 — 상담 신청 클릭 시점에만 수집 가능. 온보딩에서 금지.
  thirdParty('THIRD_PARTY'),

  /// ④ 마케팅 정보 수신 (선택)
  marketing('MARKETING');

  const ConsentType(this.wire);

  /// 서버 전송용 문자열 값.
  final String wire;

  static ConsentType fromWire(String value) {
    return ConsentType.values.firstWhere((e) => e.wire == value);
  }
}

/// GET /consents 응답 요소.
class Consent {
  const Consent({
    required this.type,
    required this.granted,
    this.documentVersion,
    this.grantedAt,
  });

  final ConsentType type;
  final bool granted;
  final String? documentVersion;
  final DateTime? grantedAt;

  factory Consent.fromJson(Map<String, dynamic> json) {
    return Consent(
      type: ConsentType.fromWire(json['type'] as String),
      granted: json['granted'] as bool? ?? false,
      documentVersion: json['documentVersion'] as String?,
      grantedAt: json['grantedAt'] == null
          ? null
          : DateTime.parse(json['grantedAt'] as String),
    );
  }
}

/// GET /sync/jobs/:id 응답 — 비동기 연동 잡 상태.
class SyncJob {
  const SyncJob({
    required this.id,
    required this.status,
    required this.progress,
    this.error,
    this.cached = false,
  });

  final String id;
  final String status;
  final int progress;
  final String? error;
  final bool cached;

  factory SyncJob.fromJson(Map<String, dynamic> json) {
    return SyncJob(
      id: json['id'] as String,
      status: json['status'] as String,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      error: json['error'] as String?,
      cached: json['cached'] as bool? ?? false,
    );
  }
}

/// GET /contracts 응답 요소 — 보험 계약(실손 세대 태그 포함).
class InsuranceContract {
  const InsuranceContract({
    required this.id,
    required this.insurerName,
    required this.productName,
    this.silsonGeneration,
    this.copaySummary,
    this.monthlyPremium,
    this.coverageEndDate,
  });

  final String id;
  final String insurerName;
  final String productName;

  /// 실손 세대(1~4). 실손 상품이 아니면 null.
  final int? silsonGeneration;

  /// 자기부담 요약 표기 (예: "급여 10% / 비급여 20%").
  final String? copaySummary;
  final int? monthlyPremium;
  final DateTime? coverageEndDate;

  factory InsuranceContract.fromJson(Map<String, dynamic> json) {
    return InsuranceContract(
      id: json['id'] as String,
      insurerName: json['insurerName'] as String,
      productName: json['productName'] as String,
      silsonGeneration: (json['silsonGeneration'] as num?)?.toInt(),
      copaySummary: json['copaySummary'] as String?,
      monthlyPremium: (json['monthlyPremium'] as num?)?.toInt(),
      coverageEndDate: json['coverageEndDate'] == null
          ? null
          : DateTime.parse(json['coverageEndDate'] as String),
    );
  }
}

/// GET /benefits/confirmed 응답 요소 — 숨은보험금 "확정액".
///
/// 예측액 [EstimatedRefund] 와 절대 혼용하지 않도록 클래스를 분리한다.
/// 확정액이므로 disclaimer·산출 근거 필드가 없다.
class ConfirmedBenefit {
  const ConfirmedBenefit({
    required this.id,
    required this.insurerName,
    required this.benefitKind,
    required this.amount,
    required this.claimChannelGuide,
  });

  final String id;
  final String insurerName;

  /// 예: "휴면보험금", "중도보험금"
  final String benefitKind;

  /// 확정 금액(원).
  final int amount;

  /// 수령 안내 채널(내보험찾아줌/보험사 채널 안내 문구).
  final String claimChannelGuide;

  factory ConfirmedBenefit.fromJson(Map<String, dynamic> json) {
    return ConfirmedBenefit(
      id: json['id'] as String,
      insurerName: json['insurerName'] as String,
      benefitKind: json['benefitKind'] as String,
      amount: (json['amount'] as num).toInt(),
      claimChannelGuide: json['claimChannelGuide'] as String? ?? '',
    );
  }
}

/// 청구 가능 판정.
enum RefundVerdict {
  claimable('CLAIMABLE'),
  notClaimable('NOT_CLAIMABLE'),

  /// 산출 근거 부족 — 금액 미표기, "검토 필요" 라벨만 노출.
  undetermined('UNDETERMINED');

  const RefundVerdict(this.wire);

  final String wire;

  static RefundVerdict fromWire(String value) {
    return RefundVerdict.values.firstWhere(
      (e) => e.wire == value,
      orElse: () => RefundVerdict.undetermined,
    );
  }
}

/// 예측 산출 상세 — verdict 가 CLAIMABLE 일 때만 존재.
class RefundEstimate {
  const RefundEstimate({
    required this.label,
    required this.amount,
    required this.formula,
    required this.ruleVersion,
  });

  /// "예상 환급액" — '예상' 접두 강제.
  final String label;
  final int amount;

  /// 산출 근거 수식 (예: "3세대 통원(급여): 48,000 - max(15,000, 48,000×10%) = 33,000").
  final String formula;
  final String ruleVersion;

  factory RefundEstimate.fromJson(Map<String, dynamic> json) {
    return RefundEstimate(
      label: json['label'] as String? ?? '예상 환급액',
      amount: (json['amount'] as num).toInt(),
      formula: json['formula'] as String? ?? '',
      ruleVersion: json['ruleVersion'] as String? ?? '',
    );
  }
}

/// GET /refunds/estimated 응답 요소 — 미청구 실비 "예측액".
///
/// [법적 하드 룰] disclaimer 필드는 필수. 누락된 응답은 파싱 단계에서 거부한다.
class EstimatedRefund {
  const EstimatedRefund({
    required this.medicalRecordId,
    required this.hospitalName,
    required this.treatmentDate,
    required this.copayTotal,
    required this.verdict,
    required this.statuteExpiresOn,
    required this.disclaimer,
    this.estimate,
  });

  final String medicalRecordId;
  final String hospitalName;
  final DateTime treatmentDate;
  final int copayTotal;
  final RefundVerdict verdict;
  final DateTime statuteExpiresOn;

  /// 면책 문구 — 필수 필드. 예측액 노출 시 항상 함께 렌더링해야 한다.
  final String disclaimer;

  /// verdict == claimable 일 때만 존재.
  final RefundEstimate? estimate;

  factory EstimatedRefund.fromJson(Map<String, dynamic> json) {
    final Object? disclaimer = json['disclaimer'];
    if (disclaimer is! String || disclaimer.isEmpty) {
      throw const FormatException(
        'EstimatedRefund 응답에 disclaimer 필드가 없습니다. 예측액 응답은 면책 문구가 필수입니다.',
      );
    }
    return EstimatedRefund(
      medicalRecordId: json['medicalRecordId'] as String,
      hospitalName: json['hospitalName'] as String,
      treatmentDate: DateTime.parse(json['treatmentDate'] as String),
      copayTotal: (json['copayTotal'] as num).toInt(),
      verdict: RefundVerdict.fromWire(json['verdict'] as String),
      statuteExpiresOn: DateTime.parse(json['statuteExpiresOn'] as String),
      disclaimer: disclaimer,
      estimate: json['estimate'] == null
          ? null
          : RefundEstimate.fromJson(json['estimate'] as Map<String, dynamic>),
    );
  }
}

/// POST /claims/route-check 응답 — 간편청구 A/B 라우팅.
enum ClaimRouteType {
  /// A. 실손24 연계 병원 — 딥링크 안내.
  silson24('SILSON24'),

  /// B. 미연계 병원 — 체크리스트 → 업로드 → 제출 준비 패키지.
  manual('MANUAL');

  const ClaimRouteType(this.wire);

  final String wire;

  static ClaimRouteType fromWire(String value) {
    return ClaimRouteType.values.firstWhere(
      (e) => e.wire == value,
      orElse: () => ClaimRouteType.manual,
    );
  }
}

class ClaimRouteResult {
  const ClaimRouteResult({required this.route, required this.guide});

  final ClaimRouteType route;
  final String guide;

  factory ClaimRouteResult.fromJson(Map<String, dynamic> json) {
    return ClaimRouteResult(
      route: ClaimRouteType.fromWire(json['route'] as String),
      guide: json['guide'] as String? ?? '',
    );
  }
}

/// GET /claims/:id/checklist 응답 요소 (MANUAL 전용).
class ChecklistItem {
  const ChecklistItem({required this.name, required this.isRequired});

  final String name;

  /// 필수 서류 여부 (서버 JSON 키: "required").
  final bool isRequired;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) {
    return ChecklistItem(
      name: json['name'] as String,
      isRequired: json['required'] as bool? ?? true,
    );
  }
}

/// 청구 진행 상태 — 서버에 "제출" API 는 존재하지 않는다.
/// SUBMITTED_BY_USER 는 고객 본인의 신고 입력으로만 전이된다.
enum ClaimStatus {
  preparing('PREPARING', '서류준비'),
  reviewing('REVIEWING', '검토중'),
  submitGuided('SUBMIT_GUIDED', '제출안내완료'),
  submittedByUser('SUBMITTED_BY_USER', '제출완료(본인)'),
  paidConfirmed('PAID_CONFIRMED', '지급확인');

  const ClaimStatus(this.wire, this.labelKo);

  final String wire;
  final String labelKo;

  static ClaimStatus fromWire(String value) {
    return ClaimStatus.values.firstWhere(
      (e) => e.wire == value,
      orElse: () => ClaimStatus.preparing,
    );
  }
}

/// POST /consultations 요청의 상담 종류 — "상품 권유"가 아닌 전문가 상담 신청.
enum ConsultationKind {
  policyReview('POLICY_REVIEW', '보험 점검 상담'),
  adjusterReview('ADJUSTER_REVIEW', '손해사정 검토 상담');

  const ConsultationKind(this.wire, this.labelKo);

  final String wire;
  final String labelKo;
}

/// GET /consultations 응답 요소.
class Consultation {
  const Consultation({
    required this.id,
    required this.kind,
    required this.status,
    this.assigneeName,
  });

  final String id;
  final ConsultationKind kind;
  final String status;
  final String? assigneeName;

  factory Consultation.fromJson(Map<String, dynamic> json) {
    return Consultation(
      id: json['id'] as String,
      kind: ConsultationKind.values.firstWhere(
        (e) => e.wire == json['kind'] as String,
        orElse: () => ConsultationKind.policyReview,
      ),
      status: json['status'] as String? ?? '',
      assigneeName: json['assigneeName'] as String?,
    );
  }
}

/// 서버 공통 에러 포맷 `{ "error": { "code", "message" } }`.
class ApiException implements Exception {
  const ApiException({required this.code, required this.message, this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode/$code): $message';
}
