'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/state/store';
import { cx } from './ui';

interface NavPunkt {
  href: string;
  label: string;
  icon: string;
}

const PUNKTE: NavPunkt[] = [
  { href: '/', label: 'Start', icon: '🏠' },
  { href: '/kalender', label: 'Kalender', icon: '📅' },
  { href: '/offen', label: 'Offen', icon: '📋' },
  { href: '/personen', label: 'Personen', icon: '👥' },
  { href: '/einstellungen', label: 'Mehr', icon: '⚙️' },
];

function titelFuer(pfad: string): string {
  if (pfad === '/') return 'Dashboard';
  if (pfad.startsWith('/kalender')) return 'Kalender';
  if (pfad.startsWith('/offen')) return 'Offene Stunden';
  if (pfad.startsWith('/personen')) return 'Personen';
  if (pfad.startsWith('/archiv')) return 'Archiv';
  if (pfad.startsWith('/drucken')) return 'Dienstplan drucken';
  if (pfad.startsWith('/einstellungen')) return 'Einstellungen';
  return 'Gemeindeplaner';
}

function istAktiv(pfad: string, href: string): boolean {
  if (href === '/') return pfad === '/';
  return pfad.startsWith(href);
}

/** Kompakte Sync-Anzeige oben rechts. */
function SyncAnzeige() {
  const { online, pending, speichert, aktualisieren } = useApp();
  let text = 'Aktuell';
  let ton = 'text-emerald-600';
  if (speichert) {
    text = 'Speichert…';
    ton = 'text-slate-500';
  } else if (!online) {
    text = 'Offline';
    ton = 'text-amber-600';
  } else if (pending) {
    text = 'Nicht synchron';
    ton = 'text-amber-600';
  }
  return (
    <button
      onClick={() => aktualisieren()}
      title="Mit Server abgleichen"
      className={cx('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-slate-100', ton)}
    >
      <span className={cx('inline-block h-2 w-2 rounded-full', online && !pending ? 'bg-emerald-500' : 'bg-amber-500')} />
      {text}
    </button>
  );
}

export function TopBar() {
  const pfad = usePathname();
  return (
    <header className="kein-druck sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-marke-hell text-lg"
          aria-label="Zum Dashboard"
        >
          🏠
        </Link>
        <h1 className="flex-1 truncate text-base font-semibold text-slate-800">{titelFuer(pfad)}</h1>
        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-1 sm:flex">
          {PUNKTE.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={cx(
                'rounded-lg px-3 py-1.5 text-sm font-medium',
                istAktiv(pfad, p.href) ? 'bg-marke text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <SyncAnzeige />
      </div>
    </header>
  );
}

export function TabLeiste() {
  const pfad = usePathname();
  return (
    <nav className="tab-leiste kein-druck fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white sm:hidden">
      <ul className="mx-auto flex max-w-3xl">
        {PUNKTE.map((p) => {
          const aktiv = istAktiv(pfad, p.href);
          return (
            <li key={p.href} className="flex-1">
              <Link
                href={p.href}
                className={cx(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  aktiv ? 'text-marke' : 'text-slate-500',
                )}
              >
                <span className="text-xl leading-none">{p.icon}</span>
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
