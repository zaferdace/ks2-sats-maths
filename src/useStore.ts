import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoreData } from './store/model';
import { loadDurable, requestPersistentStorage, saveDurable } from './store/persist';

export type Update = (fn: (data: StoreData) => StoreData) => void;

const SAVE_AFTER_MS = 400;

/** Work a screen still holds (time on the current question, a written answer being typed). */
const beforeSave = new Set<() => void>();

/**
 * Registers work to hand over before the app is hidden or closed, so it is saved with everything
 * else. Returns the function that unregisters it.
 */
export function onBeforeSave(fn: () => void): () => void {
  beforeSave.add(fn);
  return () => {
    beforeSave.delete(fn);
  };
}

/**
 * App data held in React state. It loads once (null until then) and is saved shortly after each
 * change, and straight away when the app is hidden or closed. The newest data also lives in a ref,
 * updated the moment a change is made, so a save never waits for React to render.
 */
export function useStore(): { data: StoreData | null; update: Update; saveFailed: boolean } {
  const [data, setData] = useState<StoreData | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef<StoreData | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDurable().then(({ data: stored }) => {
      if (!alive || latest.current) return;
      latest.current = stored;
      setData(stored);
    });
    requestPersistentStorage();
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    void saveDurable(latest.current, Date.now()).then((ok) => setSaveFailed(!ok));
  }, []);

  const update = useCallback<Update>(
    (fn) => {
      const prev = latest.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      latest.current = next;
      dirty.current = true;
      setData(next);
      if (timer.current === null) timer.current = window.setTimeout(save, SAVE_AFTER_MS);
    },
    [save],
  );

  // Hidden or closing: collect what screens still hold, then save at once (localStorage is written
  // synchronously, so it lands even if iOS ends the app straight after).
  const flush = useCallback(() => {
    for (const fn of [...beforeSave]) fn();
    save();
  }, [save]);

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

  return { data, update, saveFailed };
}
