import { DataFile } from '../model/types';

/**
 * Datenformat zwischen Client und den API-Routen (/api/data).
 * Bewusst schlank: Der Client schickt den kompletten Bestand plus die
 * `baseVersion`, die er beim Laden gesehen hat (Optimistic Concurrency).
 */

/** Header, in dem der Zugriffscode (Shared Secret) mitgeschickt wird. */
export const ACCESS_HEADER = 'x-access-code';

export interface SaveRequest {
  baseVersion: number;
  data: DataFile;
}

export type ApiStatus = 'ok' | 'conflict' | 'unauthorized' | 'invalid' | 'error';

export interface LoadOk {
  status: 'ok';
  data: DataFile;
}

export interface SaveOk {
  status: 'ok';
  data: DataFile; // mit erhoehter version + neuem updatedAt
}

export interface Conflict {
  status: 'conflict';
  data: DataFile; // der aktuelle Serverstand
}
