import { describe, it, expect, beforeEach, vi } from 'vitest';
import { leeresDataFile } from '@/lib/model/defaults';
import type { DataFile } from '@/lib/model/types';

/**
 * Reproduktion der Sync-Logik im Store. Netzwerk (client) und IndexedDB werden
 * gemockt; der Server wird nachgebildet (Optimistic Concurrency wie die Route).
 * Ziel: nachweisen, unter welchen Bedingungen ein Geraet Aenderungen NICHT
 * hochschiebt ("mein PC pusht die Daten nicht").
 */

// --- Fake-Server (spiegelt src/app/api/data/route.ts) -----------------------
let server: DataFile;
type SaveRes =
  | { status: 'ok'; data: DataFile }
  | { status: 'conflict'; data: DataFile };

function serverSave(data: DataFile, baseVersion: number): SaveRes {
  if (typeof baseVersion !== 'number' || server.version !== baseVersion) {
    return { status: 'conflict', data: structuredClone(server) };
  }
  server = {
    ...structuredClone(data),
    version: server.version + 1,
    updatedAt: new Date().toISOString(),
  };
  return { status: 'ok', data: structuredClone(server) };
}

// --- Steuerbares remoteSpeichern (fuer Race-Szenarien) ----------------------
// Wenn `gate` gesetzt ist, blockiert der naechste Save, bis der Test ihn oeffnet.
let gate: { promise: Promise<void>; open: () => void } | null = null;
function neuesGate() {
  let open!: () => void;
  const promise = new Promise<void>((r) => (open = r));
  gate = { promise, open };
  return gate;
}

vi.mock('@/lib/storage/client', () => ({
  remoteLaden: vi.fn(async () => ({ status: 'ok', data: structuredClone(server) })),
  remoteSpeichern: vi.fn(async (data: DataFile, baseVersion: number) => {
    if (gate) {
      const g = gate;
      gate = null;
      await g.promise;
    }
    return serverSave(data, baseVersion);
  }),
}));

// --- In-Memory IndexedDB ----------------------------------------------------
let idbData: DataFile | null = null;
let idbPendingFlag = false;
vi.mock('@/lib/storage/indexeddb', () => ({
  idbLaden: vi.fn(async () => idbData),
  idbSpeichern: vi.fn(async (d: DataFile) => {
    idbData = structuredClone(d);
  }),
  idbPending: vi.fn(async () => idbPendingFlag),
  idbPendingSetzen: vi.fn(async (v: boolean) => {
    idbPendingFlag = v;
  }),
}));

// navigator.onLine
beforeEach(() => {
  server = { ...leeresDataFile(), version: 1 };
  idbData = null;
  idbPendingFlag = false;
  gate = null;
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  vi.resetModules();
});

async function ladeStore() {
  const mod = await import('./store');
  return mod.useApp;
}

/** Kurz warten, bis Microtasks (Promises) abgearbeitet sind. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

describe('Store-Sync: einfacher Push', () => {
  it('schiebt eine lokale Aenderung zum Server (pending -> synchron)', async () => {
    const useApp = await ladeStore();
    await useApp.getState().init();
    // Server war leer (version 1); Store hat ihn geladen.
    expect(useApp.getState().data?.version).toBe(1);

    await useApp.getState().aendern((d) => {
      d.settings.ort = 'Neuer Ort';
    });
    await flush();

    const st = useApp.getState();
    expect(st.pending).toBe(false); // wurde synchronisiert
    expect(st.data?.settings.ort).toBe('Neuer Ort');
    expect(server.settings.ort).toBe('Neuer Ort'); // Server hat die Aenderung
    expect(server.version).toBe(2);
  });
});

describe('Store-Sync: Aenderung waehrend laufendem Save (Coalescing)', () => {
  it('darf eine zweite Aenderung, die waehrend des Saves kommt, NICHT verlieren', async () => {
    const useApp = await ladeStore();
    await useApp.getState().init();

    // Ersten Save blockieren, damit wir waehrenddessen erneut aendern koennen.
    const g = neuesGate();

    // Aenderung A startet den Push (bleibt am Gate haengen).
    const pA = useApp.getState().aendern((d) => {
      d.settings.ort = 'Ort A';
    });
    await flush(); // Push A ist "in flight" am Gate

    // Aenderung B kommt waehrend A noch laeuft.
    await useApp.getState().aendern((d) => {
      d.settings.ort = 'Ort B';
      d.settings.backupErinnerungTage = 99; // zweites Feld, klar zuordenbar
    });
    await flush();

    // Jetzt Save A durchlassen.
    g.open();
    await pA;
    await flush();
    await flush();

    const st = useApp.getState();
    // Erwartung: B ist letztlich synchronisiert und NICHT verloren.
    expect(server.settings.ort).toBe('Ort B');
    expect(server.settings.backupErinnerungTage).toBe(99);
    expect(st.data?.settings.ort).toBe('Ort B');
    expect(st.data?.settings.backupErinnerungTage).toBe(99);
    expect(st.pending).toBe(false);
  });
});

describe('Store-Sync: mehrere Aenderungen waehrend eines Saves', () => {
  it('koalesziert auf den neuesten Stand; keine geht verloren', async () => {
    const useApp = await ladeStore();
    await useApp.getState().init();

    const g = neuesGate();
    const pA = useApp.getState().aendern((d) => {
      d.settings.ort = 'A';
    });
    await flush(); // A haengt am Gate

    await useApp.getState().aendern((d) => {
      d.settings.ort = 'B';
    });
    await useApp.getState().aendern((d) => {
      d.settings.ort = 'C'; // letzter Stand gewinnt
    });
    await flush();

    g.open();
    await pA;
    await flush();
    await flush();

    const st = useApp.getState();
    expect(server.settings.ort).toBe('C');
    expect(st.data?.settings.ort).toBe('C');
    expect(st.pending).toBe(false);
  });
});

describe('Store-Sync: echter Fremd-Konflikt', () => {
  it('meldet Konflikt, wenn das andere Geraet zwischendurch schrieb', async () => {
    const useApp = await ladeStore();
    await useApp.getState().init(); // data.version = 1

    // Anderes Geraet schreibt direkt am Server (version 1 -> 2).
    serverSave({ ...structuredClone(server), settings: { ...server.settings, ort: 'Phone' } }, 1);
    expect(server.version).toBe(2);

    // Unser Geraet aendert lokal auf Basis von version 1 -> Konflikt erwartet.
    await useApp.getState().aendern((d) => {
      d.settings.ort = 'PC';
    });
    await flush();

    const st = useApp.getState();
    expect(st.konflikt).not.toBeNull();
    expect(st.konflikt?.version).toBe(2);
  });
});
