/// 백엔드 REST 클라이언트 스텁 — docs/04-api-spec.md 기준.
///
/// - Base URL: http://localhost:3000/api/v1
/// - 인증: 본인인증 후 발급되는 JWT Bearer 토큰
/// - [법적 하드 룰] "제출" API 는 존재하지 않는다. markSubmittedByUser 는
///   고객 본인의 신고 입력을 상태로 기록할 뿐이다.
library;

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'models.dart';

/// 액세스 토큰 상태 (본인인증 완료 시 세팅).
final authTokenProvider = StateProvider<String?>((ref) => null);

/// API 클라이언트 프로바이더.
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(token: ref.watch(authTokenProvider));
});

class ApiClient {
  ApiClient({this.token, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  static const String baseUrl = 'http://localhost:3000/api/v1';

  final String? token;
  final http.Client _http;

  Map<String, String> get _headers => <String, String>{
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Uri _uri(String path, [Map<String, String>? query]) {
    return Uri.parse('$baseUrl$path').replace(queryParameters: query);
  }

  Future<dynamic> _get(String path, {Map<String, String>? query}) async {
    final http.Response res = await _http.get(_uri(path, query), headers: _headers);
    return _decode(res);
  }

  Future<dynamic> _post(String path, {Object? body}) async {
    final http.Response res = await _http.post(
      _uri(path),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> _patch(String path, {Object? body}) async {
    final http.Response res = await _http.patch(
      _uri(path),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> _delete(String path) async {
    final http.Response res = await _http.delete(_uri(path), headers: _headers);
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final dynamic parsed = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return parsed;
    }
    if (parsed is Map<String, dynamic> && parsed['error'] is Map<String, dynamic>) {
      final Map<String, dynamic> error = parsed['error'] as Map<String, dynamic>;
      throw ApiException(
        code: error['code'] as String? ?? 'UNKNOWN',
        message: error['message'] as String? ?? '알 수 없는 오류가 발생했습니다.',
        statusCode: res.statusCode,
      );
    }
    throw ApiException(
      code: 'HTTP_${res.statusCode}',
      message: '서버 응답 오류가 발생했습니다.',
      statusCode: res.statusCode,
    );
  }

  // ── 1. 인증/회원 ──────────────────────────────────────────────
  // 주민번호 파라미터 없음: 본인인증 결과 토큰만 교환한다(CI 는 서버에서 수신).

  Future<AuthResult> verifyIdentity({
    required String provider, // 'PASS' | 'KAKAO'
    required String verificationToken,
  }) async {
    final dynamic json = await _post('/auth/verify', body: <String, String>{
      'provider': provider,
      'verificationToken': verificationToken,
    });
    return AuthResult.fromJson(json as Map<String, dynamic>);
  }

  Future<void> deleteAccount() => _delete('/users/me');

  // ── 2. 동의 (4층 분리 — 포괄 동의 금지) ───────────────────────

  Future<List<Consent>> getConsents() async {
    final dynamic json = await _get('/consents');
    return (json as List<dynamic>)
        .map((e) => Consent.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// 동의 부여. THIRD_PARTY 는 상담 신청 플로우에서만 context 와 함께 부여 가능.
  Future<void> grantConsent({
    required ConsentType type,
    required String documentVersion,
    String method = 'APP_CHECKBOX',
    Map<String, dynamic>? context,
  }) {
    return _post('/consents', body: <String, dynamic>{
      'type': type.wire,
      'documentVersion': documentVersion,
      'method': method,
      if (context != null) 'context': context,
    });
  }

  Future<void> revokeConsent(ConsentType type) => _delete('/consents/${type.wire}');

  // ── 3. 데이터 연동 (비동기 잡) ────────────────────────────────

  Future<SyncJob> startContractSync() async {
    final dynamic json = await _post('/sync/contracts');
    return SyncJob.fromJson(json as Map<String, dynamic>);
  }

  Future<SyncJob> startMedicalSync() async {
    final dynamic json = await _post('/sync/medical');
    return SyncJob.fromJson(json as Map<String, dynamic>);
  }

  Future<SyncJob> getSyncJob(String jobId) async {
    final dynamic json = await _get('/sync/jobs/$jobId');
    return SyncJob.fromJson(json as Map<String, dynamic>);
  }

  // ── 4. 내 보험 ────────────────────────────────────────────────

  Future<List<InsuranceContract>> getContracts() async {
    final dynamic json = await _get('/contracts');
    return (json as List<dynamic>)
        .map((e) => InsuranceContract.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<bool> checkDuplicateSilson() async {
    final dynamic json = await _get('/contracts/alerts/duplicate-silson');
    return (json as Map<String, dynamic>)['detected'] as bool? ?? false;
  }

  // ── 5. 환급금 ─────────────────────────────────────────────────

  /// 숨은보험금(확정액) — ConfirmedBenefit 클래스로만 수신.
  Future<List<ConfirmedBenefit>> getConfirmedBenefits() async {
    final dynamic json = await _get('/benefits/confirmed');
    return (json as List<dynamic>)
        .map((e) => ConfirmedBenefit.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// 미청구 실비(예측액) — disclaimer 필수. sort: 'amount' | 'expiry'.
  Future<List<EstimatedRefund>> getEstimatedRefunds({String sort = 'amount'}) async {
    final dynamic json = await _get('/refunds/estimated', query: <String, String>{'sort': sort});
    return (json as List<dynamic>)
        .map((e) => EstimatedRefund.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── 6. 간편청구 ───────────────────────────────────────────────

  Future<ClaimRouteResult> checkClaimRoute(List<String> medicalRecordIds) async {
    final dynamic json = await _post('/claims/route-check', body: <String, dynamic>{
      'medicalRecordIds': medicalRecordIds,
    });
    return ClaimRouteResult.fromJson(json as Map<String, dynamic>);
  }

  Future<String> createClaim(List<String> medicalRecordIds) async {
    final dynamic json = await _post('/claims', body: <String, dynamic>{
      'medicalRecordIds': medicalRecordIds,
    });
    return (json as Map<String, dynamic>)['id'] as String;
  }

  Future<List<ChecklistItem>> getClaimChecklist(String claimId) async {
    final dynamic json = await _get('/claims/$claimId/checklist');
    return (json as List<dynamic>)
        .map((e) => ChecklistItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// 제출 준비 완료 패키지: 접수 채널 안내 + 작성된 청구서 다운로드 URL.
  /// 서버가 보험사에 제출하는 것이 아니다 — 안내 자료만 제공한다.
  Future<Map<String, dynamic>> getClaimPackage(String claimId) async {
    final dynamic json = await _get('/claims/$claimId/package');
    return json as Map<String, dynamic>;
  }

  /// 고객 본인이 보험사 채널에서 직접 제출을 마친 뒤, 그 사실을 스스로
  /// 기록(신고)하는 상태 전이. 앱/서버는 어떤 제출도 대행하지 않는다.
  Future<void> markSubmittedByUser(String claimId) {
    return _patch('/claims/$claimId/status', body: <String, String>{
      'status': ClaimStatus.submittedByUser.wire,
    });
  }

  Future<void> requestExpertReview(String claimId) {
    return _post('/claims/$claimId/review-request');
  }

  Future<void> reportPaidAmount(String claimId, int paidAmount) {
    return _post('/claims/$claimId/paid', body: <String, int>{'paidAmount': paidAmount});
  }

  // ── 7. 상담 (전문가 상담 신청 — 상품 권유 아님) ────────────────

  /// ③제3자 제공 동의는 이 호출(상담 신청) 시점에만 함께 전달한다.
  Future<void> requestConsultation({
    required ConsultationKind kind,
    required String thirdPartyConsentDocumentVersion,
  }) {
    return _post('/consultations', body: <String, dynamic>{
      'kind': kind.wire,
      'thirdPartyConsent': <String, String>{
        'documentVersion': thirdPartyConsentDocumentVersion,
        'method': 'APP_MODAL',
      },
    });
  }

  Future<List<Consultation>> getConsultations() async {
    final dynamic json = await _get('/consultations');
    return (json as List<dynamic>)
        .map((e) => Consultation.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
