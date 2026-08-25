import { describe, it, expect } from 'vitest';
import { naechstePersonId, terminId } from '@/lib/model/ids';
import { machePerson, macheTermin } from '@/test/factories';

describe('naechstePersonId', () => {
  it('startet bei p_001, wenn noch keine Person existiert', () => {
    expect(naechstePersonId([])).toBe('p_001');
  });
  it('zaehlt vom hoechsten vorhandenen Wert hoch (auch bei Luecken)', () => {
    const personen = [
      machePerson({ id: 'p_001' }),
      machePerson({ id: 'p_003' }), // Luecke bei p_002 wird nicht neu vergeben
    ];
    expect(naechstePersonId(personen)).toBe('p_004');
  });
  it('ignoriert fremd geformte IDs', () => {
    const personen = [
      machePerson({ id: 'p_002' }),
      machePerson({ id: 'x_9' }),
      machePerson({ id: 'kaputt' }),
    ];
    expect(naechstePersonId(personen)).toBe('p_003');
  });
  it('fuellt auf drei Stellen auf und laesst darueber hinaus wachsen', () => {
    expect(naechstePersonId([machePerson({ id: 'p_009' })])).toBe('p_010');
    expect(naechstePersonId([machePerson({ id: 'p_099' })])).toBe('p_100');
  });
});

describe('terminId', () => {
  it('bildet die Basis aus Datum und Uhrzeit', () => {
    expect(terminId('2026-03-15', '09:30', [])).toBe('t_20260315_0930');
  });
  it('haengt bei Kollision _2 an', () => {
    const vorhandene = [macheTermin({ id: 't_20260315_0930' })];
    expect(terminId('2026-03-15', '09:30', vorhandene)).toBe('t_20260315_0930_2');
  });
  it('zaehlt das Kollisions-Suffix weiter (_3)', () => {
    const vorhandene = [
      macheTermin({ id: 't_20260315_0930' }),
      macheTermin({ id: 't_20260315_0930_2' }),
    ];
    expect(terminId('2026-03-15', '09:30', vorhandene)).toBe('t_20260315_0930_3');
  });
});
