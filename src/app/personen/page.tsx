'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '@/state/store';
import { Person, Termin } from '@/lib/model/types';
import { historieAlle, PersonHistorie } from '@/lib/model/derive';
import { formatDatum, formatRelativeTage, heuteIso, tageDifferenz } from '@/lib/date';
import { rolleLabel } from '@/lib/labels';
import { Abzeichen, Karte, Knopf, Leer, cx, eingabeKlasse } from '@/components/ui';
import PersonFormular from '@/components/PersonFormular';
import PersonDetail from '@/components/PersonDetail';
import TerminFormular from '@/components/TerminFormular';

/**
 * Kontakt-Archiv (Phase 3): dieselbe Personenliste ist jetzt eine vollwertige
 * Archiv-Sicht mit Suche, Rollen-/Status-Filter und mehreren Sortierungen.
 * Alle Kennzahlen (Besuche, letzter/naechster Termin) werden live aus den
 * Terminen abgeleitet – ein Klick oeffnet das volle Kontakt-Archiv (PersonDetail).
 */

type StatusFilter = 'aktiv' | 'inaktiv' | 'alle';
type Sortierung = 'name' | 'haeufig' | 'zuletzt' | 'laengsten' | 'naechster';

const SORT_LABEL: Record<Sortierung, string> = {
  name: 'Name (A–Z)',
  haeufig: 'Häufigkeit (meiste zuerst)',
  zuletzt: 'Zuletzt da (kürzlich zuerst)',
  laengsten: 'Am längsten nicht da',
  naechster: 'Nächster Termin',
};

export default function PersonenSeite() {
  const data = useApp((s) => s.data);
  const [suche, setSuche] = useState('');
  const [rolleFilter, setRolleFilter] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('aktiv');
  const [sortierung, setSortierung] = useState<Sortierung>('name');

  const [detail, setDetail] = useState<Person | null>(null);
  const [edit, setEdit] = useState<Person | null>(null);
  const [neu, setNeu] = useState(false);
  const [terminEdit, setTerminEdit] = useState<Termin | null>(null);

  const heute = heuteIso();
  const historie = useMemo(
    () => (data ? historieAlle(data.personen, data.termine) : new Map<string, PersonHistorie>()),
    [data],
  );
  const rollen = data?.settings.rollen ?? [];

  const gefiltert = useMemo(() => {
    let l = data?.personen ?? [];

    if (status === 'aktiv') l = l.filter((p) => p.aktiv);
    else if (status === 'inaktiv') l = l.filter((p) => !p.aktiv);

    if (rolleFilter) l = l.filter((p) => p.rollen.includes(rolleFilter));

    const q = suche.trim().toLowerCase();
    if (q) {
      l = l.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.dienstnummer ?? '').includes(q) ||
          (p.telefon ?? '').toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q),
      );
    }

    const nachName = (a: Person, b: Person) => a.name.localeCompare(b.name);
    const h = (id: string) => historie.get(id);

    return [...l].sort((a, b) => {
      switch (sortierung) {
        case 'haeufig':
          return (h(b.id)?.anzahlBesuche ?? 0) - (h(a.id)?.anzahlBesuche ?? 0) || nachName(a, b);
        case 'zuletzt': {
          // Kuerzlich zuerst; "noch nie da" ans Ende.
          const la = h(a.id)?.letzterBesuch ?? '';
          const lb = h(b.id)?.letzterBesuch ?? '';
          if (la === lb) return nachName(a, b);
          if (!la) return 1;
          if (!lb) return -1;
          return lb.localeCompare(la);
        }
        case 'laengsten': {
          // Am laengsten nicht da zuerst; "noch nie da" ganz vorne.
          const la = h(a.id)?.letzterBesuch ?? '';
          const lb = h(b.id)?.letzterBesuch ?? '';
          if (la === lb) return nachName(a, b);
          if (!la) return -1;
          if (!lb) return 1;
          return la.localeCompare(lb);
        }
        case 'naechster': {
          // Bald zuerst; "kein Termin" ans Ende.
          const na = h(a.id)?.naechsterTermin ?? '';
          const nb = h(b.id)?.naechsterTermin ?? '';
          if (na === nb) return nachName(a, b);
          if (!na) return 1;
          if (!nb) return -1;
          return na.localeCompare(nb);
        }
        default:
          return nachName(a, b);
      }
    });
  }, [data, status, rolleFilter, suche, sortierung, historie]);

  return (
    <div className="space-y-4">
      {/* Suche + Neu */}
      <div className="flex items-center gap-2">
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suche: Name, Nr., Telefon, E-Mail"
          className={cx(eingabeKlasse, 'flex-1')}
        />
        <Knopf variante="primaer" onClick={() => setNeu(true)}>
          ＋ Neu
        </Knopf>
      </div>

      {/* Rollen-Filter */}
      {rollen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip aktiv={rolleFilter === null} onClick={() => setRolleFilter(null)}>
            Alle Rollen
          </FilterChip>
          {rollen.map((r) => (
            <FilterChip key={r} aktiv={rolleFilter === r} onClick={() => setRolleFilter(rolleFilter === r ? null : r)}>
              {rolleLabel(r)}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Status-Segment + Sortierung */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
          {(['aktiv', 'inaktiv', 'alle'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-sm font-medium capitalize',
                status === s ? 'bg-white text-marke shadow-sm' : 'text-slate-500',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="hidden sm:inline">Sortierung</span>
          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value as Sortierung)}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            {(Object.keys(SORT_LABEL) as Sortierung[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Karte titel={`Personen (${gefiltert.length})`}>
        {gefiltert.length === 0 ? (
          <Leer>Keine Personen gefunden.</Leer>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gefiltert.map((p) => {
              const h = historie.get(p.id);
              const tageSeit = h?.letzterBesuch ? tageDifferenz(h.letzterBesuch, heute) : null;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setDetail(p)}
                    className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cx('truncate font-medium', p.aktiv ? 'text-slate-800' : 'text-slate-400')}>
                          {p.name}
                        </span>
                        {!p.aktiv && <Abzeichen ton="grau">inaktiv</Abzeichen>}
                        {p.dienstnummer != null && <span className="text-xs text-slate-400">#{p.dienstnummer}</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {p.rollen.map((r) => (
                          <Abzeichen key={r} ton="lila">
                            {rolleLabel(r)}
                          </Abzeichen>
                        ))}
                        {h?.naechsterTermin && (
                          <span className="text-xs text-emerald-600">
                            nächster {formatDatum(h.naechsterTermin)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <div>{h?.anzahlBesuche ?? 0}× dabei</div>
                      {h?.letzterBesuch ? (
                        <div className="text-slate-400">{formatRelativeTage(-(tageSeit ?? 0))}</div>
                      ) : (
                        <div className="text-slate-300">noch nie da</div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Karte>

      {detail && (
        <PersonDetail
          person={detail}
          onClose={() => setDetail(null)}
          onBearbeiten={(p) => {
            setDetail(null);
            setEdit(p);
          }}
          onTermin={(t) => {
            setDetail(null);
            setTerminEdit(t);
          }}
        />
      )}

      {(edit || neu) && (
        <PersonFormular
          person={edit}
          onClose={() => {
            setEdit(null);
            setNeu(false);
          }}
        />
      )}

      {terminEdit && <TerminFormular termin={terminEdit} onClose={() => setTerminEdit(null)} />}
    </div>
  );
}

function FilterChip({
  children,
  aktiv,
  onClick,
}: {
  children: ReactNode;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1 text-sm font-medium transition',
        aktiv ? 'bg-marke text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}
