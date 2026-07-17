import 'package:flutter/material.dart';

/// 면책 고지 공통 컴포넌트.
///
/// [법적 하드 룰] 예측(예상) 금액이 노출되는 모든 화면은
/// 이 위젯을 하단에 반드시 렌더링해야 한다. 문구는 임의 수정 금지.
class DisclaimerFooter extends StatelessWidget {
  const DisclaimerFooter({super.key});

  /// 고정 면책 문구 — 서버 응답(disclaimer 필드)과 동일한 기준 문구.
  static const String text = '실제 지급액은 보험사 심사에 따라 달라질 수 있습니다.';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: const Color(0xFFF4F6F8),
      child: Text(
        '※ $text',
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }
}
