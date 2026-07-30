import { randomUUID } from 'node:crypto';

export function v4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return randomUUID();
}
