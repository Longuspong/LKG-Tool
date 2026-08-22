'use client';

import { useEffect } from 'react';
import { useApp } from '@/state/store';
import { TopBar, TabLeiste } from './Navigation';
import StatusLeiste from './StatusLeiste';
import CodeGate from './CodeGate';

/**
 * Rahmen der App: startet die Synchronisation, haengt Online-/Fokus-Listener
 * ein und rendert je nach Zustand Ladeanzeige, Code-Gate oder die Module.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { bereit, brauchtCode, init, aktualisieren } = useApp();

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
