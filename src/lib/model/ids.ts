import { Person, Termin } from './types';

/**
 * ID-Erzeugung. IDs sind stabil und menschenlesbar:
 *   Person:  "p_001", "p_002", ...
 *   Termin:  "t_20260315_0930" (Datum + Uhrzeit), bei Kollision "..._2".
 *
 * IDs werden nie recycelt – auch nicht nach dem Loeschen –, damit
 * abgeleitete Historien konsistent bleiben.
 */

export function naechstePersonId(personen: Person[]): string {
  let max = 0;
  for (const p of personen) {
    const m = /^p_(\d+)$/.exec(p.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `p_${String(max + 1).padStart(3, '0')}`;
}

export function terminId(datum: string, uhrzeit: string, vorhandene: Termin[]): string {
  const basis = `t_${datum.replace(/-/g, '')}_${uhrzeit.replace(':', '')}`;
  const benutzt = new Set(vorhandene.map((t) => t.id));
  if (!benutzt.has(basis)) return basis;
  let n = 2;
  while (benutzt.has(`${basis}_${n}`)) n++;
  return `${basis}_${n}`;
}
