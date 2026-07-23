import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  RetentionPolicy,
  makeRetentionPolicyId,
  ComplianceDataType,
  PurgeableItem,
  PurgeSummary,
  PiiAccessAuditLog,
  makePiiAuditLogId,
  PiiAccessType,
  ArcoService,
  ArcoExportBundle,
  AnonymizedPersonResult,
  PrivacyNotice,
  makePrivacyNoticeId,
  PrivacyConsent,
  makePrivacyConsentId,
  TargetAudience,
  LawfulBasis,
  Person,
  makePersonId,
  AccessEvent,
  makeAccessEventId,
  makeSiteId,
  makeDoorId,
  computeEventHash,
  GENESIS_HASH,
} from '@umbral/core';
import { CreateRetentionPolicyDto } from './dto/retention-policy.dto.js';
import { RecordPiiAccessDto, QueryPiiAuditDto } from './dto/pii-audit.dto.js';
import { ArcoExportRequestDto, ArcoRectifyRequestDto, ArcoAnonymizeRequestDto } from './dto/arco.dto.js';
import { CreatePrivacyNoticeDto, RecordPrivacyConsentDto } from './dto/privacy.dto.js';

@Injectable()
export class ComplianceService {
  private retentionPolicies = new Map<string, RetentionPolicy>();
  private piiAuditLogs: PiiAccessAuditLog[] = [];
  private privacyNotices = new Map<string, PrivacyNotice>();
  private privacyConsents: PrivacyConsent[] = [];
  private purgeableItems: PurgeableItem[] = [];
  private mockPersons = new Map<string, Person>();
  private mockAccessEvents: AccessEvent[] = [];

  constructor() {
    this.seedDefaultPoliciesAndNotices();
  }

  private seedDefaultPoliciesAndNotices() {
    // Default Retention Policies
    const defaultPolicies: Array<{ dataType: ComplianceDataType; days: number; desc: string }> = [
      { dataType: 'visitor_photo', days: 30, desc: 'Foto de visitante con retención corta (Minimización LOPDP)' },
      { dataType: 'access_event', days: 365, desc: 'Eventos de acceso físico (1 año)' },
      { dataType: 'video_clip', days: 15, desc: 'Fragmentos de video de verificación' },
      { dataType: 'person_pii', days: 730, desc: 'Datos personales de ex-empleados/visitantes' },
      { dataType: 'pii_access_audit', days: 1095, desc: 'Log de auditoría de PII (3 años legal)' },
    ];

    for (const p of defaultPolicies) {
      const id = makeRetentionPolicyId(`ret-${p.dataType}`);
      const res = RetentionPolicy.create({
        id,
        dataType: p.dataType,
        retentionDays: p.days,
        autoPurgeEnabled: true,
        description: p.desc,
        updatedAt: new Date(),
      });
      if (res.isOk()) {
        this.retentionPolicies.set(id, res.value);
      }
    }

    // Default Privacy Notice
    const noticeId = makePrivacyNoticeId('notice-default-visitor');
    const noticeRes = PrivacyNotice.create({
      id: noticeId,
      targetAudience: 'VISITOR',
      version: '1.0.0',
      title: 'Aviso de Privacidad de Registro de Visitantes UMBRAL',
      content: 'De conformidad con la Ley Orgánica de Protección de Datos Personales (LOPDP), UMBRAL recaba sus datos personales para control de seguridad.',
      lawfulBasis: 'CONSENT',
      active: true,
      effectiveDate: new Date('2026-01-01T00:00:00Z'),
    });
    if (noticeRes.isOk()) {
      this.privacyNotices.set(noticeId, noticeRes.value);
    }

    // Mock Person & Event for ARCO tests
    const siteId = makeSiteId('site-default');
    const personId = makePersonId('person-demo-1');
    const personRes = Person.create({
      id: personId,
      siteId,
      personType: 'employee',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      nationalId: '1712345678',
      email: 'carlos.mendoza@example.com',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    if (personRes.isOk()) {
      this.mockPersons.set(personId, personRes.value);
    }

    const eventId = makeAccessEventId('evt-demo-1');
    const ts = new Date('2026-07-20T08:30:00Z');
    const payloadStr = JSON.stringify({});
    const currentHash = computeEventHash(GENESIS_HASH, eventId, ts.toISOString(), 'access.granted', payloadStr);
    const eventRes = AccessEvent.create({
      id: eventId,
      chainPartition: 'site-default',
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      currentHash,
      eventType: 'access.granted',
      siteId,
      doorId: makeDoorId('door-main'),
      personId,
      timestamp: ts,
    });
    if (eventRes.isOk()) {
      this.mockAccessEvents.push(eventRes.value);
    }
  }

  // --- RETENTION POLICIES ---

  public getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  public upsertRetentionPolicy(dto: CreateRetentionPolicyDto): RetentionPolicy {
    const id = makeRetentionPolicyId(`ret-${dto.dataType}`);
    const res = RetentionPolicy.create({
      id,
      dataType: dto.dataType,
      retentionDays: dto.retentionDays,
      autoPurgeEnabled: dto.autoPurgeEnabled,
      description: dto.description,
      updatedAt: new Date(),
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    this.retentionPolicies.set(id, res.value);
    return res.value;
  }

  public registerPurgeableItem(item: PurgeableItem) {
    this.purgeableItems.push(item);
  }

  public executePurge(dataType?: ComplianceDataType, referenceDate: Date = new Date()): PurgeSummary[] {
    const summaries: PurgeSummary[] = [];
    const policiesToRun = dataType
      ? Array.from(this.retentionPolicies.values()).filter(p => p.dataType === dataType)
      : Array.from(this.retentionPolicies.values());

    for (const policy of policiesToRun) {
      const summary = policy.executePurge(this.purgeableItems, referenceDate);
      summaries.push(summary);

      // Remove purged item IDs from in-memory pool
      if (summary.purgedIds.length > 0) {
        const purgedSet = new Set(summary.purgedIds);
        this.purgeableItems = this.purgeableItems.filter(i => !purgedSet.has(i.id));
      }
    }

    return summaries;
  }

  // --- PII AUDIT LOGS ---

  public recordPiiAccess(dto: RecordPiiAccessDto): PiiAccessAuditLog {
    const roles = dto.operatorRoles ?? ['operator'];
    const authRes = PiiAccessAuditLog.authorizeAccess(dto.operatorId, roles, dto.accessType, dto.targetPersonId);

    if (authRes.isErr()) {
      throw new ForbiddenException(authRes.error.message);
    }

    const id = makePiiAuditLogId(`pii-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const logRes = PiiAccessAuditLog.create({
      id,
      operatorId: dto.operatorId,
      targetPersonId: dto.targetPersonId,
      accessType: dto.accessType,
      justification: dto.justification,
      timestamp: new Date(),
      ipAddress: dto.ipAddress,
      metadata: dto.metadata,
    });

    if (logRes.isErr()) {
      throw new BadRequestException(logRes.error.message);
    }

    this.piiAuditLogs.push(logRes.value);
    return logRes.value;
  }

  public queryPiiAuditLogs(query: QueryPiiAuditDto): PiiAccessAuditLog[] {
    let result = [...this.piiAuditLogs];
    if (query.operatorId) {
      result = result.filter(l => l.operatorId === query.operatorId);
    }
    if (query.targetPersonId) {
      result = result.filter(l => l.targetPersonId === query.targetPersonId);
    }
    if (query.accessType) {
      result = result.filter(l => l.accessType === query.accessType);
    }
    if (query.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }
    return result;
  }

  // --- ARCO RIGHTS ---

  public exportPersonData(personId: string, dto: ArcoExportRequestDto): { bundle: ArcoExportBundle; auditLog: PiiAccessAuditLog } {
    const person = this.mockPersons.get(personId);
    if (!person) {
      throw new NotFoundException(`Person '${personId}' not found`);
    }

    const roles = dto.operatorRoles ?? ['compliance_officer'];
    const authRes = PiiAccessAuditLog.authorizeAccess(dto.operatorId, roles, 'ARCO_EXPORT', personId);
    if (authRes.isErr()) {
      throw new ForbiddenException(authRes.error.message);
    }

    const consents = this.privacyConsents
      .filter(c => c.personId === personId)
      .map(c => ({ noticeId: c.noticeId, version: c.noticeVersion, acceptedAt: c.acceptedAt }));

    const res = ArcoService.exportData(person, this.mockAccessEvents, consents, dto.operatorId, dto.justification);
    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    this.piiAuditLogs.push(res.value.auditLog);
    return res.value;
  }

  public rectifyPersonData(personId: string, dto: ArcoRectifyRequestDto): { person: Person; auditLog: PiiAccessAuditLog } {
    const existing = this.mockPersons.get(personId);
    if (!existing) {
      throw new NotFoundException(`Person '${personId}' not found`);
    }

    const roles = dto.operatorRoles ?? ['compliance_officer'];
    const authRes = PiiAccessAuditLog.authorizeAccess(dto.operatorId, roles, 'ARCO_RECTIFY', personId);
    if (authRes.isErr()) {
      throw new ForbiddenException(authRes.error.message);
    }

    const updatedRes = Person.create({
      id: existing.id,
      siteId: existing.siteId,
      personType: existing.personType,
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      nationalId: existing.nationalId,
      email: dto.email ?? existing.email,
      phone: dto.phone ?? existing.phone,
      createdAt: existing.props.createdAt,
      updatedAt: new Date(),
    });

    if (updatedRes.isErr()) {
      throw new BadRequestException(updatedRes.error.message);
    }

    this.mockPersons.set(personId, updatedRes.value);

    const auditId = makePiiAuditLogId(`pii-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const auditRes = PiiAccessAuditLog.create({
      id: auditId,
      operatorId: dto.operatorId,
      targetPersonId: personId,
      accessType: 'ARCO_RECTIFY',
      justification: dto.justification,
      timestamp: new Date(),
    });

    if (auditRes.isErr()) {
      throw new BadRequestException(auditRes.error.message);
    }

    this.piiAuditLogs.push(auditRes.value);
    return { person: updatedRes.value, auditLog: auditRes.value };
  }

  public anonymizePersonData(personId: string, dto: ArcoAnonymizeRequestDto): { result: AnonymizedPersonResult; auditLog: PiiAccessAuditLog } {
    const person = this.mockPersons.get(personId);
    if (!person) {
      throw new NotFoundException(`Person '${personId}' not found`);
    }

    const roles = dto.operatorRoles ?? ['compliance_officer'];
    const authRes = PiiAccessAuditLog.authorizeAccess(dto.operatorId, roles, 'ARCO_ANONYMIZE', personId);
    if (authRes.isErr()) {
      throw new ForbiddenException(authRes.error.message);
    }

    const res = ArcoService.anonymizeData(person, this.mockAccessEvents, dto.operatorId, dto.justification);
    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    // Pseudonymize person record in memory
    const anonPersonRes = Person.create({
      id: person.id,
      siteId: person.siteId,
      personType: person.personType,
      firstName: 'ANONYMIZED',
      lastName: 'ANONYMIZED',
      nationalId: '0000000000',
      email: 'anonymized@privacy.local',
      createdAt: person.props.createdAt,
      updatedAt: new Date(),
    });
    if (anonPersonRes.isOk()) {
      this.mockPersons.set(personId, anonPersonRes.value);
    }

    this.piiAuditLogs.push(res.value.auditLog);
    return res.value;
  }

  // --- LAWFUL BASIS & PRIVACY NOTICES ---

  public createPrivacyNotice(dto: CreatePrivacyNoticeDto): PrivacyNotice {
    const id = makePrivacyNoticeId(`notice-${dto.targetAudience.toLowerCase()}-${dto.version}`);
    const res = PrivacyNotice.create({
      id,
      targetAudience: dto.targetAudience,
      version: dto.version,
      title: dto.title,
      content: dto.content,
      lawfulBasis: dto.lawfulBasis,
      active: dto.active ?? true,
      effectiveDate: new Date(),
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    this.privacyNotices.set(id, res.value);
    return res.value;
  }

  public getPrivacyNotices(audience?: TargetAudience): PrivacyNotice[] {
    let result = Array.from(this.privacyNotices.values());
    if (audience) {
      result = result.filter(n => n.targetAudience === audience);
    }
    return result;
  }

  public recordPrivacyConsent(dto: RecordPrivacyConsentDto): PrivacyConsent {
    const id = makePrivacyConsentId(`consent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const res = PrivacyConsent.record({
      id,
      personId: dto.personId,
      noticeId: makePrivacyNoticeId(dto.noticeId),
      noticeVersion: dto.noticeVersion,
      lawfulBasis: dto.lawfulBasis,
      acceptedAt: new Date(),
      ipAddress: dto.ipAddress,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    this.privacyConsents.push(res.value);
    return res.value;
  }
}
