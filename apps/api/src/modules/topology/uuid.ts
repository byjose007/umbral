import { randomUUID } from 'node:crypto';

export function cryptoNativeOrRandomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return randomUUID();
}
