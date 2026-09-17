import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import worker from '../worker/index.js';

const origin = 'https://backoffice.figo.test';
const env = { BACKEND_ORIGIN: 'https://backend.figo.test', ASSETS: {
  fetch: () => new Response('<html>Figo</html>', { headers: { 'Content-Type': 'text/html' } }),
} };
const adminHeaders = { Origin: origin, 'X-Figo-Backoffice': '1' };
const request = (path = '/api/v1/admin/auth/me', options = {}) => new Request(origin + path, {
  ...options, headers: { ...adminHeaders, ...options.headers },
});
afterEach(() => mock.restoreAll());

test('encaminha login, corpo e query, preserva Set-Cookie e desativa cache', async () => {
  const cookies = [
    'figo_admin=test-token; Path=/api/v1/admin; HttpOnly; Secure; SameSite=Strict',
    'old=; Max-Age=0; Path=/api/v1/admin; HttpOnly; Secure',
  ];
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public' });
  cookies.forEach(cookie => headers.append('Set-Cookie', cookie));
  const fetch = mock.method(globalThis, 'fetch', async (req, options) => {
    assert.equal(req.url, 'https://backend.figo.test/api/v1/admin/auth/login?source=test');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.get('Origin'), origin);
    assert.equal(req.headers.get('Cookie'), 'figo_admin=previous');
    assert.equal(req.headers.get('X-Forwarded-For'), '203.0.113.2');
    assert.equal(req.headers.get('X-Forwarded-Host'), null);
    assert.equal(req.headers.get('Authorization'), null);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(await req.json(), { email: 'admin@figo.test', password: 'test-only' });
    return new Response('{"success":true}', { headers });
  });
  const response = await worker.fetch(request('/api/v1/admin/auth/login?source=test', {
    method: 'POST', body: JSON.stringify({ email: 'admin@figo.test', password: 'test-only' }),
    headers: { 'Content-Type': 'application/json', Cookie: 'another=secret; figo_admin=previous',
      'CF-Connecting-IP': '203.0.113.2', 'X-Forwarded-For': 'spoofed',
      'X-Forwarded-Host': 'evil.test', Authorization: 'Bearer mobile-token' },
  }), env);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(response.headers.getSetCookie(), cookies);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { success: true });
});

test('bloqueia outras origens, pedidos cross-site e ausência do header administrativo', async () => {
  const fetch = mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch'); });
  for (const req of [
    request(undefined, { headers: { Origin: 'https://evil.test' } }),
    request(undefined, { headers: { Origin: 'null' } }),
    request(undefined, { headers: { 'Sec-Fetch-Site': 'cross-site' } }),
    new Request(origin + '/api/v1/admin/auth/me'),
  ]) assert.equal((await worker.fetch(req, env)).status, 403);
  assert.equal(fetch.mock.callCount(), 0);
});

test('GET sem Origin envia a origem do backoffice para a allowlist do backend', async () => {
  mock.method(globalThis, 'fetch', async req => {
    assert.equal(req.headers.get('Origin'), origin);
    assert.equal(req.headers.get('X-Forwarded-For'), null);
    return Response.json({ success: false, error: { code: 'ADMIN_SESSION_REQUIRED' } }, { status: 401 });
  });
  const response = await worker.fetch(new Request(origin + '/api/v1/admin/auth/me', {
    headers: { 'X-Figo-Backoffice': '1', 'X-Forwarded-For': 'spoofed' },
  }), env);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'ADMIN_SESSION_REQUIRED');
});

test('não segue redirects nem expõe erros de rede internos', async () => {
  const fetch = mock.method(globalThis, 'fetch', () => new Response(null, {
    status: 302, headers: { Location: 'https://another.test', 'Set-Cookie': 'secret=value' },
  }));
  const redirected = await worker.fetch(request(), env);
  assert.equal(redirected.status, 502);
  assert.equal(redirected.headers.get('Location'), null);
  assert.equal(redirected.headers.get('Set-Cookie'), null);
  fetch.mock.mockImplementation(() => { throw new Error('Internal credentials and addresses'); });
  const failed = await worker.fetch(request(), env);
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).error.code, 'BACKEND_UNAVAILABLE');
});

test('rejeita destino inválido, HTTP remoto e recursão para o próprio Worker', async () => {
  const fetch = mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch'); });
  for (const BACKEND_ORIGIN of [undefined, '', 'not-url', origin, 'http://backend.figo.test',
    'https://user:pass@backend.figo.test', 'https://backend.figo.test/api/v1',
    'https://backend.figo.test/?target=evil', 'https://backend.figo.test/#hash']) {
    assert.equal((await worker.fetch(request(), { ...env, BACKEND_ORIGIN })).status, 503);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('imagens preservam query e bytes, sem cookies e sem cache', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  mock.method(globalThis, 'fetch', async req => {
    assert.equal(req.url, 'https://backend.figo.test/uploads/products/photo.png?variant=thumb');
    assert.equal(req.headers.get('Cookie'), null);
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
  });
  const response = await worker.fetch(request('/uploads/products/photo.png?variant=thumb', {
    headers: { Cookie: 'figo_admin=not-for-images' },
  }), env);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal((await worker.fetch(request('/uploads/products/photo.png', { method: 'POST' }), env)).status, 405);
});

test('CSV e logout preservam download e remoção da sessão', async () => {
  const csv = 'Data;Anúncios\n2026-09-17;1';
  const fetch = mock.method(globalThis, 'fetch', () => new Response(csv, {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="report.csv"' },
  }));
  const report = await worker.fetch(request('/api/v1/admin/reports/export'), env);
  assert.equal(report.headers.get('Content-Disposition'), 'attachment; filename="report.csv"');
  assert.equal(await report.text(), csv);
  const cookie = 'figo_admin=; Path=/api/v1/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict';
  fetch.mock.mockImplementation(() => Response.json({ success: true }, { headers: { 'Set-Cookie': cookie } }));
  const logout = await worker.fetch(request('/api/v1/admin/auth/logout', { method: 'POST' }), env);
  assert.equal(logout.headers.get('Set-Cookie'), cookie);
});

test('rotas da SPA usam assets; API desconhecida nunca recebe index.html', async () => {
  const fetch = mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch'); });
  assert.match(await (await worker.fetch(request('/anuncios'), env)).text(), /Figo/);
  for (const path of ['/api', '/api/v1/products', '/api/v1/admin-other', '/uploads', '/uploads/private/file']) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  }
  assert.equal(fetch.mock.callCount(), 0);
});
