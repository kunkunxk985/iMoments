import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localProxy } from './dev/proxy';

const PREFERRED = 'http://127.0.0.1:8000';

async function alive(origin: string) {
  try {
    const response = await fetch(`${origin}/functions/v1/app/api/health`, { signal: AbortSignal.timeout(900) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true;
  } catch { return false; }
}

// Every Vite instance (including the Sites workbench preview) must reach a local backend.
// Reuse a running fixture backend; otherwise start one here so the preview is self-sufficient.
async function resolveTarget() {
  const configured = process.env.RECORDS_LOCAL_API;
  if (configured && await alive(configured)) return configured;
  if (await alive(PREFERRED)) return PREFERRED;
  // @ts-ignore -- local fixture runner is plain JS kept outside the type-checked app
  const { startLocalBackend } = await import('./dev/local.mjs');
  // @ts-ignore -- business routes are plain JS shared with the deployed Function
  const { application } = await import('./functions/routes.mjs');
  const backend = await startLocalBackend(application, { port: 8000 });
  process.env.RECORDS_LOCAL_API = backend.origin;
  return backend.origin;
}

export default defineConfig(async ({ command }) => {
  const target = command === 'serve' ? await resolveTarget() : (process.env.RECORDS_LOCAL_API || PREFERRED);
  const proxy = localProxy(target);
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
    server: { host: '127.0.0.1', proxy },
    preview: { host: '127.0.0.1', proxy },
    build: { outDir: 'dist' },
  };
});