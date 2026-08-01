import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import mqtt, { MqttClient } from 'mqtt';
import { firstValueFrom, take } from 'rxjs';
import { eventsTopic, heartbeatTopic, matrixTopic } from '@umbral/core';
import { DeviceGatewayModule } from './device-gateway.module';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';
import { MqttDoorControllerAdapter } from './mqtt-door-controller.adapter';

/**
 * Real integration test against the EMQX broker from docker-compose.yml (must be running —
 * `docker compose up -d` at the repo root). Exercises the actual wire path: a fake controller
 * (a second raw mqtt client, standing in for physical hardware) publishes/subscribes exactly
 * like a real device would, with no mocking of MqttDoorControllerAdapter or MqttClientService.
 */
describe('MQTT device-gateway integration (requires EMQX from docker-compose)', () => {
  const CONTROLLER_ID = 'ctrl-mqtt-integration-test';
  const BROKER_URL = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883';

  let module: TestingModule;
  let controller: DeviceGatewayController;
  let service: DeviceGatewayService;
  let adapter: MqttDoorControllerAdapter;
  let fakeDevice: MqttClient;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DeviceGatewayModule],
    }).compile();
    await module.init(); // connects MqttClientService and subscribes MqttDoorControllerAdapter for real

    controller = module.get(DeviceGatewayController);
    service = module.get(DeviceGatewayService);
    adapter = module.get(MqttDoorControllerAdapter);

    service.provisionDevice({ controllerId: CONTROLLER_ID, certificateThumbprint: 'thumb-integration-test' });

    fakeDevice = await new Promise<MqttClient>((resolve, reject) => {
      const client = mqtt.connect(BROKER_URL, { connectTimeout: 5000 });
      client.once('connect', () => resolve(client));
      client.once('error', reject);
    });

    // Give the broker time to process the server's SUBSCRIBE packets (events/heartbeat wildcards)
    // before any test publishes — otherwise the first publish can race the subscription ACK.
    await new Promise((r) => setTimeout(r, 500));
  }, 15000);

  afterAll(async () => {
    fakeDevice?.end(true);
    await module?.close();
  });

  it('ingests a heartbeat published by a real device over MQTT', async () => {
    fakeDevice.publish(
      heartbeatTopic(CONTROLLER_ID),
      JSON.stringify({
        controllerId: CONTROLLER_ID,
        appliedMatrixVersion: 1,
        firmwareVersion: '1.0.0',
        batteryStatus: 'ok',
        tamperState: false,
        deviceTimestamp: Date.now(),
      }),
    );

    await waitFor(() => service.getDeviceHealth(CONTROLLER_ID, 1).isOnline === true);

    const health = service.getDeviceHealth(CONTROLLER_ID, 1);
    expect(health.isOnline).toBe(true);
  }, 10000);

  it('ingests an event published by a real device and deduplicates by eventId', async () => {
    const eventsPromise = firstValueFrom(adapter.events$.pipe(take(1)));

    const eventId = `evt-${Date.now()}`;
    const publishEvent = () =>
      fakeDevice.publish(
        eventsTopic(CONTROLLER_ID),
        JSON.stringify({
          eventId,
          controllerId: CONTROLLER_ID,
          doorId: 'door-integration-test',
          eventType: 'door.opened',
          timestamp: new Date().toISOString(),
        }),
      );

    publishEvent();
    const firstEvent = await eventsPromise;
    expect(firstEvent.id).toBe(eventId);

    // Republishing the same eventId must NOT produce a second emission on events$.
    const collected: unknown[] = [];
    const sub = adapter.events$.subscribe((e) => collected.push(e));
    publishEvent();
    await new Promise((r) => setTimeout(r, 500));
    sub.unsubscribe();

    expect(collected.length).toBe(0);
  }, 10000);

  it('pushes an access matrix to the controller-specific MQTT topic', async () => {
    const receivedMatrix = new Promise<Record<string, unknown>>((resolve) => {
      fakeDevice.subscribe(matrixTopic(CONTROLLER_ID), () => {
        fakeDevice.once('message', (topic, payload) => {
          if (topic === matrixTopic(CONTROLLER_ID)) {
            resolve(JSON.parse(payload.toString()));
          }
        });
      });
    });

    await new Promise((r) => setTimeout(r, 200)); // let the subscribe settle

    const testMatrix = { matrixVersion: 1, controllerId: CONTROLLER_ID, credentials: {} };
    await controller.pushMatrix(CONTROLLER_ID, testMatrix);

    const received = await receivedMatrix;
    expect(received).toEqual(testMatrix);
  }, 10000);
});

async function waitFor(check: () => boolean, timeoutMs = 5000, intervalMs = 50): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('waitFor: condition not met within timeout');
}
