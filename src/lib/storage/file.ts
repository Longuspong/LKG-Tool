import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DataFile } from '../model/types';
import { leeresDataFile } from '../model/defaults';
import { ServerStorage } from './types';

/**
 * Lokaler Datei-Fallback fuer die Entwicklung (kein Vercel-Token noetig).
 * Speichert unter ./.data/data.json (per .gitignore ausgeschlossen).
 * Schreibt atomar (temp-Datei + rename), damit keine halb geschriebene Datei
 * entstehen kann.
 */

const DATEN_DIR = path.join(process.cwd(), '.data');
const DATEN_DATEI = path.join(DATEN_DIR, 'data.json');
const BACKUP_DIR = path.join(DATEN_DIR, 'backups');

async function sicherDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export const dateiStorage: ServerStorage = {
  name: 'datei (lokal ./.data/data.json)',

  async load(): Promise<DataFile> {
    try {
      const text = await fs.readFile(DATEN_DATEI, 'utf8');
      return JSON.parse(text) as DataFile;
    } catch (e: any) {
      if (e?.code === 'ENOENT') return leeresDataFile();
      throw e;
    }
  },

  async save(data: DataFile): Promise<void> {
    await sicherDir(DATEN_DIR);
    const tmp = `${DATEN_DATEI}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, DATEN_DATEI);
  },

  async saveBackup(data: DataFile): Promise<void> {
    await sicherDir(BACKUP_DIR);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const ziel = path.join(BACKUP_DIR, `data-${ts}.json`);
    await fs.writeFile(ziel, JSON.stringify(data, null, 2), 'utf8');
  },
};
