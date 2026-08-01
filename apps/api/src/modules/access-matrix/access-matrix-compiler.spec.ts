import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessMatrixModule } from './access-matrix.module';
import { AccessMatrixCompilerService } from './access-matrix-compiler.service';
import { IdentityService } from '../identity/identity.service';
import { CredentialsService } from '../credentials/credentials.service';
import { AccessRightsService } from '../access-rights/access-rights.service';

describe('AccessMatrixCompilerService', () => {
  let compiler: AccessMatrixCompilerService;
  let identityService: IdentityService;
  let credentialsService: CredentialsService;
  let accessRightsService: AccessRightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AccessMatrixModule],
    }).compile();

    compiler = module.get(AccessMatrixCompilerService);
    identityService = module.get(IdentityService);
    credentialsService = module.get(CredentialsService);
    accessRightsService = module.get(AccessRightsService);
  });

  it('compiles a real access matrix from identity + credentials + access-rights data', () => {
    const person = identityService.createPerson({
      siteId: 'site-test',
      personType: 'employee',
      firstName: 'Ana',
      lastName: 'Torres',
      nationalId: 'AM-001',
      email: 'ana@umbral.local',
    });
    identityService.createEmploymentPeriod({
      personId: person.id,
      contractType: 'full_time',
      validFrom: '2020-01-01T00:00:00.000Z',
    });

    const credential = credentialsService.issueCredential({
      personId: person.id,
      credentialType: 'qr_dynamic',
      rawPayload: 'raw-payload-ana-001',
      validFrom: '2020-01-01T00:00:00.000Z',
    });

    const schedule = accessRightsService.createSchedule({
      siteId: 'site-test',
      name: 'Horario Oficina Lunes',
      windows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });

    const accessLevel = accessRightsService.createAccessLevel({
      siteId: 'site-test',
      name: 'Acceso Puerta Principal',
      entries: [{ doorId: 'door-main-entrance', scheduleId: schedule.id }],
    });

    const group = accessRightsService.createGroup({
      siteId: 'site-test',
      name: 'Empleados',
      accessLevelIds: [accessLevel.id],
    });

    accessRightsService.assignPersonToGroup({
      personId: person.id,
      groupId: group.id,
      validFrom: '2020-01-01T00:00:00.000Z',
    });

    // Monday 2026-08-03 10:00 UTC — inside the granted window.
    const result = compiler.compileForPerson(person.id, new Date('2026-08-03T10:00:00.000Z'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.credentialHash).toBe(credential.credentialHash);
    const entry = result.matrix.credentials[credential.credentialHash];
    expect(entry.allowedDoorIds).toContain('door-main-entrance');
    expect(entry.allowedDoorIds).not.toContain('door-server-room');
    expect(entry.schedulesByDoor['door-main-entrance']).toEqual([
      { dayOfWeek: 1, startMinute: 540, endMinute: 1020 },
    ]);
  });

  it('denies compilation when the person has no active qr_dynamic credential', () => {
    const person = identityService.createPerson({
      siteId: 'site-test',
      personType: 'employee',
      firstName: 'Luis',
      lastName: 'Perez',
      nationalId: 'AM-002',
    });
    identityService.createEmploymentPeriod({
      personId: person.id,
      contractType: 'full_time',
      validFrom: '2020-01-01T00:00:00.000Z',
    });

    const result = compiler.compileForPerson(person.id, new Date('2026-08-03T10:00:00.000Z'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('NO_ACTIVE_CREDENTIAL');
  });

  it('denies compilation when the person has no active employment period', () => {
    const person = identityService.createPerson({
      siteId: 'site-test',
      personType: 'contractor',
      firstName: 'Sin',
      lastName: 'Empleo',
      nationalId: 'AM-003',
    });

    const result = compiler.compileForPerson(person.id, new Date('2026-08-03T10:00:00.000Z'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('NOT_EMPLOYED');
  });
});
