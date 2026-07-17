/// 온보딩 플로우 화면 골격 (docs/02-wireframes.md §1).
///
/// 스플래시 → 소개 3장 → 본인인증(PASS/카카오) → 동의 ①② → 연동 마법사 2단계.
///
/// [법적 하드 룰]
/// - 주민등록번호 입력 화면 없음. 본인인증 결과 토큰만 서버로 전달(CI 기반).
/// - 동의는 4층 분리: 여기서는 ①수집·이용, ②민감정보, ④마케팅(선택)만 받는다.
///   ③제3자 제공 동의는 상담 신청 클릭 시점에만 수집한다(포괄 동의 금지).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../main.dart';

/// 1-1. 스플래시.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.search, size: 64, color: Color(0xFF1B64DA)),
            const SizedBox(height: 16),
            const Text('내보험 찾기',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('놓친 보험금, 지금 찾아보세요'),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const IntroScreen()),
                );
              },
              child: const Text('시작하기'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 1-2. 서비스 소개 3장 (스와이프).
class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key});

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen> {
  final PageController _controller = PageController();
  int _page = 0;

  static const List<String> _messages = <String>[
    '작년에 병원 다녀오고 못 받은 보험금,\n얼마나 될까요?',
    '진료내역과 보험을 연결하면\n자동으로 찾아드려요',
    '청구는 가장 쉬운 길로 안내해 드려요.\n제출은 안전하게 직접, 공식 채널에서',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('서비스 소개')),
      body: Column(
        children: <Widget>[
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: _messages.length,
              onPageChanged: (int page) {
                setState(() {
                  _page = page;
                });
              },
              itemBuilder: (BuildContext context, int index) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      _messages[index],
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 20, height: 1.5),
                    ),
                  ),
                );
              },
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List<Widget>.generate(_messages.length, (int i) {
              return Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == _page ? const Color(0xFF1B64DA) : Colors.grey.shade300,
                ),
              );
            }),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const VerifyScreen()),
                  );
                },
                child: const Text('다음'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 1-3. 간편 회원가입 — 휴대폰 본인인증.
///
/// 주민등록번호 입력란은 존재하지 않는다. 인증사(PASS/카카오)가 반환한
/// verificationToken 을 서버에 전달하면 서버가 CI 를 수신해 계정을 만든다.
class VerifyScreen extends ConsumerWidget {
  const VerifyScreen({super.key});

  void _startVerification(BuildContext context, String provider) {
    // TODO(스캐폴드): 인증 SDK 연동 후 ApiClient.verifyIdentity(provider, token)
    // 호출로 교체. 여기서는 화면 골격만 제공한다.
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ConsentScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('휴대폰 본인인증')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const Text(
              '본인 명의 휴대폰으로 간편하게 가입해요.\n주민등록번호는 입력받지 않아요.',
              style: TextStyle(fontSize: 16, height: 1.5),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: () => _startVerification(context, 'PASS'),
              child: const Text('PASS로 인증'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => _startVerification(context, 'KAKAO'),
              child: const Text('카카오로 인증'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 1-4. 동의 화면 — ①수집·이용(필수) + ②민감정보(연동 기능 필수) + ④마케팅(선택).
///
/// ③제3자 제공 동의는 이 화면에서 받지 않는다(상담 신청 클릭 시점에만).
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool _personalInfo = false;
  bool _sensitiveHealth = false;
  bool _marketing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('서비스 이용 동의')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          CheckboxListTile(
            value: _personalInfo,
            onChanged: (bool? v) => setState(() => _personalInfo = v ?? false),
            title: const Text('[필수] 개인정보 수집·이용 동의'),
            subtitle: const Text('전문 보기'),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CheckboxListTile(
            value: _sensitiveHealth,
            onChanged: (bool? v) => setState(() => _sensitiveHealth = v ?? false),
            title: const Text('[필수*] 민감정보(건강·진료) 처리 동의'),
            subtitle: const Text('*데이터 연동 기능에만 필요해요. 동의하지 않으면 연동 기능이 제한돼요. 전문 보기'),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CheckboxListTile(
            value: _marketing,
            onChanged: (bool? v) => setState(() => _marketing = v ?? false),
            title: const Text('[선택] 마케팅 정보 수신 동의'),
            subtitle: const Text('전문 보기'),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          const SizedBox(height: 8),
          Text(
            '제3자 제공 동의는 여기서 받지 않아요.\n전문가 상담을 신청하는 시점에 별도로 안내해 드려요.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          FilledButton(
            // ①은 필수. ②는 미동의 시 연동 마법사 건너뛰기 안내가 필요하다(스캐폴드 단순화).
            onPressed: _personalInfo
                ? () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const SyncWizardScreen()),
                    );
                  }
                : null,
            child: const Text('동의하고 계속'),
          ),
        ],
      ),
    );
  }
}

/// 1-5. 데이터 연동 마법사 (2단계).
class SyncWizardScreen extends ConsumerStatefulWidget {
  const SyncWizardScreen({super.key});

  @override
  ConsumerState<SyncWizardScreen> createState() => _SyncWizardScreenState();
}

class _SyncWizardScreenState extends ConsumerState<SyncWizardScreen> {
  int _step = 0; // 0: 내 보험 불러오기, 1: 진료내역 불러오기

  void _next() {
    if (_step == 0) {
      setState(() => _step = 1);
    } else {
      // 연동 완료 → 홈 진입. 첫 화면에서 즉시 예상 환급금 노출(★Aha).
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const HomeShell()),
        (Route<dynamic> route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isContractStep = _step == 0;
    return Scaffold(
      appBar: AppBar(
        title: Text('데이터 연동 ${_step + 1}/2'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              isContractStep ? '내 보험 불러오기' : '진료내역 불러오기',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              isContractStep
                  ? '내보험찾아줌에서 가입 보험을 불러옵니다.'
                  : '건강보험공단에서 최근 3년 진료내역을 불러옵니다. 예상 소요 약 1분.',
            ),
            const SizedBox(height: 24),
            FilledButton(
              // TODO(스캐폴드): ApiClient.startContractSync()/startMedicalSync()
              // 호출 후 getSyncJob 폴링으로 교체. 스켈레톤 UI 자리.
              onPressed: _next,
              child: const Text('간편인증으로 불러오기'),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                TextButton(onPressed: () {}, child: const Text('재시도')),
                TextButton(onPressed: _next, child: const Text('건너뛰기')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
