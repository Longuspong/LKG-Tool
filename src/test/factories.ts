import { Person, Termin } from '@/lib/model/types';

/**
 * Kleine Fabriken fuer Testdaten. Sie fuellen nur die Pflichtfelder mit
 * plausiblen Vorgaben; jeder Test ueberschreibt gezielt das, worauf es ankommt.
 * Bewusst keine Produktionslogik – reine Bequemlichkeit fuer die Tests.
 */

export function machePerson(felder: Partial<Person> = {}): Person {
  return {
    id: 'p_001',
    name: 'Testperson',
    dienstnummer: null,
    email: '',
    telefon: '',
    rollen: [],
    notiz: '',
    aktiv: true,
    ...felder,
  };
}

export function macheTermin(felder: Partial<Termin> = {}): Termin {
  return {
    id: 't_1',
    datum: '2026-01-01',
    uhrzeit: '10:00',
    ort: 'Gemeinschaftshaus',
    typ: 'gemeinschaftsstunde',
    predigerId: null,
    abendmahl: false,
    einleitungId: null,
    fahrdienstIds: [],
    kommentar: '',
    istEvent: false,
    status: 'offen',
    kontaktStatus: 'offen',
    ...felder,
  };
}
