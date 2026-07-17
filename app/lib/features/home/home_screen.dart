/// 탭 1 — 홈 (docs/02-wireframes.md §2).
///
/// 히어로 카드: 총 예상 환급금 = 숨은보험금(확정) + 미청구(예상).
/// [법적 하드 룰] 확정/예상은 AmountBadge 로 구분 표기하고,
/// 예측액이 보이므로 DisclaimerFooter 를 반드시 렌더링한다.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/amount_badge.dart';
import '../../common/disclaimer_footer.dart';
import '../../common/format.dart';

/// 홈 요약 스텁 데이터.
/// TODO(스캐폴드): apiClient.getConfirmedBenefits() + getEstimatedRefunds()
/// 결과를 합산하는 FutureProvider 로 교체.
final homeSummaryProvider = Provider<({int confirmedTotal, int estimatedTotal})>(
  (ref) => (confirmedTotal: 120000, estimatedTotal: 222000),
);

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.onNavigateToTab});

  /// 하단 탭 인덱스 이동(2: 환급금, 3: 간편청구).
  final void Function(int tabIndex) onNavigateToTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ({int confirmedTotal, int estimatedTotal}) summary =
        ref.watch(homeSummaryProvider);
    final int total = summary.confirmedTotal + summary.estimatedTotal;

    return Scaffold(
      appBar: AppBar(title: const Text('내보험 찾기')),
      body: RefreshIndicator(
        onRefresh: () async {
          // TODO(스캐폴드): 당겨서 새로고침 — 수동 재조회 트리거.
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            // ── 히어로 카드: 총 예상 환급금 ──
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text('총 예상 환급금', style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      formatWon(total),
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    // 확정/예상 구분 뱃지 — 혼용 표기 금지.
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: <Widget>[
                        AmountBadge(
                          kind: AmountKind.confirmed,
                          amount: summary.confirmedTotal,
                        ),
                        AmountBadge(
                          kind: AmountKind.estimated,
                          amount: summary.estimatedTotal,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const DisclaimerFooter(),
                  ],
                ),
              ),
            ),
            // ── 진행 중 청구 ──
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('진행 중 청구 (1)',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            Card(
              margin: const EdgeInsets.all(16),
              child: ListTile(
                title: const Text('삼성화재 · 통원 3건'),
                subtitle: const Text('서류준비 → 검토중 → 제출안내 → 지급확인'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => onNavigateToTab(3),
              ),
            ),
            // ── 최근 알림 ──
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('최근 알림 3건'),
              trailing: TextButton(
                onPressed: () {},
                child: const Text('전체보기'),
              ),
            ),
            // ── CTA ──
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: () => onNavigateToTab(2),
                child: const Text('새로 발견된 미청구 진료 확인하기'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
