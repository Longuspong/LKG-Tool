import { KontaktStatus, TerminStatus, TerminTyp } from './model/types';
import { OffenPhase } from './model/gaps';

/** Menschlich lesbare Beschriftungen + passende Badge-Toene fuer die UI. */

export const TYP_LABEL: Record<TerminTyp, string> = {
  gemeinschaftsstunde: 'Gemeinschaftsstunde',
  bibelstunde: 'Bibelstunde',
  event: 'Event',
  sonstiges: 'Sonstiges',
};

export const TYP_KURZ: Record<TerminTyp, string> = {
  gemeinschaftsstunde: 'GStd',
  bibelstunde: 'BStd',
  event: 'Event',
  sonstiges: 'Sonst.',
};

export const STATUS_LABEL: Record<TerminStatus, string> = {
  offen: 'Offen',
  besetzt: 'Besetzt',
  bestaetigt: 'Bestätigt',
};

export const STATUS_TON: Record<TerminStatus, 'grau' | 'gelb' | 'gruen' | 'blau'> = {
  offen: 'gelb',
  besetzt: 'blau',
  bestaetigt: 'gruen',
};

export const KONTAKT_LABEL: Record<KontaktStatus, string> = {
  offen: 'Kontakt offen',
  kontaktiert: 'Kontaktiert',
  bestaetigt: 'Bestätigt',
  abgesagt: 'Abgesagt',
};

export const KONTAKT_TON: Record<KontaktStatus, 'grau' | 'gelb' | 'gruen' | 'rot' | 'blau'> = {
  offen: 'grau',
  kontaktiert: 'gelb',
  bestaetigt: 'gruen',
  abgesagt: 'rot',
};

/** Phasen im Kontakt-Workflow (offene Stunden, Phase 4). */
export const OFFEN_PHASE_LABEL: Record<OffenPhase, string> = {
  abgesagt: 'Absage – neu besetzen',
  ohnePrediger: 'Ohne Prediger',
  kontaktOffen: 'Kontakt offen',
  kontaktiert: 'Rückmeldung ausstehend',
};

export const OFFEN_PHASE_TON: Record<OffenPhase, 'rot' | 'gelb' | 'blau' | 'grau'> = {
  abgesagt: 'rot',
  ohnePrediger: 'rot',
  kontaktOffen: 'blau',
  kontaktiert: 'gelb',
};

/** Kurzer Handlungshinweis je Phase (fuer die To-do-Zeile). */
export const OFFEN_PHASE_HINWEIS: Record<OffenPhase, string> = {
  abgesagt: 'Absage – bitte jemand anderen anfragen.',
  ohnePrediger: 'Noch kein Prediger – jemanden vorschlagen und anfragen.',
  kontaktOffen: 'Prediger steht – jetzt anfragen.',
  kontaktiert: 'Angefragt – auf Zu- oder Absage warten.',
};

/** Beschriftung fuer Rollen (Standard-Rollen sauber, Rest kapitalisiert). */
export const ROLLE_LABEL: Record<string, string> = {
  prediger: 'Prediger',
  einleitung: 'Einleitung',
  fahrdienst: 'Fahrdienst',
};

export function rolleLabel(rolle: string): string {
  return ROLLE_LABEL[rolle] ?? rolle.charAt(0).toUpperCase() + rolle.slice(1);
}
