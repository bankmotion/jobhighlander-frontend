// No 'use client' directive, for the same reason as `theme-init.ts`: the root
// layout is a Server Component and needs NAV_INIT_SCRIPT at render time.

export type NavState = 'shown' | 'hidden';

export const NAV_KEY = 'jh.nav';

// Runs before first paint. Without it the sidebar renders, hydration reads
// localStorage, and the layout jumps 240px sideways on every navigation for
// anyone who collapsed it.
//
// Only the hidden state is stamped. The stylesheet has no rule that force-SHOWS
// the sidebar, deliberately: it is `hidden md:flex`, so forcing it visible would
// also drag a 240px panel onto a phone screen. Absent attribute means "leave
// Tailwind's responsive behaviour alone".
export const NAV_INIT_SCRIPT = `(function(){try{
if(localStorage.getItem(${JSON.stringify(NAV_KEY)})==='hidden'){document.documentElement.dataset.nav='hidden';}
}catch(e){}})();`;
