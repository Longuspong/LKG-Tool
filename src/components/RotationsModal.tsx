'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import {
  ROTATIONS_ROLLEN,
  RotationsModus,
  RotationsRolle,
  RotationsZuweisung,
  effektiveReihenfolge,
  planeRotation,
  wendeRotationAn,
} from '@/lib/model/rotation';
import { rolleLabel } from '@/lib/labels';
import { formatDatumMitTag, formatDatum, quartalVonMonat, quartalsbereich } from '@/lib/date';
import { Abzeichen, Feld, Knopf, Leer, Modal, cx, eingabeKlasse } from './ui';

/**
 * Verteilt Einleitung/Fahrdienst reihum auf die Gemeinschaftsstunden eines
 * Zeitraums. Zeigt zuerst eine Vorschau; jede Zeile laesst sich vor dem
 * Festschreiben von Hand tauschen (manueller Tausch). Event-Tage pausieren die
 * Rotation automatisch.
 */
export default function RotationsModal({
  jahr,
  monat,
  onClose,
}: {
  jahr: number;
  monat: number;
  onClose: () => void;
}) {
  const { data, aendern, meldungSetzen } = useApp();
  const start = quartalsbereich(jahr, quartalVonMonat(monat));

  const [rolle, setRolle] = useState<RotationsRolle>('einleitung');
  const [von, setVon] = useState(start.start);
  const [bis, setBis] = useState(start.ende);
  const [modus, setModus] = useState<RotationsModus>('nurLuecken');
  // Manuelle Tausche je Rolle: terminId -> Person.id | null.
  const [tausch, setTausch] = useState<Record<string, Record<string, string | null>>>({
    einleitung: {},
    fahrdienst: {},
  });

  const personen = useMemo(() => data?.personen ?? [], [data]);
  const nameVon = (id?: string | null) =>
    id ? personen.find((p) => p.id === id)?.name ?? '??' : null;

  const plan = useMemo(() => {
    if (!data) return null;
    return planeRotation({
      rolle,
      reihe: data.rotation[rolle],
      personen: data.personen,
      termine: data.termine,
      von,
      bis,
      modus,
    });
  }, [data, rolle, von, bis, modus]);

  // Auswahlliste fuer den manuellen Tausch: aktive Personen, Rollentreffer zuerst.
  const auswahl = useMemo(() => {
    return [...personen]
      .filter((p) => p.aktiv)
      .sort((a, b) => {
        const ar = a.rollen.includes(rolle) ? 0 : 1;
        const br = b.rollen.includes(rolle) ? 0 : 1;
        if (ar !== br) return ar - br;
        return a.name.localeCompare(b.name);
      });
  }, [personen, rolle]);

  /** Vorschau inkl. manueller Tausche fuer die aktuelle Rolle. */
  const zeilen: RotationsZuweisung[] = useMemo(() => {
    if (!plan) return [];
    const overrides = tausch[rolle] ?? {};
    return plan.zuweisungen.map((z) => {
      if (!(z.terminId in overrides)) return z;
      const neuId = overrides[z.terminId];
      return { ...z, neuId, uebersprungen: false };
    });
  }, [plan, tausch, rolle]);

  const gesetzt = zeilen.filter((z) => !z.uebersprungen && z.neuId !== z.vorherId).length;
  const bleibt = zeilen.length - gesetzt;

  function tauschen(terminId: string, wert: string | null) {
    setTausch((t) => ({ ...t, [rolle]: { ...t[rolle], [terminId]: wert } }));
  }

  async function anwenden() {
    if (!data || zeilen.length === 0) return;
    await aendern((d) => {
      wendeRotationAn(rolle, zeilen, d);
    });
    meldungSetzen({
      art: 'ok',
      text: `${rolleLabel(rolle)}: ${gesetzt} Zuweisung${gesetzt === 1 ? '' : 'en'} gesetzt.`,
    });
    // Tausche dieser Rolle zuruecksetzen (die Belegung steht jetzt im Termin).
    setTausch((t) => ({ ...t, [rolle]: {} }));
  }

  const reihe = data?.rotation[rolle];
  const effektiv = data && reihe ? effektiveReihenfolge(reihe, data.personen) : [];

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel="Rotation verteilen"
      fuss={
        <>
          <Knopf variante="geist" onClick={onClose}>
            Schließen
          </Knopf>
          <Knopf variante="primaer" onClick={anwenden} disabled={gesetzt === 0}>
            {gesetzt > 0 ? `${gesetzt} setzen` : 'Nichts zu setzen'}
          </Knopf>
        </>
      }
    >
      <div className="space-y-3">
        {/* Rollenauswahl */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
          {ROTATIONS_ROLLEN.map((r) => (
            <button
              key={r}
              onClick={() => setRolle(r)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-sm font-medium',
                rolle === r ? 'bg-white text-marke shadow-sm' : 'text-slate-500',
              )}
            >
              {rolleLabel(r)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Von">
            <input type="date" value={von} onChange={(e) => setVon(e.target.value)} className={eingabeKlasse} />
          </Feld>
          <Feld label="Bis">
            <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>

        {/* Modus */}
        <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="radio"
              name="modus"
              checked={modus === 'nurLuecken'}
              onChange={() => setModus('nurLuecken')}
            />
            Nur Lücken füllen
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input type="radio" name="modus" checked={modus === 'alle'} onChange={() => setModus('alle')} />
            Ganzen Zeitraum neu verteilen
          </label>
        </div>

        {/* Reihenfolge-Hinweis */}
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="mb-1 font-medium text-slate-600">Reihenfolge {rolleLabel(rolle)}:</p>
          {effektiv.length === 0 ? (
            <p className="text-slate-400">
              Noch keine Personen – in den Einstellungen unter „Rotationen" festlegen.
            </p>
          ) : (
            <p className="text-slate-500">{effektiv.map((id) => nameVon(id)).join(' → ')}</p>
          )}
        </div>

        {plan?.warnungen.map((w, i) => (
          <p key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {w}
          </p>
        ))}

        {/* Zusammenfassung */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Abzeichen ton="gruen">{gesetzt} werden gesetzt</Abzeichen>
          <Abzeichen ton="grau">{bleibt} bleiben</Abzeichen>
          {plan && plan.pausiert > 0 && <Abzeichen ton="gelb">{plan.pausiert} Event-Pause</Abzeichen>}
        </div>

        {/* Vorschau-Liste */}
        {zeilen.length === 0 ? (
          <Leer>Keine Gemeinschaftsstunden im Zeitraum {formatDatum(von)} – {formatDatum(bis)}.</Leer>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {zeilen.map((z) => {
              const geaendert = !z.uebersprungen && z.neuId !== z.vorherId;
              return (
                <div key={z.terminId} className="flex items-center gap-3 px-3 py-2">
                  <div className="w-28 shrink-0 text-sm text-slate-700">
                    {formatDatumMitTag(z.datum)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {z.uebersprungen ? (
                      <span className="text-sm text-slate-400">
                        bleibt: {nameVon(z.neuId) ?? '— frei —'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        {z.vorherId && (
                          <>
                            <span className="text-slate-400 line-through">{nameVon(z.vorherId)}</span>
                            <span className="text-slate-300">→</span>
                          </>
                        )}
                        <span className={cx('font-medium', geaendert ? 'text-marke-dunkel' : 'text-slate-500')}>
                          {nameVon(z.neuId) ?? '— frei —'}
                        </span>
                      </div>
                    )}
                  </div>
                  <select
                    value={z.neuId ?? ''}
                    onChange={(e) => tauschen(z.terminId, e.target.value || null)}
                    className="w-32 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                    aria-label="Person tauschen"
                  >
                    <option value="">— frei —</option>
                    {auswahl.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
