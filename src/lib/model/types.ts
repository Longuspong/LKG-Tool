/**
 * ===========================================================================
 *  Zentrales Datenmodell
 * ===========================================================================
 *
 *  Grundprinzip der App: EINE Datenbasis, mehrere Sichten.
 *  Kalender, Kontakt-Archiv und "offene Stunden" sind keine getrennten
 *  Datentoepfe, sondern drei Sichten auf denselben Bestand:
 *
 *    - Ein Prediger im Kalender IST ein Kontakt im Archiv (Verknuepfung ueber id).
 *    - "Wie oft war Person X da / wann zuletzt" wird aus den Terminen berechnet,
 *      nie separat gepflegt  (siehe derive.ts).
 *    - "Offene Stunden" sind einfach Termine mit status = "offen".
 *
 *  Es gibt zwei Kern-Entitaeten (Person, Termin) plus Konfiguration.
 *  Der gesamte Bestand liegt als EINE JSON-Datei (DataFile) vor.
 */

// --- Aufzaehlungstypen -----------------------------------------------------

/** Bekannte Rollen. Rollen sind als freie Liste in den Einstellungen pflegbar,
 *  daher `string`; diese Konstanten dienen nur als Vorgabe/Autocomplete. */
export const STANDARD_ROLLEN = [
  'prediger',
  'einleitung',
  'fahrdienst',
] as const;

export type TerminTyp =
  | 'gemeinschaftsstunde' // regulaerer Sonntag
  | 'bibelstunde'         // regulaerer Mittwoch
  | 'event'               // Sondertag; reguläre Rotation pausiert
  | 'sonstiges';

export const TERMIN_TYPEN: TerminTyp[] = [
  'gemeinschaftsstunde',
  'bibelstunde',
  'event',
  'sonstiges',
];

/** Besetzungs-Status eines Termins (Kernsteuerung fuer "offene Stunden"). */
export type TerminStatus = 'offen' | 'besetzt' | 'bestaetigt';
export const TERMIN_STATUS: TerminStatus[] = ['offen', 'besetzt', 'bestaetigt'];

/** Fortschritt im Kontakt-Workflow eines Dienstes. */
export type KontaktStatus = 'offen' | 'kontaktiert' | 'bestaetigt' | 'abgesagt';
export const KONTAKT_STATUS: KontaktStatus[] = [
  'offen',
  'kontaktiert',
  'bestaetigt',
  'abgesagt',
];

// --- Kern-Entitaeten -------------------------------------------------------

/** Person / Kontakt. Ersetzt das Telefonbuch. */
export interface Person {
  id: string;            // z.B. "p_001"
  name: string;          // Pflichtfeld
  dienstnummer?: number | null;
  email?: string;
  telefon?: string;
  rollen: string[];      // z.B. ["prediger","fahrdienst"]
  notiz?: string;
  aktiv: boolean;        // deaktivierte Kontakte bleiben fuer die Historie erhalten
}

/** Ein echter Termin. Freie Tage werden NICHT gespeichert. */
export interface Termin {
  id: string;            // z.B. "t_20260315_0930"
  datum: string;         // ISO: "JJJJ-MM-TT"
  uhrzeit: string;       // "HH:MM" (24h)
  ort: string;
  typ: TerminTyp;
  predigerId?: string | null;    // -> Person.id
  abendmahl: boolean;
  einleitungId?: string | null;  // -> Person.id
  fahrdienstIds: string[];       // -> Person.id[]
  kommentar?: string;
  istEvent: boolean;             // true = Sondertag, reguläre Rotation pausiert
  status: TerminStatus;
  kontaktStatus: KontaktStatus;
}

// --- Konfiguration ---------------------------------------------------------

/** Reihenfolge einer Rotation (Einleitung bzw. Fahrdienst). */
export interface RotationsReihe {
  reihenfolge: string[]; // Person.id[]
  startIndex: number;
}

export interface RotationsConfig {
  einleitung: RotationsReihe;
  fahrdienst: RotationsReihe;
}

/** Vorgabe fuer eine wiederkehrende Terminart (Skelett-Generator). */
export interface RegelTermin {
  aktiv: boolean;
  /** 0 = Sonntag ... 6 = Samstag (wie Date.getDay()). */
  wochentag: number;
  typ: TerminTyp;
  uhrzeit: string;                 // Standard-Uhrzeit "HH:MM"
  /** Sonderregel: am 1. Vorkommen des Wochentags im Monat abweichende Zeit. */
  ersterImMonatUhrzeit?: string | null;
  ort: string;
  label: string;                   // Anzeigename, z.B. "Gemeinschaftsstunde (So)"
}

export interface Settings {
  ort: string;                     // Standard-Ort fuer neue Termine
  rollen: string[];                // pflegbare Rollen-Liste
  regelTermine: RegelTermin[];     // Vorgaben fuer den Slot-Generator
  /** Warnschwelle in Tagen fuer die Backup-Erinnerung. */
  backupErinnerungTage: number;
  /** Zeitpunkt des letzten manuellen JSON-Backups (ISO), oder null. */
  letztesBackup: string | null;
}

// --- Wurzel-Dokument -------------------------------------------------------

/**
 * Der gesamte Datenbestand als EINE JSON-Datei ("Single Point of Truth").
 * `version` + `updatedAt` steuern die Optimistic Concurrency zwischen den
 * (maximal zwei) Geraeten.
 */
export interface DataFile {
  schema: number;        // Schema-Version dieses Formats (fuer spaetere Migration)
  version: number;       // monotone Datenversion (Optimistic Concurrency)
  updatedAt: string;     // ISO-Zeitstempel des letzten Schreibens
  personen: Person[];
  termine: Termin[];
  rotation: RotationsConfig;
  settings: Settings;
}

export const SCHEMA_VERSION = 1;
