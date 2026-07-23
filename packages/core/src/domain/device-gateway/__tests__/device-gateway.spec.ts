import { describe, it, expect } from 'vitest';
import { eventsTopic, matrixTopic, heartbeatTopic, commandsTopic } from '../mqtt-topics.js';
import { makeControllerId } from '../../topology/ids.js';

describe('Device Gateway Domain & MQTT Infrastructure', () => {
  const controllerId = makeControllerId('ctrl-101');

  it('builds standard MQTT topic paths for controller isolation', () => {
    expect(eventsTopic(controllerId)).toBe('umbral/v1/controllers/ctrl-101/events');
    expect(matrixTopic(controllerId)).toBe('umbral/v1/controllers/ctrl-101/matrix');
    expect(heartbeatTopic(controllerId)).toBe('umbral/v1/controllers/ctrl-101/heartbeat');
    expect(commandsTopic(controllerId)).toBe('umbral/v1/controllers/ctrl-101/commands');
  });
});
