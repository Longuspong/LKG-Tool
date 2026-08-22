import { NextResponse } from 'next/server';
import { getServerStorage } from '@/lib/storage/server';
import { zugriffErlaubt } from '@/lib/auth';
import { DataFile } from '@/lib/model/types';
import { validateDataFile } from '@/lib/model/validate';
import { SaveRequest } from '@/lib/storage/protocol';

/**
 * Zwei Routen auf EINE Ressource: der gesamte Bestand als JSON.
 *   GET  /api/data  -> aktuellen Bestand laden
 *   POST /api/data  -> Bestand speichern (mit Versionspruefung)
 *
 * Der BLOB_READ_WRITE_TOKEN bleibt serverseitig; der Client sieht nur diese
 * Routen. Optimistic Concurrency schuetzt die zwei Geraete voreinander.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function keinZugriff() {
  return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
}

export async function GET(req: Request) {
  if (!zugriffErlaubt(req)) return keinZugriff();
  try {
    const storage = await getServerStorage();
    const data = await storage.load();
    return NextResponse.json(
      { status: 'ok', data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { status: 'error', fehler: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!zugriffErlaubt(req)) return keinZugriff();

  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ status: 'error', fehler: 'Ungueltiges JSON.' }, { status: 400 });
  }

  const { baseVersion, data } = body ?? ({} as SaveRequest);
  if (!data || typeof data !== 'object') {
    return NextResponse.json({ status: 'error', fehler: 'Feld "data" fehlt.' }, { status: 400 });
  }

  // Inhaltliche Validierung, bevor irgendetwas geschrieben wird.
  const pruef = validateDataFile(data as DataFile);
  if (!pruef.ok) {
    return NextResponse.json(
      { status: 'invalid', fehler: pruef.fehler, warnungen: pruef.warnungen },
      { status: 422 },
    );
  }

  try {
    const storage = await getServerStorage();
    const current = await storage.load();

    // Optimistic Concurrency: stimmt die mitgeschickte baseVersion nicht mit
    // dem aktuellen Serverstand ueberein, hat das andere Geraet zwischendurch
    // gespeichert -> Schreiben ablehnen, aktuellen Stand zurueckgeben.
    if (typeof baseVersion !== 'number' || current.version !== baseVersion) {
      return NextResponse.json({ status: 'conflict', data: current }, { status: 409 });
    }

    const gespeichert: DataFile = {
      ...(data as DataFile),
      schema: (data as DataFile).schema ?? current.schema,
      version: current.version + 1, // Server ist autoritativ
      updatedAt: new Date().toISOString(),
    };

    await storage.save(gespeichert);
    // Backup ist "best effort" – ein Fehler hier darf das Speichern nicht kippen.
    try {
      await storage.saveBackup(gespeichert);
    } catch {
      /* ignoriert */
    }

    return NextResponse.json(
      { status: 'ok', data: gespeichert },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { status: 'error', fehler: (e as Error).message },
      { status: 500 },
    );
  }
}
