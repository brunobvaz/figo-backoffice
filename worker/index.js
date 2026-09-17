const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const adminPath = '/api/v1/admin';

function privateResponse(response) {
  const result = new Response(response.body, response);
  // Never cache sessions, administrative data, or images whose owner can be suspended.
  result.headers.set('Cache-Control', 'no-store');
  result.headers.set('CDN-Cache-Control', 'no-store');
  result.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return result;
}

function errorResponse(status, code, message) {
  return privateResponse(Response.json({ success: false, error: { code, message } }, { status }));
}

function backendOrigin(value, frontend) {
  const backend = new URL(value);
  const local = localHosts.has(frontend.hostname) && localHosts.has(backend.hostname);
  if (
    (backend.protocol !== 'https:' && !(local && backend.protocol === 'http:')) ||
    backend.username ||
    backend.password ||
    backend.search ||
    backend.hash ||
    backend.pathname !== '/' ||
    backend.origin === frontend.origin
  )
    throw new Error('Invalid backend origin');
  return backend;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const admin = url.pathname === adminPath || url.pathname.startsWith(`${adminPath}/`);
    const upload = /^\/uploads\/(products|avatars)\/[^/]+$/.test(url.pathname);

    if (!admin && !upload) {
      if (/^\/(api|uploads)(\/|$)/.test(url.pathname)) {
        return errorResponse(404, 'NOT_FOUND', 'Recurso não encontrado.');
      }
      return env.ASSETS.fetch(request);
    }
    if (upload && !['GET', 'HEAD'].includes(request.method)) {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
    }
    if (
      admin &&
      (request.headers.get('X-Figo-Backoffice') !== '1' ||
        (request.headers.has('Origin') && request.headers.get('Origin') !== url.origin) ||
        request.headers.get('Sec-Fetch-Site') === 'cross-site')
    ) {
      return errorResponse(
        403,
        'ADMIN_ORIGIN_FORBIDDEN',
        'Pedido de administração não autorizado.'
      );
    }

    let target;
    try {
      target = backendOrigin(env.BACKEND_ORIGIN, url);
    } catch {
      return errorResponse(
        503,
        'BACKEND_NOT_CONFIGURED',
        'A ligação ao servidor não está configurada.'
      );
    }
    // The target is configuration, never a URL supplied by a browser or query parameter.
    target.pathname = url.pathname;
    target.search = url.search;
    const headers = new Headers();
    for (const name of ['Accept', 'Accept-Language', 'Content-Type']) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    if (admin) {
      headers.set('Origin', url.origin);
      headers.set('X-Figo-Backoffice', '1');
      const sessionCookie = (request.headers.get('Cookie') || '')
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith('figo_admin='));
      if (sessionCookie) headers.set('Cookie', sessionCookie);
    }
    // Drop any client-supplied forwarding headers. Cloudflare supplies the visitor IP.
    const clientIp = request.headers.get('CF-Connecting-IP');
    if (clientIp) headers.set('X-Forwarded-For', clientIp);
    headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));

    try {
      const upstream = new Request(new Request(target, request), { headers, redirect: 'manual' });
      const response = await fetch(upstream, {
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      });
      // Do not send credentials to an upstream redirect or move the browser off this origin.
      if (response.status >= 300 && response.status < 400 && response.status !== 304) {
        await response.body?.cancel();
        return errorResponse(
          502,
          'BACKEND_REDIRECT',
          'O servidor devolveu um redirecionamento inesperado.'
        );
      }
      // Keeps Set-Cookie (including deletion), HttpOnly, Secure, SameSite and its path intact.
      return privateResponse(response);
    } catch (error) {
      console.error('Backoffice proxy failed:', error.name, error.message);
      return errorResponse(
        502,
        'BACKEND_UNAVAILABLE',
        'Não foi possível contactar o servidor. Tenta novamente.'
      );
    }
  },
};
