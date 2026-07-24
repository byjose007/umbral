import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  NotificationMessage,
  NotificationTemplateEngine,
  WhatsAppChannelDispatcher,
  EmailChannelDispatcher,
  WebPushChannelDispatcher,
  ChannelDispatcher,
} from '@umbral/core';
import {
  DispatchNotificationDto,
  TestChannelDto,
  GetNotificationLogsDto,
} from './dto/notifications.dto';

export interface NotificationLogRecord {
  id: string;
  alertId: string;
  channel: string;
  recipientRole: string;
  recipientTarget: string;
  locale: string;
  templateId: string;
  idempotencyKey: string;
  status: 'queued' | 'sent' | 'failed' | 'retrying';
  retryCount: number;
  errorDetails?: string;
  payload: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly templateEngine = new NotificationTemplateEngine();
  private readonly dispatchers: Record<string, ChannelDispatcher> = {
    whatsapp: new WhatsAppChannelDispatcher(),
    email: new EmailChannelDispatcher(),
    webpush: new WebPushChannelDispatcher(),
  };

  private readonly notificationLogs: NotificationLogRecord[] = [];

  async dispatchAlertNotification(dto: DispatchNotificationDto) {
    const locale = dto.locale ?? 'es';
    const idempotencyKey = NotificationMessage.generateIdempotencyKey(
      dto.alertId,
      dto.recipientTarget,
      dto.channel,
    );

    // Idempotency check: verify whether notification was already sent or queued
    const existing = this.notificationLogs.find(
      (l) => l.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      throw new ConflictException(
        `Notification for alert '${dto.alertId}' to target '${dto.recipientTarget}' on channel '${dto.channel}' already exists.`,
      );
    }

    const msgId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createRes = NotificationMessage.create({
      id: msgId,
      alertId: dto.alertId,
      channel: dto.channel,
      recipientRole: dto.recipientRole,
      recipientTarget: dto.recipientTarget,
      locale,
      templateId: dto.templateId,
      payload: dto.payload,
      idempotencyKey,
    });

    if (createRes.isErr()) {
      throw new BadRequestException(createRes.error.message);
    }

    let message = createRes.value;

    // Render template
    const renderRes = this.templateEngine.render(
      dto.templateId,
      locale,
      dto.payload,
    );
    if (renderRes.isErr()) {
      throw new BadRequestException(renderRes.error.message);
    }
    const { subject, body } = renderRes.value;

    // Select channel dispatcher
    const dispatcher = this.dispatchers[dto.channel];
    if (!dispatcher) {
      throw new BadRequestException(
        `Unsupported notification channel: ${dto.channel}`,
      );
    }

    // Dispatch via channel
    const dispatchRes = await dispatcher.dispatch(message, subject, body);

    if (dispatchRes.success) {
      message = message.markSent();
    } else {
      message = message.markFailed(3);
    }

    const record: NotificationLogRecord = {
      id: message.id,
      alertId: message.alertId,
      channel: message.channel,
      recipientRole: message.recipientRole,
      recipientTarget: message.recipientTarget,
      locale: message.locale,
      templateId: message.templateId,
      idempotencyKey: message.idempotencyKey,
      status: message.status,
      retryCount: message.retryCount,
      errorDetails: dispatchRes.errorDetails,
      payload: message.payload,
      sentAt: message.sentAt,
      createdAt: message.createdAt,
    };

    this.notificationLogs.push(record);

    return {
      success: dispatchRes.success,
      notificationId: message.id,
      idempotencyKey,
      status: message.status,
      externalId: dispatchRes.externalId,
      errorDetails: dispatchRes.errorDetails,
    };
  }

  async testChannel(dto: TestChannelDto) {
    const locale = dto.locale ?? 'es';
    const templateId = dto.templateId ?? 'FORCED_DOOR';

    const renderRes = this.templateEngine.render(templateId, locale, {
      zoneId: 'ZONA-TEST',
      doorId: 'PUERTA-TEST',
      timestamp: new Date().toLocaleTimeString(),
    });

    if (renderRes.isErr()) {
      throw new BadRequestException(renderRes.error.message);
    }

    const { subject, body } = renderRes.value;
    const dispatcher = this.dispatchers[dto.channel];

    if (!dispatcher) {
      throw new BadRequestException(`Unsupported channel ${dto.channel}`);
    }

    const msg = NotificationMessage.create({
      id: `test-${Date.now()}`,
      alertId: 'TEST-ALERT',
      channel: dto.channel,
      recipientRole: 'tester',
      recipientTarget: dto.recipientTarget,
      locale,
      templateId,
      payload: {},
      idempotencyKey: `TEST-ALERT:${dto.recipientTarget}:${dto.channel}`,
    })._unsafeUnwrap();

    const dispatchRes = await dispatcher.dispatch(msg, subject, body);

    return {
      success: dispatchRes.success,
      channel: dto.channel,
      recipientTarget: dto.recipientTarget,
      subject,
      body,
      externalId: dispatchRes.externalId,
      errorDetails: dispatchRes.errorDetails,
    };
  }

  async retryFailedNotifications() {
    const failedRecords = this.notificationLogs.filter(
      (l) => l.status === 'retrying' || l.status === 'failed',
    );
    const retriedResults: Array<{
      id: string;
      success: boolean;
      status: string;
    }> = [];

    for (const record of failedRecords) {
      const dispatcher = this.dispatchers[record.channel];
      if (!dispatcher) continue;

      const renderRes = this.templateEngine.render(
        record.templateId,
        record.locale as any,
        record.payload,
      );
      if (renderRes.isErr()) continue;

      const { subject, body } = renderRes.value;

      const msg = NotificationMessage.create({
        id: record.id,
        alertId: record.alertId,
        channel: record.channel as any,
        recipientRole: record.recipientRole,
        recipientTarget: record.recipientTarget,
        locale: record.locale as any,
        templateId: record.templateId,
        payload: record.payload,
        idempotencyKey: record.idempotencyKey,
        retryCount: record.retryCount,
      })._unsafeUnwrap();

      // Retry sending
      const dispatchRes = await dispatcher.dispatch(msg, subject, body);

      if (dispatchRes.success) {
        record.status = 'sent';
        record.sentAt = new Date();
        record.errorDetails = undefined;
      } else {
        const updatedMsg = msg.markFailed(3);
        record.status = updatedMsg.status;
        record.retryCount = updatedMsg.retryCount;
        record.errorDetails = dispatchRes.errorDetails;
      }

      retriedResults.push({
        id: record.id,
        success: dispatchRes.success,
        status: record.status,
      });
    }

    return {
      retriedCount: retriedResults.length,
      results: retriedResults,
    };
  }

  getNotificationLogs(query: GetNotificationLogsDto) {
    let logs = [...this.notificationLogs];
    if (query.alertId) {
      logs = logs.filter((l) => l.alertId === query.alertId);
    }
    if (query.status) {
      logs = logs.filter((l) => l.status === query.status);
    }
    const limit = query.limit ?? 50;
    return logs.slice(0, limit);
  }
}
