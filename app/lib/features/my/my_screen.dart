/// 탭 5 — 마이 (docs/02-wireframes.md §6).
///
/// [법적 하드 룰]
/// - 동의내역 관리: 4층(①수집·이용 ②민감정보 ③제3자 제공 ④마케팅) 각각
///   동의 일시와 개별 [철회] 버튼 제공. 철회 시 기능 영향 안내 모달.
/// - 회원 탈퇴 시 개인정보 즉시 파기 + 파기 완료 알림 안내.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.dart';

/// 동의 현황 스텁 데이터.
/// TODO(스캐폴드): apiClient.getConsents() FutureProvider 로 교체.
final consentsProvider = Provider<List<Consent>>((ref) {
  return <Consent>[
    Consent(
      type: ConsentType.personalInfo,
      granted: true,
      documentVersion: 'personal-v1',
      grantedAt: DateTime(2026, 7, 1, 10, 30),
    ),
    Consent(
      type: ConsentType.sensitiveHealth,
      granted: true,
      documentVersion: 'sensitive-v1',
      grantedAt: DateTime(2026, 7, 1, 10, 31),
    ),
    const Consent(type: ConsentType.thirdParty, granted: false),
    const Consent(type: ConsentType.marketing, granted: false),
  ];
});

class MyScreen extends ConsumerWidget {
  const MyScreen({super.key});

  static const Map<ConsentType, String> _consentLabels = <ConsentType, String>{
    ConsentType.personalInfo: '① 개인정보 수집·이용',
    ConsentType.sensitiveHealth: '② 민감정보(건강·진료) 처리',
    ConsentType.thirdParty: '③ 제3자 제공 (상담 신청 시)',
    ConsentType.marketing: '④ 마케팅 정보 수신',
  };

  static const Map<ConsentType, String> _revokeImpacts = <ConsentType, String>{
    ConsentType.personalInfo: '철회 시 서비스 이용이 중단되고 계정 정보가 파기 절차에 들어갑니다.',
    ConsentType.sensitiveHealth: '철회 시 진료내역 연동과 환급금 찾기 기능이 중단됩니다. 이미 연동된 진료내역은 파기됩니다.',
    ConsentType.thirdParty: '철회 시 진행 중인 전문가 상담 연결이 중단됩니다.',
    ConsentType.marketing: '철회 시 혜택·소식 알림을 받지 못하게 됩니다. 서비스 이용에는 영향이 없습니다.',
  };

  String _formatDateTime(DateTime dt) {
    final String mm = dt.month.toString().padLeft(2, '0');
    final String dd = dt.day.toString().padLeft(2, '0');
    final String hh = dt.hour.toString().padLeft(2, '0');
    final String mi = dt.minute.toString().padLeft(2, '0');
    return '${dt.year}.$mm.$dd $hh:$mi';
  }

  /// 철회 시 영향 안내 모달 — 확인 후에만 철회 API 호출.
  Future<void> _confirmRevoke(BuildContext context, ConsentType type) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: Text('${_consentLabels[type]} 동의를 철회할까요?'),
        content: Text(_revokeImpacts[type] ?? ''),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('철회하기'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      // TODO(스캐폴드): apiClient.revokeConsent(type) 호출로 교체.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('동의 철회가 접수되었습니다.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<Consent> consents = ref.watch(consentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('마이')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: <Widget>[
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('동의내역 관리',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
          for (final Consent consent in consents)
            ListTile(
              title: Text(_consentLabels[consent.type] ?? consent.type.wire),
              subtitle: Text(
                consent.granted && consent.grantedAt != null
                    ? '동의일시 ${_formatDateTime(consent.grantedAt!)}'
                    : '미동의',
                style: const TextStyle(fontSize: 12),
              ),
              trailing: consent.granted
                  ? TextButton(
                      onPressed: () => _confirmRevoke(context, consent.type),
                      child: const Text('철회'),
                    )
                  : null,
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.folder_outlined),
            title: const Text('위임장·청구서류 보관함'),
            subtitle: const Text('보관 서류는 자동 파기 정책에 따라 기한 후 삭제돼요'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO(스캐폴드): GET /me/vault — 자동 파기 예정일 포함 목록.
            },
          ),
          ListTile(
            leading: const Icon(Icons.support_agent_outlined),
            title: const Text('상담 내역'),
            subtitle: const Text('배정 담당자와 진행 상태를 확인해요'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO(스캐폴드): apiClient.getConsultations() 목록 화면.
            },
          ),
          const ListTile(
            leading: Icon(Icons.family_restroom_outlined),
            title: Text('가족 관리'),
            subtitle: Text('준비 중 — 구성원별 본인인증이 필요해요 (Phase 2)'),
            enabled: false,
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.delete_outline),
            title: const Text('회원 탈퇴'),
            subtitle: const Text('개인정보를 즉시 파기하고, 파기 완료를 알려드려요'),
            onTap: () {
              // TODO(스캐폴드): DELETE /users/me + 파기 완료 알림 플로우.
            },
          ),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('고객센터 / 약관 / 개인정보 처리방침'),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}
