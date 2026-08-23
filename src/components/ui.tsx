'use client';

import React from 'react';

export function cx(...teile: (string | false | null | undefined)[]): string {
  return teile.filter(Boolean).join(' ');
}

// --- Karte -----------------------------------------------------------------
export function Karte({
  children,
  className,
  titel,
  aktion,
}: {
  children: React.ReactNode;
  className?: string;
  titel?: React.ReactNode;
  aktion?: React.ReactNode;
}) {
  return (
    <section className={cx('rounded-2xl bg-white shadow-sm ring-1 ring-slate-200', className)}>
      {(titel || aktion) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">{titel}</h2>
          {aktion}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

// --- Knopf -----------------------------------------------------------------
type KnopfVariante = 'primaer' | 'sekundaer' | 'gefahr' | 'geist';
const knopfStil: Record<KnopfVariante, string> = {
  primaer: 'bg-marke text-white hover:bg-marke-dunkel',
  sekundaer: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
  gefahr: 'bg-white text-red-600 ring-1 ring-red-300 hover:bg-red-50',
  geist: 'bg-transparent text-slate-600 hover:bg-slate-100',
};

export function Knopf({
  children,
  variante = 'sekundaer',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: KnopfVariante }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:opacity-50',
        knopfStil[variante],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// --- Abzeichen (Badge) -----------------------------------------------------
type Ton = 'grau' | 'gruen' | 'gelb' | 'rot' | 'blau' | 'lila';
const tonStil: Record<Ton, string> = {
  grau: 'bg-slate-100 text-slate-600',
  gruen: 'bg-emerald-100 text-emerald-700',
  gelb: 'bg-amber-100 text-amber-700',
  rot: 'bg-red-100 text-red-700',
  blau: 'bg-sky-100 text-sky-700',
  lila: 'bg-marke-hell text-marke-dunkel',
};

export function Abzeichen({ children, ton = 'grau' }: { children: React.ReactNode; ton?: Ton }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tonStil[ton])}>
      {children}
    </span>
  );
}

// --- Feld (Label + Inhalt) -------------------------------------------------
export function Feld({
  label,
  children,
  hinweis,
}: {
  label: string;
  children: React.ReactNode;
  hinweis?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hinweis && <span className="mt-1 block text-xs text-slate-400">{hinweis}</span>}
    </label>
  );
}

export const eingabeKlasse =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-marke focus:ring-2 focus:ring-marke/30';

// --- Modal -----------------------------------------------------------------
export function Modal({
  offen,
  onSchliessen,
  titel,
  children,
  fuss,
}: {
  offen: boolean;
  onSchliessen: () => void;
  titel: React.ReactNode;
  children: React.ReactNode;
  fuss?: React.ReactNode;
}) {
  if (!offen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onSchliessen}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-800">{titel}</h3>
          <button
            onClick={onSchliessen}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Schließen"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {fuss && <footer className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">{fuss}</footer>}
      </div>
    </div>
  );
}

// --- Leerzustand -----------------------------------------------------------
export function Leer({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
}
