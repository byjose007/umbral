import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DecisionModule } from './decision.module';
import { DecisionService } from './decision.service';
import { DecisionController } from './decision.controller';

describe('Decision Module (NestJS API)', () => {
  let service: DecisionService;
  let controller: DecisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DecisionModule],
    }).compile();

    service = module.get<DecisionService>(DecisionService);
    controller = module.get<DecisionController>(DecisionController);
  });

  it('should compile access matrix and evaluate decision', () => {
    const compiledMatrix = controller.compileMatrix({
      controllerId: 'ctrl-server-1',
      matrixVersion: 1,
      userAccessLevels: [
        {
          personId: 'p-100',
          credentialHash: 'hash-api-user',
          duressPin: '9999',
          doors: [
            {
              doorId: 'door-server-1',
              windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
            },
          ],
        },
      ],
    });

    expect(compiledMatrix.controllerId).toBe('ctrl-server-1');
    expect(compiledMatrix.credentials['hash-api-user']).toBeDefined();

    const evaluation = controller.evaluate({
      credentialHash: 'hash-api-user',
      doorId: 'door-server-1',
      readerId: 'reader-server-1',
      at: '2026-07-23T10:00:00.000Z',
      presentedPin: '9999',
      localState: {
        matrix: compiledMatrix,
        offlineMode: 'cached',
        isOffline: false,
      },
    });

    expect(evaluation.serverMirror).toBe(true);
    expect(evaluation.executionMs).toBeLessThan(500);
    expect(evaluation.decision.kind).toBe('granted');
    if (evaluation.decision.kind === 'granted') {
      expect(evaluation.decision.reasonCode).toBe('DURESS_MATCH');
      expect(evaluation.decision.silentAlarm).toBe('duress');
    }
  });

  it('denies unknown credential in server mirror', () => {
    const compiledMatrix = controller.compileMatrix({
      controllerId: 'ctrl-server-1',
      matrixVersion: 1,
      userAccessLevels: [],
    });

    const evaluation = controller.evaluate({
      credentialHash: 'hash-unknown',
      doorId: 'door-server-1',
      readerId: 'reader-server-1',
      at: '2026-07-23T10:00:00.000Z',
      localState: {
        matrix: compiledMatrix,
        offlineMode: 'cached',
        isOffline: false,
      },
    });

    expect(evaluation.decision.kind).toBe('denied');
    if (evaluation.decision.kind === 'denied') {
      expect(evaluation.decision.reasonCode).toBe('UNKNOWN_CREDENTIAL');
    }
  });
});
