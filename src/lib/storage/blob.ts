import { put, list } from '@vercel/blob';
import { DataFile } from '../model/types';
import { leeresDataFile } from '../model/defaults';
import { ServerStorage } from './types';

/**
 * Vercel-Blob-Adapter (Produktion). Der gesamte Bestand liegt als EINE
 * JSON-Datei im Blob. Das Token bleibt serverseitig (nur hier genutzt).
 *
 * Frische lesen: Nach dem Ueberschreiben behaelt die Datei denselben Pfad und
 * damit dieselbe URL; das CDN koennte alte Inhalte cachen. Fuer die
 * Versionspruefung ist Frische kritisch – deshalb schreiben wir mit
 * cacheControlMaxAge 0 und lesen mit Cache-Buster + no-store.
 */

const PATH = process.env.BLOB_DATA_PATH || 'gemeindeplaner/data.json';

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error('BLOB_READ_WRITE_TOKEN ist nicht gesetzt.');
  return t;
}

export const blobStorage: ServerStorage = {
  name: `vercel-blob (${PATH})`,

  async load(): Promise<DataFile> {
    const { blobs } = await list({ prefix: PATH, token: token(), limit: 1000 });
    const found = blobs.find((b) => b.pathname === PATH);
    if (!found) return leeresDataFile();
    const url = `${found.url}?_=${Date.now()}`; // Cache-Buster gegen CDN-Staleness
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Blob-Lesefehler: HTTP ${res.status}`);
    return (await res.json()) as DataFile;
  },

  async save(data: DataFile): Promise<void> {
    // Gleicher Pfad + addRandomSuffix:false => Upsert (die Datei wird ersetzt).
    await put(PATH, JSON.stringify(data, null, 2), {
      access: 'public',
      token: token(),
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });
  },

  async saveBackup(data: DataFile): Promise<void> {
    if (process.env.BLOB_KEEP_BACKUPS !== 'true') return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await put(`backups/data-${ts}.json`, JSON.stringify(data, null, 2), {
      access: 'public',
      token: token(),
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
  },
};
