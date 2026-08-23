import { DataFile, Termin } from './types';
import { ausIso } from '../date';
import { TYP_LABEL, KONTAKT_LABEL, rolleLabel } from '../labels';

/**
 * ICS-Export (iCalendar / RFC 5545) der Termine – bewusst nur Export.
 *
 * Zweck: den Dienstplan ins normale Telefon-/PC-Kalenderprogramm holen. Die
 * App bleibt die alleinige Planungsquelle ("Single Point of Truth"), daher gibt
 * es keinen ICS-Import zurueck in den Bestand.
 *
 * Umgesetzt ohne Bibliothek. Uhrzeiten sind bewusst als *lokale, schwebende*
 * Zeit ohne Zeitzone geschrieben (DTSTART ohne "Z"/TZID) – so erscheint 10:00
 * ueberall als 10:00, ohne Sommerzeit-Verschiebungen fuer ein reines Datum.
 */

const PRODID = '-//Gemeindeplaner//DE';
const DAUER_MIN = 90; // Standard-Dauer eines Termins, falls kein Ende gepflegt ist.

/** RFC-5545-Text-Escaping fuer SUMMARY/DESCRIPTION/LOCATION. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Zeilen auf 75 Oktette falten (Fortsetzung mit fuehrendem Leerzeichen). */
function falte(zeile: string): string {
  if (zeile.length <= 75) return zeile;
  const teile: string[] = [];
  let rest = zeile;
  teile.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    teile.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) teile.push(' ' + rest);
  return teile.join('\r\n');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Lokale, schwebende Zeit "JJJJMMTTThhmmss" aus ISO-Datum + "HH:MM". */
function lokalStempel(datum: string, uhrzeit: string): string {
  const { jahr, monat, tag } = ausIso(datum);
  const [h, m] = uhrzeit.split(':').map(Number);
  return `${jahr}${pad(monat)}${pad(tag)}T${pad(h || 0)}${pad(m || 0)}00`;
}

/** Ende = Start + DAUER_MIN, ueber Date gerechnet (Mitternachtsuebergang ok). */
function endeStempel(datum: string, uhrzeit: string): string {
  const { jahr, monat, tag } = ausIso(datum);
  const [h, m] = uhrzeit.split(':').map(Number);
  const d = new Date(jahr, monat - 1, tag, h || 0, m || 0);
  d.setMinutes(d.getMinutes() + DAUER_MIN);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}00`;
}

/** UTC-Zeitstempel "JJJJMMTTThhmmssZ" fuer DTSTAMP. */
function utcStempel(d = new Date()): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function summary(data: DataFile, t: Termin): string {
  const prediger = t.predigerId
    ? data.personen.find((p) => p.id === t.predigerId)?.name
    : null;
  const basis = t.istEvent ? `${TYP_LABEL[t.typ]} (Event)` : TYP_LABEL[t.typ];
  const teile = [basis];
  if (prediger) teile.push(prediger);
  if (t.abendmahl) teile.push('Abendmahl');
  return teile.join(' – ');
}

function beschreibung(data: DataFile, t: Termin): string {
  const name = (id?: string | null) =>
    id ? data.personen.find((p) => p.id === id)?.name ?? '' : '';
  const zeilen: string[] = [];
  if (t.predigerId) zeilen.push(`${rolleLabel('prediger')}: ${name(t.predigerId)}`);
  if (t.einleitungId) zeilen.push(`${rolleLabel('einleitung')}: ${name(t.einleitungId)}`);
  const fahrer = t.fahrdienstIds.map(name).filter(Boolean);
  if (fahrer.length) zeilen.push(`${rolleLabel('fahrdienst')}: ${fahrer.join(', ')}`);
  zeilen.push(`Status: ${KONTAKT_LABEL[t.kontaktStatus]}`);
  if (t.kommentar?.trim()) zeilen.push(`Notiz: ${t.kommentar.trim()}`);
  return zeilen.join('\n');
}

/** Vollstaendiger iCalendar-Text ueber alle (oder ausgewaehlte) Termine. */
export function exportIcs(data: DataFile, termine: Termin[] = data.termine): string {
  const stamp = utcStempel();
  const zeilen: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Gemeindeplaner',
  ];

  for (const t of termine) {
    zeilen.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@gemeindeplaner`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${lokalStempel(t.datum, t.uhrzeit)}`,
      `DTEND:${endeStempel(t.datum, t.uhrzeit)}`,
      `SUMMARY:${escapeText(summary(data, t))}`,
    );
    if (t.ort?.trim()) zeilen.push(`LOCATION:${escapeText(t.ort.trim())}`);
    const desc = beschreibung(data, t);
    if (desc) zeilen.push(`DESCRIPTION:${escapeText(desc)}`);
    zeilen.push('END:VEVENT');
  }

  zeilen.push('END:VCALENDAR');
  return zeilen.map(falte).join('\r\n') + '\r\n';
}
