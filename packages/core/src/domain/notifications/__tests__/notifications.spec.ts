import { describe, it, expect } from 'vitest';
import {
  NotificationMessage,
  NotificationTemplateEngine,
  WhatsAppChannelDispatcher,
  EmailChannelDispatcher,
  WebPushChannelDispatcher,
} from '../../../index.js';

describe('Notifications Domain Unit Tests', () => {
  it('should generate consistent idempotency keys for alert notification dispatches', () => {
    const key1 = NotificationMessage.generateIdempotencyKey('ALT-101', '+593991234567', 'whatsapp');
    const key2 = NotificationMessage.generateIdempotencyKey('ALT-101', ' +593991234567 ', 'whatsapp');

    expect(key1).toBe('ALT-101:+593991234567:whatsapp');
    expect(key1).toBe(key2);
  });

  it('should create NotificationMessage and manage lifecycle status', () => {
    const msgResult = NotificationMessage.create({
      id: 'NOTIF-001',
      alertId: 'ALT-101',
      channel: 'whatsapp',
      recipientRole: 'security_chief',
      recipientTarget: '+593991234567',
      locale: 'es',
      templateId: 'FORCED_DOOR',
      payload: { zoneId: 'ZONA-NORTE', doorId: 'PUERTA-01', timestamp: '14:30' },
      idempotencyKey: 'ALT-101:+593991234567:whatsapp',
    });

    expect(msgResult.isOk()).toBe(true);
    if (msgResult.isOk()) {
      const msg = msgResult.value;
      expect(msg.status).toBe('queued');
      expect(msg.retryCount).toBe(0);

      const sentMsg = msg.markSent();
      expect(sentMsg.status).toBe('sent');
      expect(sentMsg.sentAt).toBeDefined();

      const failedMsg = msg.markFailed(3);
      expect(failedMsg.status).toBe('retrying');
      expect(failedMsg.retryCount).toBe(1);

      const finalFailedMsg = failedMsg.markFailed(2);
      expect(finalFailedMsg.status).toBe('failed');
    }
  });

  it('should render multi-language templates correctly', () => {
    const engine = new NotificationTemplateEngine();

    const esRender = engine.render('FORCED_DOOR', 'es', {
      zoneId: 'Servidores',
      doorId: 'D-01',
      timestamp: '02:15',
    });

    expect(esRender.isOk()).toBe(true);
    if (esRender.isOk()) {
      expect(esRender.value.subject).toContain('Puerta Forzada en Servidores');
      expect(esRender.value.body).toContain('puerta D-01');
    }

    const enRender = engine.render('FORCED_DOOR', 'en', {
      zoneId: 'Server Room',
      doorId: 'D-01',
      timestamp: '02:15',
    });

    expect(enRender.isOk()).toBe(true);
    if (enRender.isOk()) {
      expect(enRender.value.subject).toContain('CRITICAL ALERT: Forced Door at Server Room');
    }
  });

  it('should dispatch messages across WhatsApp, Email, and Web Push channels', async () => {
    const engine = new NotificationTemplateEngine();
    const rendered = engine.render('HELD_OPEN', 'es', { zoneId: 'Garita', doorId: 'P-MAIN' })._unsafeUnwrap();

    const waDispatcher = new WhatsAppChannelDispatcher();
    const emailDispatcher = new EmailChannelDispatcher();
    const pushDispatcher = new WebPushChannelDispatcher();

    const msg = NotificationMessage.create({
      id: 'NOTIF-002',
      alertId: 'ALT-102',
      channel: 'whatsapp',
      recipientRole: 'security',
      recipientTarget: '+593998765432',
      locale: 'es',
      templateId: 'HELD_OPEN',
      payload: {},
      idempotencyKey: 'ALT-102:+593998765432:whatsapp',
    })._unsafeUnwrap();

    const waRes = await waDispatcher.dispatch(msg, rendered.subject, rendered.body);
    expect(waRes.success).toBe(true);
    expect(waRes.externalId).toContain('wa-msg-');

    const emailMsg = NotificationMessage.create({
      ...msg.props,
      channel: 'email',
      recipientTarget: 'guard@umbral.app',
    })._unsafeUnwrap();

    const emailRes = await emailDispatcher.dispatch(emailMsg, rendered.subject, rendered.body);
    expect(emailRes.success).toBe(true);

    const pushMsg = NotificationMessage.create({
      ...msg.props,
      channel: 'webpush',
      recipientTarget: 'device-token-12345',
    })._unsafeUnwrap();

    const pushRes = await pushDispatcher.dispatch(pushMsg, rendered.subject, rendered.body);
    expect(pushRes.success).toBe(true);
  });
});
