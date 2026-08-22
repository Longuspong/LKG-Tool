import { KontaktStatus, TerminStatus, TerminTyp } from './model/types';

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
