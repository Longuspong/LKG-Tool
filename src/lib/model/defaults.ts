import {
  DataFile,
  RegelTermin,
  Settings,
  SCHEMA_VERSION,
  STANDARD_ROLLEN,
} from './types';

/**
 * Standard-Regeltermine gemaess Absprache:
 *   - Mittwoch Bibelstunde 19:30 (woechentlich)
 *   - Sonntag Gemeinschaftsstunde: 1. Sonntag im Monat 15:00, sonst 10:00
 * Alles in den Einstellungen aenderbar.
 */
export const STANDARD_REGELTERMINE: RegelTermin[] = [
  {
    aktiv: true,
    wochentag: 0, // Sonntag
    typ: 'gemeinschaftsstunde',
    uhrzeit: '10:00',
    ersterImMonatUhrzeit: '15:00',
    ort: 'Gemeinschaftshaus',
    label: 'Gemeinschaftsstunde (So)',
  },
  {
    aktiv: true,
    wochentag: 3, // Mittwoch
    typ: 'bibelstunde',
    uhrzeit: '19:30',
    ersterImMonatUhrzeit: null,
    ort: 'Gemeinschaftshaus',
    label: 'Bibelstunde (Mi)',
  },
];

export const STANDARD_SETTINGS: Settings = {
  ort: 'Gemeinschaftshaus',
  rollen: [...STANDARD_ROLLEN],
  regelTermine: STANDARD_REGELTERMINE,
  backupErinnerungTage: 14,
  letztesBackup: null,
};

/** Frischer, leerer Datenbestand (fuer die allererste Nutzung / Reset). */
export function leeresDataFile(): DataFile {
  return {
    schema: SCHEMA_VERSION,
    version: 1,
    updatedAt: new Date().toISOString(),
    personen: [],
    termine: [],
    rotation: {
      einleitung: { reihenfolge: [], startIndex: 0 },
      fahrdienst: { reihenfolge: [], startIndex: 0 },
    },
    settings: STANDARD_SETTINGS,
  };
}
