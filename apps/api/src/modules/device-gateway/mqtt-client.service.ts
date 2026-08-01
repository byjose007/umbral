import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';

export type MqttMessageHandler = (topic: string, payload: Buffer) => void;

/**
 * Thin wrapper around MQTT.js — connects to the broker and exposes generic publish/subscribe.
 * No domain logic here; that lives in adapters (e.g. MqttDoorControllerAdapter) built on top.
 */
@Injectable()
export class MqttClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttClientService.name);
  private client: MqttClient | null = null;
  private readonly subscriptions: { pattern: string; handler: MqttMessageHandler }[] = [];

  onModuleInit(): void {
    const brokerUrl = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883';
    const client = mqtt.connect(brokerUrl, {
      clientId: `umbral-api-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 2000,
    });

    client.on('connect', () => this.logger.log(`Connected to MQTT broker at ${brokerUrl}`));
    client.on('reconnect', () => this.logger.warn('Reconnecting to MQTT broker...'));
    client.on('error', (err) => this.logger.error(`MQTT connection error: ${err.message}`));
    client.on('message', (topic, payload) => {
      for (const { pattern, handler } of this.subscriptions) {
        if (this.topicMatches(pattern, topic)) handler(topic, payload);
      }
    });

    this.client = client;
    for (const { pattern } of this.subscriptions) {
      this.client.subscribe(pattern);
    }
  }

  onModuleDestroy(): void {
    this.client?.end();
  }

  publish(topic: string, payload: unknown): void {
    if (!this.client) throw new Error('MQTT client not initialized');
    this.client.publish(topic, JSON.stringify(payload));
  }

  /** topicPattern may use MQTT wildcards ('+' single-level, '#' multi-level). */
  subscribe(topicPattern: string, handler: MqttMessageHandler): void {
    this.subscriptions.push({ pattern: topicPattern, handler });
    this.client?.subscribe(topicPattern);
  }

  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') {
        if (topicParts[i] === undefined) return false;
        continue;
      }
      if (patternParts[i] !== topicParts[i]) return false;
    }
    return patternParts.length === topicParts.length;
  }
}
