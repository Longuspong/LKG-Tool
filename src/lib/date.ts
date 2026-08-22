/**
 * Datums-Helfer. Intern arbeiten wir konsequent mit ISO-Datum "JJJJ-MM-TT",
 * angezeigt wird deutsch "TT.MM.JJJJ". Uhrzeiten sind "HH:MM" (24h).
 *
 * Bewusst ohne Datums-Bibliothek: wir brauchen nur wenige, klar umrissene
 * Operationen und vermeiden so eine weitere Abhaengigkeit. Alle Berechnungen
 * laufen datumsbasiert (kalendarisch), nicht ueber Zeitzonen-behaftete
 * Millisekunden – dadurch gibt es keine Off-by-one-Fehler ueber Zeitzonen.
 */

export const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WOCHENTAGE_LANG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];
export const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const ZEIT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function istIsoDatum(s: unknown): s is string {
  return typeof s === 'string' && ISO_RE.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00'));
}

export function istUhrzeit(s: unknown): s is string {
  return typeof s === 'string' && ZEIT_RE.test(s);
}

/** ISO "JJJJ-MM-TT" -> {jahr, monat(1-12), tag}. */
export function ausIso(iso: string): { jahr: number; monat: number; tag: number } {
  const [j, m, t] = iso.split('-').map(Number);
  return { jahr: j, monat: m, tag: t };
}

/** Baut ISO aus Jahr/Monat(1-12)/Tag mit Nullauffuellung. */
export function zuIso(jahr: number, monat: number, tag: number): string {
  const mm = String(monat).padStart(2, '0');
  const tt = String(tag).padStart(2, '0');
  return `${jahr}-${mm}-${tt}`;
}

/** Erzeugt ein lokales Date-Objekt zu Mitternacht des ISO-Datums. */
export function isoZuDate(iso: string): Date {
  const { jahr, monat, tag } = ausIso(iso);
  return new Date(jahr, monat - 1, tag);
}

/** Date -> ISO "JJJJ-MM-TT" (lokale Kalenderfelder, keine UTC-Verschiebung). */
export function dateZuIso(d: Date): string {
  return zuIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function heuteIso(): string {
  return dateZuIso(new Date());
}

/** Anzeige "TT.MM.JJJJ". */
export function formatDatum(iso: string): string {
  if (!istIsoDatum(iso)) return iso;
  const { jahr, monat, tag } = ausIso(iso);
  return `${String(tag).padStart(2, '0')}.${String(monat).padStart(2, '0')}.${jahr}`;
}

/** Anzeige "Mi, 15.03.2026". */
export function formatDatumMitTag(iso: string): string {
  if (!istIsoDatum(iso)) return iso;
  const d = isoZuDate(iso);
  return `${WOCHENTAGE_KURZ[d.getDay()]}, ${formatDatum(iso)}`;
}

/** Deutsches Eingabeformat "TT.MM.JJJJ" -> ISO oder null. */
export function deutschZuIso(eingabe: string): string | null {
  const m = eingabe.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const tag = Number(m[1]);
  const monat = Number(m[2]);
  const jahr = Number(m[3]);
  const iso = zuIso(jahr, monat, tag);
  return istIsoDatum(iso) ? iso : null;
}

export function wochentag(iso: string): number {
  return isoZuDate(iso).getDay();
}

/** Verschiebt ein ISO-Datum um n Tage. */
export function plusTage(iso: string, n: number): string {
  const d = isoZuDate(iso);
  d.setDate(d.getDate() + n);
  return dateZuIso(d);
}

/**
 * Ist `iso` das erste Vorkommen seines Wochentags im Monat?
 * (z.B. "erster Sonntag im Monat"). Gilt genau fuer die Tage 1-7.
 */
export function istErsterWochentagImMonat(iso: string): boolean {
  return ausIso(iso).tag <= 7;
}

// --- Quartal ---------------------------------------------------------------

export function quartalVonMonat(monat: number): number {
  return Math.floor((monat - 1) / 3) + 1; // 1..4
}

/** {start, ende} (ISO, inklusive) eines Quartals. */
export function quartalsbereich(jahr: number, quartal: number): { start: string; ende: string } {
  const startMonat = (quartal - 1) * 3 + 1;
  const endMonat = startMonat + 2;
  const start = zuIso(jahr, startMonat, 1);
  const ende = zuIso(jahr, endMonat, tageImMonat(jahr, endMonat));
  return { start, ende };
}

export function monatsbereich(jahr: number, monat: number): { start: string; ende: string } {
  return {
    start: zuIso(jahr, monat, 1),
    ende: zuIso(jahr, monat, tageImMonat(jahr, monat)),
  };
}

export function tageImMonat(jahr: number, monat: number): number {
  return new Date(jahr, monat, 0).getDate();
}

/** Alle Datumswerte (ISO) zwischen start und ende (inklusive). */
export function datumsSpanne(startIso: string, endeIso: string): string[] {
  const out: string[] = [];
  let cur = startIso;
  let guard = 0;
  while (cur <= endeIso && guard < 4000) {
    out.push(cur);
    cur = plusTage(cur, 1);
    guard++;
  }
  return out;
}

/** Ganze Tage zwischen zwei ISO-Daten (b - a). */
export function tageDifferenz(aIso: string, bIso: string): number {
  const a = isoZuDate(aIso).getTime();
  const b = isoZuDate(bIso).getTime();
  return Math.round((b - a) / 86_400_000);
}
