import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AccessRightsService } from './access-rights.service';
import {
  CreateScheduleDto,
  CreateHolidayCalendarDto,
  CreateAccessLevelDto,
  CreateGroupDto,
  AssignPersonToGroupDto,
} from './dto/access-rights.dto';

@Controller('access-rights')
export class AccessRightsController {
  constructor(private readonly accessRightsService: AccessRightsService) {}

  // Holiday Calendars
  @Post('holiday-calendars')
  createHolidayCalendar(@Body() dto: CreateHolidayCalendarDto) {
    return this.accessRightsService.createHolidayCalendar(dto);
  }

  @Get('holiday-calendars')
  getHolidayCalendars(@Query('siteId') siteId?: string) {
    return this.accessRightsService.getHolidayCalendars(siteId);
  }

  // Schedules
  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.accessRightsService.createSchedule(dto);
  }

  @Get('schedules')
  getSchedules(@Query('siteId') siteId?: string) {
    return this.accessRightsService.getSchedules(siteId);
  }

  // Access Levels
  @Post('access-levels')
  createAccessLevel(@Body() dto: CreateAccessLevelDto) {
    return this.accessRightsService.createAccessLevel(dto);
  }

  @Get('access-levels')
  getAccessLevels(@Query('siteId') siteId?: string) {
    return this.accessRightsService.getAccessLevels(siteId);
  }

  // Groups
  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.accessRightsService.createGroup(dto);
  }

  @Get('groups')
  getGroups(@Query('siteId') siteId?: string) {
    return this.accessRightsService.getGroups(siteId);
  }

  // Person Assignments
  @Post('assignments')
  assignPersonToGroup(@Body() dto: AssignPersonToGroupDto) {
    return this.accessRightsService.assignPersonToGroup(dto);
  }

  @Get('persons/:personId/assignments')
  getPersonGroupAssignments(@Param('personId') personId: string) {
    return this.accessRightsService.getPersonGroupAssignments(personId);
  }
}
