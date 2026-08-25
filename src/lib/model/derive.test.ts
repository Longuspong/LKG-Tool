import { describe, it, expect } from 'vitest';
import { beteiligungAn, historieFuer, archivFuer } from '@/lib/model/derive';
import { macheTermin } from '@/test/factories';

/**
 * Fester Bezugstag, damit die Vergangenheit/Zukunft-Trennung deterministisch
 * ist (heute wird als Parameter injiziert, kein globales Date-Mocking).
 */
const HEUTE = '2026-06-15';

function terminSatz() {
  return [
    macheTermin({ id: 't1', datum: '2026-01-10', predigerId: 'p_001' }), // Vergangenheit, prediger
    macheTermin({ id: 't2', datum: '2026-03-05', einleitungId: 'p_001' }), // Vergangenheit, einleitung
    macheTermin({ id: 't3', datum: '2026-05-20', fahrdienstIds: ['p_001'] }), // Vergangenheit, fahrdienst
    macheTermin({ id: 't4', datum: '2026-06-15', predigerId: 'p_001' }), // == heute -> zaehlt als Besuch
    macheTermin({ id: 't5', datum: '2026-08-01', predigerId: 'p_001' }), // Zukunft
    macheTermin({ id: 't6', datum: '2026-07-10', einleitungId: 'p_001' }), // Zukunft (frueher als t5)
    macheTermin({ id: 't7', datum: '2026-04-01', predigerId: 'p_002' }), // andere Person
  ];
}

describe('beteiligungAn', () => {
  it('erkennt alle drei Rollen', () => {
    const t = macheTermin({ predigerId: 'p_001', einleitungId: 'p_001', fahrdienstIds: ['p_001'] });
    expect(beteiligungAn(t, 'p_001').sort()).toEqual(['einleitung', 'fahrdienst', 'prediger']);
  });
  it('liefert leer, wenn die Person nicht beteiligt ist', () => {
    expect(beteiligungAn(macheTermin({ predigerId: 'p_002' }), 'p_001')).toEqual([]);
  });
});

describe('historieFuer', () => {
  it('trennt Vergangenheit (datum <= heute) von der Zukunft', () => {
    const h = historieFuer('p_001', terminSatz(), HEUTE);
    expect(h.anzahlBesuche).toBe(4); // t1..t4
    expect(h.letzterBesuch).toBe('2026-06-15');
    expect(h.naechsterTermin).toBe('2026-07-10'); // frueheste Zukunft (t6 vor t5)
  });
  it('liefert die letzten drei Besuche absteigend', () => {
    const h = historieFuer('p_001', terminSatz(), HEUTE);
    expect(h.letzteDreiBesuche.map((b) => b.terminId)).toEqual(['t4', 't3', 't2']);
  });
  it('zaehlt pro Rolle nur die Vergangenheit', () => {
    const h = historieFuer('p_001', terminSatz(), HEUTE);
    expect(h.proRolle).toEqual({ prediger: 2, einleitung: 1, fahrdienst: 1 });
  });
  it('liefert Nullwerte fuer eine unbeteiligte Person', () => {
    const h = historieFuer('p_999', terminSatz(), HEUTE);
    expect(h.anzahlBesuche).toBe(0);
    expect(h.letzterBesuch).toBeNull();
    expect(h.naechsterTermin).toBeNull();
    expect(h.letzteDreiBesuche).toEqual([]);
    expect(h.proRolle).toEqual({ prediger: 0, einleitung: 0, fahrdienst: 0 });
  });
});

describe('archivFuer', () => {
  it('sortiert Vergangenheit absteigend und Zukunft aufsteigend', () => {
    const a = archivFuer('p_001', terminSatz(), HEUTE);
    expect(a.vergangene.map((b) => b.terminId)).toEqual(['t4', 't3', 't2', 't1']);
    expect(a.kommende.map((b) => b.terminId)).toEqual(['t6', 't5']);
  });
  it('berechnet die Tage seit dem letzten Besuch', () => {
    const a = archivFuer('p_001', terminSatz(), HEUTE);
    expect(a.letzterBesuch).toBe('2026-06-15');
    expect(a.tageSeitLetztem).toBe(0); // letzter Besuch ist heute
    expect(a.naechsterTermin).toBe('2026-07-10');
  });
});
