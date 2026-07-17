import { Module } from '@nestjs/common';
import { AuditService } from './admin/audit.service';
import { ApiController } from './api.controller';
import { ClaimsService } from './claims/claims.service';
import { ConsentsService } from './consents/consents.service';
import { ConsultationsService } from './consultations/consultations.service';
import { ContractsService } from './contracts/contracts.service';
import { RefundsService } from './refunds/refunds.service';
import { StoreService } from './store/store.service';
import { SyncService } from './sync/sync.service';
import { UsersService } from './users/users.service';

@Module({
  controllers: [ApiController],
  providers: [
    StoreService,
    UsersService,
    ConsentsService,
    SyncService,
    ContractsService,
    RefundsService,
    ClaimsService,
    ConsultationsService,
    AuditService,
  ],
})
export class AppModule {}
