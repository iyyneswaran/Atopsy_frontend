import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Transport only. Authentication, authorization, validation and all business logic stay in Express.
async function relay(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (
    !['auth', 'investigations', 'intelligence', 'users', 'health'].includes(path[0]) ||
    path.some((p) => p === '..' || p.includes('/') || p.includes('\\'))
  ) {
    return Response.json({ success: false, message: 'Unknown API route' }, { status: 404 });
  }
  const origin = request.headers.get('origin');
  // Next's internal URL can use localhost even when the browser uses 127.0.0.1.
  // Compare with the incoming public Host instead of the internal routing hostname.
  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    request.nextUrl.protocol.replace(':', '');
  const publicOrigin = `${protocol}://${request.headers.get('host')}`;
  if (!['GET', 'HEAD'].includes(request.method) && origin && origin !== publicOrigin) {
    return Response.json(
      { success: false, message: 'Cross-origin request rejected' },
      { status: 403 },
    );
  }
  const base = process.env.BACKEND_API_URL || 'http://127.0.0.1:5000/api/v1';
  const headers = new Headers();
  for (const key of ['authorization', 'cookie', 'content-type', 'accept']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const upstream = await fetch(
      `${base.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        cache: 'no-store',
        redirect: 'manual',
        ...(!['GET', 'HEAD'].includes(request.method)
          ? { body: request.body, duplex: 'half' }
          : {}),
        signal: request.signal,
      } as RequestInit,
    );
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const key of ['content-type', 'content-disposition', 'x-evidence-sha256', 'retry-after']) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append('set-cookie', cookie);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      {
        success: false,
        message:
          'The investigation service is unavailable. Check the backend connection and try again.',
      },
      { status: 502 },
    );
  }
}
export { relay as GET, relay as POST, relay as PATCH, relay as DELETE };
