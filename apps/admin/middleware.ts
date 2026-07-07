import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server-side auth gate for the admin app. Runs on every request (see matcher)
 * BEFORE any page renders, so protection no longer depends on client-side JS.
 *
 * A request may reach a protected route only if it carries a valid session
 * whose user is an `admin` in the database — presence of a session alone is not
 * enough. Non-admins and anonymous users are redirected to /login.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === '/login';

  if (!user) {
    return isLogin ? response : NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the admin role against the DB, not just session presence.
  const { data: profile } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.user_type === 'admin';

  if (!isAdmin) {
    return isLogin ? response : NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated admin hitting /login → send them to the dashboard.
  if (isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
