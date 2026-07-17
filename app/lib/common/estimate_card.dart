import 'package:flutter/material.dart';

import '../api/models.dart';
import 'amount_badge.dart';
import 'format.dart';

/// 예상 환급액 카드.
///
/// [법적 하드 룰]
/// - 금액에는 항상 "예상" 접두가 붙는다(AmountBadge.estimated 사용).
/// - 산출 근거(formula)를 펼침으로 항상 제공한다.
/// - 소멸시효 D-day 를 함께 표기한다.
/// - verdict 가 UNDETERMINED 면 금액을 표기하지 않고 "검토 필요" 라벨만 노출한다.
/// - 이 카드를 쓰는 화면은 하단에 DisclaimerFooter 를 반드시 렌더링해야 한다.
class EstimateCard extends StatelessWidget {
  const EstimateCard({
    super.key,
    required this.refund,
    this.onClaimPressed,
  });

  final EstimatedRefund refund;

  /// "청구 진행하기" → 간편청구 탭 이동 콜백.
  final VoidCallback? onClaimPressed;

  @override
  Widget build(BuildContext context) {
    final RefundEstimate? estimate = refund.estimate;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    '${refund.hospitalName} · ${formatDate(refund.treatmentDate)}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                Chip(
                  visualDensity: VisualDensity.compact,
                  label: Text(
                    '소멸시효 ${formatDday(refund.statuteExpiresOn)}',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '본인부담금 ${formatWon(refund.copayTotal)}',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 8),
            // estimate != null 검사로 아래 분기에서 non-null 로 승격된다.
            if (estimate != null && refund.verdict == RefundVerdict.claimable) ...<Widget>[
              AmountBadge(kind: AmountKind.estimated, amount: estimate.amount),
              // 산출 근거 펼침 — 예측액에는 근거를 항상 제공한다.
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: const Text('산출 근거 보기', style: TextStyle(fontSize: 13)),
                children: <Widget>[
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        '${estimate.formula}\n(적용 룰: ${estimate.ruleVersion})',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonal(
                  onPressed: onClaimPressed,
                  child: const Text('청구 진행하기'),
                ),
              ),
            ] else ...<Widget>[
              // 산출 근거가 없는 건: 금액 미표기, "검토 필요" 라벨만.
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text('검토 필요', style: TextStyle(fontSize: 13)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
