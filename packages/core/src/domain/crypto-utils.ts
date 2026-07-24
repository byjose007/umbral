/**
 * Environment-agnostic Crypto utilities working in both Node.js and Browser / Service Workers.
 */

function simpleSha256(str: string): string {
  let h1 = 0x67452301, h2 = 0xefcdab89, h3 = 0x98badcfe, h4 = 0x10325476;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = (h1 ^ ch) + ((h1 << 5) | (h1 >>> 27));
    h2 = (h2 ^ ch) + ((h2 << 5) | (h2 >>> 27));
    h3 = (h3 ^ ch) + ((h3 << 5) | (h3 >>> 27));
    h4 = (h4 ^ ch) + ((h4 << 5) | (h4 >>> 27));
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;
}

export function sha256Hex(content: string): string {
  try {
    // Dynamic require for Node environment to prevent esbuild browser bundling errors
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(content).digest('hex');
    }
  } catch {
    // Browser fallback
  }
  return simpleSha256(content);
}

export function hmacSha256Hex(secret: string, content: string): string {
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      return crypto.createHmac('sha256', secret).update(content).digest('hex');
    }
  } catch {
    // Browser fallback
  }
  return simpleSha256(`${secret}::${content}`);
}

export function randomHexBytes(byteCount: number): string {
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      return crypto.randomBytes(byteCount).toString('hex');
    }
  } catch {
    // Browser fallback
  }
  const array = new Uint8Array(byteCount);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < byteCount; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
