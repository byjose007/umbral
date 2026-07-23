import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UserPassService } from './user-pass.service';
import {
  LoginUserPassDto,
  GetUserAccessHistoryDto,
  IssueVisitorPassDto,
  GetVisitorPassesDto,
  VerifyUserPassTokenDto,
  RecordVisitorPassUseDto,
} from './dto/user-pass.dto';

@Controller('user-pass')
export class UserPassController {
  constructor(private readonly userPassService: UserPassService) {}

  /** POST /user-pass/login — authenticate and retrieve offline seed */
  @Post('login')
  login(@Body() dto: LoginUserPassDto) {
    return this.userPassService.login(dto);
  }

  /** GET /user-pass/seed/:personId — fetch current seed for PWA refresh */
  @Get('seed/:personId')
  getSeed(@Param('personId') personId: string) {
    return this.userPassService.getSeed(personId);
  }

  /** GET /user-pass/history/:personId — personal access history */
  @Get('history/:personId')
  getAccessHistory(
    @Param('personId') personId: string,
    @Query('limit') limit?: string,
  ) {
    const dto: GetUserAccessHistoryDto = {
      personId,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.userPassService.getAccessHistory(dto);
  }

  /** POST /user-pass/verify — server-side QR token verification (door readers) */
  @Post('verify')
  verifyToken(@Body() dto: VerifyUserPassTokenDto) {
    return this.userPassService.verifyToken(dto);
  }

  /** POST /user-pass/visitor-pass — issue a new guest visitor pass */
  @Post('visitor-pass')
  issueVisitorPass(@Body() dto: IssueVisitorPassDto) {
    return this.userPassService.issueVisitorPass(dto);
  }

  /** GET /user-pass/visitor-passes/:personId — list visitor passes issued by a person */
  @Get('visitor-passes/:personId')
  getVisitorPasses(
    @Param('personId') personId: string,
    @Query('status') status?: string,
  ) {
    const dto: GetVisitorPassesDto = { issuerPersonId: personId, status };
    return this.userPassService.getVisitorPasses(dto);
  }

  /** POST /user-pass/visitor-pass/use — record a use of a visitor pass */
  @Post('visitor-pass/use')
  recordVisitorPassUse(@Body() dto: RecordVisitorPassUseDto) {
    return this.userPassService.recordVisitorPassUse(dto);
  }
}
