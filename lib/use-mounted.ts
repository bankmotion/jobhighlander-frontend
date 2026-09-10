'use client';

import { useSyncExternalStore } from 'react';

// Never fires: the value it reports flips exactly once, at hydration, and React
// already re-renders then. A real subscription would be a listener that can
// never have anything to say.
const noSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False while server-rendering, true once hydrated.
 *
 * For overlays that portal into `document.body`, which does not exist during
 * SSR. `useSyncExternalStore` rather than the usual `useState` + `useEffect`
 * pair: this is React's own way of reading a value that differs between server
 * and client, and it avoids a state update inside an effect — which schedules a
 * second render pass for something already known at hydration.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noSubscribe, onClient, onServer);
}
