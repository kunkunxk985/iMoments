// Device-local preferences & cross-device account session token.
// Shared rooms, photos, likes, votes, comments and accounts live in the site backend.
const VISITOR = "imoments.visitor.v1";
const NICKNAME = "imoments.nickname.v1";
const UNLOCKED = "imoments.unlocked.v1";
const ACCOUNT_TOKEN = "imoments.account.token.v1";
const ACCOUNT_CACHE = "imoments.account.profile.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: keep in-memory only */ }
}
function remove(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

let cachedKey: string | null = null;
export function visitorKey(): string {
  if (cachedKey && UUID.test(cachedKey)) return cachedKey;
  const stored = read(VISITOR);
  cachedKey = stored && UUID.test(stored) ? stored : crypto.randomUUID();
  write(VISITOR, cachedKey);
  return cachedKey;
}

export type CachedAccount = {
  id: string;
  uid: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  unlocked_codes: string[];
  created_at: string;
};

let memToken: string | null = null;
export function accountToken(): string | null {
  if (memToken) return memToken;
  const stored = read(ACCOUNT_TOKEN);
  memToken = stored && /^[a-f0-9]{48,96}$/.test(stored) ? stored : null;
  return memToken;
}
export function setAccountToken(token: string) {
  memToken = token;
  write(ACCOUNT_TOKEN, token);
}
export function clearAccountToken() {
  memToken = null;
  remove(ACCOUNT_TOKEN);
  remove(ACCOUNT_CACHE);
}

export function cachedAccount(): CachedAccount | null {
  try {
    const raw = read(ACCOUNT_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.handle === "string") return parsed as CachedAccount;
    return null;
  } catch { return null; }
}
export function setCachedAccount(account: CachedAccount | null) {
  if (!account) { remove(ACCOUNT_CACHE); return; }
  write(ACCOUNT_CACHE, JSON.stringify(account));
  if (account.display_name) write(NICKNAME, account.display_name.trim().slice(0, 24));
}

export function nickname(): string {
  const acc = cachedAccount();
  if (acc?.display_name) return acc.display_name;
  return read(NICKNAME) ?? "";
}
export function setNickname(value: string) { write(NICKNAME, value.trim().slice(0, 24)); }

export type Unlocked = { slug: string; code: string; title: string; theme: string };
export function unlockedRooms(): Unlocked[] {
  try {
    const parsed = JSON.parse(read(UNLOCKED) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is Unlocked => !!row && typeof row.slug === "string" && typeof row.code === "string").slice(0, 12);
  } catch { return []; }
}
export function rememberUnlock(room: { slug: string; code?: string | null; title: string; theme: string }) {
  if (!room.code) return;
  const next = [{ slug: room.slug, code: room.code, title: room.title, theme: room.theme }, ...unlockedRooms().filter(row => row.slug !== room.slug)].slice(0, 12);
  write(UNLOCKED, JSON.stringify(next));
}
export function forgetUnlock(slug: string) {
  write(UNLOCKED, JSON.stringify(unlockedRooms().filter(row => row.slug !== slug)));
}
export function codeFor(slug: string): string | null {
  return unlockedRooms().find(row => row.slug === slug)?.code ?? null;
}
