import { RegelTermin, Termin } from './types';
import {
  datumsSpanne,
  istErsterWochentagImMonat,
  wochentag,
} from '../date';
import { terminId } from './ids';

/**
 * Generator fuer wiederkehrende Skelett-Termine (status: "offen").
 * Erzeugt fuer einen Zeitraum die regulaeren Slots gemaess Regeltermin-Config.
 * Diese leeren Slots tauchen dann automatisch als offene To-dos auf.
 *
 * Wichtige Regeln:
 *   - Es werden nur AKTIVE Regeltermine beruecksichtigt.
 *   - Existiert am Datum bereits ein Termin desselben Typs, wird uebersprungen
 *     (kein Duplikat).
 *   - Existiert am Datum ein Event/istEvent-Termin, wird uebersprungen
 *     (Rotation pausiert an Event-Tagen).
 *   - "Erster Wochentag im Monat" kann eine abweichende Uhrzeit haben
 *     (z.B. 1. Sonntag 15:00 statt 10:00).
 */

export interface GeneratorErgebnis {
  neue: Termin[];
  uebersprungenVorhanden: number; // schon ein Termin desselben Typs vorhanden
  uebersprungenEvent: number;     // Event-Tag, daher ausgelassen
}

export function generiereSlots(
  vonIso: string,
  bisIso: string,
  regelTermine: RegelTermin[],
  vorhandene: Termin[],
): GeneratorErgebnis {
  const aktive = regelTermine.filter((r) => r.aktiv);
  const neue: Termin[] = [];
  let uebersprungenVorhanden = 0;
  let uebersprungenEvent = 0;

  // Schnelle Lookups auf den Bestand.
  const vorhandenTypProTag = new Set<string>(); // "datum|typ"
  const eventTage = new Set<string>();           // datum mit Event/istEvent
  for (const t of vorhandene) {
    vorhandenTypProTag.add(`${t.datum}|${t.typ}`);
    if (t.istEvent || t.typ === 'event') eventTage.add(t.datum);
  }

  for (const datum of datumsSpanne(vonIso, bisIso)) {
    if (eventTage.has(datum)) {
      // Wir zaehlen pro betroffenem Regeltermin, damit die Statistik stimmt.
      for (const r of aktive) if (r.wochentag === wochentag(datum)) uebersprungenEvent++;
      continue;
    }
    for (const r of aktive) {
      if (r.wochentag !== wochentag(datum)) continue;
      if (vorhandenTypProTag.has(`${datum}|${r.typ}`)) {
        uebersprungenVorhanden++;
        continue;
      }
      const uhrzeit =
        r.ersterImMonatUhrzeit && istErsterWochentagImMonat(datum)
          ? r.ersterImMonatUhrzeit
          : r.uhrzeit;

      const t: Termin = {
        id: terminId(datum, uhrzeit, [...vorhandene, ...neue]),
        datum,
        uhrzeit,
        ort: r.ort,
        typ: r.typ,
        predigerId: null,
        abendmahl: false,
        einleitungId: null,
        fahrdienstIds: [],
        kommentar: '',
        istEvent: false,
        status: 'offen',
        kontaktStatus: 'offen',
      };
      neue.push(t);
      vorhandenTypProTag.add(`${datum}|${r.typ}`);
    }
  }

  return { neue, uebersprungenVorhanden, uebersprungenEvent };
}
