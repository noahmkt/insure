import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/claims/claims_screen.dart';
import 'features/contracts/contracts_screen.dart';
import 'features/home/home_screen.dart';
import 'features/my/my_screen.dart';
import 'features/onboarding/onboarding_flow.dart';
import 'features/refunds/refunds_screen.dart';

void main() {
  runApp(const ProviderScope(child: InsureApp()));
}

class InsureApp extends StatelessWidget {
  const InsureApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '내보험 찾기',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF1B64DA),
      ),
      // 온보딩(스플래시 → 소개 → 본인인증 → 동의①② → 연동 마법사) 완료 후
      // HomeShell 로 진입한다.
      home: const SplashScreen(),
    );
  }
}

/// 하단 5탭 셸: 홈 / 내 보험 / 환급금 / 간편청구 / 마이.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  void _goToTab(int index) {
    setState(() {
      _index = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = <Widget>[
      HomeScreen(onNavigateToTab: _goToTab),
      const ContractsScreen(),
      RefundsScreen(onNavigateToTab: _goToTab),
      const ClaimsScreen(),
      const MyScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goToTab,
        destinations: const <NavigationDestination>[
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: '홈'),
          NavigationDestination(icon: Icon(Icons.shield_outlined), selectedIcon: Icon(Icons.shield), label: '내 보험'),
          NavigationDestination(icon: Icon(Icons.savings_outlined), selectedIcon: Icon(Icons.savings), label: '환급금'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment), label: '간편청구'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: '마이'),
        ],
      ),
    );
  }
}
