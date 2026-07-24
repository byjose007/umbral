import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ComplianceService } from './compliance.service.js';
import {
  CreateRetentionPolicyDto,
  ExecutePurgeDto,
} from './dto/retention-policy.dto.js';
import { RecordPiiAccessDto, QueryPiiAuditDto } from './dto/pii-audit.dto.js';
import {
  ArcoExportRequestDto,
  ArcoRectifyRequestDto,
  ArcoAnonymizeRequestDto,
} from './dto/arco.dto.js';
import {
  CreatePrivacyNoticeDto,
  RecordPrivacyConsentDto,
} from './dto/privacy.dto.js';
import { ComplianceDataType, TargetAudience } from '@umbral/core';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // --- RETENTION & PURGE ---

  @Get('retention')
  getRetentionPolicies() {
    return this.complianceService.getRetentionPolicies();
  }

  @Put('retention')
  upsertRetentionPolicy(@Body() dto: CreateRetentionPolicyDto) {
    return this.complianceService.upsertRetentionPolicy(dto);
  }

  @Post('purge')
  executePurge(@Body() dto: ExecutePurgeDto) {
    return this.complianceService.executePurge(dto.dataType);
  }

  // --- PII AUDIT LOGS ---

  @Post('pii-audit')
  recordPiiAccess(@Body() dto: RecordPiiAccessDto) {
    return this.complianceService.recordPiiAccess(dto);
  }

  @Get('pii-audit')
  queryPiiAuditLogs(@Query() query: QueryPiiAuditDto) {
    return this.complianceService.queryPiiAuditLogs(query);
  }

  // --- ARCO RIGHTS ---

  @Post('arco/export/:personId')
  exportPersonData(
    @Param('personId') personId: string,
    @Body() dto: ArcoExportRequestDto,
  ) {
    return this.complianceService.exportPersonData(personId, dto);
  }

  @Put('arco/rectify/:personId')
  rectifyPersonData(
    @Param('personId') personId: string,
    @Body() dto: ArcoRectifyRequestDto,
  ) {
    return this.complianceService.rectifyPersonData(personId, dto);
  }

  @Post('arco/anonymize/:personId')
  anonymizePersonData(
    @Param('personId') personId: string,
    @Body() dto: ArcoAnonymizeRequestDto,
  ) {
    return this.complianceService.anonymizePersonData(personId, dto);
  }

  // --- PRIVACY NOTICES & CONSENTS ---

  @Post('privacy-notice')
  createPrivacyNotice(@Body() dto: CreatePrivacyNoticeDto) {
    return this.complianceService.createPrivacyNotice(dto);
  }

  @Get('privacy-notice')
  getPrivacyNotices(@Query('audience') audience?: TargetAudience) {
    return this.complianceService.getPrivacyNotices(audience);
  }

  @Post('privacy-consent')
  recordPrivacyConsent(@Body() dto: RecordPrivacyConsentDto) {
    return this.complianceService.recordPrivacyConsent(dto);
  }
}
