import {
  DataFile,
  KONTAKT_STATUS,
  Person,
  TERMIN_STATUS,
  TERMIN_TYPEN,
  Termin,
} from './types';
import { istIsoDatum, istUhrzeit } from '../date';

/**
 * Einfache, aber wirksame Validierungen: Pflichtfelder, Datums-/Zeitformat und
 * referenzielle Integritaet (verweisen predigerId & Co. auf existierende
 * Personen?). Wir liefern Fehler (blockierend) und Warnungen (Hinweis) getrennt.
 */

export interface Pruefergebnis {
  ok: boolean;
  fehler: string[];
  warnungen: string[];
}

export function validatePerson(p: Person): string[] {
  const f: string[] = [];
  if (!p.id || !/^p_\d+/.test(p.id)) f.push(`Person hat ungueltige id: ${p.id}`);
  if (!p.name || !p.name.trim()) f.push(`Person ${p.id}: Name ist Pflicht.`);
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) {
    f.push(`Person ${p.id}: E-Mail sieht ungueltig aus (${p.email}).`);
  }
  if (p.dienstnummer != null && (!Number.isInteger(p.dienstnummer) || p.dienstnummer < 0)) {
    f.push(`Person ${p.id}: Dienstnummer muss eine positive Ganzzahl sein.`);
  }
  return f;
}

export function validateTermin(t: Termin, personIds: Set<string>): string[] {
  const f: string[] = [];
  if (!t.id) f.push('Termin ohne id.');
  if (!istIsoDatum(t.datum)) f.push(`Termin ${t.id}: Datum nicht im Format JJJJ-MM-TT (${t.datum}).`);
  if (!istUhrzeit(t.uhrzeit)) f.push(`Termin ${t.id}: Uhrzeit nicht im Format HH:MM (${t.uhrzeit}).`);
  if (!TERMIN_TYPEN.includes(t.typ)) f.push(`Termin ${t.id}: unbekannter Typ "${t.typ}".`);
  if (!TERMIN_STATUS.includes(t.status)) f.push(`Termin ${t.id}: unbekannter Status "${t.status}".`);
  if (!KONTAKT_STATUS.includes(t.kontaktStatus)) {
    f.push(`Termin ${t.id}: unbekannter Kontakt-Status "${t.kontaktStatus}".`);
  }
  // Referenzielle Integritaet.
  if (t.predigerId && !personIds.has(t.predigerId)) {
    f.push(`Termin ${t.id}: predigerId "${t.predigerId}" verweist auf keine Person.`);
  }
  if (t.einleitungId && !personIds.has(t.einleitungId)) {
    f.push(`Termin ${t.id}: einleitungId "${t.einleitungId}" verweist auf keine Person.`);
  }
  for (const fid of t.fahrdienstIds ?? []) {
    if (!personIds.has(fid)) {
      f.push(`Termin ${t.id}: fahrdienstId "${fid}" verweist auf keine Person.`);
    }
  }
  return f;
}

export function validateDataFile(data: DataFile): Pruefergebnis {
  const fehler: string[] = [];
  const warnungen: string[] = [];

  if (typeof data.version !== 'number' || data.version < 1) {
    fehler.push('Feld "version" fehlt oder ist ungueltig.');
  }
  if (!istIsoDatum((data.updatedAt || '').slice(0, 10))) {
    warnungen.push('Feld "updatedAt" ist kein plausibler Zeitstempel.');
  }

  const personIds = new Set<string>();
  for (const p of data.personen ?? []) {
    if (personIds.has(p.id)) fehler.push(`Doppelte Person-id: ${p.id}`);
    personIds.add(p.id);
    fehler.push(...validatePerson(p));
  }

  const terminIds = new Set<string>();
  for (const t of data.termine ?? []) {
    if (terminIds.has(t.id)) fehler.push(`Doppelte Termin-id: ${t.id}`);
    terminIds.add(t.id);
    fehler.push(...validateTermin(t, personIds));
  }

  // Rotations-Reihenfolgen: unbekannte Personen sind kein harter Fehler
  // (deaktivierte Personen werden zur Laufzeit ohnehin uebersprungen), aber
  // ein Hinweis hilft beim Aufraeumen.
  for (const [rolle, reihe] of Object.entries(data.rotation ?? {})) {
    for (const id of reihe?.reihenfolge ?? []) {
      if (!personIds.has(id)) {
        warnungen.push(`Rotation "${rolle}": id "${id}" verweist auf keine Person.`);
      }
    }
  }

  return { ok: fehler.length === 0, fehler, warnungen };
}
