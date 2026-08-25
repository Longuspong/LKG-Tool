import { describe, it, expect } from 'vitest';
import { berechneLuecken, findeKollisionen, Kollision } from '@/lib/model/gaps';
import { macheTermin } from '@/test/factories';

const AB = '2026-06-01';

function kollisionArt(koll: Kollision[], art: Kollision['art']) {
  return koll.filter((k) => k.art === art);
}

describe('berechneLuecken', () => {
  const termine = [
    // Gemeinschaftsstunde ohne jede Besetzung -> alle drei Luecken.
    macheTermin({ id: 'g1', datum: '2026-07-05', typ: 'gemeinschaftsstunde' }),
    // Bibelstunde braucht nur einen Prediger, keine Einleitung/Fahrdienst.
    macheTermin({ id: 'b1', datum: '2026-07-08', typ: 'bibelstunde' }),
    // Event-Tag: Rotation pausiert -> keinerlei Luecke.
    macheTermin({ id: 'e1', datum: '2026-07-12', typ: 'gemeinschaftsstunde', istEvent: true }),
    // Voll besetzt, aber Kontakt noch offen -> kontaktOffen.
    macheTermin({
      id: 'k1',
      datum: '2026-07-19',
      typ: 'gemeinschaftsstunde',
      predigerId: 'p_001',
      einleitungId: 'p_002',
      fahrdienstIds: ['p_003'],
      kontaktStatus: 'offen',
    }),
    // Abgesagt -> Slot muss neu besetzt werden.
    macheTermin({
      id: 'a1',
      datum: '2026-07-26',
      typ: 'gemeinschaftsstunde',
      predigerId: 'p_001',
      einleitungId: 'p_002',
      fahrdienstIds: ['p_003'],
      kontaktStatus: 'abgesagt',
    }),
    // Vergangenheit -> wird ignoriert (liegt vor AB).
    macheTermin({ id: 'alt', datum: '2026-01-01', typ: 'gemeinschaftsstunde' }),
  ];

  it('findet fehlenden Prediger bei Gemeinschafts- und Bibelstunde, nicht am Event-Tag', () => {
    const l = berechneLuecken(termine, AB);
    expect(l.ohnePrediger.map((t) => t.id).sort()).toEqual(['b1', 'g1']);
  });
  it('meldet fehlende Einleitung/Fahrdienst nur bei der Gemeinschaftsstunde', () => {
    const l = berechneLuecken(termine, AB);
    expect(l.ohneEinleitung.map((t) => t.id)).toEqual(['g1']);
    expect(l.ohneFahrdienst.map((t) => t.id)).toEqual(['g1']);
  });
  it('trennt kontaktOffen und abgesagt', () => {
    const l = berechneLuecken(termine, AB);
    expect(l.kontaktOffen.map((t) => t.id)).toEqual(['k1']);
    expect(l.abgesagt.map((t) => t.id)).toEqual(['a1']);
  });
  it('ignoriert vergangene Termine', () => {
    const l = berechneLuecken(termine, AB);
    const alleIds = [...l.ohnePrediger, ...l.ohneEinleitung, ...l.ohneFahrdienst].map((t) => t.id);
    expect(alleIds).not.toContain('alt');
  });
});

describe('findeKollisionen', () => {
  it('meldet einen regulaeren Termin an einem Event-Tag', () => {
    const koll = findeKollisionen([
      macheTermin({ id: 'ev', datum: '2026-07-05', typ: 'event', istEvent: true, uhrzeit: '09:00' }),
      macheTermin({ id: 'reg', datum: '2026-07-05', typ: 'gemeinschaftsstunde', uhrzeit: '10:00' }),
    ]);
    const treffer = kollisionArt(koll, 'event-tag');
    expect(treffer).toHaveLength(1);
    expect(treffer[0].terminIds.sort()).toEqual(['ev', 'reg']);
  });
  it('meldet eine zeitliche Ueberschneidung bei gleicher Uhrzeit', () => {
    const koll = findeKollisionen([
      macheTermin({ id: 'x', datum: '2026-07-05', uhrzeit: '10:00' }),
      macheTermin({ id: 'y', datum: '2026-07-05', uhrzeit: '10:00' }),
    ]);
    const treffer = kollisionArt(koll, 'zeit-ueberschneidung');
    expect(treffer).toHaveLength(1);
    expect(treffer[0].terminIds.sort()).toEqual(['x', 'y']);
  });
  it('meldet eine doppelt verplante Person am selben Tag', () => {
    const koll = findeKollisionen([
      macheTermin({ id: 'v', datum: '2026-07-05', uhrzeit: '10:00', predigerId: 'p_001' }),
      macheTermin({ id: 'n', datum: '2026-07-05', uhrzeit: '19:30', predigerId: 'p_001' }),
    ]);
    const treffer = kollisionArt(koll, 'person-doppelt');
    expect(treffer).toHaveLength(1);
    expect(treffer[0].personId).toBe('p_001');
    expect(treffer[0].terminIds.sort()).toEqual(['n', 'v']);
    // Unterschiedliche Uhrzeiten -> keine Zeit-Ueberschneidung.
    expect(kollisionArt(koll, 'zeit-ueberschneidung')).toHaveLength(0);
  });
  it('meldet nichts bei einem einzelnen sauberen Termin', () => {
    expect(findeKollisionen([macheTermin({ id: 's', datum: '2026-07-05', uhrzeit: '10:00' })])).toEqual([]);
  });
});
