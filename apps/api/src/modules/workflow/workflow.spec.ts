import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { PortalController } from './portal.controller';
import { WorkflowService } from './workflow.service';
import { IdentityController } from '../identity/identity.controller';
import { IdentityService } from '../identity/identity.service';
import { AccessRightsController } from '../access-rights/access-rights.controller';
import { AccessRightsService } from '../access-rights/access-rights.service';

describe('WorkflowModule', () => {
  let portalController: PortalController;
  let workflowController: WorkflowController;
  let identityController: IdentityController;
  let accessRightsController: AccessRightsController;

  const siteId = 'site-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        WorkflowController,
        PortalController,
        IdentityController,
        AccessRightsController,
      ],
      providers: [WorkflowService, IdentityService, AccessRightsService],
    }).compile();

    portalController = module.get(PortalController);
    workflowController = module.get(WorkflowController);
    identityController = module.get(IdentityController);
    accessRightsController = module.get(AccessRightsController);
  });

  function createAccessLevel() {
    const schedule = accessRightsController.createSchedule({
      siteId,
      name: 'Horario Proveedores',
      windows: [{ dayOfWeek: 1, startTime: '07:00', endTime: '19:00' }],
    });

    return accessRightsController.createAccessLevel({
      siteId,
      name: 'Acceso Bodega Visitas',
      description: 'Acceso temporal de proveedores',
      entries: [{ doorId: 'door-warehouse', scheduleId: schedule.id }],
    });
  }

  it('registers a request submitted through the public portal', () => {
    const accessLevel = createAccessLevel();

    const request = portalController.submitRequest({
      siteId,
      applicantType: 'provider',
      applicantName: 'Acme Proveedores',
      requestedAccessLevelId: accessLevel.id,
      reason: 'Mantenimiento de bodega',
      validFrom: '2026-07-20T00:00:00.000Z',
      validUntil: '2026-07-21T00:00:00.000Z',
    });

    expect(request.status).toBe('requested');
  });

  it('blocks approval when a required document is expired, then grants access with vigencia once resolved', () => {
    const accessLevel = createAccessLevel();

    const person = identityController.createPerson({
      siteId,
      personType: 'visitor',
      firstName: 'Juan',
      lastName: 'Proveedor',
      nationalId: '0102030405',
    });

    identityController.createPersonDocument({
      personId: person.id,
      docType: 'insurance_policy',
      documentNumber: 'POL-1',
      expiresAt: '2020-01-01T00:00:00.000Z',
      blocksAccessOnExpiry: true,
    });

    const request = portalController.submitRequest({
      siteId,
      applicantType: 'provider',
      applicantName: 'Juan Proveedor',
      applicantPersonId: person.id,
      requestedAccessLevelId: accessLevel.id,
      reason: 'Instalación de equipos',
      validFrom: '2026-07-20T00:00:00.000Z',
      validUntil: '2026-07-21T00:00:00.000Z',
      requiredDocumentTypes: ['insurance_policy'],
    });

    workflowController.moveToReview(request.id, { actor: 'reviewer-1' });

    expect(() =>
      workflowController.approve(request.id, {
        actor: 'approver-1',
        reason: 'OK',
      }),
    ).toThrow(BadRequestException);

    identityController.createPersonDocument({
      personId: person.id,
      docType: 'insurance_policy',
      documentNumber: 'POL-2',
      expiresAt: '2027-01-01T00:00:00.000Z',
      blocksAccessOnExpiry: true,
    });

    const approved = workflowController.approve(request.id, {
      actor: 'approver-1',
      reason: 'OK',
    });
    expect(approved.status).toBe('active');
    expect(approved.decidedBy).toBe('approver-1');
  });

  it('rejects an invalid direct transition from rejected to active', () => {
    const accessLevel = createAccessLevel();

    const request = portalController.submitRequest({
      siteId,
      applicantType: 'visitor',
      applicantName: 'Visitante X',
      requestedAccessLevelId: accessLevel.id,
      reason: 'Visita técnica',
      validFrom: '2026-07-20T00:00:00.000Z',
      validUntil: '2026-07-20T23:59:59.000Z',
    });

    workflowController.moveToReview(request.id, { actor: 'reviewer-1' });
    workflowController.reject(request.id, {
      actor: 'reviewer-1',
      reason: 'Fuera de alcance',
    });

    expect(() =>
      workflowController.approve(request.id, { actor: 'approver-1' }),
    ).toThrow(BadRequestException);
  });
});
