// Local fixtures only. This directory stays outside both publication upload roots.
// It runs the real application routes with credential-free memory DB / Storage / identity.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export class LocalError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }

const MAX_LOCAL_BYTES = 34 * 1024 * 1024;

const DEFAULTS = {
  rooms: { code: null, share_code: null, tags: [], cover_seed_key: null, cover_thumb_path: null, revealed: false, ai_curator_note: '', moment_count: 0 },
  moments: {
    place: '', tag: '', story: '', seed_key: null, object_path: null, thumb_path: null,
    original_path: null, original_width: 0, original_height: 0, ai_score: 94, ai_caption: '',
    status: 'pending', width: 0, height: 0, likes: 0, votes: 0, comment_count: 0,
  },
  likes: { active: true },
  votes: { active: true },
  ballots: { used: 0 },
  comments: { floor: 1 },
  gate_attempts: { fails: 0, window_start: () => new Date().toISOString() },
  accounts: { avatar_url: '', bio: '', unlocked_codes: [] },
  sessions: {},
  moment_parts: { part_index: 0, total_parts: 1, byte_size: 0, total_size: 0, content_type: 'image/jpeg', sha256: '' },
};
const UNIQUE = {
  rooms: [['slug'], ['code'], ['share_code'], ['creator_id', 'idempotency_key']],
  moments: [['object_path']],
  likes: [['moment_id', 'voter_id']],
  votes: [['moment_id', 'voter_id']],
  ballots: [['room_id', 'voter_id']],
  gate_attempts: [['room_id', 'voter_id']],
  accounts: [['handle']],
  sessions: [['token_hash']],
  moment_parts: [['object_path'], ['moment_id', 'part_index']],
};
const matches = (row, keys, values) => keys.every(key => row[key] === values[key]);

export function createMemoryRuntime() {
  const tables = { rooms: [], moments: [], likes: [], votes: [], ballots: [], comments: [], gate_attempts: [], accounts: [], sessions: [], moment_parts: [] };
  const objects = new Map(), signatures = new Map();
  const state = { visitor: null, user: null, failList: false, loseCreate: false, loseComplete: false, ballotConflict: false };
  function reset() {
    for (const table of Object.values(tables)) table.length = 0;
    objects.clear(); signatures.clear();
    Object.assign(state, { visitor: null, user: null, failList: false, loseCreate: false, loseComplete: false, ballotConflict: false });
  }
  const defaultsFor = table => Object.fromEntries(Object.entries(DEFAULTS[table] || {}).map(([key, value]) => [key, typeof value === 'function' ? value() : value]));
  const uniqueClash = (table, values) => (UNIQUE[table] || []).some(keys =>
    keys.every(key => values[key] !== null && values[key] !== undefined)
    && tables[table].some(row => matches(row, keys, values)));

  const db = { from(table) {
    if (!(table in tables)) throw new LocalError('invalid_table', 400);
    const filters = [], order = []; let mode = 'read', values, conflict, columns, count = 1000;
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      order(key, options = {}) { order.push([key, options.ascending !== false]); return query; },
      limit(value) { count = value; return query; },
      insert(value) { mode = 'insert'; values = value; return query; },
      insertIfAbsent(value, options) { mode = 'insert'; values = value; conflict = options.onConflict.split(','); return query; },
      update(value) { mode = 'update'; values = value; return query; },
      then(fulfilled, rejected) {
        return Promise.resolve().then(() => {
          let result;
          if (mode === 'insert') {
            const list = Array.isArray(values) ? values : [values];
            const inserted = [];
            for (const item of list) {
              const row = { id: randomUUID(), created_at: new Date().toISOString(), ...defaultsFor(table), ...item };
              if (uniqueClash(table, row)) {
                if (conflict) continue;
                return { data: null, error: { code: 'duplicate_key', status: 409 } };
              }
              if (conflict && tables[table].some(existing => matches(existing, conflict, row))) continue;
              tables[table].push(row); inserted.push(row);
            }
            result = inserted;
          } else {
            result = tables[table].filter(row => filters.every(([key, value]) => row[key] === value));
            if (mode === 'update') result.forEach(row => Object.assign(row, values));
          }
          for (const [key, asc] of [...order].reverse()) result = [...result].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (asc ? 1 : -1));
          result = result.slice(0, count).map(row => columns ? Object.fromEntries(columns.split(',').map(key => [key, row[key]])) : { ...row });
          return { data: result, error: null };
        }).then(fulfilled, rejected);
      },
    };
    return query;
  } };

  function sign(path, operation) {
    const token = randomUUID(); signatures.set(token, { path, operation, expires: Date.now() + 3600_000 });
    return { signedUrl: `/storage/v1/object/${operation === 'upload' ? 'upload/sign' : 'sign'}/11111111-1111-4111-8111-111111111111/${path}?token=${token}` };
  }
  const storage = {
    async createSignedUploadUrl(path) { return sign(path, 'upload'); },
    async createSignedUrl(path) { return sign(path, 'download'); },
    async download(path) {
      const object = objects.get(path);
      if (!object) throw new LocalError('storage_object_not_found', 404);
      return new Response(object.bytes, { headers: { 'content-type': object.type, 'content-length': String(object.bytes.length) } });
    },
  };
  return {
    db, storage, state, tables, reset, BackendError: LocalError,
    getUser() { return state.user ? { user_id: state.user, name: state.user === 'local-a' ? '拾光访客 A' : '拾光访客 B' } : null; },
    async transfer(request) {
      const url = new URL(request.url), signed = signatures.get(url.searchParams.get('token'));
      if (!signed || signed.expires < Date.now()) throw new LocalError('signature_expired', 403);
      if (signed.operation === 'download' && request.method === 'GET') return storage.download(signed.path);
      if (signed.operation !== 'upload' || request.method !== 'PUT') throw new LocalError('method_not_allowed', 405);
      if (objects.has(signed.path)) throw new LocalError('object_exists', 409);
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.length > MAX_LOCAL_BYTES) throw new LocalError('payload_too_large', 413);
      objects.set(signed.path, { bytes, type: request.headers.get('content-type') });
      return Response.json({ ok: true });
    },
  };
}

const controls = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>拾光房间 · 本地测试控制台</title>
<style>body{font:16px/1.7 -apple-system,"PingFang SC",system-ui,sans-serif;max-width:720px;margin:48px auto;padding:20px;color:#1b1a17;background:#f7f4ef}
h1{font-size:22px}button{font:inherit;padding:9px 14px;margin:6px 6px 0 0;border:1px solid #ded5c8;background:#fff;border-radius:10px;cursor:pointer}
button:hover{border-color:#e0761a;color:#c25a10}p{color:#6d675e}a{color:#c25a10}</style>
<h1>本地测试控制台</h1><p>只影响本次进程的内存数据，不连接任何云端服务。切换身份后回到页面点击「重新加载」；故障只影响下一次匹配的请求。进程重启会恢复示例房间。</p>
<p><a href="/">← 返回拾光房间</a></p><div id="controls"></div><p id="status" role="status"></p>
<script>const actions={'visitor-a':'模拟访客 A（本机）','visitor-b':'模拟访客 B（另一台设备）','visitor-new':'模拟全新访客','login':'模拟已登录站点账号','logout':'恢复匿名访客','fail-list':'下一次广场读取失败','lose-create':'下一次创办成功但丢失响应','lose-complete':'下一次上传确认成功但丢失响应','ballot-conflict':'下一次投票发生写入冲突','reset':'清空内存数据（重新播种示例房间）'};
for(const [action,label] of Object.entries(actions)){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{const r=await fetch('/__local/control',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})});document.querySelector('#status').textContent=r.ok?'已设置：'+label:'设置失败'};document.querySelector('#controls').append(b)}</script></html>`;

const VISITORS = { 'visitor-a': '11111111-1111-4111-8111-111111111111', 'visitor-b': '22222222-2222-4222-8222-222222222222' };

export async function startLocalBackend(application, { port = 0 } = {}) {
  const runtime = createMemoryRuntime();
  let handle = application(runtime);
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, `http://${incoming.headers.host}`);
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new LocalError('invalid_host', 403);
      if (!['GET', 'HEAD'].includes(incoming.method) && incoming.headers.origin && incoming.headers.origin !== url.origin) throw new LocalError('invalid_origin', 403);
      let size = 0; const chunks = [];
      for await (const chunk of incoming) { size += chunk.length; if (size > MAX_LOCAL_BYTES) throw new LocalError('payload_too_large', 413); chunks.push(chunk); }
      const headers = { ...incoming.headers };
      if (runtime.state.visitor) headers['x-visitor-key'] = runtime.state.visitor;
      const request = new Request(url, { method: incoming.method, headers, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Buffer.concat(chunks) }) });
      let response;
      if (url.pathname === '/__local/' && incoming.method === 'GET') response = new Response(controls, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      else if (url.pathname === '/__local/control' && incoming.method === 'POST') {
        const { action } = await request.json();
        if (action === 'reset') { runtime.reset(); handle = application(runtime); }
        else if (action === 'visitor-a' || action === 'visitor-b') runtime.state.visitor = VISITORS[action];
        else if (action === 'visitor-new') runtime.state.visitor = randomUUID();
        else if (action === 'login') runtime.state.user = 'local-a';
        else if (action === 'logout') runtime.state.user = null;
        else if ({ 'fail-list': 1, 'lose-create': 1, 'lose-complete': 1, 'ballot-conflict': 1 }[action]) {
          runtime.state[({ 'fail-list': 'failList', 'lose-create': 'loseCreate', 'lose-complete': 'loseComplete', 'ballot-conflict': 'ballotConflict' })[action]] = true;
        } else throw new LocalError('invalid_control', 400);
        response = Response.json({ ok: true });
      } else if (url.pathname.startsWith('/storage/v1/')) response = await runtime.transfer(request);
      else {
        if (url.pathname.endsWith('/api/rooms') && request.method === 'GET' && runtime.state.failList) { runtime.state.failList = false; throw new LocalError('database_unavailable', 503); }
        if (url.pathname.endsWith('/vote') && request.method === 'POST' && runtime.state.ballotConflict) { runtime.state.ballotConflict = false; throw new LocalError('write_conflict', 409); }
        response = await handle({ request });
        const create = url.pathname.endsWith('/api/rooms') && request.method === 'POST';
        const complete = url.pathname.endsWith('/complete') && request.method === 'POST';
        if ((create && runtime.state.loseCreate) || (complete && runtime.state.loseComplete)) {
          if (create) runtime.state.loseCreate = false;
          if (complete) runtime.state.loseComplete = false;
          response = Response.json({ error: 'response_lost' }, { status: 503 });
        }
      }
      outgoing.writeHead(response.status, { ...Object.fromEntries(response.headers), 'cache-control': 'no-store' });
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(error instanceof LocalError ? error.status : 500, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      outgoing.end(JSON.stringify({ error: error instanceof LocalError ? error.code : 'local_failure' }));
    }
  });
  const listen = p => new Promise((resolve, reject) => { server.once('error', reject); server.listen(p, '127.0.0.1', resolve); });
  try { await listen(port); }
  catch (error) { if (error.code !== 'EADDRINUSE' || port === 0) throw error; await listen(0); }
  return { runtime, server, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { application } = await import(/* @vite-ignore */ new URL('../functions/routes.mjs', import.meta.url).href);
  const probe = async origin => {
    try {
      const response = await fetch(`${origin}/functions/v1/app/api/health`, { signal: AbortSignal.timeout(800) });
      return response.ok && Number((await response.json()).version) >= 3;
    } catch { return false; }
  };
  let backend = null;
  if (await probe('http://127.0.0.1:8000')) process.env.RECORDS_LOCAL_API = 'http://127.0.0.1:8000';
  else {
    backend = await startLocalBackend(application, { port: 8000 });
    process.env.RECORDS_LOCAL_API = backend.origin;
  }
  const vite = await import('vite');
  let frontend;
  try { frontend = await vite.createServer(); await frontend.listen(); frontend.printUrls(); }
  catch (error) { if (backend) await backend.close(); throw error; }
  console.log(backend
    ? 'Local fixture mode: memory data, no cloud services. Open /__local/ for identity and failure controls.'
    : 'Local fixture mode: reusing the fixture backend on 127.0.0.1:8000 (shared with the workbench preview).');
  const stop = async () => { await frontend.close(); if (backend) await backend.close(); process.exit(0); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
