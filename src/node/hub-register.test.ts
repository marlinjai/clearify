import { describe, it, expect, beforeAll } from 'vitest';
import { __internal } from './hub-register.js';

const { encryptSecret } = __internal;

// Generate a throwaway libsodium keypair at test setup so we never hardcode
// a real key. The public key is what GitHub returns from the Secrets API in
// the real flow; here we synthesize one.
let publicKeyBase64: string;

beforeAll(async () => {
  const sodium = (await import('libsodium-wrappers')).default;
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  publicKeyBase64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);
});

describe('encryptSecret', () => {
  it('returns a base64 string', async () => {
    const ciphertext = await encryptSecret('hello', publicKeyBase64);
    expect(typeof ciphertext).toBe('string');
    expect(ciphertext.length).toBeGreaterThan(0);
    // base64 chars only (original variant: A-Z a-z 0-9 + / =)
    expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('produces ciphertext at least 48 bytes long (sealed-box overhead)', async () => {
    const ciphertext = await encryptSecret('hello', publicKeyBase64);
    // Sealed-box adds an ephemeral public key (32 bytes) + MAC (16 bytes) = 48 bytes
    // of overhead on top of the message bytes.
    const decoded = Buffer.from(ciphertext, 'base64');
    expect(decoded.length).toBeGreaterThanOrEqual(48);
  });

  it('is non-deterministic: same input twice produces different ciphertexts', async () => {
    const a = await encryptSecret('hello', publicKeyBase64);
    const b = await encryptSecret('hello', publicKeyBase64);
    expect(a).not.toBe(b);
  });
});
