import { DataFile } from '../model/types';
import { ACCESS_HEADER } from './protocol';

/**
 * Client-seitiger Netzwerkzugriff auf /api/data. Uebersetzt HTTP-Status in
 * klare Ergebnistypen, damit die UI eindeutig reagieren kann (u.a. der
 * "auf dem anderen Geraet wurde geaendert"-Fall = conflict).
 */

export type LadeErgebnis =
  | { status: 'ok'; data: DataFile }
  | { status: 'unauthorized' }
  | { status: 'offline' }
  | { status: 'error'; fehler: string };

export type SpeicherErgebnis =
  | { status: 'ok'; data: DataFile }
  | { status: 'conflict'; data: DataFile }
  | { status: 'unauthorized' }
  | { status: 'invalid'; fehler: string[] }
  | { status: 'offline' }
  | { status: 'error'; fehler: string };

function authHeader(code: string | null): Record<string, string> {
  return code ? { [ACCESS_HEADER]: code } : {};
}

export async function remoteLaden(code: string | null): Promise<LadeErgebnis> {
  try {
    const res = await fetch('/api/data', {
      headers: authHeader(code),
      cache: 'no-store',
    });
    if (res.status === 401) return { status: 'unauthorized' };
    if (!res.ok) return { status: 'error', fehler: `HTTP ${res.status}` };
    const j = await res.json();
    return { status: 'ok', data: j.data as DataFile };
  } catch {
    return { status: 'offline' };
  }
}

export async function remoteSpeichern(
  data: DataFile,
  baseVersion: number,
  code: string | null,
): Promise<SpeicherErgebnis> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(code) },
      body: JSON.stringify({ baseVersion, data }),
    });
    if (res.status === 401) return { status: 'unauthorized' };
    const j = await res.json().catch(() => ({} as any));
    if (res.status === 409) return { status: 'conflict', data: j.data as DataFile };
    if (res.status === 422) {
      return { status: 'invalid', fehler: (j.fehler as string[]) ?? ['Validierung fehlgeschlagen.'] };
    }
    if (!res.ok) return { status: 'error', fehler: j.fehler ?? `HTTP ${res.status}` };
    return { status: 'ok', data: j.data as DataFile };
  } catch {
    return { status: 'offline' };
  }
}
