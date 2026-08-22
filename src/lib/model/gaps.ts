import { Termin } from './types';
import { heuteIso } from '../date';

/**
 * Luecken- und Kollisionserkennung – das Herzstueck des Dashboards.
 * Ziel der App: "Ich will nichts uebersehen oder doppelt planen."
 * Alles hier wird live berechnet, nichts gespeichert.
 */

// Welche Termine brauchen welche Dienste?
// Regel: An Event-Tagen (istEvent) pausiert die Rotation -> dort keine Luecke melden.
export function brauchtPrediger(t: Termin): boolean {
  return !t.istEvent && (t.typ === 'gemeinschaftsstunde' || t.typ === 'bibelstunde');
}
export function brauchtEinleitung(t: Termin): boolean {
  return !t.istEvent && t.typ === 'gemeinschaftsstunde';
}
export function brauchtFahrdienst(t: Termin): boolean {
  return !t.istEvent && t.typ === 'gemeinschaftsstunde';
}

export interface Kollision {
  art: 'event-tag' | 'zeit-ueberschneidung' | 'person-doppelt';
  datum: string;
  beschreibung: string;
  terminIds: string[];
  personId?: string;
}

export interface DashboardLuecken {
  ohnePrediger: Termin[];
  ohneEinleitung: Termin[];
  ohneFahrdienst: Termin[];
  kontaktOffen: Termin[];
  kollisionen: Kollision[];
}

const nachDatumZeit = (a: Termin, b: Termin) =>
  a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.uhrzeit.localeCompare(b.uhrzeit);

/** Kommende Termine (heute und spaeter), chronologisch sortiert. */
export function kommendeTermine(termine: Termin[], abIso = heuteIso()): Termin[] {
  return termine.filter((t) => t.datum >= abIso).sort(nachDatumZeit);
}

export function berechneLuecken(termine: Termin[], abIso = heuteIso()): DashboardLuecken {
  const kommend = kommendeTermine(termine, abIso);

  const ohnePrediger = kommend.filter((t) => brauchtPrediger(t) && !t.predigerId);
  const ohneEinleitung = kommend.filter((t) => brauchtEinleitung(t) && !t.einleitungId);
  const ohneFahrdienst = kommend.filter(
    (t) => brauchtFahrdienst(t) && (t.fahrdienstIds?.length ?? 0) === 0,
  );
  // "Ich habe jemanden geplant, aber noch nicht kontaktiert/bestaetigt."
  const kontaktOffen = kommend.filter((t) => t.predigerId && t.kontaktStatus === 'offen');

  const kollisionen = findeKollisionen(kommend);

  return { ohnePrediger, ohneEinleitung, ohneFahrdienst, kontaktOffen, kollisionen };
}

/** Kollisionen ueber die uebergebenen Termine (i.d.R. die kommenden). */
export function findeKollisionen(termine: Termin[]): Kollision[] {
  const koll: Kollision[] = [];

  // Nach Datum gruppieren.
  const proTag = new Map<string, Termin[]>();
  for (const t of termine) {
    const arr = proTag.get(t.datum) ?? [];
    arr.push(t);
    proTag.set(t.datum, arr);
  }

  for (const [datum, tage] of proTag) {
    // (1) Termin an einem als Event markierten Tag: Event + regulärer Termin am selben Tag.
    const events = tage.filter((t) => t.istEvent || t.typ === 'event');
    const regulaer = tage.filter(
      (t) => !t.istEvent && (t.typ === 'gemeinschaftsstunde' || t.typ === 'bibelstunde'),
    );
    if (events.length > 0 && regulaer.length > 0) {
      koll.push({
        art: 'event-tag',
        datum,
        beschreibung:
          'Regulärer Termin faellt auf einen Event-Tag – Rotation sollte hier pausieren.',
        terminIds: [...events, ...regulaer].map((t) => t.id),
      });
    }

    // (2) Zeitliche Ueberschneidung: mehrere Termine zur exakt gleichen Uhrzeit.
    const proZeit = new Map<string, Termin[]>();
    for (const t of tage) {
      const arr = proZeit.get(t.uhrzeit) ?? [];
      arr.push(t);
      proZeit.set(t.uhrzeit, arr);
    }
    for (const [uhrzeit, gleich] of proZeit) {
      if (gleich.length > 1) {
        koll.push({
          art: 'zeit-ueberschneidung',
          datum,
          beschreibung: `Zwei oder mehr Termine um ${uhrzeit} Uhr.`,
          terminIds: gleich.map((t) => t.id),
        });
      }
    }

    // (3) Person doppelt am selben Tag verplant.
    const proPerson = new Map<string, Set<string>>();
    for (const t of tage) {
      const ids = [t.predigerId, t.einleitungId, ...(t.fahrdienstIds ?? [])].filter(
        (x): x is string => !!x,
      );
      for (const pid of ids) {
        const set = proPerson.get(pid) ?? new Set<string>();
        set.add(t.id);
        proPerson.set(pid, set);
      }
    }
    for (const [personId, terminSet] of proPerson) {
      if (terminSet.size > 1) {
        koll.push({
          art: 'person-doppelt',
          datum,
          beschreibung: 'Dieselbe Person ist an diesem Tag mehrfach eingeteilt.',
          terminIds: [...terminSet],
          personId,
        });
      }
    }
  }

  return koll.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

/** Gesamtzahl der offenen Punkte – fuer Badges. */
export function anzahlOffenePunkte(l: DashboardLuecken): number {
  return (
    l.ohnePrediger.length +
    l.ohneEinleitung.length +
    l.ohneFahrdienst.length +
    l.kontaktOffen.length +
    l.kollisionen.length
  );
}
