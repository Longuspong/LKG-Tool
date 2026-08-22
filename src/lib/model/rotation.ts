import { DataFile, Person, RotationsReihe, Termin } from './types';
import { brauchtEinleitung, brauchtFahrdienst } from './gaps';

/**
 * ===========================================================================
 *  Rotations-Engine (Phase 2)
 * ===========================================================================
 *
 *  Verteilt die wiederkehrenden Dienste "Einleitung" und "Fahrdienst"
 *  reihum auf die Gemeinschaftsstunden. Zwei Kernanforderungen:
 *
 *    - Event-Pausierung: An Event-Tagen (istEvent) pausiert die Rotation.
 *      Solche Slots brauchen keinen Dienst (siehe gaps.ts) und tauchen daher
 *      gar nicht erst als betroffene Slots auf – die Reihenfolge "wartet".
 *    - Manueller Tausch: In der Vorschau kann jede einzelne Zuweisung von Hand
 *      geaendert werden, bevor sie festgeschrieben wird.
 *
 *  Bewusste Design-Entscheidung – *positionsbasiert statt Zeiger*:
 *  Wer an einem Slot "dran" ist, ergibt sich deterministisch aus der
 *  chronologischen Position des Slots unter ALLEN betroffenen Slots des
 *  Bestands:
 *
 *      person = reihenfolge[(startIndex + position) % n]
 *
 *  Vorteile: Die Berechnung ist idempotent (mehrfaches Planen desselben
 *  Zeitraums liefert dasselbe Ergebnis, es "driftet" nichts), die Fortsetzung
 *  ueber Quartalsgrenzen ergibt sich von selbst, und Event-Tage verschieben
 *  die Zaehlung nicht (sie sind keine betroffenen Slots). `startIndex` legt
 *  fest, mit wem die Rotation ganz vorne beginnt.
 */

export type RotationsRolle = 'einleitung' | 'fahrdienst';

export const ROTATIONS_ROLLEN: RotationsRolle[] = ['einleitung', 'fahrdienst'];

/** Nur bestehende Luecken fuellen, oder den ganzen Zeitraum neu verteilen. */
export type RotationsModus = 'nurLuecken' | 'alle';

export interface RotationsZuweisung {
  terminId: string;
  datum: string;
  uhrzeit: string;
  vorherId: string | null; // aktuelle Belegung des Slots
  neuId: string | null;    // vorgeschlagene (bzw. manuell geaenderte) Belegung
  /** true = im Modus "nur Luecken" bereits belegt und daher unangetastet. */
  uebersprungen: boolean;
}

export interface RotationsPlan {
  rolle: RotationsRolle;
  /** Effektiv verwendete Reihenfolge (existierende, aktive Personen, dedupliziert). */
  reihenfolge: string[];
  zuweisungen: RotationsZuweisung[];
  /** Gemeinschaftsstunden im Zeitraum, die als Event pausiert wurden. */
  pausiert: number;
  warnungen: string[];
}

const chrono = (a: Termin, b: Termin) =>
  a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.uhrzeit.localeCompare(b.uhrzeit);

/** Braucht dieser Termin fuer die Rolle einen rotierten Dienst? */
export function betrifftSlot(rolle: RotationsRolle, t: Termin): boolean {
  return rolle === 'einleitung' ? brauchtEinleitung(t) : brauchtFahrdienst(t);
}

/** Aktuelle Belegung eines Slots fuer die Rolle (Fahrdienst = erster Fahrer). */
export function aktuelleBelegung(rolle: RotationsRolle, t: Termin): string | null {
  if (rolle === 'einleitung') return t.einleitungId ?? null;
  return t.fahrdienstIds?.[0] ?? null;
}

/** Schreibt eine neue Belegung in den Termin (Fahrdienst behaelt Zusatzfahrer). */
export function setzeBelegung(
  rolle: RotationsRolle,
  t: Termin,
  neuId: string | null,
  vorherId: string | null,
): void {
  if (rolle === 'einleitung') {
    t.einleitungId = neuId;
    return;
  }
  // Fahrdienst: nur den rotierten Fahrer (Position 0) austauschen, evtl.
  // manuell ergaenzte Zusatzfahrer bleiben erhalten.
  const rest = (t.fahrdienstIds ?? []).filter((id) => id !== neuId && id !== vorherId);
  t.fahrdienstIds = neuId ? [neuId, ...rest] : rest;
}

/** Reihenfolge auf existierende, aktive Personen reduzieren (dedupliziert). */
export function effektiveReihenfolge(reihe: RotationsReihe, personen: Person[]): string[] {
  const aktiv = new Set(personen.filter((p) => p.aktiv).map((p) => p.id));
  const gesehen = new Set<string>();
  const out: string[] = [];
  for (const id of reihe.reihenfolge) {
    if (aktiv.has(id) && !gesehen.has(id)) {
      out.push(id);
      gesehen.add(id);
    }
  }
  return out;
}

export interface PlaneOptionen {
  rolle: RotationsRolle;
  reihe: RotationsReihe;
  personen: Person[];
  termine: Termin[];
  von: string; // ISO, inklusive
  bis: string; // ISO, inklusive
  modus: RotationsModus;
}

/**
 * Erzeugt den Vorschlags-Plan fuer einen Zeitraum. Aendert nichts – das
 * Festschreiben passiert getrennt ueber `wendeRotationAn`.
 */
export function planeRotation(opt: PlaneOptionen): RotationsPlan {
  const { rolle, reihe, personen, termine, von, bis, modus } = opt;
  const warnungen: string[] = [];
  const reihenfolge = effektiveReihenfolge(reihe, personen);
  const n = reihenfolge.length;

  if (n === 0) {
    warnungen.push(
      'Keine (aktiven) Personen in der Reihenfolge – bitte in den Einstellungen festlegen.',
    );
  }

  // Alle betroffenen Slots des gesamten Bestands, chronologisch. Events sind
  // ausgeschlossen (Event-Pausierung) und verschieben die Zaehlung nicht.
  const alle = termine.filter((t) => betrifftSlot(rolle, t)).sort(chrono);
  const position = new Map<string, number>();
  alle.forEach((t, i) => position.set(t.id, i));

  // Als Event pausierte Gemeinschaftsstunden im Zeitraum (nur zur Anzeige).
  let pausiert = 0;
  for (const t of termine) {
    if (t.datum < von || t.datum > bis) continue;
    if (t.typ === 'gemeinschaftsstunde' && t.istEvent) pausiert++;
  }

  const zuweisungen: RotationsZuweisung[] = [];
  for (const t of alle) {
    if (t.datum < von || t.datum > bis) continue;
    const vorher = aktuelleBelegung(rolle, t);

    if (n === 0 || (modus === 'nurLuecken' && vorher)) {
      zuweisungen.push({
        terminId: t.id,
        datum: t.datum,
        uhrzeit: t.uhrzeit,
        vorherId: vorher,
        neuId: vorher,
        uebersprungen: true,
      });
      continue;
    }

    const p = position.get(t.id) ?? 0;
    const turn = (((reihe.startIndex + p) % n) + n) % n;
    zuweisungen.push({
      terminId: t.id,
      datum: t.datum,
      uhrzeit: t.uhrzeit,
      vorherId: vorher,
      neuId: reihenfolge[turn],
      uebersprungen: false,
    });
  }

  return { rolle, reihenfolge, zuweisungen, pausiert, warnungen };
}

export interface AnwendungsErgebnis {
  gesetzt: number;
  unveraendert: number;
  uebersprungen: number;
}

/**
 * Schreibt die Zuweisungen in `d.termine` (mutierend – fuer den `aendern`-Pfad
 * des Stores gedacht). Uebersprungene und unveraenderte Slots bleiben, wie sie
 * sind.
 */
export function wendeRotationAn(
  rolle: RotationsRolle,
  zuweisungen: RotationsZuweisung[],
  d: DataFile,
): AnwendungsErgebnis {
  let gesetzt = 0;
  let unveraendert = 0;
  let uebersprungen = 0;
  const byId = new Map(d.termine.map((t) => [t.id, t] as const));

  for (const z of zuweisungen) {
    if (z.uebersprungen) {
      uebersprungen++;
      continue;
    }
    if (z.neuId === z.vorherId) {
      unveraendert++;
      continue;
    }
    const t = byId.get(z.terminId);
    if (!t) continue;
    setzeBelegung(rolle, t, z.neuId, z.vorherId);
    gesetzt++;
  }

  return { gesetzt, unveraendert, uebersprungen };
}
