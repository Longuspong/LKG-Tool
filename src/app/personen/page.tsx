'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Person } from '@/lib/model/types';
import { historieAlle } from '@/lib/model/derive';
import { formatDatum } from '@/lib/date';
import { Abzeichen, Karte, Knopf, Leer, cx, eingabeKlasse } from '@/components/ui';
import PersonFormular from '@/components/PersonFormular';

/**
 * Personen/Kontakte (Grundfunktionen). Zeigt bereits die aus den Terminen
 * abgeleitete Historie (Besuche, letzter Besuch). Die volle Archiv-Sicht mit
 * Suche/Filter nach Haeufigkeit folgt in Phase 3.
 */
export default function PersonenSeite() {
  const data = useApp((s) => s.data);
  const [suche, setSuche] = useState('');
  const [zeigeInaktive, setZeigeInaktive] = useState(false);
  const [edit, setEdit] = useState<Person | null>(null);
  const [neu, setNeu] = useState(false);

  const historie = useMemo(
    () => (data ? historieAlle(data.personen, data.termine) : new Map()),
    [data],
  );

  const gefiltert = useMemo(() => {
    let l = data?.personen ?? [];
    if (!zeigeInaktive) l = l.filter((p) => p.aktiv);
    const q = suche.trim().toLowerCase();
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q) || String(p.dienstnummer ?? '').includes(q));
    return [...l].sort((a, b) => a.name.localeCompare(b.name));
  }, [data, suche, zeigeInaktive]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suche nach Name / Dienstnummer"
          className={cx(eingabeKlasse, 'flex-1')}
        />
        <Knopf variante="primaer" onClick={() => setNeu(true)}>
          ＋ Neu
        </Knopf>
      </div>

      <label className="flex items-center gap-2 px-1 text-xs text-slate-500">
        <input type="checkbox" checked={zeigeInaktive} onChange={(e) => setZeigeInaktive(e.target.checked)} />
        Inaktive anzeigen
      </label>

      <Karte titel={`Personen (${gefiltert.length})`}>
        {gefiltert.length === 0 ? (
          <Leer>Keine Personen gefunden.</Leer>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gefiltert.map((p) => {
              const h = historie.get(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setEdit(p)}
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
                            {r}
                          </Abzeichen>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <div>{h?.anzahlBesuche ?? 0}× dabei</div>
                      {h?.letzterBesuch && <div className="text-slate-400">zuletzt {formatDatum(h.letzterBesuch)}</div>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Karte>

      {(edit || neu) && (
        <PersonFormular
          person={edit}
          onClose={() => {
            setEdit(null);
            setNeu(false);
          }}
        />
      )}
    </div>
  );
}
