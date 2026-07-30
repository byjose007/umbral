import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import {
  CreatePersonDto,
  CreateEmploymentPeriodDto,
  CreateAbsenceDto,
  CreatePersonDocumentDto,
  BatchAccessStatusDto,
} from './dto/identity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  // Persons
  @Post('persons')
  createPerson(@Body() dto: CreatePersonDto) {
    return this.identityService.createPerson(dto);
  }

  @Get('persons')
  getPersons(
    @Query('siteId') siteId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.identityService.getPersons(
      siteId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('persons/:id')
  getPersonById(@Param('id') id: string) {
    return this.identityService.getPersonById(id);
  }

  // Derived Access Status
  @Get('persons/:id/access-status')
  getPersonAccessStatus(@Param('id') id: string, @Query('at') at?: string) {
    return this.identityService.evaluatePersonAccessStatus(id, at);
  }

  @Post('access-status/batch')
  getAccessStatusBatch(@Body() dto: BatchAccessStatusDto) {
    return this.identityService.evaluateAccessStatusBatch(dto.personIds);
  }

  // Employment Periods
  @Post('employment-periods')
  createEmploymentPeriod(@Body() dto: CreateEmploymentPeriodDto) {
    return this.identityService.createEmploymentPeriod(dto);
  }

  @Get('persons/:id/employment-periods')
  getEmploymentPeriods(@Param('id') id: string) {
    return this.identityService.getEmploymentPeriods(id);
  }

  // Absences
  @Post('absences')
  createAbsence(@Body() dto: CreateAbsenceDto) {
    return this.identityService.createAbsence(dto);
  }

  @Get('persons/:id/absences')
  getAbsences(@Param('id') id: string) {
    return this.identityService.getAbsences(id);
  }

  // Person Documents
  @Post('documents')
  createPersonDocument(@Body() dto: CreatePersonDocumentDto) {
    return this.identityService.createPersonDocument(dto);
  }

  @Get('persons/:id/documents')
  getPersonDocuments(@Param('id') id: string) {
    return this.identityService.getPersonDocuments(id);
  }
}
