import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GuardPwaModule } from './guard-pwa.module';
import { GuardPwaController } from './guard-pwa.controller';
import { GuardPwaService } from './guard-pwa.service';
import { IdentityService } from '../identity/identity.service';
import { TopologyService } from '../topology/topology.service';
import { generateOfflineDynamicQRToken } from '@umbral/core';

const DEFAULT_ORG_ID = 'org-default';
const DEFAULT_ORG_SEED_SECRET = 'secret-key-12345678901234567890';
const fakeReq = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({ user: { id: 'op-1', siteId: 'site-default', organizationId: DEFAULT_ORG_ID, role: 'guardia', assignedReaderId: null, ...overrides } }) as any;

describe('GuardPwaModule', () => {
  let controller: GuardPwaController;
  let service: GuardPwaService;
  let identityService: IdentityService;
  let topologyService: TopologyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [GuardPwaModule],
    }).compile();
    await module.init(); // triggers OnModuleInit on TopologyModule (seeds the default organization)

    controller = module.get<GuardPwaController>(GuardPwaController);
    service = module.get<GuardPwaService>(GuardPwaService);
    identityService = module.get<IdentityService>(IdentityService);
    topologyService = module.get<TopologyService>(TopologyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should return sync data including occupancy, CRL and seed secret', () => {
    const data = controller.getSyncData('SITE-MAIN', fakeReq());
    expect(data.siteId).toBe('SITE-MAIN');
    expect(data.seedSecret).toBeDefined();
    expect(data.crlList).toBeInstanceOf(Array);
    expect(data.occupants.length).toBeGreaterThan(0);
  });

  it('should save emergency muster roll snapshot', () => {
    const result = controller.saveMusterSnapshot({
      siteId: 'SITE-MAIN',
      initiatedBy: 'Chief Security Officer',
      occupantsSnapshot: [
        {
          personId: 'PER-1001',
          pseudonym: 'USR-A9F32',
          zoneId: 'ZONE-A-MAIN',
          status: 'present_inside',
        },
        {
          personId: 'PER-1002',
          pseudonym: 'USR-B821C',
          zoneId: 'ZONE-B-LAB',
          status: 'evacuated_accounted',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.snapshotId).toContain('muster-');
    expect(service.getSavedMusterSnapshots().length).toBe(1);
  });

  it('should record manual contingency gate release log', () => {
    const result = controller.recordOverrideLog({
      guardPersonId: 'GRD-900',
      targetPersonId: 'PER-1001',
      targetDocument: '1712345678',
      doorId: 'DOOR-GATE-MAIN',
      reason: 'Physical barrier power outage override',
      action: 'manual_contingency_grant',
    });

    expect(result.success).toBe(true);
    expect(result.logId).toContain('log-');
    expect(service.getSavedOverrideLogs().length).toBe(1);
  });

  it('should return active pseudonymous alerts', () => {
    const alerts = controller.getActiveAlerts('SITE-MAIN');
    expect(alerts.length).toBe(2);
    expect(alerts[0].pseudonym).toBe('USR-A9F32');
  });

  it('should verify QR token using service', () => {
    const seed = 'secret-key-12345678901234567890';
    const { token } = generateOfflineDynamicQRToken(seed, 'PER-1001');

    const res = controller.verifyToken(token, fakeReq());
    expect(res.valid).toBe(true);
    expect(res.personId).toBe('PER-1001');
  });

  it('verify-realtime includes the enrolled person photo even when denied for other reasons', () => {
    const person = identityService.createPerson({
      siteId: 'site-test',
      personType: 'employee',
      firstName: 'Foto',
      lastName: 'Test',
      nationalId: 'PHOTO-001',
      photoUrl: 'https://cdn.umbral.local/photos/photo-001.jpg',
    });

    const seed = 'secret-key-12345678901234567890';
    const { token } = generateOfflineDynamicQRToken(seed, person.id);

    // No assignedReaderId -> denied before topology/decision are consulted, but the photo
    // lookup must still have run so the guard can visually confirm identity either way.
    const res = service.verifyRealtime(token, null, DEFAULT_ORG_ID);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('NO_ASSIGNED_CHECKPOINT');
    expect(res.photoUrl).toBe('https://cdn.umbral.local/photos/photo-001.jpg');
  });

  it('rejects a token signed with a different organization\'s seedSecret (tenant isolation)', () => {
    const org2 = topologyService.createOrganization({ code: 'ORG2', name: 'Otra Organización' });
    expect(org2.seedSecret).not.toBe(DEFAULT_ORG_SEED_SECRET);

    // Token signed with org-default's secret (what apps/user hardcodes today).
    const { token } = generateOfflineDynamicQRToken(DEFAULT_ORG_SEED_SECRET, 'PER-CROSS-ORG');

    // A guard whose operator belongs to org2 must NOT be able to verify it — different secret.
    const res = service.verifyRealtime(token, null, org2.id);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Firma HMAC no coincide');

    // The same token verifies fine (signature-wise) for a guard in org-default — proves the
    // rejection above is really about org-scoping, not a broken token.
    const sameOrgRes = service.verifyRealtime(token, null, DEFAULT_ORG_ID);
    expect(sameOrgRes.reason).not.toContain('Firma HMAC no coincide');
    expect(sameOrgRes.reason).toContain('NO_ASSIGNED_CHECKPOINT');
  });
});
