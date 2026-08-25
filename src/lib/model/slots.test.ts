import { describe, it, expect } from 'vitest';
import { generiereSlots } from '@/lib/model/slots';
import { STANDARD_REGELTERMINE } from '@/lib/model/defaults';
import { RegelTermin } from '@/lib/model/types';
import { macheTermin } from '@/test/factories';

// Sonntage im Januar 2026: 04, 11, 18, 25 (04 = 1. Sonntag). Mittwoche: 07, 14, 21, 28.
const NUR_SONNTAG: RegelTermin[] = [STANDARD_REGELTERMINE[0]];

describe('generiereSlots', () => {
  it('erzeugt Slots fuer alle passenden Wochentage im Zeitraum', () => {
    const r = generiereSlots('2026-01-01', '2026-01-14', STANDARD_REGELTERMINE, []);
    // 2 Sonntage (04, 11) + 2 Mittwoche (07, 14)
    expect(r.neue).toHaveLength(4);
    expect(r.uebersprungenVorhanden).toBe(0);
    expect(r.uebersprungenEvent).toBe(0);
    const daten = r.neue.map((t) => t.datum).sort();
    expect(daten).toEqual(['2026-01-04', '2026-01-07', '2026-01-11', '2026-01-14']);
  });

  it('nutzt am ersten Wochentag im Monat die Sonderuhrzeit', () => {
    const r = generiereSlots('2026-01-01', '2026-01-31', NUR_SONNTAG, []);
    const jan04 = r.neue.find((t) => t.datum === '2026-01-04');
    const jan11 = r.neue.find((t) => t.datum === '2026-01-11');
    expect(jan04?.uhrzeit).toBe('15:00'); // 1. Sonntag -> ersterImMonatUhrzeit
    expect(jan11?.uhrzeit).toBe('10:00'); // sonstiger Sonntag -> Standarduhrzeit
  });

  it('ueberspringt Tage mit vorhandenem Termin gleichen Typs', () => {
    const vorhandene = [macheTermin({ id: 'v', datum: '2026-01-11', typ: 'gemeinschaftsstunde' })];
    const r = generiereSlots('2026-01-01', '2026-01-14', NUR_SONNTAG, vorhandene);
    expect(r.neue.map((t) => t.datum)).toEqual(['2026-01-04']);
    expect(r.uebersprungenVorhanden).toBe(1);
    expect(r.uebersprungenEvent).toBe(0);
  });

  it('ueberspringt Event-Tage (Rotation pausiert)', () => {
    const vorhandene = [macheTermin({ id: 'ev', datum: '2026-01-11', typ: 'event', istEvent: true })];
    const r = generiereSlots('2026-01-01', '2026-01-14', NUR_SONNTAG, vorhandene);
    expect(r.neue.map((t) => t.datum)).toEqual(['2026-01-04']);
    expect(r.uebersprungenEvent).toBe(1);
    expect(r.uebersprungenVorhanden).toBe(0);
  });

  it('beruecksichtigt nur aktive Regeltermine', () => {
    const inaktiv: RegelTermin[] = [{ ...STANDARD_REGELTERMINE[0], aktiv: false }];
    const r = generiereSlots('2026-01-01', '2026-01-31', inaktiv, []);
    expect(r.neue).toHaveLength(0);
  });
});
