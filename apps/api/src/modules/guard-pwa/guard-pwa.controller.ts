import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { GuardPwaService } from './guard-pwa.service';
import {
  SaveMusterSnapshotDto,
  RecordGuardOverrideLogDto,
} from './dto/guard-pwa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedOperator {
  id: string;
  siteId: string;
  organizationId: string;
  role: string;
  assignedReaderId: string | null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('guardia', 'admin', 'supervisor')
@Controller('guard')
export class GuardPwaController {
  constructor(private readonly guardService: GuardPwaService) {}

  /** GET /guard/sync/:siteId — offline sync data: occupancy, CRL, seed (scoped to the caller's org) */
  @Get('sync/:siteId')
  getSyncData(
    @Param('siteId') siteId: string,
    @Req() req: { user: AuthenticatedOperator },
  ) {
    return this.guardService.getSyncData(siteId, req.user.organizationId);
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

  /** POST /guard/verify — offline/server QR verification check (scoped to the caller's org) */
  @Post('verify')
  verifyToken(
    @Body('token') token: string,
    @Req() req: { user: AuthenticatedOperator },
  ) {
    return this.guardService.verifyQR(token, req.user.organizationId);
  }

  /**
   * POST /guard/verify-realtime — online-first verification against the shared decision engine
   * (evaluateAccess/evaluateAPB), using the authenticated operator's assigned checkpoint. The
   * Angular guard app falls back to local offline HMAC verification only if this call fails.
   */
  @Post('verify-realtime')
  verifyRealtime(
    @Body('token') token: string,
    @Req() req: { user: AuthenticatedOperator },
  ) {
    return this.guardService.verifyRealtime(token, req.user.assignedReaderId, req.user.organizationId);
  }
}
