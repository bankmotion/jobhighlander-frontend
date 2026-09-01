// No 'use client' directive on purpose. The root layout is a Server Component
// and needs THEME_INIT_SCRIPT at render time; importing it from the client
// module below would pull that module into the server graph, where its
// top-level createLocalStore() call would run against a client reference.
// Everything here is a plain value, safe on either side of the boundary.

export type Theme = 'dark' | 'light';

export const THEME_KEY = 'jh.theme';

// Inlined into <head> and run during HTML parsing, before the first paint.
// Reads the same key the store writes, so the two cannot disagree.
//
// The OS preference is consulted only when nothing is stored — a first visit
// follows the system, and an explicit choice outranks it from then on.
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});
if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
}catch(e){document.documentElement.dataset.theme='dark';}})();`;
