import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';


describe('IdentityModule', () => {
  let controller: IdentityController;
  let service: IdentityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [IdentityService],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
    service = module.get<IdentityService>(IdentityService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('creates and lists persons', () => {
    const person = controller.createPerson({
      siteId: 'site-1',
      personType: 'employee',
      firstName: 'Ana',
      lastName: 'Torres',
      nationalId: '1799887766',
      externalRef: 'HR-200',
    });

    expect(person.id).toBeDefined();
    expect(person.firstName).toBe('Ana');

    const list = controller.getPersons('site-1');
    expect(list.length).toBe(1);
    expect(list[0]?.nationalId).toBe('1799887766');
  });

  it('prevents duplicate national ID per site', () => {
    controller.createPerson({
      siteId: 'site-1',
      personType: 'employee',
      firstName: 'Ana',
      lastName: 'Torres',
      nationalId: '1799887766',
    });

    expect(() =>
      controller.createPerson({
        siteId: 'site-1',
        personType: 'contractor',
        firstName: 'Pedro',
        lastName: 'Ramírez',
        nationalId: '1799887766',
      })
    ).toThrow(BadRequestException);
  });

  it('creates employment period and evaluates access status', () => {
    const person = controller.createPerson({
      siteId: 'site-1',
      personType: 'employee',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      nationalId: '0912345678',
    });

    controller.createEmploymentPeriod({
      personId: person.id,
      contractType: 'full_time',
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    const status = controller.getPersonAccessStatus(person.id, '2026-07-15T00:00:00.000Z');
    expect(status.status).toBe('allowed');
  });

  it('blocks access during active absence and unblocks after absence ends', () => {
    const person = controller.createPerson({
      siteId: 'site-1',
      personType: 'employee',
      firstName: 'Lucia',
      lastName: 'Vera',
      nationalId: '0955443322',
    });

    controller.createEmploymentPeriod({
      personId: person.id,
      contractType: 'full_time',
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    controller.createAbsence({
      personId: person.id,
      absenceType: 'vacation',
      validFrom: '2026-07-10T00:00:00.000Z',
      validUntil: '2026-07-20T23:59:59.000Z',
      blocksAccess: true,
    });

    const blocked = controller.getPersonAccessStatus(person.id, '2026-07-15T12:00:00.000Z');
    expect(blocked.status).toBe('blocked');
    if (blocked.status === 'blocked') {
      expect(blocked.reasonCode).toBe('ABSENCE_ACTIVE');
    }

    const unblocked = controller.getPersonAccessStatus(person.id, '2026-07-21T08:00:00.000Z');
    expect(unblocked.status).toBe('allowed');
  });

  it('rejects overlapping employment periods', () => {
    const person = controller.createPerson({
      siteId: 'site-1',
      personType: 'employee',
      firstName: 'Diego',
      lastName: 'Luna',
      nationalId: '0988776655',
    });

    controller.createEmploymentPeriod({
      personId: person.id,
      contractType: 'full_time',
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: '2026-06-30T23:59:59.000Z',
    });

    expect(() =>
      controller.createEmploymentPeriod({
        personId: person.id,
        contractType: 'full_time',
        validFrom: '2026-05-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
      })
    ).toThrow(BadRequestException);
  });
});
