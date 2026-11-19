// iMoments · 拾光房间 — business routes.
// Dependency injection exists only for the local fixture runner; index.ts keeps Deno.serve.
// Object paths, visitor identity and counters are never taken from client claims alone.
import { ensureSeed } from './seed.mjs';
import { generateRoomVibe, judgeMomentSubmission, generateRoomAward } from './ai.mjs';
import {
  hashPassword, isValidAvatar, isValidHandle, isValidPassword,
  normalizeHandle, publicAccount, randomHex, sha256Hex, shortUid, verifyPassword,
} from './account.mjs';

const ROOM_COLS = 'id,slug,code,share_code,title,tagline,visibility,mode,theme,tags,cover_seed_key,cover_thumb_path,revealed,ai_curator_note,creator_id,creator_name,moment_count,created_at';
const MOMENT_COLS = 'id,room_id,author_id,author_name,place,tag,story,seed_key,object_path,thumb_path,original_path,original_width,original_height,ai_score,ai_caption,status,width,height,likes,votes,comment_count,created_at';
const COMMENT_COLS = 'id,moment_id,author_id,author_name,body,floor,created_at';
const ACCOUNT_COLS = 'id,handle,display_name,avatar_url,bio,unlocked_codes,created_at';
const ACCOUNT_AUTH_COLS = 'id,handle,display_name,avatar_url,bio,password_salt,password_hash,unlocked_codes,created_at';
const THEMES = ['amber', 'ginkgo', 'geek', 'neon', 'mint'];
const MODES = ['gentle', 'ballot', 'blind'];
const BALLOTS = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FULL = 8 * 1024 * 1024;
const MAX_THUMB = 1.5 * 1024 * 1024;
const MAX_ORIGINAL = 10 * 1024 * 1024; // platform Storage per-object ceiling (10 MiB)
const GATE_ALL = '00000000-0000-4000-8000-000000000000';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function application({ db, storage, getUser, BackendError }) {
  const fail = (code, status) => { throw new BackendError(code, status); };
  // The reviewed schema carries no DB defaults; the Function supplies generated values.
  const stamp = () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString() });
  const rows = result => { if (result?.error) fail(result.error.code || 'database_unavailable', result.error.status || 503); return result?.data; };
  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
  const isCode = v => typeof v === 'string' && /^[0-9]{4}$/.test(v);
  const isShare = v => typeof v === 'string' && /^SG-[A-Z0-9]{6}$/.test(v);
  const clean = (v, max, required = false) => typeof v === 'string'
    && (!required || v.trim().length > 0) && v.trim().length <= max && !/[\u0000-\u001f]/.test(v);
  const one = async (table, cols, filters) => {
    let query = db.from(table).select(cols);
    for (const [key, value] of filters) query = query.eq(key, value);
    const found = rows(await query.limit(1));
    return found?.length ? found[0] : null;
  };

  async function input(request, maxBytes = 16384) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) fail('invalid_input', 400);
    const reader = request.body?.getReader(); if (!reader) fail('invalid_input', 400);
    let size = 0; const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > maxBytes) { await reader.cancel(); fail('payload_too_large', 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail('invalid_input', 400); }
  }

  async function resolveIdentity(ctx) {
    // 1. Cross-device iMoments Account Session Token (works across phone & desktop)
    const rawToken = ctx.request.headers.get('x-account-token');
    if (rawToken && /^[a-f0-9]{48,96}$/.test(rawToken)) {
      try {
        const tokenHash = await sha256Hex(rawToken);
        const session = await one('sessions', 'id,account_id,expires_at', [['token_hash', tokenHash]]);
        if (session && Date.parse(session.expires_at) > Date.now()) {
          const account = await one('accounts', ACCOUNT_COLS, [['id', session.account_id]]);
          if (account) {
            return {
              id: `u:${account.id}`,
              name: account.display_name,
              avatar_url: account.avatar_url || '',
              authenticated: true,
              account,
              sessionId: session.id,
            };
          }
        }
      } catch {
        // Ignore if accounts/sessions tables are not yet migrated; gracefully fall back
      }
    }

    // 2. Platform-injected user context (if available)
    let user = null;
    try { user = getUser ? getUser(ctx.request) : null; }
    catch (error) { if (error?.code && error?.status) fail(error.code, error.status); throw error; }
    if (user?.user_id) {
      return {
        id: `u:${user.user_id}`,
        name: typeof user.name === 'string' ? user.name.slice(0, 24) : '',
        avatar_url: typeof user.picture === 'string' ? user.picture : '',
        authenticated: true,
        account: null,
        sessionId: null,
      };
    }

    // 3. Anonymous device visitor UUID
    const key = ctx.request.headers.get('x-visitor-key');
    if (isUuid(key)) return { id: `v:${key}`, name: '', avatar_url: '', authenticated: false, account: null, sessionId: null };
    return { id: null, name: '', avatar_url: '', authenticated: false, account: null, sessionId: null };
  }
  const requireVisitor = ident => { if (!ident.id) fail('visitor_required', 400); return ident.id; };

  async function createSession(accountId) {
    const token = randomHex(32);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    rows(await db.from('sessions').insert({ ...stamp(), token_hash: tokenHash, account_id: accountId, expires_at: expiresAt }));
    return token;
  }

  async function syncAccountCode(ident, code) {
    if (!ident.account || !isCode(code)) return;
    const prev = Array.isArray(ident.account.unlocked_codes) ? ident.account.unlocked_codes : [];
    if (prev.includes(code)) return;
    const next = [code, ...prev.filter(isCode)].slice(0, 12);
    try {
      rows(await db.from('accounts').update({ unlocked_codes: next }).eq('id', ident.account.id).select('id'));
      ident.account.unlocked_codes = next;
    } catch { /* non-fatal */ }
  }

  async function loadProfiles(actorIds) {
    const map = new Map();
    const accountIds = [...new Set(
      actorIds
        .filter(id => typeof id === 'string' && id.startsWith('u:'))
        .map(id => id.slice(2))
        .filter(isUuid)
    )];
    for (const accId of accountIds) {
      try {
        const acc = await one('accounts', 'id,handle,display_name,avatar_url', [['id', accId]]);
        if (acc) {
          map.set(`u:${acc.id}`, {
            display_name: acc.display_name,
            avatar_url: acc.avatar_url || '',
            handle: acc.handle,
            uid: shortUid(acc.id),
          });
        }
      } catch { /* ignore if table unavailable */ }
    }
    return map;
  }

  let seedPromise = null;
  function seeded() {
    if (!seedPromise) seedPromise = ensureSeed(db, BackendError).catch(error => { seedPromise = null; throw error; });
    return seedPromise;
  }

  async function roomBySlug(slug) {
    if (typeof slug !== 'string' || !/^[a-z0-9-]{3,40}$/.test(slug)) fail('invalid_input', 400);
    const room = await one('rooms', ROOM_COLS, [['slug', slug]]);
    if (!room) fail('not_found', 404);
    return room;
  }
  function roomCode(request) {
    const value = request.headers.get('x-room-code');
    return isCode(value) || isShare(value) ? value : null;
  }
  function assertAccess(room, ident, code) {
    if (room.visibility === 'public') return;
    if (ident.id && room.creator_id === ident.id) return;
    if (ident.account && Array.isArray(ident.account.unlocked_codes) && room.code && ident.account.unlocked_codes.includes(room.code)) return;
    if (code && (code === room.code || code === room.share_code)) return;
    fail('room_locked', 403);
  }

  async function bump(table, id, column, delta) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const found = rows(await db.from(table).select(`id,${column}`).eq('id', id).limit(1));
      if (!found?.length) fail('not_found', 404);
      const current = Number(found[0][column]) || 0;
      const next = Math.max(0, current + delta);
      const updated = rows(await db.from(table).update({ [column]: next }).eq('id', id).eq(column, current).select(`id,${column}`));
      if (updated?.length) return Number(updated[0][column]);
    }
    fail('write_conflict', 409);
  }

  async function ballotRow(roomId, voterId) {
    return one('ballots', 'id,used', [['room_id', roomId], ['voter_id', voterId]]);
  }
  async function moveBallot(roomId, voterId, delta) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const found = await ballotRow(roomId, voterId);
      if (!found) {
        if (delta < 0) return 0;
        const inserted = rows(await db.from('ballots').insertIfAbsent({ ...stamp(), room_id: roomId, voter_id: voterId, used: 1 }, { onConflict: 'room_id,voter_id' }).select('id,used'));
        if (inserted?.length) return Number(inserted[0].used);
        continue;
      }
      const used = Number(found.used) || 0;
      if (delta > 0 && used >= BALLOTS) fail('no_ballots_left', 409);
      const next = Math.max(0, Math.min(BALLOTS, used + delta));
      const updated = rows(await db.from('ballots').update({ used: next }).eq('id', found.id).eq('used', used).select('id,used'));
      if (updated?.length) return Number(updated[0].used);
    }
    fail('write_conflict', 409);
  }

  async function signImages(moments) {
    const map = new Map();
    // Sequential signing: keep provider clients single-flight.
    for (const moment of moments) {
      if (moment.seed_key) {
        map.set(moment.id, {
          image_url: `/seed/${moment.seed_key}.jpg`,
          thumb_url: `/seed/thumb/${moment.seed_key}.jpg`,
          original_url: `/seed/${moment.seed_key}.jpg`,
        });
        continue;
      }
      if (!moment.object_path || moment.status !== 'ready') continue;
      try {
        const full = await storage.createSignedUrl(moment.object_path, 3600);
        const thumb = moment.thumb_path ? await storage.createSignedUrl(moment.thumb_path, 3600) : full;
        const orig = moment.original_path ? await storage.createSignedUrl(moment.original_path, 3600) : null;
        map.set(moment.id, {
          image_url: full.signedUrl,
          thumb_url: thumb.signedUrl,
          original_url: orig ? orig.signedUrl : full.signedUrl,
        });
      } catch { fail('storage_unavailable', 503); }
    }
    return map;
  }
  async function coverUrl(room) {
    if (room.cover_seed_key) return `/seed/thumb/${room.cover_seed_key}.jpg`;
    if (!room.cover_thumb_path) return null;
    try { return (await storage.createSignedUrl(room.cover_thumb_path, 3600)).signedUrl; }
    catch { fail('storage_unavailable', 503); }
  }

  async function myState(room, ident) {
    if (!ident.id) return { liked: [], voted: [], used: 0, remaining: BALLOTS };
    // Sequential reads: the injected database client is not safe for concurrent requests.
    const likes = rows(await db.from('likes').select('moment_id').eq('room_id', room.id).eq('voter_id', ident.id).eq('active', true).limit(200));
    const votes = rows(await db.from('votes').select('moment_id').eq('room_id', room.id).eq('voter_id', ident.id).eq('active', true).limit(20));
    const ballot = await ballotRow(room.id, ident.id);
    const used = Number(ballot?.used) || 0;
    return { liked: (likes || []).map(r => r.moment_id), voted: (votes || []).map(r => r.moment_id), used, remaining: Math.max(0, BALLOTS - used) };
  }

  function rankMap(moments) {
    const sorted = [...moments].sort((a, b) => (b.votes - a.votes) || (b.likes - a.likes) || (a.created_at < b.created_at ? -1 : 1));
    return new Map(sorted.map((moment, index) => [moment.id, index + 1]));
  }
  const showsVotes = room => room.mode === 'ballot' || (room.mode === 'blind' && room.revealed);

  function publicMoment(moment, images, state, room, ranks, profiles) {
    const urls = images.get(moment.id) || {};
    const origW = Number(moment.original_width) || moment.width;
    const origH = Number(moment.original_height) || moment.height;
    const prof = profiles?.get(moment.author_id);
    return {
      id: moment.id,
      author_name: prof?.display_name || moment.author_name,
      author_avatar: prof?.avatar_url || '',
      author_handle: prof?.handle || '',
      author_uid: prof?.uid || '',
      place: moment.place, tag: moment.tag, story: moment.story,
      width: moment.width, height: moment.height,
      original_width: origW, original_height: origH,
      has_original: Boolean(moment.original_path || moment.seed_key),
      ai_score: typeof moment.ai_score === 'number' && moment.ai_score > 0 ? moment.ai_score : 94,
      ai_caption: typeof moment.ai_caption === 'string' ? moment.ai_caption : '',
      likes: moment.likes, comment_count: moment.comment_count,
      votes: showsVotes(room) ? moment.votes : null,
      rank: showsVotes(room) ? (ranks.get(moment.id) || null) : null,
      created_at: moment.created_at, seed_key: moment.seed_key || null,
      image_url: urls.image_url || null,
      thumb_url: urls.thumb_url || urls.image_url || null,
      original_url: urls.original_url || urls.image_url || null,
      liked: state.liked.includes(moment.id), voted: state.voted.includes(moment.id),
      mine: !!state.voterId && moment.author_id === state.voterId,
      can_delete: !!state.voterId && (moment.author_id === state.voterId || room.creator_id === state.voterId),
    };
  }
  function publicRoom(room, cover, ident, profiles) {
    const prof = profiles?.get(room.creator_id);
    return {
      id: room.id, slug: room.slug, title: room.title, tagline: room.tagline, visibility: room.visibility,
      mode: room.mode, theme: room.theme, tags: Array.isArray(room.tags) ? room.tags : [], revealed: room.revealed,
      ai_curator_note: typeof room.ai_curator_note === 'string' ? room.ai_curator_note : '',
      creator_name: prof?.display_name || room.creator_name,
      creator_avatar: prof?.avatar_url || '',
      creator_handle: prof?.handle || '',
      creator_uid: prof?.uid || '',
      moment_count: room.moment_count, created_at: room.created_at,
      cover_url: cover || null, is_creator: !!ident?.id && room.creator_id === ident.id,
      code: room.visibility === 'private' ? room.code : null,
      share_code: room.visibility === 'private' ? room.share_code : null,
    };
  }

  async function roomView(room, ident) {
    const moments = rows(await db.from('moments').select(MOMENT_COLS).eq('room_id', room.id).eq('status', 'ready').order('created_at', { ascending: false }).limit(120)) || [];
    const images = await signImages(moments);
    const state = await myState(room, ident);
    state.voterId = ident.id;
    const ranks = rankMap(moments);
    const profiles = await loadProfiles([room.creator_id, ...moments.map(m => m.author_id)]);
    const items = moments.map(moment => publicMoment(moment, images, state, room, ranks, profiles));
    const participants = new Set(moments.map(moment => moment.author_id)).size;
    return {
      room: publicRoom(room, await coverUrl(room), ident, profiles),
      moments: items,
      me: { liked: state.liked, voted: state.voted, used: state.used, remaining: state.remaining, authenticated: ident.authenticated, name: ident.name, avatar_url: ident.avatar_url },
      stats: {
        moments: moments.length, participants,
        likes: moments.reduce((sum, moment) => sum + moment.likes, 0),
        votes: showsVotes(room) ? moments.reduce((sum, moment) => sum + moment.votes, 0) : null,
      },
      unlocked: true,
    };
  }

  async function momentInRoom(id, request, ident) {
    if (!isUuid(id)) fail('invalid_input', 400);
    const moment = await one('moments', MOMENT_COLS, [['id', id]]);
    if (!moment || moment.status !== 'ready') fail('not_found', 404);
    const room = await one('rooms', ROOM_COLS, [['id', moment.room_id]]);
    if (!room) fail('not_found', 404);
    assertAccess(room, ident, roomCode(request));
    return { moment, room };
  }

  async function verifyImage(objectPath, maxBytes) {
    let response;
    try { response = await storage.download(objectPath); }
    catch (error) { if (error?.code === 'storage_object_not_found') fail('upload_pending', 409); fail('storage_unavailable', 503); }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!response.ok || !response.body || !IMAGE_TYPES.includes(type)) { await response.body?.cancel(); fail('invalid_upload', 422); }
    const reader = response.body.getReader(); let size = 0, timedOut = false;
    const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 25000);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (timedOut) fail('storage_unavailable', 503);
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) fail('invalid_upload', 422);
      }
      if (size === 0) fail('invalid_upload', 422);
      return size;
    } catch (error) {
      if (error instanceof BackendError) throw error;
      fail('storage_unavailable', 503);
    } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }

  async function commentList(momentId) {
    const list = rows(await db.from('comments').select(COMMENT_COLS).eq('moment_id', momentId).order('floor', { ascending: true }).limit(200)) || [];
    const profiles = await loadProfiles(list.map(row => row.author_id));
    return list.map(row => {
      const prof = profiles.get(row.author_id);
      return {
        id: row.id,
        author_name: prof?.display_name || row.author_name,
        author_avatar: prof?.avatar_url || '',
        body: row.body, floor: row.floor, created_at: row.created_at,
      };
    });
  }

  return async ctx => {
    const request = ctx.request;
    const pathname = new URL(request.url).pathname;
    const match = pathname.match(/^\/(?:functions\/v1\/)?(?:app|app-d[0-9a-f]{32})(\/.*)?$/);
    if (!match) fail('not_found', 404);
    const path = match[1] || '/';
    const method = request.method;
    if (path === '/api/health' && method === 'GET') return Response.json({ ok: true, service: 'imoments', version: 3 });

    const ident = await resolveIdentity(ctx);

    // Account: Current identity + stats
    if (path === '/api/me' && method === 'GET') {
      let stats = { rooms: 0, moments: 0 };
      if (ident.id) {
        try {
          const myRooms = rows(await db.from('rooms').select('id').eq('creator_id', ident.id).limit(100)) || [];
          const myMoments = rows(await db.from('moments').select('id').eq('author_id', ident.id).eq('status', 'ready').limit(200)) || [];
          stats = { rooms: myRooms.length, moments: myMoments.length };
        } catch { /* ignore */ }
      }
      return Response.json({
        id: ident.id,
        name: ident.name,
        avatar_url: ident.avatar_url,
        authenticated: ident.authenticated,
        account: publicAccount(ident.account),
        stats,
      });
    }

    // Account: Register new unique cross-device ID
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await input(request, 96 * 1024);
      const handle = normalizeHandle(body?.handle);
      const password = typeof body?.password === 'string' ? body.password : '';
      const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
      const avatarUrl = typeof body?.avatar_url === 'string' ? body.avatar_url.trim() : '';
      const bio = typeof body?.bio === 'string' ? body.bio.trim() : '';
      if (!isValidHandle(handle)) fail('invalid_handle', 400);
      if (!isValidPassword(password)) fail('invalid_password', 400);
      if (!clean(displayName, 24, true)) fail('invalid_input', 400);
      if (!isValidAvatar(avatarUrl)) fail('invalid_avatar', 400);
      if (!clean(bio, 60)) fail('invalid_input', 400);

      const exists = await one('accounts', 'id', [['handle', handle]]);
      if (exists) fail('handle_taken', 409);

      const salt = randomHex(16);
      const pwHash = await hashPassword(password, salt);
      const codes = Array.isArray(body?.unlocked_codes) ? [...new Set(body.unlocked_codes.filter(isCode))].slice(0, 12) : [];
      const row = {
        ...stamp(),
        handle,
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        password_salt: salt,
        password_hash: pwHash,
        unlocked_codes: codes,
      };
      const inserted = rows(await db.from('accounts').insertIfAbsent(row, { onConflict: 'handle' }).select(ACCOUNT_COLS));
      if (!inserted?.length) fail('handle_taken', 409);
      const account = inserted[0];
      const token = await createSession(account.id);
      return Response.json({ token, account: publicAccount(account) }, { status: 201 });
    }

    // Account: Login on any device to sync unique ID, ballots, profile & unlocked rooms
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await input(request);
      const handle = normalizeHandle(body?.handle);
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!isValidHandle(handle) || !isValidPassword(password)) fail('invalid_credentials', 401);

      const account = await one('accounts', ACCOUNT_AUTH_COLS, [['handle', handle]]);
      if (!account) fail('invalid_credentials', 401);
      const ok = await verifyPassword(password, account.password_salt, account.password_hash);
      if (!ok) fail('invalid_credentials', 401);

      // Merge any local unlocked private room codes into cloud account
      const incomingCodes = Array.isArray(body?.unlocked_codes) ? body.unlocked_codes.filter(isCode) : [];
      const existingCodes = Array.isArray(account.unlocked_codes) ? account.unlocked_codes.filter(isCode) : [];
      const merged = [...new Set([...incomingCodes, ...existingCodes])].slice(0, 12);
      if (merged.length !== existingCodes.length) {
        rows(await db.from('accounts').update({ unlocked_codes: merged }).eq('id', account.id).select('id'));
        account.unlocked_codes = merged;
      }

      const token = await createSession(account.id);
      return Response.json({ token, account: publicAccount(account) });
    }

    // Account: Logout current device session
    if (path === '/api/auth/logout' && method === 'POST') {
      if (ident.sessionId) {
        try {
          rows(await db.from('sessions').update({ expires_at: new Date(0).toISOString() }).eq('id', ident.sessionId).select('id'));
        } catch { /* ignore */ }
      }
      return Response.json({ ok: true });
    }

    // Account: Update custom nickname, avatar & bio (instantly syncs across all rooms/photos/comments)
    if (path === '/api/auth/profile' && (method === 'PATCH' || method === 'POST')) {
      if (!ident.account) fail('login_required', 401);
      const body = await input(request, 96 * 1024);
      const patch = {};
      if (body?.display_name !== undefined) {
        if (!clean(body.display_name, 24, true)) fail('invalid_input', 400);
        patch.display_name = body.display_name.trim();
      }
      if (body?.avatar_url !== undefined) {
        const av = typeof body.avatar_url === 'string' ? body.avatar_url.trim() : '';
        if (!isValidAvatar(av)) fail('invalid_avatar', 400);
        patch.avatar_url = av;
      }
      if (body?.bio !== undefined) {
        if (!clean(body.bio, 60)) fail('invalid_input', 400);
        patch.bio = body.bio.trim();
      }
      if (Object.keys(patch).length === 0) return Response.json({ account: publicAccount(ident.account) });
      const updated = rows(await db.from('accounts').update(patch).eq('id', ident.account.id).select(ACCOUNT_COLS));
      if (!updated?.length) fail('not_found', 404);
      return Response.json({ account: publicAccount(updated[0]) });
    }

    // AI Capability 1: One-sentence Room Vibe Architect
    if (path === '/api/ai/vibe' && method === 'POST') {
      requireVisitor(ident);
      const body = await input(request);
      const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 60) : '';
      if (!prompt) fail('invalid_input', 400);
      const vibe = await generateRoomVibe(prompt);
      return Response.json({ vibe });
    }

    if (path === '/api/rooms' && method === 'GET') {
      await seeded();
      const url = new URL(request.url);
      const queryCodes = (url.searchParams.get('codes') || '').split(',').map(v => v.trim()).filter(isCode);
      const accountCodes = ident.account && Array.isArray(ident.account.unlocked_codes) ? ident.account.unlocked_codes.filter(isCode) : [];
      const codes = [...new Set([...accountCodes, ...queryCodes])].slice(0, 12);
      const publicRooms = rows(await db.from('rooms').select(ROOM_COLS).eq('visibility', 'public').order('created_at', { ascending: false }).limit(60)) || [];
      const unlocked = [];
      for (const code of codes) {
        const room = await one('rooms', ROOM_COLS, [['code', code]]);
        if (room && room.visibility === 'private') unlocked.push(room);
      }
      const profiles = await loadProfiles([...publicRooms, ...unlocked].map(r => r.creator_id));
      const withCover = async list => {
        const out = [];
        for (const room of list) out.push(publicRoom(room, await coverUrl(room), ident, profiles));
        return out;
      };
      const publicIds = new Set(publicRooms.map(room => room.id));
      const totals = rows(await db.from('moments').select('id,room_id').eq('status', 'ready').limit(1000)) || [];
      return Response.json({
        rooms: await withCover(publicRooms),
        unlocked: await withCover(unlocked),
        stats: { rooms: publicRooms.length, moments: totals.filter(moment => publicIds.has(moment.room_id)).length },
        me: { id: ident.id, authenticated: ident.authenticated, account: publicAccount(ident.account) },
      });
    }

    if (path === '/api/rooms' && method === 'POST') {
      await seeded();
      const voterId = requireVisitor(ident);
      const body = await input(request);
      const key = request.headers.get('idempotency-key');
      if (!isUuid(key)) fail('invalid_input', 400);
      if (!clean(body?.title, 40, true) || !clean(body?.tagline, 80, true)) fail('invalid_input', 400);
      if (!['public', 'private'].includes(body?.visibility) || !MODES.includes(body?.mode) || !THEMES.includes(body?.theme)) fail('invalid_input', 400);
      const tags = Array.isArray(body?.tags) ? body.tags.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean) : [];
      if (tags.length < 3 || tags.length > 4 || tags.some(tag => tag.length > 12) || new Set(tags).size !== tags.length) fail('invalid_input', 400);
      const creatorName = ident.account ? ident.account.display_name : (typeof body?.creator_name === 'string' ? body.creator_name.trim() : '');
      if (!clean(creatorName, 24, true)) fail('invalid_input', 400);
      const owned = rows(await db.from('rooms').select('id').eq('creator_id', voterId).limit(31)) || [];
      if (owned.length >= 30) fail('room_limit_reached', 409);
      const base = {
        title: body.title.trim(), tagline: body.tagline.trim(), visibility: body.visibility, mode: body.mode,
        theme: body.theme, tags, creator_id: voterId, creator_name: creatorName,
        cover_seed_key: null, cover_thumb_path: null, revealed: false, ai_curator_note: '', moment_count: 0, idempotency_key: key,
      };
      const previous = await one('rooms', ROOM_COLS, [['creator_id', voterId], ['idempotency_key', key]]);
      if (previous) {
        if (previous.title !== base.title || previous.mode !== base.mode || previous.theme !== base.theme) fail('idempotency_conflict', 409);
        const profiles = await loadProfiles([previous.creator_id]);
        return Response.json({ room: publicRoom(previous, await coverUrl(previous), ident, profiles), created: false });
      }
      const slug = `r-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
      let created = null;
      for (let attempt = 0; attempt < (body.visibility === 'private' ? 14 : 1) && !created; attempt++) {
        const code = body.visibility === 'private' ? String(Math.floor(Math.random() * 10000)).padStart(4, '0') : null;
        const share = body.visibility === 'private'
          ? `SG-${Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')}`
          : null;
        try {
          const inserted = rows(await db.from('rooms')
            .insertIfAbsent({ ...base, ...stamp(), slug, code, share_code: share }, { onConflict: body.visibility === 'private' ? 'code' : 'creator_id,idempotency_key' })
            .select(ROOM_COLS));
          if (inserted?.length) created = inserted[0];
        } catch (error) {
          if (error?.code !== 'duplicate_key') throw error;
          const winner = await one('rooms', ROOM_COLS, [['creator_id', voterId], ['idempotency_key', key]]);
          if (winner) created = winner;
        }
      }
      if (!created) fail(body.visibility === 'private' ? 'code_unavailable' : 'write_conflict', body.visibility === 'private' ? 503 : 409);
      if (created.visibility === 'private' && created.code) await syncAccountCode(ident, created.code);
      const profiles = await loadProfiles([created.creator_id]);
      return Response.json({ room: publicRoom(created, null, ident, profiles), created: true }, { status: 201 });
    }

    if (path === '/api/rooms/unlock' && method === 'POST') {
      await seeded();
      const body = await input(request);
      const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!isCode(code) && !isShare(code)) fail('invalid_input', 400);
      const voterId = ident.id || 'anonymous';
      const gate = await one('gate_attempts', 'id,fails,window_start', [['room_id', GATE_ALL], ['voter_id', voterId]]);
      const fresh = gate && Date.now() - Date.parse(gate.window_start) < 15 * 60 * 1000;
      if (fresh && Number(gate.fails) >= 12) fail('too_many_attempts', 429);
      const room = isCode(code) ? await one('rooms', ROOM_COLS, [['code', code]]) : await one('rooms', ROOM_COLS, [['share_code', code]]);
      if (!room || room.visibility !== 'private') {
        if (gate) {
          const fails = fresh ? Number(gate.fails) + 1 : 1;
          rows(await db.from('gate_attempts').update({ fails, window_start: new Date().toISOString() }).eq('id', gate.id).eq('fails', Number(gate.fails)).select('id'));
        } else {
          rows(await db.from('gate_attempts').insertIfAbsent({ ...stamp(), room_id: GATE_ALL, voter_id: voterId, fails: 1, window_start: new Date().toISOString() }, { onConflict: 'room_id,voter_id' }).select('id'));
        }
        fail('code_not_found', 404);
      }
      if (gate) rows(await db.from('gate_attempts').update({ fails: 0, window_start: new Date().toISOString() }).eq('id', gate.id).select('id'));
      if (room.code) await syncAccountCode(ident, room.code);
      const profiles = await loadProfiles([room.creator_id]);
      return Response.json({ room: publicRoom(room, await coverUrl(room), ident, profiles) });
    }

    // AI Capability 2: Pre-upload Multimodal Topic Resonance Judge & Polaroid Caption
    const aiJudgeRoute = path.match(/^\/api\/rooms\/([a-z0-9-]{3,40})\/ai-judge$/);
    if (aiJudgeRoute && method === 'POST') {
      await seeded();
      requireVisitor(ident);
      const room = await roomBySlug(aiJudgeRoute[1]);
      assertAccess(room, ident, roomCode(request));
      const body = await input(request);
      const verdict = await judgeMomentSubmission({
        room,
        tag: typeof body?.tag === 'string' ? body.tag.slice(0, 16) : '',
        place: typeof body?.place === 'string' ? body.place.slice(0, 40) : '',
        story: typeof body?.story === 'string' ? body.story.slice(0, 140) : '',
        fileName: typeof body?.file_name === 'string' ? body.file_name.slice(0, 80) : '',
        telemetry: body?.telemetry,
      });
      return Response.json({ verdict });
    }

    // AI Capability 3: Room Chief Curator Summary & TOP 3 Award Speech
    const aiAwardRoute = path.match(/^\/api\/rooms\/([a-z0-9-]{3,40})\/ai-award$/);
    if (aiAwardRoute && method === 'POST') {
      await seeded();
      requireVisitor(ident);
      const room = await roomBySlug(aiAwardRoute[1]);
      assertAccess(room, ident, roomCode(request));
      const moments = rows(await db.from('moments').select(MOMENT_COLS).eq('room_id', room.id).eq('status', 'ready').limit(120)) || [];
      const recentComments = rows(await db.from('comments').select('id,author_name,body,created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(12)) || [];
      const note = await generateRoomAward({ room, moments, topComments: recentComments });
      rows(await db.from('rooms').update({ ai_curator_note: note }).eq('id', room.id).select('id,ai_curator_note'));
      return Response.json({ ai_curator_note: note });
    }

    // Live Stage 16:9 Comment Stream across the whole room
    const roomFeedRoute = path.match(/^\/api\/rooms\/([a-z0-9-]{3,40})\/feed$/);
    if (roomFeedRoute && method === 'GET') {
      await seeded();
      const room = await roomBySlug(roomFeedRoute[1]);
      assertAccess(room, ident, roomCode(request));
      const recent = rows(await db.from('comments').select('id,moment_id,author_id,author_name,body,floor,created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(28)) || [];
      const profiles = await loadProfiles(recent.map(r => r.author_id));
      return Response.json({
        comments: recent.map(r => {
          const prof = profiles.get(r.author_id);
          return {
            id: r.id, moment_id: r.moment_id,
            author_name: prof?.display_name || r.author_name,
            author_avatar: prof?.avatar_url || '',
            body: r.body, floor: r.floor, created_at: r.created_at,
          };
        }),
      });
    }

    const roomRoute = path.match(/^\/api\/rooms\/([a-z0-9-]{3,40})(\/reveal)?$/);
    if (roomRoute) {
      await seeded();
      const room = await roomBySlug(roomRoute[1]);
      const code = roomCode(request);
      assertAccess(room, ident, code);
      if (roomRoute[2] === '/reveal' && method === 'POST') {
        if (room.mode !== 'blind') fail('invalid_mode', 409);
        if (room.revealed) return Response.json({ revealed: true });
        const updated = rows(await db.from('rooms').update({ revealed: true }).eq('id', room.id).eq('revealed', false).select('id,revealed'));
        if (!updated?.length) fail('write_conflict', 409);
        return Response.json({ revealed: true });
      }
      if (method === 'GET') return Response.json(await roomView(room, ident));
      fail('method_not_allowed', 405);
    }

    const uploadRoute = path.match(/^\/api\/rooms\/([a-z0-9-]{3,40})\/uploads$/);
    if (uploadRoute && method === 'POST') {
      await seeded();
      const voterId = requireVisitor(ident);
      const room = await roomBySlug(uploadRoute[1]);
      assertAccess(room, ident, roomCode(request));
      const body = await input(request);
      const place = typeof body?.place === 'string' ? body.place : '';
      const story = typeof body?.story === 'string' ? body.story : '';
      const authorName = ident.account ? ident.account.display_name : (typeof body?.author_name === 'string' ? body.author_name.trim() : '');
      if (!clean(authorName, 24, true) || !clean(place, 40) || !clean(story, 140)) fail('invalid_input', 400);
      const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
      const tags = Array.isArray(room.tags) ? room.tags : [];
      if (!tags.includes(tag)) fail('invalid_input', 400);
      if (!IMAGE_TYPES.includes(body?.content_type)) fail('invalid_upload', 422);
      const size = Number(body?.size), thumbSize = Number(body?.thumb_size);
      const width = Number(body?.width), height = Number(body?.height);
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FULL) fail('invalid_upload', 422);
      if (!Number.isSafeInteger(thumbSize) || thumbSize < 1 || thumbSize > MAX_THUMB) fail('invalid_upload', 422);
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 12000 || height > 12000) fail('invalid_input', 400);

      const keepOriginal = body?.keep_original === true;
      const origSize = keepOriginal ? Number(body?.original_size) : 0;
      const origWidth = keepOriginal ? (Number(body?.original_width) || width) : width;
      const origHeight = keepOriginal ? (Number(body?.original_height) || height) : height;
      const origType = keepOriginal && IMAGE_TYPES.includes(body?.original_type) ? body.original_type : body.content_type;
      if (keepOriginal && (!Number.isSafeInteger(origSize) || origSize < 1 || origSize > MAX_ORIGINAL)) fail('invalid_upload', 422);

      if (Number(room.moment_count) >= 200) fail('room_full', 409);

      // Server-side safety & AI caption confirmation
      const judged = await judgeMomentSubmission({
        room, tag, place: place.trim(), story: story.trim(),
        fileName: typeof body?.file_name === 'string' ? body.file_name : '',
        telemetry: body?.telemetry,
      });
      if (!judged.allowed) fail('unsafe_content', 422);
      if (judged.off_topic && body?.force_keep !== true) fail('off_topic_moment', 422);

      const aiScore = typeof body?.ai_score === 'number' && body.ai_score >= 1 && body.ai_score <= 100 ? Math.round(body.ai_score) : judged.score;
      const aiCaption = typeof body?.ai_caption === 'string' && body.ai_caption.trim().length > 0 && clean(body.ai_caption, 80)
        ? body.ai_caption.trim()
        : judged.caption;

      const id = crypto.randomUUID();
      const objectPath = `moments/${id}/full`, thumbPath = `moments/${id}/thumb`;
      const originalPath = keepOriginal && origSize > 0 ? `moments/${id}/orig` : null;
      rows(await db.from('moments').insert({
        id, room_id: room.id, author_id: voterId, author_name: authorName,
        place: place.trim(), tag, story: story.trim(),
        seed_key: null, object_path: objectPath, thumb_path: thumbPath,
        original_path: originalPath, original_width: origWidth, original_height: origHeight,
        ai_score: aiScore, ai_caption: aiCaption,
        status: 'pending', width, height, likes: 0, votes: 0, comment_count: 0, created_at: new Date().toISOString(),
      }));
      let full, thumb, original = null;
      try {
        full = await storage.createSignedUploadUrl(objectPath, { upsert: false, contentType: body.content_type });
        thumb = await storage.createSignedUploadUrl(thumbPath, { upsert: false, contentType: 'image/jpeg' });
        if (originalPath) original = await storage.createSignedUploadUrl(originalPath, { upsert: false, contentType: origType });
      } catch { fail('storage_unavailable', 503); }
      return Response.json({ id, full, thumb, original, ai_score: aiScore, ai_caption: aiCaption, max_full: MAX_FULL, max_thumb: MAX_THUMB, max_original: MAX_ORIGINAL }, { status: 201 });
    }

    const completeRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})\/complete$/);
    if (completeRoute && method === 'POST') {
      const voterId = requireVisitor(ident);
      if (!isUuid(completeRoute[1])) fail('invalid_input', 400);
      const moment = await one('moments', MOMENT_COLS, [['id', completeRoute[1]]]);
      if (!moment) fail('not_found', 404);
      if (moment.author_id !== voterId) fail('forbidden', 403);
      const room = await one('rooms', ROOM_COLS, [['id', moment.room_id]]);
      if (!room) fail('not_found', 404);
      assertAccess(room, ident, roomCode(request));
      if (moment.status === 'ready') return Response.json({ id: moment.id, status: 'ready' });
      await verifyImage(moment.object_path, MAX_FULL);
      await verifyImage(moment.thumb_path, MAX_THUMB);
      if (moment.original_path) await verifyImage(moment.original_path, MAX_ORIGINAL);
      const updated = rows(await db.from('moments').update({ status: 'ready' }).eq('id', moment.id).eq('author_id', voterId).eq('status', 'pending').select('id,status'));
      if (!updated?.length) fail('write_conflict', 409);
      await bump('rooms', room.id, 'moment_count', 1);
      if (!room.cover_thumb_path && !room.cover_seed_key) {
        rows(await db.from('rooms').update({ cover_thumb_path: moment.thumb_path }).eq('id', room.id).select('id'));
      }
      return Response.json({ id: moment.id, status: 'ready', slug: room.slug });
    }

    const deleteMomentRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})\/delete$/);
    if (deleteMomentRoute && method === 'POST') {
      const voterId = requireVisitor(ident);
      const { moment, room } = await momentInRoom(deleteMomentRoute[1], request, ident);
      if (moment.author_id !== voterId && room.creator_id !== voterId) fail('forbidden', 403);
      const updated = rows(await db.from('moments').update({ status: 'deleted' }).eq('id', moment.id).eq('status', 'ready').select('id,status'));
      if (!updated?.length) fail('not_found', 404);
      await bump('rooms', room.id, 'moment_count', -1);
      if (moment.thumb_path && room.cover_thumb_path === moment.thumb_path) {
        const remaining = rows(await db.from('moments').select('thumb_path,seed_key').eq('room_id', room.id).eq('status', 'ready').order('created_at', { ascending: false }).limit(1)) || [];
        const nextCover = remaining[0]?.thumb_path || null;
        const nextSeed = nextCover ? null : (remaining[0]?.seed_key || null);
        rows(await db.from('rooms').update({ cover_thumb_path: nextCover, cover_seed_key: nextSeed }).eq('id', room.id).select('id'));
      }
      return Response.json({ id: moment.id, deleted: true });
    }

    const momentRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})$/);
    if (momentRoute && method === 'GET') {
      const { moment, room } = await momentInRoom(momentRoute[1], request, ident);
      const images = await signImages([moment]);
      const state = await myState(room, ident);
      state.voterId = ident.id;
      const all = rows(await db.from('moments').select('id,votes,likes,created_at').eq('room_id', room.id).eq('status', 'ready').limit(200)) || [];
      const ranks = rankMap(all);
      const profiles = await loadProfiles([moment.author_id]);
      return Response.json({
        moment: publicMoment(moment, images, state, room, ranks, profiles),
        comments: await commentList(moment.id),
        me: { liked: state.liked, voted: state.voted, used: state.used, remaining: state.remaining },
        room: { slug: room.slug, mode: room.mode, theme: room.theme, revealed: room.revealed, title: room.title },
      });
    }

    const likeRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})\/like$/);
    if (likeRoute && method === 'POST') {
      const voterId = requireVisitor(ident);
      const { moment, room } = await momentInRoom(likeRoute[1], request, ident);
      const existing = await one('likes', 'id,active', [['moment_id', moment.id], ['voter_id', voterId]]);
      let liked;
      if (!existing) {
        const inserted = rows(await db.from('likes').insertIfAbsent({ ...stamp(), moment_id: moment.id, room_id: room.id, voter_id: voterId, active: true }, { onConflict: 'moment_id,voter_id' }).select('id,active'));
        if (!inserted?.length) fail('write_conflict', 409);
        liked = true;
      } else {
        liked = !existing.active;
        const updated = rows(await db.from('likes').update({ active: liked }).eq('id', existing.id).eq('active', existing.active).select('id,active'));
        if (!updated?.length) fail('write_conflict', 409);
      }
      const likes = await bump('moments', moment.id, 'likes', liked ? 1 : -1);
      return Response.json({ id: moment.id, liked, likes });
    }

    const voteRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})\/(vote|unvote)$/);
    if (voteRoute && method === 'POST') {
      const voterId = requireVisitor(ident);
      const { moment, room } = await momentInRoom(voteRoute[1], request, ident);
      if (room.mode === 'gentle') fail('invalid_mode', 409);
      const casting = voteRoute[2] === 'vote';
      const existing = await one('votes', 'id,active', [['moment_id', moment.id], ['voter_id', voterId]]);
      if (casting && existing?.active) fail('already_voted', 409);
      if (!casting && !existing?.active) fail('not_voted', 409);
      const used = await moveBallot(room.id, voterId, casting ? 1 : -1);
      let voted;
      if (!existing) {
        const inserted = rows(await db.from('votes').insertIfAbsent({ ...stamp(), moment_id: moment.id, room_id: room.id, voter_id: voterId, active: true }, { onConflict: 'moment_id,voter_id' }).select('id,active'));
        if (!inserted?.length) { await moveBallot(room.id, voterId, -1); fail('write_conflict', 409); }
        voted = true;
      } else {
        voted = casting;
        const updated = rows(await db.from('votes').update({ active: voted }).eq('id', existing.id).eq('active', existing.active).select('id,active'));
        if (!updated?.length) { await moveBallot(room.id, voterId, casting ? -1 : 1); fail('write_conflict', 409); }
      }
      let votes;
      try { votes = await bump('moments', moment.id, 'votes', casting ? 1 : -1); }
      catch (error) { await moveBallot(room.id, voterId, casting ? -1 : 1).catch(() => {}); throw error; }
      return Response.json({ id: moment.id, voted, votes: showsVotes(room) ? votes : null, used, remaining: Math.max(0, BALLOTS - used) });
    }

    const commentRoute = path.match(/^\/api\/moments\/([0-9a-f-]{36})\/comments$/);
    if (commentRoute && method === 'GET') {
      const { moment } = await momentInRoom(commentRoute[1], request, ident);
      return Response.json({ comments: await commentList(moment.id) });
    }
    if (commentRoute && method === 'POST') {
      const voterId = requireVisitor(ident);
      const { moment, room } = await momentInRoom(commentRoute[1], request, ident);
      const body = await input(request);
      const authorName = ident.account ? ident.account.display_name : (typeof body?.author_name === 'string' ? body.author_name.trim() : '');
      if (!clean(body?.body, 300, true) || !clean(authorName, 24, true)) fail('invalid_input', 400);
      if (/赌博|博彩|裸聊|刷单兼职|引流加微/i.test(body.body)) fail('unsafe_content', 422);
      const mine = rows(await db.from('comments').select('id').eq('moment_id', moment.id).eq('author_id', voterId).limit(101)) || [];
      if (mine.length >= 100) fail('comment_limit_reached', 409);
      if (Number(moment.comment_count) >= 300) fail('comment_limit_reached', 409);
      const floor = await bump('moments', moment.id, 'comment_count', 1);
      const id = crypto.randomUUID();
      const inserted = rows(await db.from('comments').insert({
        id, moment_id: moment.id, room_id: room.id, author_id: voterId,
        author_name: authorName, body: body.body.trim(), floor, created_at: new Date().toISOString(),
      }).select(COMMENT_COLS));
      if (!inserted?.length) { await bump('moments', moment.id, 'comment_count', -1).catch(() => {}); fail('write_conflict', 409); }
      const row = inserted[0];
      return Response.json({
        comment: {
          id: row.id,
          author_name: ident.account?.display_name || row.author_name,
          author_avatar: ident.account?.avatar_url || '',
          body: row.body, floor: row.floor, created_at: row.created_at,
        },
      }, { status: 201 });
    }

    fail('not_found', 404);
  };
}
