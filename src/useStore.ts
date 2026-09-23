import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoreData } from './store/model';
import { loadDurable, requestPersistentStorage, saveDurable } from './store/persist';

export type Update = (fn: (data: StoreData) => StoreData) => void;

const SAVE_AFTER_MS = 400;

/**
 * App data held in React state. It loads once (null until then) and is saved shortly after each
 * change, and straight away when the app is hidden or closed.
 */
export function useStore(): { data: StoreData | null; update: Update; saveFailed: boolean } {
  const [data, setData] = useState<StoreData | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const loaded = useRef<StoreData | null>(null);
  const latest = useRef<StoreData | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDurable().then(({ data: stored }) => {
      if (!alive) return;
      loaded.current = stored;
      setData(stored);
    });
    requestPersistentStorage();
    return () => {
      alive = false;
    };
  }, []);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const pending = latest.current;
    if (!pending) return;
    latest.current = null;
    void saveDurable(pending, Date.now()).then((ok) => setSaveFailed(!ok));
  }, []);

  // Every change after loading is saved.
  useEffect(() => {
    if (!data || data === loaded.current) return;
    latest.current = data;
    if (timer.current === null) timer.current = window.setTimeout(flush, SAVE_AFTER_MS);
  }, [data, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const update = useCallback<Update>((fn) => setData((prev) => (prev ? fn(prev) : prev)), []);
  return { data, update, saveFailed };
}
