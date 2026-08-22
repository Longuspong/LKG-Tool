import { Person, Termin } from './types';
import { heuteIso, tageDifferenz } from '../date';

/**
 * Abgeleitete Felder – NIE gespeichert, immer live aus den Terminen berechnet.
 * Das ist der Kern des Grundprinzips "eine Datenbasis, mehrere Sichten":
 * Besuchszahlen driften nie auseinander, weil sie kein eigener Datentopf sind.
 *
 * "Beteiligung" an einem Termin = die Person ist Prediger ODER Einleitung ODER
 * im Fahrdienst. Ein Termin zaehlt als "Besuch", sobald sein Datum <= heute ist.
 */

export type Rollenbeteiligung = 'prediger' | 'einleitung' | 'fahrdienst';

export interface TerminBeteiligung {
  terminId: string;
  datum: string;
  rollen: Rollenbeteiligung[];
}

export interface PersonHistorie {
  anzahlBesuche: number;
  letzterBesuch: string | null;              // ISO, oder null
  letzteDreiBesuche: TerminBeteiligung[];    // absteigend nach Datum
  naechsterTermin: string | null;            // naechster zukuenftiger Termin (ISO)
  proRolle: Record<Rollenbeteiligung, number>; // Zaehler je Rolle (nur Vergangenheit)
}

/** Rollen, in denen `personId` an einem Termin beteiligt ist. */
export function beteiligungAn(t: Termin, personId: string): Rollenbeteiligung[] {
  const rollen: Rollenbeteiligung[] = [];
  if (t.predigerId === personId) rollen.push('prediger');
  if (t.einleitungId === personId) rollen.push('einleitung');
  if (t.fahrdienstIds?.includes(personId)) rollen.push('fahrdienst');
  return rollen;
}

/** Berechnet die Historie einer Person aus allen Terminen. */
export function historieFuer(personId: string, termine: Termin[]): PersonHistorie {
  const heute = heuteIso();
  const beteiligungen: TerminBeteiligung[] = [];
  let naechster: string | null = null;

  for (const t of termine) {
    const rollen = beteiligungAn(t, personId);
    if (rollen.length === 0) continue;
    if (t.datum <= heute) {
      beteiligungen.push({ terminId: t.id, datum: t.datum, rollen });
    } else if (naechster === null || t.datum < naechster) {
      naechster = t.datum;
    }
  }

  beteiligungen.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));

  const proRolle: Record<Rollenbeteiligung, number> = {
    prediger: 0,
    einleitung: 0,
    fahrdienst: 0,
  };
  for (const b of beteiligungen) {
    for (const r of b.rollen) proRolle[r] += 1;
  }

  return {
    anzahlBesuche: beteiligungen.length,
    letzterBesuch: beteiligungen[0]?.datum ?? null,
    letzteDreiBesuche: beteiligungen.slice(0, 3),
    naechsterTermin: naechster,
    proRolle,
  };
}

/** Historie fuer alle Personen auf einmal (effizient in einem Durchlauf). */
export function historieAlle(
  personen: Person[],
  termine: Termin[],
): Map<string, PersonHistorie> {
  const out = new Map<string, PersonHistorie>();
  for (const p of personen) out.set(p.id, historieFuer(p.id, termine));
  return out;
}

/**
 * Volles Archiv einer Person fuer die Detail-Sicht (Phase 3): die KOMPLETTE
 * chronologische Beteiligungsliste, getrennt in Vergangenheit (absteigend) und
 * Zukunft (aufsteigend), plus die schon in `historieFuer` bekannten Kennzahlen.
 * Bewusst eine eigene Funktion, damit die schlanke Listen-Historie
 * (`historieAlle`) nicht unnoetig alle Beteiligungen mitschleppt.
 */
export interface PersonArchiv {
  anzahlBesuche: number;
  letzterBesuch: string | null;
  naechsterTermin: string | null;
  /** Ganze Tage seit dem letzten Besuch (0 = heute), oder null wenn nie da. */
  tageSeitLetztem: number | null;
  proRolle: Record<Rollenbeteiligung, number>;
  vergangene: TerminBeteiligung[]; // absteigend nach Datum (neueste zuerst)
  kommende: TerminBeteiligung[];   // aufsteigend nach Datum (naechste zuerst)
}

export function archivFuer(personId: string, termine: Termin[]): PersonArchiv {
  const heute = heuteIso();
  const vergangene: TerminBeteiligung[] = [];
  const kommende: TerminBeteiligung[] = [];

  for (const t of termine) {
    const rollen = beteiligungAn(t, personId);
    if (rollen.length === 0) continue;
    const eintrag: TerminBeteiligung = { terminId: t.id, datum: t.datum, rollen };
    if (t.datum <= heute) vergangene.push(eintrag);
    else kommende.push(eintrag);
  }

  vergangene.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
  kommende.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

  const proRolle: Record<Rollenbeteiligung, number> = {
    prediger: 0,
    einleitung: 0,
    fahrdienst: 0,
  };
  for (const b of vergangene) {
    for (const r of b.rollen) proRolle[r] += 1;
  }

  const letzterBesuch = vergangene[0]?.datum ?? null;
  return {
    anzahlBesuche: vergangene.length,
    letzterBesuch,
    naechsterTermin: kommende[0]?.datum ?? null,
    tageSeitLetztem: letzterBesuch ? tageDifferenz(letzterBesuch, heute) : null,
    proRolle,
    vergangene,
    kommende,
  };
}
