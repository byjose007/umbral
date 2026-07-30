import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  DispatchNotificationDto,
  TestChannelDto,
  GetNotificationLogsDto,
} from './dto/notifications.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** POST /notifications/dispatch — Enqueue and dispatch alert notification */
  @Post('dispatch')
  dispatchAlertNotification(@Body() dto: DispatchNotificationDto) {
    return this.notificationsService.dispatchAlertNotification(dto);
  }

  /** POST /notifications/test — Test notification channel dispatch */
  @Post('test')
  testChannel(@Body() dto: TestChannelDto) {
    return this.notificationsService.testChannel(dto);
  }

  /** POST /notifications/retry — Retry failed notification dispatches */
  @Post('retry')
  retryFailedNotifications() {
    return this.notificationsService.retryFailedNotifications();
  }

  /** GET /notifications/logs — Get audit log history of dispatches */
  @Get('logs')
  getNotificationLogs(
    @Query('alertId') alertId?: string,
    @Query('status') status?: 'queued' | 'sent' | 'failed' | 'retrying',
    @Query('limit') limit?: string,
  ) {
    const dto: GetNotificationLogsDto = {
      alertId,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    };
    return this.notificationsService.getNotificationLogs(dto);
  }
}
