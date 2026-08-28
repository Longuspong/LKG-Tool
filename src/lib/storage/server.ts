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
  // Auf Vercel ist das Projektverzeichnis schreibgeschuetzt. Der Datei-Fallback
  // wuerde dort beim Speichern mit einem kryptischen EROFS scheitern – der
  // Nutzer saehe nur "Speichern fehlgeschlagen", ohne die eigentliche Ursache.
  // Deshalb hier sofort eine klare, handlungsweisende Meldung. Der Datei-Fallback
  // ist ausschliesslich fuer die lokale Entwicklung gedacht.
  if (process.env.VERCEL) {
    throw new Error(
      'Server-Speicher nicht konfiguriert: BLOB_READ_WRITE_TOKEN fehlt. Im ' +
        'Vercel-Projekt unter Storage → Blob einen Store anlegen/verbinden.',
    );
  }
  return dateiStorage;
}
