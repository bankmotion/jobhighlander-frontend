import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, isSuperAdmin, isAdminRole } from './lib/session';

const PUBLIC_PATHS = ['/login', '/register'];

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

  // Signed in → keep them out of login/register.
  if (isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // /admin/profiles is open to admins (and super admins); the rest of /admin
  // (user + keyword management) stays super_admin only.
  if (pathname.startsWith('/admin')) {
    const allowed = pathname.startsWith('/admin/profiles')
      ? isAdminRole(session.role)
      : isSuperAdmin(session.role);
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Gate everything except Next internals and the auth route handlers.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
