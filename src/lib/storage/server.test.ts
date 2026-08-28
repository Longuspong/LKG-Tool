import { describe, it, expect, afterEach } from 'vitest';
import { getServerStorage } from './server';

/**
 * Auswahl der serverseitigen Ablage. Wichtig fuer die Produktion: auf Vercel
 * (schreibgeschuetztes Dateisystem) darf ein fehlendes BLOB_READ_WRITE_TOKEN
 * NICHT still in den Datei-Fallback laufen – das scheiterte spaeter beim
 * Speichern mit einer nichtssagenden Meldung. Stattdessen: klare Fehlermeldung.
 */

const gemerkt = {
  token: process.env.BLOB_READ_WRITE_TOKEN,
  vercel: process.env.VERCEL,
};

function setzeEnv(token: string | undefined, vercel: string | undefined) {
  if (token === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = token;
  if (vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = vercel;
}

afterEach(() => {
  setzeEnv(gemerkt.token, gemerkt.vercel);
});

describe('getServerStorage', () => {
  it('nutzt ohne Token lokal den Datei-Fallback', async () => {
    setzeEnv(undefined, undefined);
    const s = await getServerStorage();
    expect(s.name).toMatch(/datei/i);
  });

  it('meldet auf Vercel ohne Token einen klaren Konfigurationsfehler', async () => {
    setzeEnv(undefined, '1');
    await expect(getServerStorage()).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it('nutzt bei gesetztem Token den Blob-Speicher', async () => {
    setzeEnv('vercel_blob_rw_testtoken', '1');
    const s = await getServerStorage();
    expect(s.name).toMatch(/blob/i);
  });
});
