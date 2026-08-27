import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, isSuperAdmin, isAdminRole, type Role } from './lib/session';

// Google sign-in also creates the account, so there is no separate register page.
const PUBLIC_PATHS = ['/login'];
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Ask the backend for the caller's *current* role (the source of truth) so a
 * just-granted or just-revoked role is honored right away, instead of when the
 * JWT is next reissued.
 *  - { role }    → backend answered; use this fresh role
 *  - { revoked } → backend rejected the token (revoked to guest / gone / bad)
 *  - { offline } → backend unreachable; caller should fall back to the token
 */
async function currentRole(
  token: string,
): Promise<{ role: Role } | { revoked: true } | { offline: true }> {
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) return { revoked: true };
    if (!res.ok) return { offline: true }; // 5xx etc. — don't lock the user out
    const data = await res.json().catch(() => null);
    const role = data?.user?.role as Role | undefined;
    return role ? { role } : { offline: true };
  } catch {
    return { offline: true };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;
  const session = token ? await verifyToken(token) : null;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Not signed in → only public pages allowed.
  if (!session) {
    if (isPublic) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete('token'); // clear an invalid/expired token
    return res;
  }

  // Signed in → keep them off the login page.
  if (isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // /admin/bidders and /admin/templates are open to admins (and super admins):
  // one shares their own profiles, the other shapes their resume output. The
  // rest of /admin (users, keywords, scraper config) stays super_admin only.
  //
  // /profiles, /inbox and /ai-usage are deliberately NOT under /admin — every signed-in
  // role reaches them, and what they may do there is decided per profile by the
  // backend, not by this path check.
  //
  // Re-check the role against the backend here so a just-granted or
  // just-revoked role applies immediately, without waiting for a fresh login.
  if (pathname.startsWith('/admin')) {
    const check = await currentRole(token!);
    if ('revoked' in check) {
      // Token no longer valid (e.g. revoked back to guest) → sign them out.
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      const res = NextResponse.redirect(url);
      res.cookies.delete('token');
      return res;
    }
    const role = 'role' in check ? check.role : session.role; // offline → trust token
    const ADMIN_LEVEL = ['/admin/bidders', '/admin/templates'];
    const allowed = ADMIN_LEVEL.some((p) => pathname.startsWith(p))
      ? isAdminRole(role)
      : isSuperAdmin(role);
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// `template-thumbs` holds pre-rendered previews of a FICTIONAL sample resume —
// no user data — and must be exempt: next/image fetches the source URL itself
// with no session cookie, so a redirect here turns every preview into a 400.
export const config = {
  // Gate everything except Next internals and the auth route handlers.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|template-thumbs|api/auth).*)'],
};
