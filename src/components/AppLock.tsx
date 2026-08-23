'use client';

import { useState } from 'react';
import { pruefeSperre } from '@/lib/lock';
import { Knopf, eingabeKlasse } from './ui';

/**
 * Sperrbildschirm ("Passcode beim Oeffnen", Phase 5). Wird von der AppShell vor
 * allem anderen gezeigt, solange eine lokale Geraete-Sperre eingerichtet und
 * noch nicht entsperrt ist. Rein lokal – es geht nichts ans Netz.
 */
export default function AppLock({ onEntsperrt }: { onEntsperrt: () => void }) {
  const [pin, setPin] = useState('');
  const [pruefe, setPruefe] = useState(false);
  const [fehler, setFehler] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setPruefe(true);
    const ok = await pruefeSperre(pin);
    setPruefe(false);
    if (ok) {
      onEntsperrt();
    } else {
      setFehler(true);
      setPin('');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={absenden} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-marke-hell text-2xl">
            🔒
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Gemeindeplaner</h1>
          <p className="mt-1 text-sm text-slate-500">Bitte Passcode eingeben.</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            if (fehler) setFehler(false);
          }}
          className={eingabeKlasse}
          placeholder="Passcode"
          autoFocus
          autoComplete="off"
        />
        {fehler && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Passcode ist falsch.</p>}
        <Knopf type="submit" variante="primaer" className="mt-4 w-full" disabled={pruefe}>
          {pruefe ? 'Prüfe…' : 'Entsperren'}
        </Knopf>
        <p className="mt-3 text-center text-xs text-slate-400">Nur ein lokaler Sichtschutz auf diesem Gerät.</p>
      </form>
    </div>
  );
}
