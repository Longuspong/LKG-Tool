import { DataFile, Person, Termin } from './types';
import { naechstePersonId } from './ids';
import { formatDatum, formatDatumMitTag, WOCHENTAGE_KURZ, wochentag } from '../date';
import { TYP_LABEL, KONTAKT_LABEL, STATUS_LABEL, rolleLabel } from '../labels';

/**
 * CSV-Aus- und -Einfuhr (Phase 5).
 *
 * Grundhaltung wie im ganzen Projekt: schlank, abhaengigkeitsfrei und robust.
 * - EXPORT nutzt das Semikolon als Trenner und ein UTF-8-BOM (siehe download.ts),
 *   damit deutsches Excel die Datei ohne Nachfrage korrekt oeffnet.
 * - IMPORT erkennt den Trenner selbst (`;`, `,` oder Tab) und versteht in Anfuehrungs-
 *   zeichen stehende Felder mit eingebettetem Trenner/Zeilenumbruch.
 *
 * Importiert werden nur PERSONEN (Kontaktliste) – das ist der realistische Fall
 * ("meine Telefonliste einlesen"). Termine sind Planungsartefakte dieser App und
 * werden nicht aus fremden CSVs erzeugt; dafuer gibt es JSON-Backup und ICS-Export.
 */

// ===========================================================================
//  Generischer CSV-Kern
// ===========================================================================

/** Ein Feld quoten, falls es Trenner, Anfuehrungszeichen oder Umbruch enthaelt. */
function feldQuoten(wert: string, trenner: string): string {
  if (wert.includes(trenner) || wert.includes('"') || /[\r\n]/.test(wert)) {
    return `"${wert.replace(/"/g, '""')}"`;
  }
  return wert;
}

/** Zeilen (Array von Feldern) zu einem CSV-Text (CRLF, RFC-4180-konform). */
export function serialisiereCsv(zeilen: string[][], trenner = ';'): string {
  return zeilen
    .map((zeile) => zeile.map((f) => feldQuoten(f ?? '', trenner)).join(trenner))
    .join('\r\n');
}

/** Trenner anhand der ersten (nicht leeren) Zeile schaetzen. */
function erkenneTrenner(text: string): string {
  const kopf = text.split(/\r?\n/).find((z) => z.trim().length > 0) ?? '';
  const kandidaten: [string, number][] = [
    [';', (kopf.match(/;/g) || []).length],
    [',', (kopf.match(/,/g) || []).length],
    ['\t', (kopf.match(/\t/g) || []).length],
  ];
  kandidaten.sort((a, b) => b[1] - a[1]);
  return kandidaten[0][1] > 0 ? kandidaten[0][0] : ';';
}

/**
 * CSV-Text zu Zeilen parsen. Beruecksichtigt gequotete Felder mit eingebettetem
 * Trenner, Zeilenumbruch und verdoppelten Anfuehrungszeichen. Ein fuehrendes
 * BOM wird entfernt. Voellig leere Zeilen fallen weg.
 */
export function parseCsv(text: string, trennerVorgabe?: string): string[][] {
  const rein = text.replace(/^﻿/, '');
  const trenner = trennerVorgabe ?? erkenneTrenner(rein);
  const zeilen: string[][] = [];
  let feld = '';
  let zeile: string[] = [];
  let inQuote = false;

  for (let i = 0; i < rein.length; i++) {
    const c = rein[i];
    if (inQuote) {
      if (c === '"') {
        if (rein[i + 1] === '"') {
          feld += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        feld += c;
      }
      continue;
    }
    if (c === '"') {
      inQuote = true;
    } else if (c === trenner) {
      zeile.push(feld);
      feld = '';
    } else if (c === '\n') {
      zeile.push(feld);
      zeilen.push(zeile);
      feld = '';
      zeile = [];
    } else if (c === '\r') {
      // Umbruch wird am \n behandelt; \r ignorieren.
    } else {
      feld += c;
    }
  }
  // Rest (letzte Zeile ohne abschliessenden Umbruch).
  if (feld.length > 0 || zeile.length > 0) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen.filter((z) => z.some((f) => f.trim().length > 0));
}

// ===========================================================================
//  Domaenen-Export
// ===========================================================================

function nameVon(data: DataFile, id?: string | null): string {
  if (!id) return '';
  return data.personen.find((p) => p.id === id)?.name ?? '?';
}

/** Termine als CSV-Tabelle (fuer Tabellenkalkulation / Uebersicht). */
export function termineCsv(data: DataFile): string {
  const kopf = [
    'Datum',
    'Wochentag',
    'Uhrzeit',
    'Anlass',
    'Ort',
    'Abendmahl',
    'Prediger',
    'Einleitung',
    'Fahrdienst',
    'Status',
    'Kontakt',
    'Kommentar',
  ];
  const termine = [...data.termine].sort((a, b) =>
    (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit),
  );
  const zeilen = termine.map((t) => [
    formatDatum(t.datum),
    WOCHENTAGE_KURZ[wochentag(t.datum)] ?? '',
    t.uhrzeit,
    t.istEvent ? `${TYP_LABEL[t.typ]} (Event)` : TYP_LABEL[t.typ],
    t.ort,
    t.abendmahl ? 'ja' : '',
    nameVon(data, t.predigerId),
    nameVon(data, t.einleitungId),
    t.fahrdienstIds.map((id) => nameVon(data, id)).filter(Boolean).join(', '),
    STATUS_LABEL[t.status],
    KONTAKT_LABEL[t.kontaktStatus],
    (t.kommentar ?? '').replace(/\s*\n\s*/g, ' '),
  ]);
  return serialisiereCsv([kopf, ...zeilen]);
}

/** Personen (Kontaktliste) als CSV. Die Kopfzeile passt zum Import unten. */
export function personenCsv(data: DataFile): string {
  const kopf = ['Name', 'Dienstnummer', 'Telefon', 'E-Mail', 'Rollen', 'Aktiv', 'Notiz'];
  const zeilen = [...data.personen]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => [
      p.name,
      p.dienstnummer != null ? String(p.dienstnummer) : '',
      p.telefon ?? '',
      p.email ?? '',
      p.rollen.map(rolleLabel).join(', '),
      p.aktiv ? 'ja' : 'nein',
      (p.notiz ?? '').replace(/\s*\n\s*/g, ' '),
    ]);
  return serialisiereCsv([kopf, ...zeilen]);
}

// ===========================================================================
//  Personen-Import (CSV -> Personen, additiv mit Zusammenfuehrung)
// ===========================================================================

/** Bekannte Spalten-Ueberschriften (klein geschrieben) je Feld. */
const SPALTEN: Record<string, string[]> = {
  name: ['name', 'vorname name', 'kontakt'],
  dienstnummer: ['dienstnummer', 'dienst-nr', 'dienstnr', 'dienst nr', 'nr', 'nummer'],
  telefon: ['telefon', 'tel', 'telefonnummer', 'handy', 'mobil', 'mobiltelefon'],
  email: ['e-mail', 'email', 'mail', 'e mail'],
  rollen: ['rollen', 'rolle', 'dienste'],
  aktiv: ['aktiv', 'active'],
  notiz: ['notiz', 'notizen', 'bemerkung', 'bemerkungen', 'kommentar'],
};

/** Ordnet die Kopfzeile den bekannten Feldern zu (Feld -> Spaltenindex). */
function ordneSpalten(kopf: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  kopf.forEach((roh, idx) => {
    const norm = roh.trim().toLowerCase();
    for (const [feld, namen] of Object.entries(SPALTEN)) {
      if (map[feld] === undefined && namen.includes(norm)) map[feld] = idx;
    }
  });
  return map;
}

function parseAktiv(wert: string | undefined): boolean {
  const v = (wert ?? '').trim().toLowerCase();
  if (v === '') return true;
  return !['nein', 'no', 'false', '0', 'inaktiv', 'x'].includes(v);
}

function parseRollen(wert: string | undefined): string[] {
  if (!wert) return [];
  return wert
    .split(/[,/|;]+/)
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
}

function parseDienstnummer(wert: string | undefined): number | null {
  const v = (wert ?? '').trim();
  if (v === '') return null;
  const n = Number(v.replace(/[^\d-]/g, ''));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export interface PersonenImportErgebnis {
  /** Vollstaendige neue Personen-Liste (bestehende + neue/aktualisierte). */
  personen: Person[];
  neu: number;
  aktualisiert: number;
  fehler: string[];
  warnungen: string[];
}

/**
 * Liest Personen aus CSV und fuehrt sie additiv mit dem Bestand zusammen.
 * - Zuordnung bestehender Kontakte: bevorzugt ueber die Dienstnummer, sonst ueber
 *   den (klein geschriebenen) Namen. So werden Duplikate vermieden.
 * - Es werden nur Spalten uebernommen, die in der Kopfzeile vorkommen – fehlende
 *   Spalten ueberschreiben also keine bestehenden Werte.
 * - Personen werden NIE geloescht (die abgeleitete Historie bliebe sonst kaputt).
 */
export function importPersonenCsv(text: string, bestand: Person[]): PersonenImportErgebnis {
  const fehler: string[] = [];
  const warnungen: string[] = [];
  const zeilen = parseCsv(text);
  if (zeilen.length === 0) {
    return { personen: bestand, neu: 0, aktualisiert: 0, fehler: ['Die Datei ist leer.'], warnungen };
  }

  const spalten = ordneSpalten(zeilen[0]);
  if (spalten.name === undefined) {
    return {
      personen: bestand,
      neu: 0,
      aktualisiert: 0,
      fehler: ['Keine Spalte "Name" gefunden. Die erste Zeile muss die Spaltennamen enthalten.'],
      warnungen,
    };
  }

  // Auf einer Arbeitskopie aufsetzen, damit IDs fortlaufend vergeben werden.
  const ergebnis: Person[] = bestand.map((p) => ({ ...p }));
  const hat = (feld: string) => spalten[feld] !== undefined;
  const zelle = (zeile: string[], feld: string) =>
    hat(feld) ? (zeile[spalten[feld]] ?? '').trim() : undefined;

  let neu = 0;
  let aktualisiert = 0;

  for (let i = 1; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    const name = (zeile[spalten.name] ?? '').trim();
    if (!name) {
      warnungen.push(`Zeile ${i + 1}: ohne Name – uebersprungen.`);
      continue;
    }
    const dienstnummer = parseDienstnummer(zelle(zeile, 'dienstnummer'));

    // Bestehenden Kontakt finden (erst Dienstnummer, dann Name).
    let treffer = -1;
    if (dienstnummer != null) {
      treffer = ergebnis.findIndex((p) => p.dienstnummer != null && p.dienstnummer === dienstnummer);
    }
    if (treffer < 0) {
      treffer = ergebnis.findIndex((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    }

    // Nur vorhandene Spalten anwenden (fehlende Spalten wirken nicht loeschend).
    const felder: Partial<Person> = { name };
    if (hat('dienstnummer')) felder.dienstnummer = dienstnummer;
    if (hat('telefon')) felder.telefon = zelle(zeile, 'telefon') || '';
    if (hat('email')) felder.email = zelle(zeile, 'email') || '';
    if (hat('rollen')) felder.rollen = parseRollen(zelle(zeile, 'rollen'));
    if (hat('aktiv')) felder.aktiv = parseAktiv(zelle(zeile, 'aktiv'));
    if (hat('notiz')) felder.notiz = zelle(zeile, 'notiz') || '';

    const email = felder.email;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      warnungen.push(`Zeile ${i + 1} (${name}): E-Mail sieht ungueltig aus (${email}).`);
    }

    if (treffer >= 0) {
      ergebnis[treffer] = { ...ergebnis[treffer], ...felder };
      aktualisiert++;
    } else {
      const id = naechstePersonId(ergebnis);
      ergebnis.push({
        id,
        name,
        dienstnummer: felder.dienstnummer ?? null,
        email: felder.email ?? '',
        telefon: felder.telefon ?? '',
        rollen: felder.rollen ?? [],
        notiz: felder.notiz ?? '',
        aktiv: felder.aktiv ?? true,
      });
      neu++;
    }
  }

  if (neu === 0 && aktualisiert === 0) {
    fehler.push('Keine verwertbaren Zeilen gefunden.');
  }
  return { personen: ergebnis, neu, aktualisiert, fehler, warnungen };
}

/** Kurzer Vorschautext fuer eine einzelne Termin-Zeile (Debug/Anzeige). */
export function terminKurz(data: DataFile, t: Termin): string {
  return `${formatDatumMitTag(t.datum)} ${t.uhrzeit} – ${nameVon(data, t.predigerId) || 'kein Prediger'}`;
}
