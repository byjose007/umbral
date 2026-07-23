import { describe, it, expect } from 'vitest';
import { AlertRule } from '../alert-rule.entity.js';
import { Alert } from '../alert.entity.js';
import { pseudonymizePersonId } from '../pseudonymizer.js';
import { makeAlertRuleId, makeAlertId } from '../ids.js';
import { makeSiteId, makeDoorId } from '../../topology/ids.js';

describe('Alerting Domain', () => {
  const siteId = makeSiteId('site-1');
  const doorId = makeDoorId('door-1');

  it('pseudonymizes person ID for LOPDP compliance by default', () => {
    const rawPersonId = 'person-uuid-998877';
    const pseudo1 = pseudonymizePersonId(rawPersonId);
    const pseudo2 = pseudonymizePersonId(rawPersonId);

    expect(pseudo1).not.toContain('person-uuid-998877');
    expect(pseudo1).toMatch(/^USR-[A-Z0-9]{6}$/);
    expect(pseudo1).toBe(pseudo2); // Deterministic short code
  });

  it('creates an AlertRule entity', () => {
    const rule = AlertRule.create({
      id: makeAlertRuleId('rule-dfo'),
      siteId,
      name: 'Alerta Puerta Forzada DFO',
      eventType: 'door.forced_open',
      severity: 'critical',
      dedupWindowSec: 120,
      escalationSec: 300,
      channels: ['websocket', 'whatsapp'],
    })._unsafeUnwrap();

    expect(rule.eventType).toBe('door.forced_open');
    expect(rule.severity).toBe('critical');
    expect(rule.dedupWindowSec).toBe(120);
  });

  it('creates an Alert and pseudonymizes PII by default', () => {
    const alert = Alert.create({
      id: makeAlertId('alert-1'),
      siteId,
      doorId,
      eventType: 'access.denied',
      severity: 'warning',
      status: 'active',
      rawPersonId: 'person-secret-id',
      timestamp: new Date('2026-07-15T12:00:00.000Z'),
    })._unsafeUnwrap();

    expect(alert.status).toBe('active');
    expect(alert.pseudonymizedPersonId).toMatch(/^USR-[A-Z0-9]{6}$/);
    expect(alert.rawPersonId).toBe('person-secret-id'); // Kept internally for audited reveal
  });

  it('acknowledges an active alert and prevents double ACK', () => {
    const alert = Alert.create({
      id: makeAlertId('alert-2'),
      siteId,
      eventType: 'door.held_open',
      severity: 'warning',
      status: 'active',
      timestamp: new Date(),
    })._unsafeUnwrap();

    const ackRes = alert.acknowledge('operador.juan@umbral.com');
    expect(ackRes.isOk()).toBe(true);

    const ackAlert = ackRes._unsafeUnwrap();
    expect(ackAlert.status).toBe('acknowledged');
    expect(ackAlert.acknowledgedBy).toBe('operador.juan@umbral.com');

    // Double ACK fails
    const secondAck = ackAlert.acknowledge('operador.maria@umbral.com');
    expect(secondAck.isErr()).toBe(true);
    if (secondAck.isErr()) {
      expect(secondAck.error.code).toBe('ALERT_ALREADY_ACKNOWLEDGED');
    }
  });

  it('escalates unacknowledged alert', () => {
    const alert = Alert.create({
      id: makeAlertId('alert-3'),
      siteId,
      eventType: 'input.fault',
      severity: 'critical',
      status: 'active',
      timestamp: new Date(),
    })._unsafeUnwrap();

    const escRes = alert.escalate();
    expect(escRes.isOk()).toBe(true);
    expect(escRes._unsafeUnwrap().status).toBe('escalated');
  });
});
