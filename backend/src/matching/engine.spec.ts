import { matchRecord, statuteExpiryDate } from './engine';
import { InsuranceContract, MedicalRecord } from '../domain/types';

const TODAY = new Date('2026-07-17T00:00:00Z');

function contract(over: Partial<InsuranceContract> = {}): InsuranceContract {
  return {
    id: 'contract-1',
    userId: 'user-1',
    insurerCode: 'SAMSUNG_FIRE',
    insurerName: '삼성화재',
    productName: '실손의료비보장보험',
    contractType: 'SILSON',
    silsonGeneration: 3,
    coverageStart: '2018-01-01',
    coverageEnd: '2039-05-01',
    fetchedAt: TODAY,
    ...over,
  };
}

function record(over: Partial<MedicalRecord> = {}): MedicalRecord {
  return {
    id: 'record-1',
    userId: 'user-1',
    hospitalName: '서울정형외과',
    hospitalTier: 'HOSPITAL',
    treatmentDate: '2025-11-02',
    claimType: 'OUTPATIENT',
    copayCovered: 48000,
    copayUncovered: 0,
    hasPrescription: false,
    source: 'CODEF',
    fetchedAt: TODAY,
    ...over,
  };
}

describe('담보 매칭 엔진', () => {
  it('3세대 통원(급여): 공제 max(정액 15,000, 10%) 적용 후 예상액과 산출 근거를 낸다', () => {
    const r = matchRecord(record(), contract(), TODAY);
    expect(r.verdict).toBe('CLAIMABLE');
    // 48,000 - max(15,000, 4,800) = 33,000
    expect(r.estimatedAmount).toBe(33000);
    expect(r.formula).toContain('3세대 통원(급여)');
    expect(r.formula).toContain('33,000');
    expect(r.ruleVersion).toBe('silson-v1');
  });

  it('금액이 있으면 산출 근거가 반드시 존재한다 (§7.3)', () => {
    const r = matchRecord(record(), contract(), TODAY);
    expect(r.estimatedAmount).toBeDefined();
    expect(r.formula).toBeDefined();
  });

  it('4세대 통원 급여+비급여를 각각 공제 후 합산한다', () => {
    const r = matchRecord(
      record({ copayCovered: 50000, copayUncovered: 100000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 4 }),
      TODAY,
    );
    // 급여: 50,000 - max(10,000, 20%=10,000) = 40,000
    // 비급여: 100,000 - max(30,000, 30%=30,000) = 70,000
    expect(r.verdict).toBe('CLAIMABLE');
    expect(r.estimatedAmount).toBe(110000);
    expect(r.formula).toContain('급여');
    expect(r.formula).toContain('비급여');
  });

  it('2세대 통원: 정액 공제만 적용(자기부담률 0%)', () => {
    const r = matchRecord(
      record({ copayCovered: 30000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 2 }),
      TODAY,
    );
    expect(r.estimatedAmount).toBe(20000); // 30,000 - 10,000
  });

  it('공제액 이하 소액 진료는 NOT_CLAIMABLE(below_deductible)', () => {
    const r = matchRecord(
      record({ copayCovered: 9000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 2 }),
      TODAY,
    );
    expect(r.verdict).toBe('NOT_CLAIMABLE');
    expect(r.reason).toBe('below_deductible');
    expect(r.estimatedAmount).toBeUndefined();
  });

  it('회당 한도를 초과하는 환급액은 한도로 상한되고, 한도 항이 수식에 포함된다', () => {
    const r = matchRecord(
      record({ copayCovered: 1000000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 3 }),
      TODAY,
    );
    expect(r.estimatedAmount).toBe(250000); // perVisitLimit
    expect(r.formula).toContain('회당 한도 min(250,000');
  });

  it('2·3세대 통원은 급여+비급여 합산액에 회당 한도를 1회만 적용한다(파트별 2배 부풀림 금지)', () => {
    const r = matchRecord(
      record({ copayCovered: 200000, copayUncovered: 200000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 3 }),
      TODAY,
    );
    // 급여: 200,000 - max(10,000, 10%=20,000) = 180,000
    // 비급여: 200,000 - max(10,000, 20%=40,000) = 160,000
    // 합산 340,000 → 통합 담보 한도 250,000 으로 1회 상한 (500,000 이 아님)
    expect(r.estimatedAmount).toBe(250000);
    expect(r.formula).toContain('회당 한도 min(250,000, 340,000)');
  });

  it('4세대는 급여/비급여 담보가 분리되어 파트별로 한도를 적용한다', () => {
    const r = matchRecord(
      record({ copayCovered: 500000, copayUncovered: 500000, hospitalTier: 'CLINIC' }),
      contract({ silsonGeneration: 4 }),
      TODAY,
    );
    // 급여: 500,000 - max(10,000, 20%=100,000) = 400,000 → 한도 200,000
    // 비급여: 500,000 - max(30,000, 30%=150,000) = 350,000 → 한도 200,000
    expect(r.estimatedAmount).toBe(400000);
  });

  it('소멸시효 만료일 당일까지는 청구 가능하다(오프바이원 방지)', () => {
    // 진료일 2023-07-17 → 만료일 2026-07-17 = TODAY → 아직 유효
    const ok = matchRecord(record({ treatmentDate: '2023-07-17' }), contract(), TODAY);
    expect(ok.verdict).toBe('CLAIMABLE');
    // 진료일 2023-07-16 → 만료일 2026-07-16 < TODAY → 만료
    const expired = matchRecord(record({ treatmentDate: '2023-07-16' }), contract(), TODAY);
    expect(expired.reason).toBe('statute_expired');
  });

  it('소멸시효(진료일+3년) 경과 건은 NOT_CLAIMABLE(statute_expired)', () => {
    const r = matchRecord(
      record({ treatmentDate: '2023-07-01' }),
      contract(),
      TODAY,
    );
    expect(r.verdict).toBe('NOT_CLAIMABLE');
    expect(r.reason).toBe('statute_expired');
  });

  it('보장기간 밖 진료는 NOT_CLAIMABLE', () => {
    const r = matchRecord(
      record({ treatmentDate: '2025-11-02' }),
      contract({ coverageEnd: '2024-12-31' }),
      TODAY,
    );
    expect(r.verdict).toBe('NOT_CLAIMABLE');
    expect(r.reason).toBe('outside_coverage_period');
  });

  it('실손이 아닌 계약은 NOT_CLAIMABLE', () => {
    const r = matchRecord(record(), contract({ contractType: 'OTHER' }), TODAY);
    expect(r.verdict).toBe('NOT_CLAIMABLE');
  });

  it('세대 미상 계약은 금액 없이 UNDETERMINED("전문가 검토 추천")', () => {
    const r = matchRecord(record(), contract({ silsonGeneration: undefined }), TODAY);
    expect(r.verdict).toBe('UNDETERMINED');
    expect(r.estimatedAmount).toBeUndefined();
    expect(r.formula).toBeUndefined();
  });

  it('파라미터가 없는 케이스(1세대 약제)는 UNDETERMINED', () => {
    const r = matchRecord(
      record({ claimType: 'PHARMACY', hospitalTier: 'PHARMACY' }),
      contract({ silsonGeneration: 1, coverageStart: '2005-01-01' }),
      TODAY,
    );
    expect(r.verdict).toBe('UNDETERMINED');
    expect(r.reason).toBe('missing_parameter');
  });

  it('소멸시효 만료일은 진료일 + 3년', () => {
    expect(statuteExpiryDate('2025-11-02').toISOString().slice(0, 10)).toBe('2028-11-02');
  });
});
