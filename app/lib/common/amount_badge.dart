import 'package:flutter/material.dart';

import 'format.dart';

/// 금액 성격 구분.
///
/// [법적 하드 룰] 확정액(숨은보험금)과 예측액(미청구 실비 예상 환급액)은
/// 절대 같은 스타일로 표기하지 않는다. 혼용 표기 금지.
enum AmountKind {
  /// 확정액 — 숨은보험금 등 이미 확정된 금액.
  confirmed,

  /// 예측액 — 룰 기반 산출 예상 금액. 항상 "예상" 접두가 붙는다.
  estimated,
}

/// 확정/예상 구분 뱃지.
///
/// - 확정: 청록 계열 채움(solid) 스타일 + "확정" 라벨
/// - 예상: 주황 계열 외곽선(outlined) 스타일 + "예상" 라벨
class AmountBadge extends StatelessWidget {
  const AmountBadge({
    super.key,
    required this.kind,
    required this.amount,
  });

  final AmountKind kind;
  final int amount;

  static const Color _confirmedColor = Color(0xFF00796B);
  static const Color _estimatedColor = Color(0xFFE65100);

  @override
  Widget build(BuildContext context) {
    final bool isConfirmed = kind == AmountKind.confirmed;
    final String label = isConfirmed ? '확정' : '예상';
    final Color color = isConfirmed ? _confirmedColor : _estimatedColor;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        // 확정은 채움, 예상은 외곽선 — 시각적으로 항상 구분된다.
        color: isConfirmed ? color : Colors.transparent,
        border: Border.all(color: color, width: 1.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        '$label ${formatWon(amount)}',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: isConfirmed ? Colors.white : color,
        ),
      ),
    );
  }
}
