// No 'use client' directive on purpose — same reasoning as theme-init.ts. The
// root layout is a Server Component and needs the script at render time, and
// zone.server.ts needs the cookie name. Importing either from display-zone.ts
// would pull that module into the server graph, where its top-level
// createLocalStore() call would run against a client reference. Everything here
// is a plain value, safe on either side of the boundary.

export const TZ_COOKIE = 'jh-tz';

/** The localStorage key the client store writes, as a RAW string (not JSON). */
export const ZONE_KEY = 'jh.display-zone';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Publish the viewer's time zone to the server BEFORE the first data fetch.
 *
 * The zone preference lives in localStorage, which a server component cannot
 * read, so it is mirrored into a cookie. Doing that mirroring from a React
 * effect — as this first did — is too late: the server has already rendered the
 * page, and every window it computed used the UTC fallback.
 *
 * The symptom is nasty precisely because it is not an error. "Today" quietly
 * means the UTC day, so a viewer in Pacific time at 01:00 sees a list of jobs
 * that are, by their own calendar, yesterday evening's — a plausible number,
 * silently answering a question nobody asked.
 *
 * Running here, inline in <head> during HTML parsing, puts the cookie on every
 * request the page goes on to make. Only the very first HTML response of a
 * brand-new browser profile can miss it, and ZoneSync refreshes that one.
 *
 * Validated with Intl before it is written: an unparseable zone reaching the
 * server would be rejected there anyway, but writing a bad cookie would make it
 * stick until the user changed the setting. A stored value that fails that
 * check falls through to the browser's own zone rather than to nothing —
 * writing no cookie means UTC, which is a worse guess than the device's zone.
 */
export const ZONE_INIT_SCRIPT = `(function(){try{
function ok(v){if(typeof v!=='string'||!v){return false;}
try{new Intl.DateTimeFormat('en-US',{timeZone:v});return true;}catch(e){return false;}}
var z=null;
try{z=localStorage.getItem(${JSON.stringify(ZONE_KEY)});}catch(e){}
if(!ok(z)){try{z=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){}}
if(!ok(z)){return;}
var m=document.cookie.match(/(?:^|; )${TZ_COOKIE}=([^;]*)/);
if(m&&decodeURIComponent(m[1])===z){return;}
document.cookie=${JSON.stringify(TZ_COOKIE)}+'='+encodeURIComponent(z)+'; path=/; max-age=${ONE_YEAR}; samesite=lax';
}catch(e){}})();`;
