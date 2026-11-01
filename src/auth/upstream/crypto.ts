const encoder = new TextEncoder();

export function randomState() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)));
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}

export async function stateHash(value: string) {
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

export async function encryptionKey(secret: string) {
  const bytes = fromBase64(secret);
  if (bytes.length !== 32) throw new Error('Invalid token encryption key');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptTokens(value: unknown, secret: string, owner: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(owner)}, await encryptionKey(secret), encoder.encode(JSON.stringify(value)));
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptTokens<T>(value: string, secret: string, owner: string): Promise<T> {
  const [version, nonce, payload] = value.split('.');
  if (version !== 'v1' || !nonce || !payload) throw new Error('Invalid token envelope');
  const decrypted = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(nonce),additionalData:encoder.encode(owner)}, await encryptionKey(secret), fromBase64(payload));
  return JSON.parse(new TextDecoder().decode(decrypted));
}
