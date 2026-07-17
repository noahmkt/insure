import { ClaimType } from '../domain/types';

/**
 * 필요서류 매트릭스 v1 — 보험사 × 청구유형 × 금액구간 (사양서 §6)
 * 운영 시 core.document_matrix 테이블 + 관리자 CRUD 로 이관되며, 여기는 상위 손보 5사
 * 공통 패턴의 시드 데이터다. 보험사별 세부 편차는 운영 데이터에서 관리한다.
 */

export interface RequiredDoc {
  code: string;
  name: string;
  required: boolean;
  note?: string;
}

export interface MatrixEntry {
  insurerCode: string; // '*' = 공통 기본값
  claimType: ClaimType;
  amountMin: number;
  amountMax: number | null;
  requiredDocs: RequiredDoc[];
  channelGuide: { app?: string; fax?: string; email?: string };
}

const COMMON_CHANNELS: Record<string, MatrixEntry['channelGuide']> = {
  SAMSUNG_FIRE: { app: '삼성화재 다이렉트 앱 > 보험금 청구', fax: '02-0000-0001' },
  HYUNDAI: { app: '현대해상 하이플래닛 앱', fax: '02-0000-0002' },
  DB: { app: 'DB손해보험 앱', fax: '02-0000-0003' },
  KB: { app: 'KB손해보험 앱', fax: '02-0000-0004' },
  MERITZ: { app: '메리츠화재 앱', fax: '02-0000-0005' },
};

export const DOCUMENT_MATRIX: MatrixEntry[] = ['SAMSUNG_FIRE', 'HYUNDAI', 'DB', 'KB', 'MERITZ'].flatMap(
  (insurerCode): MatrixEntry[] => [
    {
      insurerCode,
      claimType: 'OUTPATIENT',
      amountMin: 0,
      amountMax: 100000,
      requiredDocs: [
        { code: 'RECEIPT', name: '진료비 영수증', required: true },
        { code: 'DETAIL', name: '진료비 세부내역서', required: true, note: '비급여 포함 시' },
      ],
      channelGuide: COMMON_CHANNELS[insurerCode],
    },
    {
      insurerCode,
      claimType: 'OUTPATIENT',
      amountMin: 100001,
      amountMax: null,
      requiredDocs: [
        { code: 'RECEIPT', name: '진료비 영수증', required: true },
        { code: 'DETAIL', name: '진료비 세부내역서', required: true },
        { code: 'VISIT_CONFIRM', name: '통원확인서 또는 진단서', required: true },
      ],
      channelGuide: COMMON_CHANNELS[insurerCode],
    },
    {
      insurerCode,
      claimType: 'INPATIENT',
      amountMin: 0,
      amountMax: null,
      requiredDocs: [
        { code: 'RECEIPT', name: '진료비 영수증', required: true },
        { code: 'DETAIL', name: '진료비 세부내역서', required: true },
        { code: 'DISCHARGE', name: '입퇴원확인서', required: true },
        { code: 'DIAGNOSIS', name: '진단서', required: false, note: '고액 청구 시 요구될 수 있음' },
      ],
      channelGuide: COMMON_CHANNELS[insurerCode],
    },
    {
      insurerCode,
      claimType: 'PHARMACY',
      amountMin: 0,
      amountMax: null,
      requiredDocs: [
        { code: 'PHARMACY_RECEIPT', name: '약제비 영수증', required: true },
        { code: 'PRESCRIPTION', name: '처방전 사본', required: true },
      ],
      channelGuide: COMMON_CHANNELS[insurerCode],
    },
  ],
);

export function lookupChecklist(
  insurerCode: string,
  claimType: ClaimType,
  amount: number,
): MatrixEntry | undefined {
  return DOCUMENT_MATRIX.find(
    (e) =>
      e.insurerCode === insurerCode &&
      e.claimType === claimType &&
      amount >= e.amountMin &&
      (e.amountMax === null || amount <= e.amountMax),
  );
}
