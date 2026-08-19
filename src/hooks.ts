import { useEffect, useState } from 'react';
import { getBlob } from './idb';

/** Resolves an IndexedDB blob key to an object URL, and revokes it on unmount. */
export function useBlobUrl(key: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }
    let live = true;
    let made: string | null = null;
    getBlob(key).then((blob) => {
      if (!live || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [key]);

  return url;
}

/**
 * Close-out and cold start have no exits. A back gesture must not become one.
 */
export function useNoExit(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const guard = () => history.pushState({ mtnGuard: true }, '');
    guard();
    window.addEventListener('popstate', guard);
    return () => window.removeEventListener('popstate', guard);
  }, [active]);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
