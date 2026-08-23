import { Person, Termin } from './types';
import { Rollenbeteiligung } from './derive';
import { heuteIso, tageDifferenz } from '../date';

/**
 * Vorschlagsfunktion (Phase 4) – wer soll den offenen Slot uebernehmen?
 *
 * Wie alles in dieser App ist der Vorschlag NICHT gespeichert, sondern live aus
 * den Terminen abgeleitet. Leitgedanke der App: "nichts uebersehen" – deshalb
 * steht Fairness im Vordergrund: Wer am laengsten nicht dran war, wird zuerst
 * vorgeschlagen. So faellt niemand hinten runter.
 *
 * Ranking (in dieser Reihenfolge):
 *   1. Personen mit passender Rolle zuerst.
 *   2. Nicht am selben Tag schon verplant zuerst (Doppelbuchung vermeiden).
 *   3. Laengste Pause in DIESER Rolle zuerst ("noch nie" = ganz oben).
 *   4. Weniger Einsaetze in der Rolle zuerst (Ausgleich).
 *   5. Name alphabetisch.
 */

export interface Vorschlag {
  person: Person;
  /** Traegt die Person die passende Rolle laut Stammdaten? */
  hatRolle: boolean;
  /** Letztes vergangenes Datum in dieser Rolle (ISO) oder null. */
  letzteInRolle: string | null;
  /** Tage seit dem letzten Einsatz in dieser Rolle (null = noch nie). */
  tageSeit: number | null;
  /** Anzahl vergangener Einsaetze in dieser Rolle. */
  anzahlRolle: number;
  /** Naechste bereits geplante eigene Beteiligung (irgendeine Rolle), ISO oder null. */
  naechsterEigenerTermin: string | null;
  /** Schon an genau diesem Tag (anderer Termin) verplant -> Doppelbuchung droht. */
  schonAmTag: boolean;
}

export interface VorschlagOptionen {
  rolle: Rollenbeteiligung;
  /** Der zu besetzende Slot – liefert Datum (fuer Doppelbuchung) und wird ausgeklammert. */
  termin: Termin;
  personen: Person[];
  termine: Termin[];
  /** Zusaetzlich auszuschliessende Person-IDs (z.B. bereits im selben Slot gesetzt). */
  ausschluss?: string[];
}

/** Wer haelt an Termin `t` die Rolle `rolle`? (Fahrdienst kann mehrere sein.) */
function rolleHalter(t: Termin, rolle: Rollenbeteiligung): string[] {
  if (rolle === 'prediger') return t.predigerId ? [t.predigerId] : [];
  if (rolle === 'einleitung') return t.einleitungId ? [t.einleitungId] : [];
  return t.fahrdienstIds ?? [];
}

/** Alle an einem Termin beteiligten Person-IDs (Prediger + Einleitung + Fahrdienst). */
function alleBeteiligten(t: Termin): string[] {
  const ids = [t.predigerId, t.einleitungId, ...(t.fahrdienstIds ?? [])];
  return ids.filter((x): x is string => !!x);
}

/** Sortierschluessel: siehe Ranking-Beschreibung oben (kleiner = weiter vorne). */
function vergleich(a: Vorschlag, b: Vorschlag): number {
  if (a.hatRolle !== b.hatRolle) return a.hatRolle ? -1 : 1;
  if (a.schonAmTag !== b.schonAmTag) return a.schonAmTag ? 1 : -1;
  const ta = a.tageSeit == null ? Infinity : a.tageSeit;
  const tb = b.tageSeit == null ? Infinity : b.tageSeit;
  if (ta !== tb) return tb - ta; // laengere Pause zuerst
  if (a.anzahlRolle !== b.anzahlRolle) return a.anzahlRolle - b.anzahlRolle;
  return a.person.name.localeCompare(b.person.name);
}

/**
 * Liefert alle aktiven Personen als gerankte Vorschlaege fuer den Slot.
 * Ein einziger Durchlauf ueber die Termine sammelt die noetigen Kennzahlen.
 */
export function vorschlaege(opt: VorschlagOptionen): Vorschlag[] {
  const { rolle, termin, personen, termine } = opt;
  const heute = heuteIso();
  const ausschluss = new Set(opt.ausschluss ?? []);

  const letzteInRolle = new Map<string, string>(); // spaetestes vergangenes Datum in der Rolle
  const anzahlRolle = new Map<string, number>();
  const naechster = new Map<string, string>();      // fruehestes zukuenftiges eigenes Datum
  const amTag = new Set<string>();                   // an termin.datum anderweitig verplant

  for (const t of termine) {
    if (t.datum <= heute) {
      for (const pid of rolleHalter(t, rolle)) {
        anzahlRolle.set(pid, (anzahlRolle.get(pid) ?? 0) + 1);
        const cur = letzteInRolle.get(pid);
        if (!cur || t.datum > cur) letzteInRolle.set(pid, t.datum);
      }
    } else {
      for (const pid of alleBeteiligten(t)) {
        const cur = naechster.get(pid);
        if (!cur || t.datum < cur) naechster.set(pid, t.datum);
      }
    }
    if (t.datum === termin.datum && t.id !== termin.id) {
      for (const pid of alleBeteiligten(t)) amTag.add(pid);
    }
  }

  const kandidaten: Vorschlag[] = personen
    .filter((p) => p.aktiv && !ausschluss.has(p.id))
    .map((p) => {
      const letzte = letzteInRolle.get(p.id) ?? null;
      return {
        person: p,
        hatRolle: p.rollen.includes(rolle),
        letzteInRolle: letzte,
        tageSeit: letzte ? tageDifferenz(letzte, heute) : null,
        anzahlRolle: anzahlRolle.get(p.id) ?? 0,
        naechsterEigenerTermin: naechster.get(p.id) ?? null,
        schonAmTag: amTag.has(p.id),
      };
    });

  kandidaten.sort(vergleich);
  return kandidaten;
}
