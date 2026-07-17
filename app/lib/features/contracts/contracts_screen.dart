/// 탭 2 — 내 보험 (docs/02-wireframes.md §3).
///
/// [법적 하드 룰]
/// - "상품 권유" 성 문구 금지 — "전문가 상담 신청" 프레임만 사용.
/// - ③제3자 제공 동의는 상담 신청 버튼 클릭 시점에 모달로만 수집(§3-1).
///   동의는 선택이며, 미동의 시 상담 신청만 제한된다.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.dart';
import '../../common/format.dart';

/// 보험 계약 스텁 데이터.
/// TODO(스캐폴드): apiClient.getContracts() FutureProvider 로 교체.
final contractsProvider = Provider<List<InsuranceContract>>((ref) {
  return <InsuranceContract>[
    InsuranceContract(
      id: 'c-001',
      insurerName: '삼성화재',
      productName: '실손의료비보장보험',
      silsonGeneration: 3,
      copaySummary: '자기부담 급여 10% / 비급여 20%',
      monthlyPremium: 32000,
      coverageEndDate: DateTime(2039, 5, 1),
    ),
    const InsuranceContract(
      id: 'c-002',
      insurerName: '한화생명',
      productName: '종신보험',
      monthlyPremium: 89000,
    ),
  ];
});

class ContractsScreen extends ConsumerWidget {
  const ContractsScreen({super.key});

  /// ③ 제3자 제공 동의 모달 — 상담 신청 클릭 시점에만 표시.
  Future<void> _showThirdPartyConsentModal(BuildContext context) async {
    bool agreed = false;
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return AlertDialog(
              title: const Text('전문가 상담을 위한 정보 제공 동의'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text('전문가 상담을 위해 아래 정보 제공에 동의해 주세요.'),
                  const SizedBox(height: 12),
                  const Text('· 제공받는 자: 배정 설계사(제휴 GA)'),
                  const Text('· 제공 항목: 이름·연락처·보험 요약'),
                  const Text('· 보유 기간: 상담 종료 후 3개월'),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    value: agreed,
                    onChanged: (bool? v) => setModalState(() => agreed = v ?? false),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text('동의합니다 (선택)', style: TextStyle(fontSize: 14)),
                    subtitle: const Text(
                      '동의하지 않아도 다른 기능은 모두 이용할 수 있어요. 상담 신청만 제한돼요.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
              actions: <Widget>[
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('취소'),
                ),
                FilledButton(
                  onPressed: agreed
                      ? () => Navigator.of(dialogContext).pop(true)
                      : null,
                  child: const Text('동의하고 상담 신청'),
                ),
              ],
            );
          },
        );
      },
    );

    if (confirmed == true && context.mounted) {
      // TODO(스캐폴드): apiClient.requestConsultation(
      //   kind: ConsultationKind.policyReview,
      //   thirdPartyConsentDocumentVersion: 'third-party-v1',
      // ) — ③동의는 이 요청 본문에만 실어 보낸다.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('전문가 상담 신청이 접수되었습니다. 담당자 배정 후 알려드릴게요.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<InsuranceContract> contracts = ref.watch(contractsProvider);
    // TODO(스캐폴드): apiClient.checkDuplicateSilson() 결과로 교체.
    const bool duplicateSilsonDetected = true;

    return Scaffold(
      appBar: AppBar(title: const Text('내 보험')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: <Widget>[
          if (duplicateSilsonDetected)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: <Widget>[
                  Icon(Icons.warning_amber, color: Color(0xFFE65100)),
                  SizedBox(width: 8),
                  Expanded(child: Text('실손 중복 가입이 감지되었어요. 상세에서 확인해 주세요.')),
                ],
              ),
            ),
          for (final InsuranceContract contract in contracts)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                title: Text('${contract.insurerName} ${contract.productName}'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (contract.silsonGeneration != null)
                      Text('실손 ${contract.silsonGeneration}세대 · ${contract.copaySummary ?? ''}'),
                    Text(
                      <String>[
                        if (contract.monthlyPremium != null)
                          '월 ${formatWon(contract.monthlyPremium!)}',
                        if (contract.coverageEndDate != null)
                          '~${formatDate(contract.coverageEndDate!)}',
                      ].join(' · '),
                    ),
                  ],
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // TODO(스캐폴드): 상품 상세(주요 담보 요약/자기부담률/만기일) 화면.
                },
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton(
              onPressed: () => _showThirdPartyConsentModal(context),
              child: const Text('내 보험, 전문가에게 점검받기'),
            ),
          ),
        ],
      ),
    );
  }
}
