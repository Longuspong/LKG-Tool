'use client';

import { useState } from 'react';
import { useApp } from '@/state/store';
import { Knopf, eingabeKlasse } from './ui';

/** Zugriffscode-Eingabe (Shared Secret). Wird nur gezeigt, wenn der Server
 *  einen Code verlangt (401) und noch keiner / ein falscher gemerkt ist. */
const FEHLER_TEXT: Record<'unauthorized' | 'offline' | 'error', string> = {
  unauthorized: 'Zugriffscode ist falsch.',
  offline: 'Keine Verbindung zum Server. Bitte später erneut versuchen.',
  error: 'Serverfehler beim Prüfen des Codes.',
};

export default function CodeGate() {
  const setCode = useApp((s) => s.setCode);
  const [wert, setWert] = useState('');
  const [pruefe, setPruefe] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!wert.trim()) return;
    setPruefe(true);
    setFehler(null);
    const status = await setCode(wert.trim());
    setPruefe(false);
    // Bei Erfolg verschwindet dieses Gate (brauchtCode = false); sonst Grund zeigen.
    if (status !== 'ok') setFehler(FEHLER_TEXT[status]);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={absenden} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-marke-hell text-2xl">
            🔒
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Gemeindeplaner</h1>
          <p className="mt-1 text-sm text-slate-500">Bitte Zugriffscode eingeben.</p>
        </div>
        <input
          type="password"
          value={wert}
          onChange={(e) => {
            setWert(e.target.value);
            if (fehler) setFehler(null);
          }}
          className={eingabeKlasse}
          placeholder="Zugriffscode"
          autoFocus
          autoComplete="current-password"
        />
        {fehler && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{fehler}</p>}
        <Knopf type="submit" variante="primaer" className="mt-4 w-full" disabled={pruefe}>
          {pruefe ? 'Prüfe…' : 'Weiter'}
        </Knopf>
        <p className="mt-3 text-center text-xs text-slate-400">
          Der Code wird nur auf diesem Geraet gemerkt.
        </p>
      </form>
    </div>
  );
}
