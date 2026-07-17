/// 탭 4 — 간편청구 (docs/02-wireframes.md §5). 라우팅 분기 UI.
///
/// Step1 병원 선택 → Step2 진료건 선택 → Step3 자동 분기
///   A. 실손24 연계: 딥링크 안내 + "청구 완료로 표시"(사용자 신고 기반 상태 기록)
///   B. 미연계: 서류 체크리스트 → 업로드 자리 → 제출 준비 완료 패키지
///
/// [법적 하드 룰]
/// - 이 앱에는 "제출" 실행 기능이 없다. 최종 제출은 고객 본인이 보험사
///   공식 채널에서 직접 수행하며, 앱은 준비물과 경로만 안내한다.
/// - "청구 완료로 표시"는 제출 행위가 아니라 본인이 마친 제출을 기록하는 것.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.dart';
import '../../common/format.dart';

/// 진료건 선택용 간단 뷰모델(스캐폴드).
class _MedicalRecordItem {
  const _MedicalRecordItem({
    required this.id,
    required this.date,
    required this.kind,
    required this.copay,
  });

  final String id;
  final String date;
  final String kind;
  final int copay;
}

class ClaimsScreen extends ConsumerStatefulWidget {
  const ClaimsScreen({super.key});

  @override
  ConsumerState<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends ConsumerState<ClaimsScreen> {
  int _step = 0; // 0: 병원 선택, 1: 진료건 선택, 2: 분기 결과
  String? _selectedHospital;
  final Set<String> _selectedRecordIds = <String>{};
  ClaimRouteType? _route;

  // TODO(스캐폴드): apiClient — GET /claims/hospitals 로 교체.
  static const Map<String, int> _hospitals = <String, int>{
    '서울정형외과': 3,
    '김안과': 1,
  };

  // TODO(스캐폴드): 진료내역 API 연동으로 교체.
  static const List<_MedicalRecordItem> _records = <_MedicalRecordItem>[
    _MedicalRecordItem(id: 'm-001', date: '2025.11.02', kind: '통원', copay: 48000),
    _MedicalRecordItem(id: 'm-002', date: '2025.11.09', kind: '통원', copay: 31000),
    _MedicalRecordItem(id: 'm-003', date: '2025.12.01', kind: '약제', copay: 8000),
  ];

  void _checkRoute() {
    // TODO(스캐폴드): apiClient.checkClaimRoute(_selectedRecordIds.toList()) 로 교체.
    // 스텁: 서울정형외과는 실손24 연계, 그 외 미연계로 가정.
    setState(() {
      _route = _selectedHospital == '서울정형외과'
          ? ClaimRouteType.silson24
          : ClaimRouteType.manual;
      _step = 2;
    });
  }

  void _reset() {
    setState(() {
      _step = 0;
      _selectedHospital = null;
      _selectedRecordIds.clear();
      _route = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('간편청구'),
        leading: _step > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step -= 1),
              )
            : null,
        actions: <Widget>[
          if (_step > 0)
            TextButton(onPressed: _reset, child: const Text('처음부터')),
        ],
      ),
      body: switch (_step) {
        0 => _buildHospitalStep(),
        1 => _buildRecordStep(),
        _ => _route == ClaimRouteType.silson24
            ? _buildSilson24Route()
            : _buildManualRoute(),
      },
    );
  }

  /// Step1 — 병원 선택.
  Widget _buildHospitalStep() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        const Text('청구할 병원을 선택해 주세요',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        for (final MapEntry<String, int> entry in _hospitals.entries)
          Card(
            child: ListTile(
              title: Text(entry.key),
              subtitle: Text('미청구 진료 ${entry.value}건'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                setState(() {
                  _selectedHospital = entry.key;
                  _step = 1;
                });
              },
            ),
          ),
        TextButton.icon(
          onPressed: () {
            // TODO(스캐폴드): 병원 수동 추가 폼.
          },
          icon: const Icon(Icons.add),
          label: const Text('병원 수동 추가'),
        ),
      ],
    );
  }

  /// Step2 — 진료건 다중 선택.
  Widget _buildRecordStep() {
    return Column(
      children: <Widget>[
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: <Widget>[
              Text('$_selectedHospital 진료건을 선택해 주세요',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              for (final _MedicalRecordItem record in _records)
                CheckboxListTile(
                  value: _selectedRecordIds.contains(record.id),
                  onChanged: (bool? checked) {
                    setState(() {
                      if (checked ?? false) {
                        _selectedRecordIds.add(record.id);
                      } else {
                        _selectedRecordIds.remove(record.id);
                      }
                    });
                  },
                  title: Text('${record.date} ${record.kind} ${formatWon(record.copay)}'),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _selectedRecordIds.isEmpty ? null : _checkRoute,
              child: const Text('청구 경로 확인하기'),
            ),
          ),
        ),
      ],
    );
  }

  /// Step3-A — 실손24 연계 병원: 딥링크 안내 + 사용자 신고 기반 상태 기록.
  /// 우리 시스템은 서류를 만지지 않고, 상태만 사용자 입력으로 트래킹한다.
  Widget _buildSilson24Route() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        const Card(
          color: Color(0xFFE8F5E9),
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: <Widget>[
                Icon(Icons.check_circle, color: Color(0xFF2E7D32)),
                SizedBox(width: 12),
                Expanded(
                  child: Text('이 병원은 서류 없이 실손24 앱으로 바로 청구할 수 있어요.'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () {
            // TODO(스캐폴드): url_launcher 로 실손24 딥링크 실행.
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('실손24 앱으로 이동합니다. (딥링크 자리)')),
            );
          },
          icon: const Icon(Icons.open_in_new),
          label: const Text('실손24 앱 열기'),
        ),
        const SizedBox(height: 16),
        const Text('단계별 가이드', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        const Text('1. 실손24 앱에서 본인인증 후 병원·진료일을 선택해요.'),
        const Text('2. 청구 정보를 확인하고 실손24에서 직접 청구를 진행해요.'),
        const Text('3. 청구를 마치면 아래 버튼으로 상태를 알려주세요.'),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () async {
            // 사용자 신고 기반 상태 전이(SUBMITTED_BY_USER).
            // TODO(스캐폴드): apiClient.markSubmittedByUser(claimId) 호출.
            final bool? ok = await showDialog<bool>(
              context: context,
              builder: (BuildContext dialogContext) => AlertDialog(
                title: const Text('청구 완료로 표시할까요?'),
                content: const Text('실손24에서 본인이 직접 청구를 마친 경우에만 표시해 주세요. 이 앱이 청구를 대신 제출하는 것은 아니에요.'),
                actions: <Widget>[
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: const Text('아니요'),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: const Text('네, 청구를 마쳤어요'),
                  ),
                ],
              ),
            );
            if (ok == true && mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('청구 완료로 표시했어요. 지급 확인까지 알림으로 챙겨드릴게요.')),
              );
            }
          },
          child: const Text('청구 완료로 표시'),
        ),
        const SizedBox(height: 16),
        _buildNoProxyNotice(),
      ],
    );
  }

  /// Step3-B — 미연계 병원: 체크리스트 → 업로드 자리 → 제출 준비 패키지.
  Widget _buildManualRoute() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        const Text('필요서류 체크리스트',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('보험사·청구유형·금액 기준으로 자동 구성했어요.',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
        const SizedBox(height: 8),
        // TODO(스캐폴드): apiClient.getClaimChecklist(claimId) 로 교체.
        const _ChecklistTile(label: '진료비 영수증'),
        const _ChecklistTile(label: '진료비 세부내역서'),
        const _ChecklistTile(label: '통원확인서 (10만원 초과 시)'),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () {
            // TODO(스캐폴드): 카메라/갤러리 업로드 + OCR(금액·항목 자동인식) 연동 자리.
          },
          icon: const Icon(Icons.photo_camera_outlined),
          label: const Text('서류 촬영/업로드'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () {
            // TODO(스캐폴드): apiClient.requestExpertReview(claimId) — 손해사정사 큐.
          },
          icon: const Icon(Icons.fact_check_outlined),
          label: const Text('전문가 검토 요청 (선택)'),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () {
            // TODO(스캐폴드): apiClient.getClaimPackage(claimId) —
            // 보험사 접수 채널 안내 + 작성 완료된 청구서 다운로드 URL 표시.
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('제출 준비 패키지가 준비되면 보험사 접수 채널 안내와 함께 알려드려요.'),
              ),
            );
          },
          icon: const Icon(Icons.folder_zip_outlined),
          label: const Text('제출 준비 완료 패키지 만들기'),
        ),
        const SizedBox(height: 16),
        _buildNoProxyNotice(),
      ],
    );
  }

  /// 청구 대행 금지 고지 — A/B 라우트 공통 고정 노출.
  Widget _buildNoProxyNotice() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F6F8),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '※ 내보험 찾기는 청구 제출을 대행하지 않습니다. 최종 제출은 고객님이 보험사 공식 채널(앱·홈페이지·팩스·방문)에서 직접 진행하시며, 저희는 준비물과 경로를 안내해 드립니다.',
        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
      ),
    );
  }
}

class _ChecklistTile extends StatefulWidget {
  const _ChecklistTile({required this.label});

  final String label;

  @override
  State<_ChecklistTile> createState() => _ChecklistTileState();
}

class _ChecklistTileState extends State<_ChecklistTile> {
  bool _checked = false;

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      value: _checked,
      onChanged: (bool? v) => setState(() => _checked = v ?? false),
      title: Text(widget.label),
      controlAffinity: ListTileControlAffinity.leading,
      contentPadding: EdgeInsets.zero,
    );
  }
}
