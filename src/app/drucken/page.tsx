'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import {
  MONATE,
  WOCHENTAGE_KURZ,
  ausIso,
  formatDatum,
  heuteIso,
  monatsbereich,
  quartalVonMonat,
  quartalsbereich,
  wochentag,
} from '@/lib/date';
import { TYP_LABEL } from '@/lib/labels';
import { Knopf, Leer, cx } from '@/components/ui';

type Bereich = 'monat' | 'quartal';

/**
 * Druck-Ansicht (Phase 5): ein sauberer Dienstplan zum Aushaengen/Verteilen.
 * Auf dem Bildschirm mit Zeitraum-Auswahl, im Ausdruck nur die Tabelle
 * (Steuerung traegt `kein-druck`, Feinschliff in globals.css).
 */
export default function DruckenSeite() {
  const data = useApp((s) => s.data);
  const heute = heuteIso();
  const { jahr: hJahr, monat: hMonat } = ausIso(heute);

  const [bereich, setBereich] = useState<Bereich>('monat');
  const [jahr, setJahr] = useState(hJahr);
  const [monat, setMonat] = useState(hMonat); // 1-12
  const [nurRelevante, setNurRelevante] = useState(false);

  const spanne = useMemo(
    () => (bereich === 'quartal' ? quartalsbereich(jahr, quartalVonMonat(monat)) : monatsbereich(jahr, monat)),
    [bereich, jahr, monat],
  );

  const nameVon = (id?: string | null) =>
    id ? data?.personen.find((p) => p.id === id)?.name ?? '?' : '';

  const termine = useMemo(() => {
    let liste = (data?.termine ?? []).filter((t) => t.datum >= spanne.start && t.datum <= spanne.ende);
    if (nurRelevante) {
      liste = liste.filter((t) => t.istEvent || t.typ === 'gemeinschaftsstunde' || t.typ === 'bibelstunde');
    }
    return liste.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));
  }, [data, spanne, nurRelevante]);

  function schritt(richtung: number) {
    const spr = bereich === 'quartal' ? 3 : 1;
    let m = monat + richtung * spr;
    let j = jahr;
    while (m > 12) { m -= 12; j++; }
    while (m < 1) { m += 12; j--; }
    setMonat(m);
    setJahr(j);
  }

  const titel =
    bereich === 'quartal' ? `Dienstplan Q${quartalVonMonat(monat)} ${jahr}` : `Dienstplan ${MONATE[monat - 1]} ${jahr}`;

  return (
    <div className="space-y-4">
      {/* Steuerung – nicht im Ausdruck */}
      <div className="kein-druck space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
            {(['monat', 'quartal'] as Bereich[]).map((b) => (
              <button
                key={b}
                onClick={() => setBereich(b)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium capitalize',
                  bereich === b ? 'bg-white text-marke shadow-sm' : 'text-slate-500',
                )}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Knopf variante="primaer" onClick={() => window.print()}>
            🖨 Drucken
          </Knopf>
        </div>

        <div className="flex items-center justify-between">
          <Knopf variante="geist" onClick={() => schritt(-1)}>
            ‹
          </Knopf>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">
              {bereich === 'quartal' ? `Q${quartalVonMonat(monat)} ${jahr}` : `${MONATE[monat - 1]} ${jahr}`}
            </span>
            <label className="flex items-center gap-1 text-xs text-slate-500">
              <input type="checkbox" checked={nurRelevante} onChange={(e) => setNurRelevante(e.target.checked)} />
              nur Gemeinschafts-/Bibelstunden
            </label>
          </div>
          <Knopf variante="geist" onClick={() => schritt(1)}>
            ›
          </Knopf>
        </div>
      </div>

      {/* Druckbereich */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{titel}</h2>
          <span className="text-xs text-slate-400">Stand: {formatDatum(heute)}</span>
        </div>

        {termine.length === 0 ? (
          <Leer>Keine Termine im gewählten Zeitraum.</Leer>
        ) : (
          <div className="overflow-x-auto">
            <table className="druck-tabelle w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">Datum</th>
                  <th className="py-2 pr-2">Zeit</th>
                  <th className="py-2 pr-2">Anlass</th>
                  <th className="py-2 pr-2">Prediger</th>
                  <th className="py-2 pr-2">Einleitung</th>
                  <th className="py-2 pr-2">Fahrdienst</th>
                  <th className="py-2">Ort</th>
                </tr>
              </thead>
              <tbody>
                {termine.map((t) => (
                  <PlanZeile key={t.id} termin={t} nameVon={nameVon} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanZeile({ termin: t, nameVon }: { termin: Termin; nameVon: (id?: string | null) => string }) {
  const tag = WOCHENTAGE_KURZ[wochentag(t.datum)];
  const prediger = nameVon(t.predigerId);
  const fahrer = t.fahrdienstIds.map(nameVon).filter(Boolean).join(', ');
  const anlass = t.istEvent ? `${TYP_LABEL[t.typ]} (Event)` : TYP_LABEL[t.typ];
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="py-2 pr-2 whitespace-nowrap font-medium text-slate-800">
        {tag}, {formatDatum(t.datum)}
      </td>
      <td className="py-2 pr-2 whitespace-nowrap text-slate-600">{t.uhrzeit}</td>
      <td className="py-2 pr-2 text-slate-600">
        {anlass}
        {t.abendmahl && <span className="text-slate-400"> · Abendmahl</span>}
      </td>
      <td className={cx('py-2 pr-2', prediger ? 'text-slate-800' : 'text-slate-400')}>{prediger || '—'}</td>
      <td className="py-2 pr-2 text-slate-600">{nameVon(t.einleitungId) || '—'}</td>
      <td className="py-2 pr-2 text-slate-600">{fahrer || '—'}</td>
      <td className="py-2 text-slate-600">{t.ort}</td>
    </tr>
  );
}
