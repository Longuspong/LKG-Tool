import { ServerStorage } from './types';
import { dateiStorage } from './file';

/**
 * Waehlt die konkrete serverseitige Ablage:
 *   - Ist BLOB_READ_WRITE_TOKEN gesetzt -> Vercel Blob.
 *   - Sonst -> lokaler Datei-Fallback (Entwicklung).
 *
 * Der Blob-Adapter wird dynamisch importiert, damit @vercel/blob in der reinen
 * Datei-Entwicklung nicht zwingend geladen werden muss.
 */
export async function getServerStorage(): Promise<ServerStorage> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { blobStorage } = await import('./blob');
    return blobStorage;
  }
  return dateiStorage;
}
