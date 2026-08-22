'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import { heuteIso } from '@/lib/date';
import { Karte, Leer } from '@/components/ui';
import TerminZeile from '@/components/TerminZeile';
import TerminFormular from '@/components/TerminFormular';

/**
 * Offene Stunden = Termine mit status "offen" (v.a. die vom Generator erzeugten
 * Skelett-Slots). Der volle Kontakt-Workflow + Vorschlagsfunktion folgt in
 * Phase 4; hier die grundlegende To-do-Liste mit direktem Bearbeiten.
 */
export default function OffenSeite() {
  const data = useApp((s) => s.data);
  const [edit, setEdit] = useState<Termin | null>(null);
  const [nurKommende, setNurKommende] = useState(true);
  const heute = heuteIso();

  const offene = useMemo(() => {
    let l = (data?.termine ?? []).filter((t) => t.status === 'offen');
    if (nurKommende) l = l.filter((t) => t.datum >= heute);
    return l.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));
  }, [data, nurKommende, heute]);

  return (
    <div className="space-y-4">
      <Karte
        titel={`Offene Stunden (${offene.length})`}
        aktion={
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={nurKommende} onChange={(e) => setNurKommende(e.target.checked)} />
            nur kommende
          </label>
        }
      >
        {offene.length === 0 ? (
          <Leer>Keine offenen Stunden. 🎉 Erzeuge im Kalender Regeltermine, um To-dos anzulegen.</Leer>
        ) : (
          <div className="divide-y divide-slate-100">
            {offene.map((t) => (
              <TerminZeile key={t.id} termin={t} onClick={setEdit} />
            ))}
          </div>
        )}
      </Karte>

      <p className="px-1 text-xs text-slate-400">
        Tipp: Tippe auf einen Slot, um Prediger &amp; Dienste zuzuweisen und den Status auf „besetzt" zu setzen. Der
        geführte Kontakt-Workflow und die Vorschlagsfunktion kommen in Phase 4.
      </p>

      {edit && <TerminFormular termin={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
