'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import { OFFEN_PHASEN, offenPhase } from '@/lib/model/gaps';
import { heuteIso } from '@/lib/date';
import { OFFEN_PHASE_HINWEIS, OFFEN_PHASE_LABEL, OFFEN_PHASE_TON } from '@/lib/labels';
import { Abzeichen, Karte, Knopf, Leer } from '@/components/ui';
import TerminZeile from '@/components/TerminZeile';
import TerminFormular from '@/components/TerminFormular';
import KontaktWorkflow from '@/components/KontaktWorkflow';

/**
 * Offene Stunden = die Arbeitsliste des Kontakt-Workflows (Phase 4).
 *
 * Gezeigt werden nur Termine, die noch etwas brauchen (kein Prediger, Kontakt
 * offen, Rueckmeldung ausstehend oder Absage) – nach Dringlichkeit gruppiert.
 * Ein Klick oeffnet den gefuehrten Ablauf mit Vorschlaegen und Kontaktschritten;
 * „Alle durchgehen" blaettert die ganze Liste chronologisch durch.
 */
export default function OffenSeite() {
  const data = useApp((s) => s.data);
  const [nurKommende, setNurKommende] = useState(true);
  // Durchlauf: bei Start eingefrorene Reihenfolge der Termin-IDs + aktuelle Position.
  // Eingefroren, damit erledigte Slots die Navigation nicht unter den Fingern verschieben.
  const [queue, setQueue] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [form, setForm] = useState<Termin | null>(null);
  const heute = heuteIso();

  const liste = useMemo(() => {
    let l = (data?.termine ?? []).filter((t) => offenPhase(t) !== null);
    if (nurKommende) l = l.filter((t) => t.datum >= heute);
    return l.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));
  }, [data, nurKommende, heute]);

  const gruppen = useMemo(
    () =>
      OFFEN_PHASEN.map((ph) => ({ ph, termine: liste.filter((t) => offenPhase(t) === ph) })).filter(
        (g) => g.termine.length > 0,
      ),
    [liste],
  );

  function durchgehen(startId?: string) {
    const ids = liste.map((t) => t.id);
    const start = startId ? Math.max(0, ids.indexOf(startId)) : 0;
    setQueue(ids);
    setPos(start);
  }
  function schliessen() {
    setQueue(null);
    setPos(0);
  }

  const aktuellId = queue ? queue[pos] : undefined;

  return (
    <div className="space-y-4">
      <Karte
        titel={`Zu erledigen (${liste.length})`}
        aktion={
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={nurKommende}
              onChange={(e) => setNurKommende(e.target.checked)}
            />
            nur kommende
          </label>
        }
      >
        {liste.length === 0 ? (
          <Leer>Nichts offen. 🎉 Alle kommenden Stunden sind besetzt und bestätigt.</Leer>
        ) : (
          <div className="space-y-4">
            <Knopf variante="primaer" onClick={() => durchgehen()} className="w-full sm:w-auto">
              ▶ Alle durchgehen ({liste.length})
            </Knopf>

            {gruppen.map(({ ph, termine }) => (
              <div key={ph}>
                <div className="mb-1 flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {OFFEN_PHASE_LABEL[ph]}
                  </h3>
                  <Abzeichen ton={OFFEN_PHASE_TON[ph]}>{termine.length}</Abzeichen>
                </div>
                <p className="mb-1 px-1 text-xs text-slate-400">{OFFEN_PHASE_HINWEIS[ph]}</p>
                <div className="divide-y divide-slate-100">
                  {termine.map((t) => (
                    <TerminZeile key={t.id} termin={t} onClick={(x) => durchgehen(x.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Karte>

      <p className="px-1 text-xs text-slate-400">
        Tipp: Der geführte Ablauf schlägt beim Besetzen automatisch Personen vor – wer am längsten
        nicht dran war, steht oben. So übersiehst du niemanden.
      </p>

      {queue && aktuellId && (
        <KontaktWorkflow
          terminId={aktuellId}
          position={{ index: pos, total: queue.length }}
          onClose={schliessen}
          onDetails={(t) => {
            schliessen();
            setForm(t);
          }}
          zurueck={pos > 0 ? () => setPos((p) => Math.max(0, p - 1)) : undefined}
          weiter={pos < queue.length - 1 ? () => setPos((p) => p + 1) : schliessen}
        />
      )}

      {form && <TerminFormular termin={form} onClose={() => setForm(null)} />}
    </div>
  );
}
