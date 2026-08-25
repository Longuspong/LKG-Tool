'use client';

import { create } from 'zustand';
import { DataFile, Person } from '@/lib/model/types';
import { naechstePersonId } from '@/lib/model/ids';
import { idbLaden, idbSpeichern, idbPending, idbPendingSetzen } from '@/lib/storage/indexeddb';
import { remoteLaden, remoteSpeichern } from '@/lib/storage/client';

/**
 * Zentraler App-Zustand + Sync-Logik.
 *
 * Kernidee der Versionierung (bewusst einfach gehalten):
 *   - `data.version` ist IMMER die zuletzt vom Server bestaetigte Version.
 *   - Lokale Aenderungen erhoehen die version NICHT; das macht allein der Server.
 *   - Beim Speichern schicken wir baseVersion = data.version mit. Passt sie
 *     nicht zum Serverstand, hat das andere Geraet zwischendurch gespeichert
 *     -> Konflikt (statt blind zu ueberschreiben).
 *   - Offline landen Aenderungen in IndexedDB mit "pending"-Flag und werden
 *     spaeter mit derselben Versionspruefung nachgereicht.
 */

const LS_CODE = 'gemeindeplaner.zugriffscode';

export type MeldungArt = 'ok' | 'info' | 'warnung' | 'fehler';
export interface Meldung {
  art: MeldungArt;
  text: string;
}

interface AppState {
  data: DataFile | null;
  bereit: boolean;
  code: string | null;
  brauchtCode: boolean;
  online: boolean;
  pending: boolean;
  speichert: boolean;
  konflikt: DataFile | null; // Serverstand bei erkanntem Konflikt
  meldung: Meldung | null;

  init: () => Promise<void>;
  setCode: (code: string) => Promise<'ok' | 'unauthorized' | 'offline' | 'error'>;
  aendern: (mut: (d: DataFile) => void) => Promise<void>;
  personAnlegen: (felder: Partial<Person> & { name: string }) => Promise<string>;
  ersetzen: (neu: DataFile) => Promise<void>;
  aktualisieren: () => Promise<void>;
  konfliktServerUebernehmen: () => Promise<void>;
  konfliktTrotzdemSpeichern: () => Promise<void>;
  meldungSetzen: (m: Meldung | null) => void;
}

function ladeCode(): string | null {
  try {
    return localStorage.getItem(LS_CODE);
  } catch {
    return null;
  }
}
function speichereCode(code: string) {
  try {
    localStorage.setItem(LS_CODE, code);
  } catch {
    /* ignoriert */
  }
}

export const useApp = create<AppState>((set, get) => ({
  data: null,
  bereit: false,
  code: null,
  brauchtCode: false,
  online: true,
  pending: false,
  speichert: false,
  konflikt: null,
  meldung: null,

  meldungSetzen: (m) => set({ meldung: m }),

  async init() {
    const code = ladeCode();
    const lokal = await idbLaden();
    const pending = await idbPending();
    if (lokal) set({ data: lokal, pending });
    set({ code, online: typeof navigator === 'undefined' ? true : navigator.onLine });

    const r = await remoteLaden(code);
    if (r.status === 'unauthorized') {
      set({ brauchtCode: true, bereit: true });
      return;
    }
    if (r.status === 'offline' || r.status === 'error') {
      set({ online: r.status !== 'offline' ? get().online : false, bereit: true });
      return;
    }

    const remote = r.data;
    if (!lokal) {
      await idbSpeichern(remote);
      set({ data: remote, bereit: true, online: true, brauchtCode: false });
      return;
    }
    if (pending && remote.version !== lokal.version) {
      // Beide Seiten haben sich geaendert -> Konflikt sichtbar machen.
      set({ konflikt: remote, bereit: true, online: true, brauchtCode: false });
      return;
    }
    if (remote.version > lokal.version) {
      await idbSpeichern(remote);
      await idbPendingSetzen(false);
      set({ data: remote, pending: false, bereit: true, online: true, brauchtCode: false });
      return;
    }
    // lokal == remote. Gibt es unsynchronisierte Aenderungen? Dann nachreichen.
    if (pending) {
      set({ bereit: true, online: true, brauchtCode: false });
      await pushLokal(set, get);
      return;
    }
    set({ bereit: true, online: true, brauchtCode: false });
  },

  async setCode(code) {
    // Erst den Code am Server pruefen und NUR bei Erfolg uebernehmen. Frueher
    // wurde blind brauchtCode:false gesetzt und neu geladen – ein falscher Code
    // liess dadurch kurz die App aufblitzen und sprang dann ohne Meldung zurueck
    // zur Eingabe. Jetzt bleibt die Eingabe stehen und meldet den Grund.
    set({ speichert: true });
    const r = await remoteLaden(code);
    set({ speichert: false });
    if (r.status !== 'ok') return r.status; // 'unauthorized' | 'offline' | 'error'

    speichereCode(code);
    set({ code, brauchtCode: false });
    await get().init();
    return 'ok';
  },

  async aendern(mut) {
    const aktuell = get().data;
    if (!aktuell) return;
    const neu: DataFile = structuredClone(aktuell);
    mut(neu);
    neu.updatedAt = new Date().toISOString(); // version bleibt (Server erhoeht sie)
    await idbSpeichern(neu);
    await idbPendingSetzen(true);
    set({ data: neu, pending: true });
    await pushLokal(set, get);
  },

  async personAnlegen(felder) {
    const aktuell = get().data;
    const id = naechstePersonId(aktuell?.personen ?? []);
    const person: Person = {
      id,
      name: felder.name.trim(),
      dienstnummer: felder.dienstnummer ?? null,
      email: felder.email ?? '',
      telefon: felder.telefon ?? '',
      rollen: felder.rollen ?? [],
      notiz: felder.notiz ?? '',
      aktiv: felder.aktiv ?? true,
    };
    await get().aendern((d) => {
      d.personen.push(person);
    });
    return id;
  },

  async ersetzen(neu) {
    // Kompletter Datenaustausch (Import). Version bleibt, Server bekommt die Daten.
    const behalten: DataFile = { ...neu, version: get().data?.version ?? neu.version };
    await idbSpeichern(behalten);
    await idbPendingSetzen(true);
    set({ data: behalten, pending: true });
    await pushLokal(set, get);
  },

  async aktualisieren() {
    const { code, data, pending } = get();
    // Gibt es ausstehende lokale Aenderungen, werden sie zuerst hochgeschoben.
    // So loest ein Klick auf "Nicht synchron" (und der Fokus-/Online-Abgleich)
    // tatsaechlich einen Push aus, statt nur vom Server zu lesen. Die
    // Versionspruefung in pushLokal deckt dabei Konflikte auf (409), statt
    // fremde Aenderungen blind zu ueberschreiben.
    if (pending && data) {
      await pushLokal(set, get);
      return;
    }
    const r = await remoteLaden(code);
    if (r.status === 'unauthorized') return set({ brauchtCode: true });
    if (r.status === 'offline') return set({ online: false });
    if (r.status === 'error') return;
    set({ online: true });
    const remote = r.data;
    if (!data) {
      await idbSpeichern(remote);
      return set({ data: remote });
    }
    if (remote.version > data.version) {
      await idbSpeichern(remote);
      await idbPendingSetzen(false);
      set({ data: remote, pending: false });
    }
  },

  async konfliktServerUebernehmen() {
    const server = get().konflikt;
    if (!server) return;
    await idbSpeichern(server);
    await idbPendingSetzen(false);
    set({
      data: server,
      konflikt: null,
      pending: false,
      meldung: { art: 'info', text: 'Serverstand übernommen. Deine lokalen Änderungen wurden verworfen.' },
    });
  },

  async konfliktTrotzdemSpeichern() {
    const { konflikt, data, code } = get();
    if (!konflikt || !data) return;
    set({ speichert: true });
    // Auf den Serverstand aufsetzen, damit die Versionspruefung greift.
    const erzwungen: DataFile = { ...data, version: konflikt.version };
    const res = await remoteSpeichern(erzwungen, konflikt.version, code);
    set({ speichert: false });
    if (res.status === 'ok') {
      await idbSpeichern(res.data);
      await idbPendingSetzen(false);
      set({
        data: res.data,
        konflikt: null,
        pending: false,
        meldung: { art: 'ok', text: 'Deine Version wurde gespeichert (Serverstand überschrieben).' },
      });
    } else if (res.status === 'conflict') {
      set({ konflikt: res.data, meldung: { art: 'warnung', text: 'Erneuter Konflikt – der Server wurde gerade wieder geändert.' } });
    } else {
      set({ meldung: { art: 'fehler', text: 'Speichern fehlgeschlagen.' } });
    }
  },
}));

/** Schiebt den aktuellen lokalen Stand zum Server (mit Versionspruefung). */
async function pushLokal(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
) {
  const { data, code } = get();
  if (!data) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    set({ online: false });
    return; // bleibt pending, wird spaeter nachgereicht
  }
  set({ speichert: true });
  const res = await remoteSpeichern(data, data.version, code);
  set({ speichert: false });

  if (res.status === 'ok') {
    await idbSpeichern(res.data);
    await idbPendingSetzen(false);
    set({ data: res.data, pending: false, online: true });
  } else if (res.status === 'conflict') {
    set({ konflikt: res.data, online: true });
  } else if (res.status === 'unauthorized') {
    set({ brauchtCode: true });
  } else if (res.status === 'offline') {
    set({ online: false }); // bleibt pending
  } else if (res.status === 'invalid') {
    set({ meldung: { art: 'fehler', text: 'Ungültige Daten: ' + res.fehler.slice(0, 3).join(' ') } });
  } else {
    set({ meldung: { art: 'fehler', text: 'Speichern fehlgeschlagen.' } });
  }
}
