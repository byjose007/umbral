import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IdentityService } from './identity.service';
import {
  CreatePersonDto,
  CreateEmploymentPeriodDto,
  CreateAbsenceDto,
  CreatePersonDocumentDto,
} from './dto/identity.dto';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  // Persons
  @Post('persons')
  createPerson(@Body() dto: CreatePersonDto) {
    return this.identityService.createPerson(dto);
  }

  @Get('persons')
  getPersons(@Query('siteId') siteId?: string) {
    return this.identityService.getPersons(siteId);
  }

  @Get('persons/:id')
  getPersonById(@Param('id') id: string) {
    return this.identityService.getPersonById(id);
  }

  // Derived Access Status
  @Get('persons/:id/access-status')
  getPersonAccessStatus(
    @Param('id') id: string,
    @Query('at') at?: string
  ) {
    return this.identityService.evaluatePersonAccessStatus(id, at);
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
