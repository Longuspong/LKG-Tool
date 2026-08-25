import { describe, it, expect } from 'vitest';
import { validatePerson, validateTermin, validateDataFile } from '@/lib/model/validate';
import { leeresDataFile } from '@/lib/model/defaults';
import { DataFile, Termin } from '@/lib/model/types';
import { machePerson, macheTermin } from '@/test/factories';

describe('validatePerson', () => {
  it('meldet keine Fehler bei einer gueltigen Person', () => {
    expect(
      validatePerson(machePerson({ id: 'p_001', name: 'Anna', email: 'anna@example.de', dienstnummer: 5 })),
    ).toEqual([]);
  });
  it('meldet eine ungueltige id', () => {
    const f = validatePerson(machePerson({ id: 'x_1', name: 'Anna' }));
    expect(f.some((m) => m.includes('ungültige id'))).toBe(true);
  });
  it('meldet einen fehlenden Namen', () => {
    const f = validatePerson(machePerson({ id: 'p_001', name: '   ' }));
    expect(f.some((m) => m.includes('Name ist Pflicht'))).toBe(true);
  });
  it('meldet eine unplausible E-Mail', () => {
    const f = validatePerson(machePerson({ id: 'p_001', name: 'Anna', email: 'keine-mail' }));
    expect(f.some((m) => m.includes('E-Mail'))).toBe(true);
  });
  it('meldet eine ungueltige Dienstnummer', () => {
    expect(validatePerson(machePerson({ id: 'p_001', name: 'A', dienstnummer: -1 })).length).toBeGreaterThan(0);
    expect(validatePerson(machePerson({ id: 'p_001', name: 'A', dienstnummer: 1.5 })).length).toBeGreaterThan(0);
  });
});

describe('validateTermin', () => {
  const personIds = new Set(['p_001']);

  it('meldet keine Fehler bei einem gueltigen Termin', () => {
    const t = macheTermin({ id: 't_1', datum: '2026-03-15', uhrzeit: '10:00', predigerId: 'p_001' });
    expect(validateTermin(t, personIds)).toEqual([]);
  });
  it('meldet ein falsches Datums- und Zeitformat', () => {
    const t = macheTermin({ id: 't_1', datum: '2026/03/15', uhrzeit: '25:00' });
    const f = validateTermin(t, personIds);
    expect(f.some((m) => m.includes('Datum nicht im Format'))).toBe(true);
    expect(f.some((m) => m.includes('Uhrzeit nicht im Format'))).toBe(true);
  });
  it('meldet unbekannte Aufzaehlungswerte', () => {
    const t = macheTermin({
      id: 't_1',
      datum: '2026-03-15',
      uhrzeit: '10:00',
      typ: 'foo' as unknown as Termin['typ'],
      status: 'irgendwas' as unknown as Termin['status'],
      kontaktStatus: 'xxx' as unknown as Termin['kontaktStatus'],
    });
    const f = validateTermin(t, personIds);
    expect(f.some((m) => m.includes('unbekannter Typ'))).toBe(true);
    expect(f.some((m) => m.includes('unbekannter Status'))).toBe(true);
    expect(f.some((m) => m.includes('unbekannter Kontakt-Status'))).toBe(true);
  });
  it('prueft die referenzielle Integritaet von predigerId, einleitungId und fahrdienstIds', () => {
    const t = macheTermin({
      id: 't_1',
      datum: '2026-03-15',
      uhrzeit: '10:00',
      predigerId: 'p_999',
      einleitungId: 'p_888',
      fahrdienstIds: ['p_777'],
    });
    const f = validateTermin(t, personIds);
    expect(f.some((m) => m.includes('predigerId "p_999"'))).toBe(true);
    expect(f.some((m) => m.includes('einleitungId "p_888"'))).toBe(true);
    expect(f.some((m) => m.includes('fahrdienstId "p_777"'))).toBe(true);
  });
});

describe('validateDataFile', () => {
  function basis(): DataFile {
    const d = leeresDataFile();
    d.personen = [machePerson({ id: 'p_001', name: 'Anna' })];
    d.termine = [macheTermin({ id: 't_1', datum: '2026-03-15', uhrzeit: '10:00', predigerId: 'p_001' })];
    return d;
  }

  it('akzeptiert einen sauberen Bestand', () => {
    const r = validateDataFile(basis());
    expect(r.ok).toBe(true);
    expect(r.fehler).toEqual([]);
  });
  it('meldet doppelte Person-IDs als Fehler', () => {
    const d = basis();
    d.personen.push(machePerson({ id: 'p_001', name: 'Zweite Anna' }));
    const r = validateDataFile(d);
    expect(r.ok).toBe(false);
    expect(r.fehler.some((m) => m.includes('Doppelte Person-id'))).toBe(true);
  });
  it('meldet doppelte Termin-IDs als Fehler', () => {
    const d = basis();
    d.termine.push(macheTermin({ id: 't_1', datum: '2026-04-01', uhrzeit: '10:00', predigerId: 'p_001' }));
    const r = validateDataFile(d);
    expect(r.ok).toBe(false);
    expect(r.fehler.some((m) => m.includes('Doppelte Termin-id'))).toBe(true);
  });
  it('meldet eine ungueltige version als Fehler', () => {
    const d = basis();
    d.version = 0;
    const r = validateDataFile(d);
    expect(r.ok).toBe(false);
    expect(r.fehler.some((m) => m.includes('"version"'))).toBe(true);
  });
  it('behandelt eine unbekannte Rotations-id als Warnung, nicht als Fehler', () => {
    const d = basis();
    d.rotation.fahrdienst.reihenfolge = ['p_999'];
    const r = validateDataFile(d);
    expect(r.ok).toBe(true); // Warnung blockiert nicht
    expect(r.warnungen.some((m) => m.includes('p_999'))).toBe(true);
  });
});
