/// 탭 3 — 환급금 (docs/02-wireframes.md §4).
///
/// 세그먼트 토글: [숨은보험금(확정)] | [미청구 실비(예상)].
/// [법적 하드 룰]
/// - 확정액과 예측액은 클래스·스타일 모두 분리(ConfirmedBenefit vs EstimatedRefund).
/// - 예측액 뷰에는 DisclaimerFooter 를 반드시 렌더링한다.
/// - 산출 근거 없는 건(UNDETERMINED)은 금액 미표기, "검토 필요" 라벨만.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.dart';
import '../../common/amount_badge.dart';
import '../../common/disclaimer_footer.dart';
import '../../common/estimate_card.dart';

/// 숨은보험금(확정) 스텁 데이터.
/// TODO(스캐폴드): apiClient.getConfirmedBenefits() FutureProvider 로 교체.
final confirmedBenefitsProvider = Provider<List<ConfirmedBenefit>>((ref) {
  return const <ConfirmedBenefit>[
    ConfirmedBenefit(
      id: 'b-001',
      insurerName: '○○생명',
      benefitKind: '휴면보험금',
      amount: 120000,
      claimChannelGuide: '내보험찾아줌 또는 해당 보험사 고객센터에서 직접 수령을 신청하세요.',
    ),
  ];
});

/// 미청구 실비(예상) 스텁 데이터 — disclaimer 필수.
/// TODO(스캐폴드): apiClient.getEstimatedRefunds(sort: ...) FutureProvider 로 교체.
final estimatedRefundsProvider = Provider<List<EstimatedRefund>>((ref) {
  return <EstimatedRefund>[
    EstimatedRefund(
      medicalRecordId: 'm-001',
      hospitalName: '서울정형외과',
      treatmentDate: DateTime(2025, 11, 2),
      copayTotal: 48000,
      verdict: RefundVerdict.claimable,
      statuteExpiresOn: DateTime(2028, 11, 2),
      disclaimer: DisclaimerFooter.text,
      estimate: const RefundEstimate(
        label: '예상 환급액',
        amount: 33000,
        formula: '3세대 통원(급여): 48,000 - max(15,000, 48,000×10%) = 33,000',
        ruleVersion: 'silson-v1',
      ),
    ),
    EstimatedRefund(
      medicalRecordId: 'm-002',
      hospitalName: '김안과',
      treatmentDate: DateTime(2025, 12, 1),
      copayTotal: 8000,
      verdict: RefundVerdict.undetermined,
      statuteExpiresOn: DateTime(2028, 12, 1),
      disclaimer: DisclaimerFooter.text,
    ),
  ];
});

class RefundsScreen extends ConsumerStatefulWidget {
  const RefundsScreen({super.key, required this.onNavigateToTab});

  /// 하단 탭 인덱스 이동(3: 간편청구).
  final void Function(int tabIndex) onNavigateToTab;

  @override
  ConsumerState<RefundsScreen> createState() => _RefundsScreenState();
}

class _RefundsScreenState extends ConsumerState<RefundsScreen> {
  /// 0: 숨은보험금(확정), 1: 미청구 실비(예상)
  int _segment = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('환급금')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<int>(
              segments: const <ButtonSegment<int>>[
                ButtonSegment<int>(value: 0, label: Text('숨은보험금')),
                ButtonSegment<int>(value: 1, label: Text('미청구 실비')),
              ],
              selected: <int>{_segment},
              onSelectionChanged: (Set<int> selection) {
                setState(() => _segment = selection.first);
              },
            ),
          ),
          Expanded(
            child: _segment == 0 ? _buildConfirmedView() : _buildEstimatedView(),
          ),
        ],
      ),
    );
  }

  /// 숨은보험금 뷰 — 확정액. 수령은 공식 채널 안내(딥링크/가이드)로 연결한다.
  Widget _buildConfirmedView() {
    return Consumer(
      builder: (BuildContext context, WidgetRef ref, Widget? child) {
        final List<ConfirmedBenefit> benefits = ref.watch(confirmedBenefitsProvider);
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            for (final ConfirmedBenefit benefit in benefits)
              Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        '${benefit.benefitKind} · ${benefit.insurerName}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      AmountBadge(kind: AmountKind.confirmed, amount: benefit.amount),
                      const SizedBox(height: 8),
                      Text(
                        benefit.claimChannelGuide,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () {
                            // TODO(스캐폴드): 내보험찾아줌/보험사 채널 안내 화면(딥링크/가이드).
                          },
                          child: const Text('찾으러 가기'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  /// 미청구 실비 뷰 — 예측액. EstimateCard + 하단 DisclaimerFooter 강제.
  Widget _buildEstimatedView() {
    return Consumer(
      builder: (BuildContext context, WidgetRef ref, Widget? child) {
        final List<EstimatedRefund> refunds = ref.watch(estimatedRefundsProvider);
        return Column(
          children: <Widget>[
            Expanded(
              child: ListView(
                padding: const EdgeInsets.only(bottom: 12),
                children: <Widget>[
                  for (final EstimatedRefund refund in refunds)
                    EstimateCard(
                      refund: refund,
                      onClaimPressed: () => widget.onNavigateToTab(3),
                    ),
                ],
              ),
            ),
            // 예측액 노출 화면 — 면책 문구 고정 렌더링.
            const DisclaimerFooter(),
          ],
        );
      },
    );
  }
}
