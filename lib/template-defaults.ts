/**
 * The template a resume renders with when nothing else is chosen.
 *
 * Mirrors FALLBACK_PRESET in the backend's templates/registry.ts, which is
 * what actually decides it. Kept here only so a control can SHOW the right
 * name: the default is a key, never "whichever preset happens to be listed
 * first", and the custom group now leads the list.
 *
 * In a file of its own, with no imports, on purpose. It is read by a client
 * component, and `lib/templates.ts` imports the server-only auth helper
 * (`next/headers`). Importing a VALUE from there pulled that helper into the
 * browser bundle and failed the production build. A type-only import is
 * erased and is safe; a constant is not.
 */
export const FALLBACK_TEMPLATE_KEY = 'classic-ink';
