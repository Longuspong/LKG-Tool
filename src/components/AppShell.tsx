'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { sperreAktiv } from '@/lib/lock';
import { TopBar, TabLeiste } from './Navigation';
import StatusLeiste from './StatusLeiste';
import CodeGate from './CodeGate';
import AppLock from './AppLock';

/** Nach so langer Verborgenheit (ms) wird beim Zurueckkommen erneut gesperrt. */
const WIEDER_SPERREN_NACH = 2 * 60 * 1000;

/**
 * Rahmen der App: startet die Synchronisation, haengt Online-/Fokus-Listener
 * ein und rendert je nach Zustand Sperrbildschirm, Ladeanzeige, Code-Gate oder
 * die Module.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { bereit, brauchtCode, init, aktualisieren } = useApp();
  // Lokale Geraete-Sperre: startet auf `false` (gleiche erste Ausgabe wie SSR),
  // wird nach dem Mounten anhand der lokalen Konfiguration gesetzt.
  const [gesperrt, setGesperrt] = useState(false);

  useEffect(() => {
    setGesperrt(sperreAktiv());
  }, []);

  // Beim Zurueckkommen aus dem Hintergrund ggf. erneut sperren (Sichtschutz).
  useEffect(() => {
    let verborgenSeit = 0;
    const beiSichtwechsel = () => {
      if (document.hidden) {
        verborgenSeit = Date.now();
      } else if (sperreAktiv() && verborgenSeit && Date.now() - verborgenSeit > WIEDER_SPERREN_NACH) {
        setGesperrt(true);
      }
    };
    document.addEventListener('visibilitychange', beiSichtwechsel);
    return () => document.removeEventListener('visibilitychange', beiSichtwechsel);
  }, []);

  useEffect(() => {
    init();
    // Beim Zurueckkommen (Fokus) und beim Online-Gehen mit dem Server abgleichen –
    // so sieht das zweite Geraet Aenderungen des ersten ohne manuelles Neuladen.
    const beiFokus = () => {
      if (!document.hidden) aktualisieren();
    };
    const beiOnline = () => aktualisieren();
    window.addEventListener('focus', beiFokus);
    document.addEventListener('visibilitychange', beiFokus);
    window.addEventListener('online', beiOnline);
    return () => {
      window.removeEventListener('focus', beiFokus);
      document.removeEventListener('visibilitychange', beiFokus);
      window.removeEventListener('online', beiOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sperrbildschirm zuerst – noch bevor Inhalte sichtbar werden.
  if (gesperrt) return <AppLock onEntsperrt={() => setGesperrt(false)} />;

  if (!bereit) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-marke" />
          <p className="text-sm">Lade Daten…</p>
        </div>
      </div>
    );
  }

  if (brauchtCode) return <CodeGate />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <StatusLeiste />
      <main className="app-inhalt mx-auto max-w-3xl px-4 py-4">{children}</main>
      <TabLeiste />
    </div>
  );
}
