import { openDB, IDBPDatabase } from 'idb';
import { DataFile } from '../model/types';

/**
 * Lokaler Cache in IndexedDB (via idb). Haelt genau EINEN Bestand plus ein
 * "pending"-Flag: Wurde offline gespeichert und muss noch synchronisiert werden?
 * Bewusst simpel – kein komplexes Merge-System.
 */

const DB_NAME = 'gemeindeplaner';
const DB_VERSION = 1;
const STORE = 'daten';
const KEY_DATEN = 'aktuell';
const KEY_PENDING = 'pending';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB nicht verfuegbar (SSR?).'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function idbLaden(): Promise<DataFile | null> {
  try {
    const d = await db();
    return ((await d.get(STORE, KEY_DATEN)) as DataFile | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function idbSpeichern(data: DataFile): Promise<void> {
  const d = await db();
  await d.put(STORE, data, KEY_DATEN);
}

export async function idbPendingSetzen(v: boolean): Promise<void> {
  try {
    const d = await db();
    await d.put(STORE, v, KEY_PENDING);
  } catch {
    /* ignoriert */
  }
}

export async function idbPending(): Promise<boolean> {
  try {
    const d = await db();
    return !!(await d.get(STORE, KEY_PENDING));
  } catch {
    return false;
  }
}
