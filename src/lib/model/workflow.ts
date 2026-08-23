import { KontaktStatus, Termin } from './types';

/**
 * Kontakt-Workflow (Phase 4) – die Statuskette eines offenen Slots.
 *
 * Ein Termin traegt zwei zusammenhaengende Status:
 *   - `status`        (offen | besetzt | bestaetigt)  – Belegung des Slots
 *   - `kontaktStatus` (offen | kontaktiert | bestaetigt | abgesagt) – Fortschritt
 *                     der Absprache mit dem Prediger.
 *
 * Damit die beiden nicht auseinanderlaufen (der TerminFormular-Weg erlaubt sie
 * einzeln zu setzen), buendeln diese reinen Mutatoren die sinnvollen Uebergaenge
 * an EINER Stelle. Sie werden innerhalb von `store.aendern` auf den Entwurf
 * angewandt.
 *
 *   frisch      -> predigerZuweisen  -> besetzt / kontakt offen
 *   kontaktiert -> alsKontaktiert    -> besetzt / kontaktiert
 *   zusage      -> alsBestaetigt     -> bestaetigt / bestaetigt
 *   absage      -> alsAbgesagt       -> besetzt / abgesagt (Slot braucht Ersatz)
 *   ersatz      -> predigerFreigeben -> offen / offen (Person raus)
 */

/** Prediger (neu) setzen und den Kontakt von vorne beginnen. */
export function predigerZuweisen(t: Termin, personId: string): void {
  t.predigerId = personId;
  t.kontaktStatus = 'offen';
  if (t.status === 'offen') t.status = 'besetzt';
}

/** Person angefragt, Rueckmeldung steht noch aus. */
export function alsKontaktiert(t: Termin): void {
  t.kontaktStatus = 'kontaktiert';
  t.status = 'besetzt';
}

/** Zusage erhalten – Slot ist erledigt. */
export function alsBestaetigt(t: Termin): void {
  t.kontaktStatus = 'bestaetigt';
  t.status = 'bestaetigt';
}

/**
 * Absage erhalten. Person bleibt zunaechst am Termin vermerkt (damit sichtbar
 * bleibt, wer abgesagt hat), der Slot gilt aber nicht mehr als bestaetigt und
 * muss neu besetzt werden.
 */
export function alsAbgesagt(t: Termin): void {
  t.kontaktStatus = 'abgesagt';
  if (t.status === 'bestaetigt') t.status = 'besetzt';
}

/** Prediger wieder entfernen – der Slot ist danach frei fuer eine neue Wahl. */
export function predigerFreigeben(t: Termin): void {
  t.predigerId = null;
  t.kontaktStatus = 'offen';
  t.status = 'offen';
}

/** Beschriftung fuer den naechsten sinnvollen Schritt (fuer Buttons/Hinweise). */
export function naechsterSchritt(kontakt: KontaktStatus): string {
  switch (kontakt) {
    case 'offen':
      return 'kontaktieren';
    case 'kontaktiert':
      return 'Zu-/Absage eintragen';
    case 'bestaetigt':
      return 'erledigt';
    case 'abgesagt':
      return 'neu besetzen';
  }
}
