import { describe, it, expect } from 'vitest';
import {
  istErsterWochentagImMonat,
  datumsSpanne,
  quartalsbereich,
  monatsbereich,
  tageImMonat,
  deutschZuIso,
  wochentag,
  plusTage,
} from '@/lib/date';

describe('istErsterWochentagImMonat', () => {
  it('gilt fuer die Tage 1 bis 7', () => {
    expect(istErsterWochentagImMonat('2026-03-01')).toBe(true);
    expect(istErsterWochentagImMonat('2026-03-07')).toBe(true);
  });
  it('gilt ab Tag 8 nicht mehr', () => {
    expect(istErsterWochentagImMonat('2026-03-08')).toBe(false);
    expect(istErsterWochentagImMonat('2026-03-15')).toBe(false);
  });
});

describe('datumsSpanne', () => {
  it('schliesst beide Grenzen ein', () => {
    expect(datumsSpanne('2026-03-01', '2026-03-03')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
  });
  it('liefert genau einen Tag bei gleichem Start und Ende', () => {
    expect(datumsSpanne('2026-03-01', '2026-03-01')).toEqual(['2026-03-01']);
  });
  it('ist leer, wenn Start nach Ende liegt', () => {
    expect(datumsSpanne('2026-03-05', '2026-03-01')).toEqual([]);
  });
  it('laeuft ueber den Monatswechsel', () => {
    expect(datumsSpanne('2026-01-30', '2026-02-02')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });
  it('enthaelt den 29.02. im Schaltjahr', () => {
    expect(datumsSpanne('2024-02-28', '2024-03-01')).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });
  it('ueberspringt den 29.02. im Nicht-Schaltjahr', () => {
    expect(datumsSpanne('2026-02-27', '2026-03-01')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });
});

describe('quartalsbereich', () => {
  it('umfasst Q1 vom 1.1. bis 31.3.', () => {
    expect(quartalsbereich(2026, 1)).toEqual({ start: '2026-01-01', ende: '2026-03-31' });
  });
  it('umfasst Q4 vom 1.10. bis 31.12.', () => {
    expect(quartalsbereich(2026, 4)).toEqual({ start: '2026-10-01', ende: '2026-12-31' });
  });
});

describe('monatsbereich', () => {
  it('endet im Februar eines Schaltjahres am 29.', () => {
    expect(monatsbereich(2024, 2)).toEqual({ start: '2024-02-01', ende: '2024-02-29' });
  });
  it('endet im Februar eines Nicht-Schaltjahres am 28.', () => {
    expect(monatsbereich(2026, 2)).toEqual({ start: '2026-02-01', ende: '2026-02-28' });
  });
  it('endet im April am 30.', () => {
    expect(monatsbereich(2026, 4)).toEqual({ start: '2026-04-01', ende: '2026-04-30' });
  });
});

describe('tageImMonat', () => {
  it('kennt den Schaltjahr-Februar', () => {
    expect(tageImMonat(2024, 2)).toBe(29);
    expect(tageImMonat(2026, 2)).toBe(28);
  });
  it('kennt 30- und 31-Tage-Monate', () => {
    expect(tageImMonat(2026, 4)).toBe(30);
    expect(tageImMonat(2026, 12)).toBe(31);
  });
});

describe('deutschZuIso', () => {
  it('wandelt ein gueltiges Datum um', () => {
    expect(deutschZuIso('15.03.2026')).toBe('2026-03-15');
  });
  it('akzeptiert einstellige Tag/Monat-Angaben', () => {
    expect(deutschZuIso('1.3.2026')).toBe('2026-03-01');
  });
  it('akzeptiert den 29.02. im Schaltjahr', () => {
    expect(deutschZuIso('29.02.2024')).toBe('2024-02-29');
  });
  it('akzeptiert die Grenzwerte des Jahres', () => {
    expect(deutschZuIso('31.12.2026')).toBe('2026-12-31');
    expect(deutschZuIso('01.01.2026')).toBe('2026-01-01');
  });
  it('lehnt falsche Formate ab', () => {
    expect(deutschZuIso('2026-03-15')).toBeNull();
    expect(deutschZuIso('foo')).toBeNull();
    expect(deutschZuIso('')).toBeNull();
    expect(deutschZuIso('15.3.26')).toBeNull(); // nur zweistelliges Jahr
  });
  it('lehnt unmoegliche Kalenderwerte ab', () => {
    expect(deutschZuIso('32.01.2026')).toBeNull();
    expect(deutschZuIso('01.13.2026')).toBeNull();
    expect(deutschZuIso('00.01.2026')).toBeNull();
  });
});

describe('wochentag', () => {
  it('liefert 0 fuer Sonntag und 1 fuer Montag (wie Date.getDay)', () => {
    expect(wochentag('2026-03-15')).toBe(0); // Sonntag
    expect(wochentag('2026-06-15')).toBe(1); // Montag
    expect(wochentag('2026-03-04')).toBe(3); // Mittwoch
  });
});

describe('plusTage', () => {
  it('rechnet ueber den Monatswechsel', () => {
    expect(plusTage('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('rechnet ueber den Jahreswechsel', () => {
    expect(plusTage('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('rechnet rueckwaerts', () => {
    expect(plusTage('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('trifft den 29.02. im Schaltjahr', () => {
    expect(plusTage('2024-02-28', 1)).toBe('2024-02-29');
  });
  it('addiert ein ganzes (Nicht-Schalt-)Jahr', () => {
    expect(plusTage('2026-01-01', 365)).toBe('2027-01-01');
  });
});
