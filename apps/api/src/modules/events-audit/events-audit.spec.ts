import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventsAuditController } from './events-audit.controller';
import { EventsAuditService } from './events-audit.service';

describe('EventsAuditModule', () => {
  let controller: EventsAuditController;
  let service: EventsAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsAuditController],
      providers: [EventsAuditService],
    }).compile();

    controller = module.get<EventsAuditController>(EventsAuditController);
    service = module.get<EventsAuditService>(EventsAuditService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('records events with hash chaining and passes verification', () => {
    const partition = 'ctrl-101';

    const e1 = controller.recordEvent({
      chainPartition: partition,
      eventType: 'access.granted',
      siteId: 'site-1',
      doorId: 'door-1',
      controllerId: partition,
      personId: 'p-1',
      credentialId: 'c-1',
      direction: 'in',
    });

    expect(e1.sequenceNumber).toBe(1);
    expect(e1.previousHash).toBe(
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(e1.currentHash.length).toBe(64);

    const e2 = controller.recordEvent({
      chainPartition: partition,
      eventType: 'door.opened',
      siteId: 'site-1',
      doorId: 'door-1',
      controllerId: partition,
    });

    expect(e2.sequenceNumber).toBe(2);
    expect(e2.previousHash).toBe(e1.currentHash);

    const verification = controller.verifyChain({ chainPartition: partition });
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.verifiedCount).toBe(2);
    }
  });

  it('records PACS events: input.fault, rex.activated, and fire.release_detected', () => {
    const partition = 'ctrl-202';

    const fault = controller.recordEvent({
      chainPartition: partition,
      eventType: 'input.fault',
      severity: 'critical',
      siteId: 'site-1',
      details: { inputChannel: 2, eolState: 'short_circuit' },
    });
    expect(fault.severity).toBe('critical');

    const rex = controller.recordEvent({
      chainPartition: partition,
      eventType: 'rex.activated',
      siteId: 'site-1',
      doorId: 'door-2',
    });
    expect(rex.eventType).toBe('rex.activated');

    const fire = controller.recordEvent({
      chainPartition: partition,
      eventType: 'fire.release_detected',
      severity: 'critical',
      siteId: 'site-1',
    });
    expect(fire.eventType).toBe('fire.release_detected');

    const verification = controller.verifyChain({ chainPartition: partition });
    expect(verification.valid).toBe(true);
  });

  describe('pseudonymized feed and audited PII reveal', () => {
    it('never exposes raw personId in the feed, only a pseudonym', () => {
      controller.recordEvent({
        chainPartition: 'ctrl-feed-1',
        eventType: 'access.granted',
        siteId: 'site-feed',
        doorId: 'door-1',
        personId: 'person-secret-1',
      });

      const feed = controller.getFeed('site-feed');
      expect(feed).toHaveLength(1);
      expect((feed[0] as any).personId).toBeUndefined();
      expect(feed[0].hasPii).toBe(true);
      expect(feed[0].pseudonymizedPersonId).toMatch(/^USR-[A-Z0-9]{6}$/);
    });

    it('rejects revealing PII for an event with no associated person', () => {
      const evt = controller.recordEvent({
        chainPartition: 'ctrl-feed-2',
        eventType: 'input.fault',
        siteId: 'site-feed',
      });

      expect(() =>
        controller.revealPii(evt.id, { operatorUser: 'op@umbral.local' }),
      ).toThrow(BadRequestException);
    });

    it('reveals PII and records an immutable audit log entry (DP-06)', () => {
      const evt = controller.recordEvent({
        chainPartition: 'ctrl-feed-3',
        eventType: 'access.granted',
        siteId: 'site-feed',
        personId: 'person-secret-2',
      });

      const reveal = controller.revealPii(evt.id, {
        operatorUser: 'op@umbral.local',
      });
      expect(reveal.rawPersonId).toBe('person-secret-2');
      expect(reveal.pseudonymizedPersonId).toMatch(/^USR-[A-Z0-9]{6}$/);

      const logs = controller.getPiiAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operatorUser).toBe('op@umbral.local');
      expect(logs[0].revealedPersonId).toBe('person-secret-2');
    });
  });
});
