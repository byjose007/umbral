import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ConflictException } from '@nestjs/common';

describe('NotificationsModule', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [NotificationsService],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should dispatch WhatsApp alert notification successfully', async () => {
    const res = await controller.dispatchAlertNotification({
      alertId: 'ALT-101',
      templateId: 'FORCED_DOOR',
      recipientRole: 'security_chief',
      recipientTarget: '+593991234567',
      channel: 'whatsapp',
      locale: 'es',
      payload: { zoneId: 'ZONA-A', doorId: 'P-01', timestamp: '15:00' },
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('sent');
    expect(res.externalId).toContain('wa-msg-');

    const logs = controller.getNotificationLogs('ALT-101');
    expect(logs.length).toBe(1);
    expect(logs[0]!.channel).toBe('whatsapp');
  });

  it('should enforce idempotency and prevent duplicate dispatches for the same alert target', async () => {
    await controller.dispatchAlertNotification({
      alertId: 'ALT-102',
      templateId: 'HELD_OPEN',
      recipientRole: 'security',
      recipientTarget: '+593998765432',
      channel: 'whatsapp',
      payload: { zoneId: 'ZONA-B', doorId: 'P-02' },
    });

    await expect(
      controller.dispatchAlertNotification({
        alertId: 'ALT-102',
        templateId: 'HELD_OPEN',
        recipientRole: 'security',
        recipientTarget: '+593998765432',
        channel: 'whatsapp',
        payload: { zoneId: 'ZONA-B', doorId: 'P-02' },
      })
    ).rejects.toThrow(ConflictException);
  });

  it('should test channel dispatch with localized template rendering', async () => {
    const res = await controller.testChannel({
      channel: 'email',
      recipientTarget: 'admin@umbral.app',
      locale: 'en',
      templateId: 'FORCED_DOOR',
    });

    expect(res.success).toBe(true);
    expect(res.subject).toContain('CRITICAL ALERT: Forced Door');
  });

  it('should track failed dispatch and handle retry queue processing', async () => {
    // Dispatch to invalid target to trigger channel error
    const dispatchRes = await controller.dispatchAlertNotification({
      alertId: 'ALT-103',
      templateId: 'TAILGATING_SUSPECT',
      recipientRole: 'facility_manager',
      recipientTarget: 'invalid_number',
      channel: 'whatsapp',
      payload: { zoneId: 'ZONA-C', doorId: 'P-03' },
    });

    expect(dispatchRes.success).toBe(false);
    expect(dispatchRes.status).toBe('retrying');

    const retryRes = await controller.retryFailedNotifications();
    expect(retryRes.retriedCount).toBe(1);
  });
});
