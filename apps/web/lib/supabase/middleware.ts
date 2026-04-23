import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

const PUBLIC_PATHS = ['/login', '/auth', '/api/health'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const getUserResult = await supabase.auth.getUser();
  const user = getUserResult.data.user;
  const getUserError = getUserResult.error;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const debugHeaders: Record<string, string> = {
    'x-mw-path': pathname,
    'x-mw-public': String(isPublic),
    'x-mw-has-user': String(!!user),
    'x-mw-user-id': user?.id ?? 'none',
    'x-mw-err': getUserError?.message ?? 'none',
    'x-mw-cookies': request.cookies
      .getAll()
      .map((c) => `${c.name}:${c.value.length}`)
      .join(','),
  };

  // When redirecting we must forward any cookies that supabase set during
  // token refresh — otherwise the rotated refresh_token is lost and the next
  // request will fail auth, causing a redirect loop.
  function applyDebug<T extends NextResponse>(res: T): T {
    for (const [k, v] of Object.entries(debugHeaders)) res.headers.set(k, v);
    return res;
  }

  function redirectWithCookies(url: URL) {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return applyDebug(redirect);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return redirectWithCookies(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return redirectWithCookies(url);
  }

  return applyDebug(response);
}
