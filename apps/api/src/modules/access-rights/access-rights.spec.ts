import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessRightsController } from './access-rights.controller';
import { AccessRightsService } from './access-rights.service';

describe('AccessRightsModule', () => {
  let controller: AccessRightsController;
  let service: AccessRightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessRightsController],
      providers: [AccessRightsService],
    }).compile();

    controller = module.get<AccessRightsController>(AccessRightsController);
    service = module.get<AccessRightsService>(AccessRightsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('creates holiday calendar, schedule, access level, group and assigns person', () => {
    const siteId = 'site-1';

    // 1. Holiday Calendar
    const calendar = controller.createHolidayCalendar({
      siteId,
      name: 'Feriados Ecuador 2026',
      holidays: [
        { date: '2026-01-01', name: 'Año Nuevo' },
        { date: '2026-05-01', name: 'Día del Trabajo' },
      ],
    });
    expect(calendar.id).toBeDefined();

    // 2. Schedule
    const schedule = controller.createSchedule({
      siteId,
      name: 'Horario Oficina L-V',
      windows: [
        { dayOfWeek: 1, startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 2, startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 3, startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 4, startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 5, startTime: '07:00', endTime: '19:00' },
      ],
      holidayCalendarId: calendar.id,
      holidayBehavior: 'block_all',
    });
    expect(schedule.id).toBeDefined();

    // 3. Access Level
    const accessLevel = controller.createAccessLevel({
      siteId,
      name: 'Acceso Oficina Central',
      description: 'Puerta Principal en Horario Oficina',
      entries: [{ doorId: 'door-main', scheduleId: schedule.id }],
    });
    expect(accessLevel.entries.length).toBe(1);

    // 4. Group
    const group = controller.createGroup({
      siteId,
      name: 'Personal Administrativo',
      accessLevelIds: [accessLevel.id],
    });
    expect(group.accessLevelIds).toContain(accessLevel.id);

    // 5. Assignment
    const assignment = controller.assignPersonToGroup({
      personId: 'person-101',
      groupId: group.id,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
    });
    expect(assignment.groupId).toBe(group.id);
  });
});
