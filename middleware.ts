import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, isSuperAdmin, isAdminRole, type Role } from './lib/session';

// Google sign-in also creates the account, so there is no separate register page.
const PUBLIC_PATHS = ['/login'];
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

  // /profiles and /inbox are deliberately NOT under /admin or /superadmin —
  // every signed-in role reaches them, and what they may do there is decided
  // per profile by the backend, not by this path check. /billing is the
  // exception, gated below: bidders do not pay, so there is nothing there for
  // them.
  //
  // Re-checked on EVERY gated page, not just the admin trees.
  //
  // The role is inside the token, so a demoted user carries a session that
  // still asserts the old one. Checking only the admin trees meant they were
  // bounced off those pages but kept a valid-looking session everywhere else —
  // admin links still in the sidebar, every request behind them failing. The
  // API now rejects a token whose role has changed, so this turns any role
  // change into a sign-out on the next navigation.
  //
  // The cost is one internal request per page view. Deliberate: a stale
  // session is a security question, and answering it late is answering it
  // wrong. `offline` deliberately falls back to the token rather than locking
  // everyone out when the API is merely down.
  const check = await currentRole(token!);
  if ('revoked' in check) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.delete('token');
    return res;
  }
  const role = 'role' in check ? check.role : session.role; // offline → trust token

  // Billing belongs to whoever PAYS, and since AI spend is charged to the
  // profile's owner a bidder has no balance to top up and no statement to read.
  // Gated here rather than only hidden in the nav: a hidden link is not a
  // guard, and the page would otherwise render a $0.00 balance and a deposit
  // address that would take their money for nothing.
  if (pathname.startsWith('/billing') && role === 'bidder') {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // An old bookmark or a pasted link still points at /admin/<super-admin page>.
  // Redirected rather than 404'd, and BEFORE the gate below, so a super admin
  // following one lands on the page instead of being bounced to the dashboard.
  // The query string survives the clone, which is what keeps a link like
  // /admin/scrape-runs?site=ziprecruiter pointing at the same filtered view.
  const MOVED = [
    '/admin/ai-usage',
    '/admin/bid-performance',
    '/admin/keywords',
    '/admin/payments',
    '/admin/profiles',
    '/admin/prompts',
    '/admin/scrape-runs',
    '/admin/scraper-settings',
    '/admin/stage-types',
  ];
  if (pathname === '/admin' || MOVED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/superadmin' + pathname.slice('/admin'.length);
    return NextResponse.redirect(url);
  }

  // The URL now carries the access level, so the gate is a prefix test rather
  // than a list of exceptions: /superadmin/* is super_admin only, and what is
  // left under /admin/* (bidders, resume templates) is open to admins too —
  // one shares their own profiles, the other shapes their resume output.
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/admin')) {
    const allowed = pathname.startsWith('/superadmin') ? isSuperAdmin(role) : isAdminRole(role);
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
  // Static images are exempt: the sign-in page renders the logo BEFORE there
  // is a session, so gating them redirects the asset to /login and the image
  // breaks. They are public files either way — gating them protected nothing.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|template-thumbs|api/auth|.*\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
