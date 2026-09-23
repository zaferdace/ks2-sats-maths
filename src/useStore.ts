import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoreData } from './store/model';
import { loadStore, requestPersistentStorage, saveStore } from './store/persist';

export type Update = (fn: (data: StoreData) => StoreData) => void;

/** App data held in React state and written to localStorage after every change. */
export function useStore(): { data: StoreData; update: Update; saveFailed: boolean } {
  const [data, setData] = useState<StoreData>(() => loadStore());
  const [saveFailed, setSaveFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      requestPersistentStorage();
      return;
    }
    setSaveFailed(!saveStore(data));
  }, [data]);

  const update = useCallback<Update>((fn) => setData((prev) => fn(prev)), []);
  return { data, update, saveFailed };
}
