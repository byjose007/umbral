import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GuardPwaService } from './guard-pwa.service';
import {
  SaveMusterSnapshotDto,
  RecordGuardOverrideLogDto,
} from './dto/guard-pwa.dto';

@Controller('guard')
export class GuardPwaController {
  constructor(private readonly guardService: GuardPwaService) {}

  /** GET /guard/sync/:siteId — offline sync data: occupancy, CRL, seed */
  @Get('sync/:siteId')
  getSyncData(@Param('siteId') siteId: string) {
    return this.guardService.getSyncData(siteId);
  }

  /** POST /guard/muster-snapshot — save evacuation muster roll snapshot */
  @Post('muster-snapshot')
  saveMusterSnapshot(@Body() dto: SaveMusterSnapshotDto) {
    return this.guardService.saveMusterSnapshot(dto);
  }

  /** POST /guard/override-log — log manual gate release or identity unmask audit */
  @Post('override-log')
  recordOverrideLog(@Body() dto: RecordGuardOverrideLogDto) {
    return this.guardService.recordOverrideLog(dto);
  }

  /** GET /guard/alerts/:siteId — get pseudonymous active alerts */
  @Get('alerts/:siteId')
  getActiveAlerts(@Param('siteId') siteId: string) {
    return this.guardService.getActiveAlerts(siteId);
  }

  /** POST /guard/verify — offline/server QR verification check */
  @Post('verify')
  verifyToken(@Body('token') token: string) {
    return this.guardService.verifyQR(token);
  }
}
