// iMoments · 拾光房间 — Cross-device User Account, PBKDF2 Auth & Profile Helpers.
// Uses standard Web Crypto (crypto.subtle) so it runs identically in Deno Edge Functions and Node.js.

const enc = new TextEncoder();

function toHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(value)));
  return toHex(new Uint8Array(digest));
}

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function verifyPassword(password, saltHex, expectedHex) {
  if (!saltHex || !expectedHex || saltHex.length < 16) return false;
  const computed = await hashPassword(password, saltHex);
  if (computed.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}

export function normalizeHandle(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export function isValidHandle(handle) {
  return /^[a-z0-9_]{3,20}$/.test(handle);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 64 && !/[\u0000-\u001f]/.test(password);
}

export function isValidAvatar(avatarUrl) {
  if (avatarUrl === '') return true;
  if (typeof avatarUrl !== 'string') return false;
  if (/^preset:[a-z0-9_-]{2,24}$/.test(avatarUrl)) return true;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarUrl) && avatarUrl.length <= 56000) return true;
  return false;
}

export function shortUid(accountId) {
  const clean = String(accountId || '').replace(/-/g, '').slice(0, 6).toUpperCase();
  return clean ? `IM-${clean}` : 'IM-GUEST';
}

export function publicAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: shortUid(row.id),
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : '',
    bio: typeof row.bio === 'string' ? row.bio : '',
    unlocked_codes: Array.isArray(row.unlocked_codes) ? row.unlocked_codes : [],
    created_at: row.created_at,
  };
}
