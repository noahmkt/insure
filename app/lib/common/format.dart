/// 공통 포맷 유틸리티.
///
/// intl 의존성 없이 원화 금액·날짜·D-day 표기를 처리한다.
library;

/// 정수 금액에 천 단위 쉼표를 넣어 "48,000원" 형태로 반환한다.
String formatWon(int amount) {
  final bool negative = amount < 0;
  final String digits = amount.abs().toString();
  final StringBuffer buffer = StringBuffer();
  for (int i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) {
      buffer.write(',');
    }
    buffer.write(digits[i]);
  }
  return '${negative ? '-' : ''}${buffer.toString()}원';
}

/// DateTime → "2025.11.02" 표기.
String formatDate(DateTime date) {
  final String mm = date.month.toString().padLeft(2, '0');
  final String dd = date.day.toString().padLeft(2, '0');
  return '${date.year}.$mm.$dd';
}

/// 소멸시효 만료일까지 남은 일수를 "D-712" 형태로 반환한다.
/// 이미 지난 날짜면 "기한 경과"를 반환한다.
String formatDday(DateTime expiresOn) {
  final DateTime today = DateTime.now();
  final DateTime todayDate = DateTime(today.year, today.month, today.day);
  final DateTime expiry = DateTime(expiresOn.year, expiresOn.month, expiresOn.day);
  final int days = expiry.difference(todayDate).inDays;
  if (days < 0) {
    return '기한 경과';
  }
  return 'D-$days';
}
