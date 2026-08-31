import * as Crypto from 'expo-crypto';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  return new Uint8Array(buf);
}

/** HMAC-SHA256 as hex. Uses Expo Crypto (works on Hermes; WebCrypto often does not). */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(secret);
  const msg = enc.encode(message);
  const block = 64;
  const hashedKey = keyBytes.length > block ? await sha256(keyBytes) : keyBytes;
  const key = new Uint8Array(block);
  key.set(hashedKey);
  const ipad = new Uint8Array(block);
  const opad = new Uint8Array(block);
  for (let i = 0; i < block; i++) {
    ipad[i] = key[i] ^ 0x36;
    opad[i] = key[i] ^ 0x5c;
  }
  const inner = new Uint8Array(block + msg.length);
  inner.set(ipad);
  inner.set(msg, block);
  const innerHash = await sha256(inner);
  const outer = new Uint8Array(block + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, block);
  return toHex(await sha256(outer));
}

export function randomNonce(): string {
  const bytes = Crypto.getRandomBytes(16);
  return toHex(bytes);
}
