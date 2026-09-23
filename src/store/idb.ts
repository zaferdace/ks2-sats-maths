// A tiny key-value store on IndexedDB. localStorage holds only about 5 MB in Safari, which a
// year of papers could fill; IndexedDB gets far more room.
const DB_NAME = 'ks2-sats';
const STORE = 'kv';

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB is blocked'));
    });
    opening.catch(() => {
      opening = null; // try again next time
    });
  }
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const idbGet = (key: string): Promise<unknown> => run('readonly', (s) => s.get(key));

export const idbSet = (key: string, value: unknown): Promise<void> =>
  run('readwrite', (s) => s.put(value, key)).then(() => undefined);
