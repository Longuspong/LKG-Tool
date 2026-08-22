/**
 * Zugriffsschutz per Shared Secret (serverseitig).
 *
 * Ist APP_ACCESS_CODE gesetzt, muessen Anfragen an /api/data den passenden Code
 * im Header "x-access-code" mitschicken. Ist die Variable leer/ungesetzt, ist
 * der Schutz deaktiviert (nur fuer lokale Entwicklung sinnvoll).
 *
 * Der Code selbst verlaesst nie den Server – der Client sendet nur den vom
 * Nutzer eingegebenen Wert, den er lokal (localStorage) gemerkt hat.
 */

import { ACCESS_HEADER as HEADER } from './storage/protocol';

/** Ist ueberhaupt ein Schutz konfiguriert? */
export function schutzAktiv(): boolean {
  return !!process.env.APP_ACCESS_CODE && process.env.APP_ACCESS_CODE.length > 0;
}

/** Zeitkonstanter Vergleich, um Timing-Rueckschluesse zu vermeiden. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** true, wenn die Anfrage zugelassen ist. */
export function zugriffErlaubt(req: Request): boolean {
  if (!schutzAktiv()) return true;
  const soll = process.env.APP_ACCESS_CODE as string;
  const ist = req.headers.get(HEADER) ?? '';
  return gleich(ist, soll);
}

export { HEADER as ACCESS_HEADER };
