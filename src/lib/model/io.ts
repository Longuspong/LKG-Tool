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

/** Fehler, wenn ein Bestand aus einer NEUEREN App-Version stammt (schema > SCHEMA_VERSION). */
export class SchemaZukunftError extends Error {}

/**
 * Migrationspfad: hebt einen (evtl. aelteren) Bestand anhand `data.schema`
 * schrittweise auf SCHEMA_VERSION an und lehnt ein Schema aus der ZUKUNFT ab,
 * statt Daten zu beschaedigen.
 *
 * Klare Reihenfolge / Verantwortungstrennung:
 *   1. Zukunfts-Schema erkennen und ablehnen (SchemaZukunftError).
 *   2. Schrittweise Format-Migrationen (von1nach2, ...) – aktuell noch keine,
 *      da SCHEMA_VERSION = 1 (No-op-Geruest, s.u.).
 *   3. `normalisiere()` DANACH fuellt fehlende Felder auf; das Auffuellen bleibt
 *      allein Sache von normalisiere, die Formatstufe allein Sache von migriere.
 */
export function migriere(roh: unknown): DataFile {
  const o = roh && typeof roh === 'object' ? (roh as Record<string, unknown>) : {};
  // Fehlendes Schema gilt als "aelter als die erste Version" -> wird migriert.
  const schema = typeof o.schema === 'number' ? o.schema : 0;

  if (schema > SCHEMA_VERSION) {
    throw new SchemaZukunftError(
      `Diese Datei stammt aus einer neueren App-Version (Schema ${schema}, unterstützt bis ${SCHEMA_VERSION}). ` +
        `Bitte zuerst die App aktualisieren. Der Import wurde abgebrochen, um die Daten nicht zu beschädigen.`,
    );
  }

  // --- Schrittweise Format-Migrationen -------------------------------------
  // Aktuell gibt es nur Schema 1, daher ist hier noch nichts zu tun. Kuenftige
  // Stufen werden nach genau diesem Muster ergaenzt (jeweils reine Umformung
  // des rohen Objekts, BEVOR normalisiere die Felder auffuellt):
  //
  //   let stand: unknown = roh;
  //   if (schema < 2) stand = von1nach2(stand);
  //   if (schema < 3) stand = von2nach3(stand);
  //   const data = normalisiere(stand);
  //
  // function von1nach2(d: unknown): unknown {
  //   const x = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  //   return { ...x, /* neues/umbenanntes Feld setzen */ schema: 2 };
  // }

  const data = normalisiere(roh);
  data.schema = SCHEMA_VERSION; // nach erfolgreicher Migration autoritativ
  return data;
}

/** Parst, migriert und normalisiert einen JSON-String zu einem DataFile. */
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

  // Reihenfolge: erst migrieren (Formatstufe, lehnt Zukunft ab), dann validieren.
  let data: DataFile;
  try {
    data = migriere(roh);
  } catch (e) {
    if (e instanceof SchemaZukunftError) {
      return { data: null, pruefung: { ok: false, fehler: [e.message], warnungen: [] } };
    }
    throw e;
  }

  const pruefung = validateDataFile(data);
  return { data, pruefung };
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
