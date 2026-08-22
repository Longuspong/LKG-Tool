import { DataFile } from '../model/types';

/**
 * Abstrahierte Speicher-Schicht.
 *
 * Die App kennt nur dieses Interface, nie die konkrete Ablage. Dadurch laesst
 * sich die Implementierung spaeter austauschen (z.B. gegen Supabase/Neon), ohne
 * die App umzubauen. Aktuell gibt es zwei serverseitige Umsetzungen:
 *   - Vercel Blob (Produktion / sobald ein Token gesetzt ist)
 *   - lokale Datei  (Entwicklung ohne Token)
 *
 * Die Optimistic-Concurrency-Pruefung (version/updatedAt) passiert in der
 * API-Route, nicht im Adapter – der Adapter liest und schreibt nur.
 */
export interface ServerStorage {
  /** Laedt den aktuellen Bestand. Existiert noch keiner, wird ein leerer
   *  Startbestand (version 1) zurueckgegeben, aber nicht persistiert. */
  load(): Promise<DataFile>;

  /** Schreibt den Bestand als kanonische Datei (ueberschreibt). */
  save(data: DataFile): Promise<void>;

  /** Optional: zusaetzliche versionierte Backup-Kopie ablegen. */
  saveBackup(data: DataFile): Promise<void>;

  /** Klartext-Name der aktiven Ablage (fuer Diagnose). */
  readonly name: string;
}
