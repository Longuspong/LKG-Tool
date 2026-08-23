import { DataFile, SCHEMA_VERSION } from './types';
import { leeresDataFile, STANDARD_SETTINGS } from './defaults';
import { validateDataFile, Pruefergebnis } from './validate';

/**
 * JSON-Import/Export der kompletten Grundlage (Backup).
 * Export = der gesamte DataFile als lesbares JSON.
 * Import = robustes Einlesen: fehlende Felder werden mit Defaults aufgefuellt,
 * anschliessend validiert.
 */

export function exportJson(data: DataFile): string {
  return JSON.stringify(data, null, 2);
}

export interface ImportErgebnis {
  data: DataFile | null;
  pruefung: Pruefergebnis;
}

/** Parst und normalisiert einen JSON-String zu einem DataFile. */
export function importJson(text: string): ImportErgebnis {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch (e) {
    return {
      data: null,
      pruefung: { ok: false, fehler: [`Kein gültiges JSON: ${(e as Error).message}`], warnungen: [] },
    };
  }
  const data = normalisiere(roh);
  const pruefung = validateDataFile(data);
  return { data: pruefung.ok ? data : data, pruefung };
}

/** Fuellt ein (evtl. unvollstaendiges) Objekt zu einem validen DataFile auf. */
export function normalisiere(roh: unknown): DataFile {
  const basis = leeresDataFile();
  if (!roh || typeof roh !== 'object') return basis;
  const o = roh as Record<string, unknown>;

  return {
    schema: typeof o.schema === 'number' ? o.schema : SCHEMA_VERSION,
    version: typeof o.version === 'number' && o.version >= 1 ? o.version : 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    personen: Array.isArray(o.personen)
      ? (o.personen as any[]).map(normPerson)
      : [],
    termine: Array.isArray(o.termine) ? (o.termine as any[]).map(normTermin) : [],
    rotation:
      o.rotation && typeof o.rotation === 'object'
        ? normRotation(o.rotation as any)
        : basis.rotation,
    settings:
      o.settings && typeof o.settings === 'object'
        ? { ...STANDARD_SETTINGS, ...(o.settings as any) }
        : STANDARD_SETTINGS,
  };
}

function normPerson(p: any) {
  return {
    id: String(p?.id ?? ''),
    name: String(p?.name ?? ''),
    dienstnummer: p?.dienstnummer ?? null,
    email: p?.email ?? '',
    telefon: p?.telefon ?? '',
    rollen: Array.isArray(p?.rollen) ? p.rollen.map(String) : [],
    notiz: p?.notiz ?? '',
    aktiv: p?.aktiv !== false,
  };
}

function normTermin(t: any) {
  return {
    id: String(t?.id ?? ''),
    datum: String(t?.datum ?? ''),
    uhrzeit: String(t?.uhrzeit ?? ''),
    ort: String(t?.ort ?? ''),
    typ: t?.typ ?? 'sonstiges',
    predigerId: t?.predigerId ?? null,
    abendmahl: !!t?.abendmahl,
    einleitungId: t?.einleitungId ?? null,
    fahrdienstIds: Array.isArray(t?.fahrdienstIds) ? t.fahrdienstIds.map(String) : [],
    kommentar: t?.kommentar ?? '',
    istEvent: !!t?.istEvent,
    status: t?.status ?? 'offen',
    kontaktStatus: t?.kontaktStatus ?? 'offen',
  };
}

function normRotation(r: any) {
  const reihe = (x: any) => ({
    reihenfolge: Array.isArray(x?.reihenfolge) ? x.reihenfolge.map(String) : [],
    startIndex: typeof x?.startIndex === 'number' ? x.startIndex : 0,
  });
  return {
    einleitung: reihe(r?.einleitung),
    fahrdienst: reihe(r?.fahrdienst),
  };
}
