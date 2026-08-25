import { describe, it, expect } from 'vitest';
import { importJson, migriere, SchemaZukunftError } from '@/lib/model/io';
import { SCHEMA_VERSION } from '@/lib/model/types';

/** Ein gueltiger Bestand im aktuellen Schema als rohes Objekt. */
function gueltigerBestand(extra: Record<string, unknown> = {}) {
  return {
    schema: 1,
    version: 3,
    updatedAt: '2026-05-01T10:00:00.000Z',
    personen: [
      { id: 'p_001', name: 'Anna', rollen: ['prediger'], aktiv: true },
    ],
    termine: [
      {
        id: 't_1',
        datum: '2026-05-10',
        uhrzeit: '10:00',
        ort: 'Haus',
        typ: 'gemeinschaftsstunde',
        predigerId: 'p_001',
        abendmahl: false,
        einleitungId: null,
        fahrdienstIds: [],
        istEvent: false,
        status: 'offen',
        kontaktStatus: 'offen',
      },
    ],
    rotation: { einleitung: { reihenfolge: [], startIndex: 0 }, fahrdienst: { reihenfolge: [], startIndex: 0 } },
    ...extra,
  };
}

describe('importJson – Schema-Migration', () => {
  it('importiert einen Schema-1-Bestand unveraendert', () => {
    const r = importJson(JSON.stringify(gueltigerBestand()));
    expect(r.pruefung.ok).toBe(true);
    expect(r.data).not.toBeNull();
    expect(r.data!.schema).toBe(1);
    expect(r.data!.version).toBe(3); // Version bleibt erhalten
    expect(r.data!.personen).toHaveLength(1);
    expect(r.data!.termine).toHaveLength(1);
  });

  it('migriert eine Datei ohne schema-Feld auf die aktuelle Version', () => {
    const ohneSchema = gueltigerBestand();
    delete (ohneSchema as Record<string, unknown>).schema;
    const r = importJson(JSON.stringify(ohneSchema));
    expect(r.pruefung.ok).toBe(true);
    expect(r.data!.schema).toBe(SCHEMA_VERSION);
  });

  it('lehnt ein Schema aus der Zukunft mit verstaendlicher Meldung ab', () => {
    const r = importJson(JSON.stringify(gueltigerBestand({ schema: 999 })));
    expect(r.data).toBeNull();
    expect(r.pruefung.ok).toBe(false);
    expect(r.pruefung.fehler[0]).toMatch(/neueren App-Version/);
    expect(r.pruefung.fehler[0]).toMatch(/999/);
  });

  it('meldet ungueltiges JSON getrennt von der Migration', () => {
    const r = importJson('{kaputt');
    expect(r.data).toBeNull();
    expect(r.pruefung.fehler[0]).toMatch(/Kein gültiges JSON/);
  });
});

describe('migriere', () => {
  it('wirft SchemaZukunftError bei einem Zukunfts-Schema', () => {
    expect(() => migriere({ schema: SCHEMA_VERSION + 1 })).toThrow(SchemaZukunftError);
  });
  it('setzt bei fehlendem schema die aktuelle Version', () => {
    expect(migriere({}).schema).toBe(SCHEMA_VERSION);
  });
  it('laesst einen aktuellen Bestand auf der aktuellen Version', () => {
    expect(migriere(gueltigerBestand()).schema).toBe(SCHEMA_VERSION);
  });
});
