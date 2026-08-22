'use client';

import { useState } from 'react';
import { useApp } from '@/state/store';
import { Person } from '@/lib/model/types';
import { Abzeichen, Knopf, cx, eingabeKlasse } from './ui';

/** Aktive Personen, optional nach Rolle vorsortiert (rollentreffer zuerst). */
function personenListe(personen: Person[], rolle?: string): Person[] {
  const aktive = personen.filter((p) => p.aktiv);
  if (!rolle) return aktive.sort((a, b) => a.name.localeCompare(b.name));
  return aktive.sort((a, b) => {
    const ar = a.rollen.includes(rolle) ? 0 : 1;
    const br = b.rollen.includes(rolle) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
}

/** Kleiner Inline-Anleger fuer neue Personen. */
function SchnellAnlegen({ rolle, onFertig }: { rolle?: string; onFertig: (id: string) => void }) {
  const personAnlegen = useApp((s) => s.personAnlegen);
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState('');

  async function anlegen() {
    const n = name.trim();
    if (!n) return;
    const id = await personAnlegen({ name: n, rollen: rolle ? [rolle] : [] });
    setName('');
    setOffen(false);
    onFertig(id);
  }

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-1 text-xs font-medium text-marke hover:underline"
      >
        ＋ Neue Person
      </button>
    );
  }
  return (
    <div className="mt-1 flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), anlegen())}
        placeholder="Name"
        className={cx(eingabeKlasse, 'py-1.5 text-sm')}
      />
      <Knopf type="button" variante="primaer" onClick={anlegen} className="shrink-0 px-2 py-1.5">
        OK
      </Knopf>
      <Knopf type="button" variante="geist" onClick={() => setOffen(false)} className="shrink-0 px-2 py-1.5">
        ✕
      </Knopf>
    </div>
  );
}

/** Einzelauswahl (z.B. Prediger, Einleitung). */
export function PersonSelect({
  wert,
  onChange,
  rolle,
  leerLabel = '— keiner —',
}: {
  wert: string | null;
  onChange: (id: string | null) => void;
  rolle?: string;
  leerLabel?: string;
}) {
  const personen = useApp((s) => s.data?.personen ?? []);
  const liste = personenListe(personen, rolle);
  return (
    <div>
      <select value={wert ?? ''} onChange={(e) => onChange(e.target.value || null)} className={eingabeKlasse}>
        <option value="">{leerLabel}</option>
        {liste.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.dienstnummer != null ? ` (#${p.dienstnummer})` : ''}
          </option>
        ))}
      </select>
      <SchnellAnlegen rolle={rolle} onFertig={(id) => onChange(id)} />
    </div>
  );
}

/** Mehrfachauswahl (z.B. Fahrdienst) als Chips. */
export function PersonMulti({
  werte,
  onChange,
  rolle,
}: {
  werte: string[];
  onChange: (ids: string[]) => void;
  rolle?: string;
}) {
  const personen = useApp((s) => s.data?.personen ?? []);
  const liste = personenListe(personen, rolle).filter((p) => !werte.includes(p.id));
  const nameVon = (id: string) => personen.find((p) => p.id === id)?.name ?? id;

  return (
    <div>
      {werte.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {werte.map((id) => (
            <span key={id} className="inline-flex items-center gap-1">
              <Abzeichen ton="blau">{nameVon(id)}</Abzeichen>
              <button
                type="button"
                onClick={() => onChange(werte.filter((x) => x !== id))}
                className="text-xs text-slate-400 hover:text-red-500"
                aria-label="Entfernen"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...werte, e.target.value])}
        className={eingabeKlasse}
      >
        <option value="">＋ hinzufuegen…</option>
        {liste.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.dienstnummer != null ? ` (#${p.dienstnummer})` : ''}
          </option>
        ))}
      </select>
      <SchnellAnlegen rolle={rolle} onFertig={(id) => onChange([...werte, id])} />
    </div>
  );
}
