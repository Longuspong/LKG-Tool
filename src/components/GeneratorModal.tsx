'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { generiereSlots } from '@/lib/model/slots';
import { quartalVonMonat, quartalsbereich, formatDatum } from '@/lib/date';
import { Feld, Knopf, Modal, eingabeKlasse } from './ui';

/**
 * Erzeugt fuer einen Zeitraum die regulaeren Skelett-Termine (status "offen")
 * gemaess den Regelterminen aus den Einstellungen. Mit Vorschau vor dem
 * Festschreiben.
 */
export default function GeneratorModal({
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
  const [von, setVon] = useState(start.start);
  const [bis, setBis] = useState(start.ende);

  const vorschau = useMemo(() => {
    if (!data) return null;
    return generiereSlots(von, bis, data.settings.regelTermine, data.termine);
  }, [data, von, bis]);

  async function erzeugen() {
    if (!vorschau || vorschau.neue.length === 0) return;
    await aendern((d) => {
      d.termine.push(...vorschau.neue);
    });
    meldungSetzen({ art: 'ok', text: `${vorschau.neue.length} Termine erzeugt.` });
    onClose();
  }

  const aktiveRegeln = data?.settings.regelTermine.filter((r) => r.aktiv) ?? [];

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel="Regeltermine erzeugen"
      fuss={
        <>
          <Knopf variante="geist" onClick={onClose}>
            Abbrechen
          </Knopf>
          <Knopf variante="primaer" onClick={erzeugen} disabled={!vorschau || vorschau.neue.length === 0}>
            {vorschau ? `${vorschau.neue.length} erzeugen` : 'Erzeugen'}
          </Knopf>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Erzeugt leere, offene Slots für die aktiven Regeltermine. Bereits vorhandene Termine und Event-Tage werden
          übersprungen.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Von">
            <input type="date" value={von} onChange={(e) => setVon(e.target.value)} className={eingabeKlasse} />
          </Feld>
          <Feld label="Bis">
            <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="mb-1 font-medium text-slate-600">Aktive Regeltermine:</p>
          {aktiveRegeln.length === 0 ? (
            <p className="text-slate-400">Keine – bitte in den Einstellungen anlegen.</p>
          ) : (
            <ul className="list-inside list-disc text-slate-500">
              {aktiveRegeln.map((r, i) => (
                <li key={i}>
                  {r.label}: {r.uhrzeit}
                  {r.ersterImMonatUhrzeit ? ` (1. im Monat: ${r.ersterImMonatUhrzeit})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        {vorschau && (
          <div className="rounded-xl border border-marke/20 bg-marke-hell/50 p-3 text-sm text-slate-700">
            <p>
              Zeitraum {formatDatum(von)} – {formatDatum(bis)}:
            </p>
            <p className="mt-1 font-semibold text-marke-dunkel">{vorschau.neue.length} neue Termine</p>
            <p className="text-xs text-slate-500">
              {vorschau.uebersprungenVorhanden} bereits vorhanden · {vorschau.uebersprungenEvent} wegen Event-Tag
              ausgelassen
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
