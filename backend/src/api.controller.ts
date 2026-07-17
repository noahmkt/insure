import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuditService, StaffRole } from './admin/audit.service';
import { ClaimsService } from './claims/claims.service';
import { ConsentsService } from './consents/consents.service';
import { ConsultationsService } from './consultations/consultations.service';
import { ContractsService } from './contracts/contracts.service';
import { ClaimStatus, ConsentType } from './domain/types';
import { RefundsService } from './refunds/refunds.service';
import { StoreService } from './store/store.service';
import { SyncService } from './sync/sync.service';
import { UsersService } from './users/users.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * REST API (docs/04-api-spec.md) — Phase 1 코어 엔드포인트.
 * 데모 인증: Bearer <userId>. 운영 전환 시 JWT 가드로 교체.
 */
@Controller('api/v1')
export class ApiController {
  constructor(
    private readonly users: UsersService,
    private readonly consents: ConsentsService,
    private readonly sync: SyncService,
    private readonly contracts: ContractsService,
    private readonly refunds: RefundsService,
    private readonly claims: ClaimsService,
    private readonly consultations: ConsultationsService,
    private readonly audit: AuditService,
    private readonly store: StoreService,
  ) {}

  // ── 인증/회원 ──────────────────────────────────────────────
  @Post('auth/verify')
  verify(@Body() body: { provider: 'PASS' | 'KAKAO'; verificationToken: string }) {
    return this.users.verify(body.provider, body.verificationToken);
  }

  @Delete('users/me')
  withdraw(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.users.withdraw(user.id);
  }

  // ── 동의 (4층) ────────────────────────────────────────────
  @Get('consents')
  consentHistory(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.consents.history(user.id);
  }

  @Post('consents')
  grantConsent(
    @Body()
    body: {
      type: ConsentType;
      documentVersion: string;
      method: 'CHECKBOX' | 'SIGNATURE';
      context?: string;
    },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.consents.grant(user.id, body.type, body.documentVersion, body.method, body.context);
  }

  @Delete('consents/:type')
  withdrawConsent(@Param('type') type: ConsentType, @Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.consents.withdraw(user.id, type);
  }

  // ── 데이터 연동 ────────────────────────────────────────────
  @Post('sync/contracts')
  syncContracts(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.sync.syncContracts(user.id);
  }

  @Post('sync/medical')
  syncMedical(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.sync.syncMedical(user.id);
  }

  // ── 내 보험 ───────────────────────────────────────────────
  @Get('contracts')
  listContracts(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.contracts.list(user.id);
  }

  @Get('contracts/alerts/duplicate-silson')
  duplicateSilson(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.contracts.duplicateSilsonAlert(user.id);
  }

  // ── 환급금: 확정액과 예측액은 별도 엔드포인트 (§2) ──────────
  @Get('benefits/confirmed')
  confirmedBenefits(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.refunds.confirmed(user.id);
  }

  @Get('refunds/estimated')
  estimatedRefunds(
    @Query('sort') sort: 'amount' | 'expiry' = 'amount',
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.refunds.estimated(user.id, sort);
  }

  // ── 간편청구 ──────────────────────────────────────────────
  @Get('claims/hospitals')
  claimHospitals(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.claims.listHospitals(user.id);
  }

  @Post('claims/route-check')
  routeCheck(
    @Body() body: { medicalRecordIds: string[] },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.claims.routeCheck(user.id, body.medicalRecordIds);
  }

  @Post('claims')
  createClaim(
    @Body() body: { medicalRecordIds: string[]; contractId?: string },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.claims.create(user.id, body.medicalRecordIds, body.contractId);
  }

  @Get('claims/:id/checklist')
  checklist(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.claims.checklist(user.id, id);
  }

  @Get('claims/:id/package')
  submitPackage(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.claims.package(user.id, id);
  }

  @Patch('claims/:id/status')
  updateClaimStatus(
    @Param('id') id: string,
    @Body() body: { status: ClaimStatus },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.claims.updateStatus(user.id, id, body.status);
  }

  @Post('claims/:id/paid')
  confirmPaid(
    @Param('id') id: string,
    @Body() body: { actualPaidAmount: number },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.claims.confirmPaid(user.id, id, body.actualPaidAmount);
  }

  // ── 상담 (리드) ───────────────────────────────────────────
  @Post('consultations')
  requestConsultation(
    @Body()
    body: {
      kind: 'POLICY_REVIEW' | 'ADJUSTER_REVIEW';
      thirdPartyConsent?: { documentVersion: string; method: 'CHECKBOX' | 'SIGNATURE' };
    },
    @Headers('authorization') auth?: string,
  ) {
    const user = this.users.requireUser(auth);
    return this.consultations.request(user.id, body.kind, body.thirdPartyConsent);
  }

  @Get('consultations')
  myConsultations(@Headers('authorization') auth?: string) {
    const user = this.users.requireUser(auth);
    return this.consultations.listMine(user.id);
  }

  // ── 관리자 (데모 RBAC: x-staff-id / x-staff-role 헤더, 운영: SSO+RBAC 가드) ──
  @Post('admin/consultations/:id/assign')
  assignConsultation(
    @Param('id') id: string,
    @Body() body: { staffId: string },
    @Headers('x-staff-role') role?: StaffRole,
  ) {
    this.requireRole(role, ['OPERATOR']);
    const consultation = this.store.consultations.find((c) => c.id === id);
    if (consultation) {
      consultation.status = 'ASSIGNED';
      consultation.assignedStaffId = body.staffId;
    }
    // 리드 전달 시 ③ 제3자 제공 동의 증적 자동 첨부 (감사 대응)
    return { consultation, attachedConsentId: consultation?.thirdPartyConsentId };
  }

  @Get('admin/users/:userId/medical')
  viewMedical(
    @Param('userId') userId: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-staff-role') role?: StaffRole,
  ) {
    this.requireRole(role, ['CONSULTANT', 'ADJUSTER']);
    // 배정 담당자만 열람 + 전건 감사 로그 (하드 룰 3 / §9)
    this.audit.assertCanViewSensitive(staffId ?? '', userId);
    this.audit.record(staffId ?? '', 'VIEW_MEDICAL', userId, 'medical.medical_records');
    return this.store.medicalRecords.filter((r) => r.userId === userId);
  }

  @Get('admin/audit-logs')
  auditLogs(@Headers('x-staff-role') role?: StaffRole) {
    this.requireRole(role, ['AUDITOR', 'OPERATOR']);
    return this.audit.list();
  }

  /** 예측 정확도 대시보드 — 실지급액 입력 건 기준 오차 (§7.1 정확도 루프) */
  @Get('admin/accuracy')
  accuracy(@Headers('x-staff-role') role?: StaffRole) {
    this.requireRole(role, ['OPERATOR', 'CONSULTANT', 'ADJUSTER', 'AUDITOR']);
    const paid = this.store.claims.filter(
      (c) => c.status === 'PAID' && c.actualPaidAmount !== undefined,
    );
    return { paidClaims: paid.length, note: '예측치 대비 오차 집계는 매칭 결과 스냅샷 연동 후 제공' };
  }

  private requireRole(role: StaffRole | undefined, allowed: StaffRole[]): void {
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException({ code: 'RBAC_DENIED', message: '권한이 없습니다.' });
    }
  }
}
