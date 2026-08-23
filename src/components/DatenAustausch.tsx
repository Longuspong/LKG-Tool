'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/state/store';
import { downloadText } from '@/lib/download';
import { termineCsv, personenCsv, importPersonenCsv, PersonenImportErgebnis } from '@/lib/model/csv';
import { exportIcs } from '@/lib/model/ics';
import { heuteIso } from '@/lib/date';
import { Karte, Knopf } from '@/components/ui';

/**
 * Datenaustausch (Phase 5): CSV-/ICS-Export sowie CSV-Import der Kontaktliste.
 * Der JSON-Voll-Export ("Grundlage/Backup") bleibt bewusst in seiner eigenen
 * Karte – hier geht es um den Austausch mit anderen Programmen.
 */
export default function DatenAustausch() {
  const { data, aendern, meldungSetzen } = useApp();
  const dateiRef = useRef<HTMLInputElement>(null);
  const [vorschau, setVorschau] = useState<PersonenImportErgebnis | null>(null);

  if (!data) return null;
  const heute = heuteIso();

  function kalenderIcs() {
    downloadText(exportIcs(data!), `gemeindeplaner-kalender-${heute}.ics`, 'text/calendar;charset=utf-8');
    meldungSetzen({ art: 'ok', text: 'Kalender als ICS exportiert.' });
  }
  function termineCsvExport() {
    downloadText(termineCsv(data!), `gemeindeplaner-termine-${heute}.csv`, 'text/csv;charset=utf-8', true);
    meldungSetzen({ art: 'ok', text: 'Termine als CSV exportiert.' });
  }
  function personenCsvExport() {
    downloadText(personenCsv(data!), `gemeindeplaner-personen-${heute}.csv`, 'text/csv;charset=utf-8', true);
    meldungSetzen({ art: 'ok', text: 'Personen als CSV exportiert.' });
  }

  async function importDateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setVorschau(importPersonenCsv(text, data!.personen));
    e.target.value = '';
  }
  async function importUebernehmen() {
    if (!vorschau || vorschau.fehler.length > 0) return;
    const neuePersonen = vorschau.personen;
    await aendern((d) => {
      d.personen = neuePersonen;
    });
    setVorschau(null);
    meldungSetzen({ art: 'ok', text: 'Kontaktliste importiert.' });
  }

  return (
    <Karte titel="Datenaustausch (CSV / ICS)">
      <p className="mb-3 text-sm text-slate-500">
        Für den Austausch mit Kalender- und Tabellenprogrammen. Der ICS-Kalender lässt sich am Telefon oder PC
        abonnieren/importieren; CSV öffnet in Excel &amp; Co.
      </p>

      <p className="mb-1 text-xs font-medium text-slate-500">Export</p>
      <div className="flex flex-wrap gap-2">
        <Knopf variante="sekundaer" onClick={kalenderIcs}>
          📅 Kalender (.ics)
        </Knopf>
        <Knopf variante="sekundaer" onClick={termineCsvExport}>
          📊 Termine (.csv)
        </Knopf>
        <Knopf variante="sekundaer" onClick={personenCsvExport}>
          👥 Personen (.csv)
        </Knopf>
        <Link
          href="/drucken"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
        >
          🖨 Dienstplan drucken
        </Link>
      </div>

      <p className="mb-1 mt-4 text-xs font-medium text-slate-500">Import (Kontaktliste)</p>
      <div className="flex flex-wrap gap-2">
        <Knopf variante="sekundaer" onClick={() => dateiRef.current?.click()}>
          ⬆ Personen aus CSV
        </Knopf>
        <input ref={dateiRef} type="file" accept=".csv,text/csv" hidden onChange={importDateiGewaehlt} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Erwartete Spalten (erste Zeile): <code className="rounded bg-slate-100 px-1">Name</code>, optional Dienstnummer,
        Telefon, E-Mail, Rollen, Aktiv, Notiz. Vorhandene Kontakte werden über Dienstnummer bzw. Name erkannt und
        aktualisiert; nichts wird gelöscht.
      </p>

      {vorschau && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">Import-Vorschau</p>
          {vorschau.fehler.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-xs text-red-600">
              {vorschau.fehler.slice(0, 5).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-600">
              {vorschau.neu} neu · {vorschau.aktualisiert} aktualisiert
            </p>
          )}
          {vorschau.warnungen.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-amber-600">
              {vorschau.warnungen.slice(0, 4).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {vorschau.warnungen.length > 4 && <li>… und {vorschau.warnungen.length - 4} weitere Hinweise</li>}
            </ul>
          )}
          <div className="mt-2 flex gap-2">
            <Knopf variante="primaer" onClick={importUebernehmen} disabled={vorschau.fehler.length > 0}>
              Übernehmen
            </Knopf>
            <Knopf variante="geist" onClick={() => setVorschau(null)}>
              Abbrechen
            </Knopf>
          </div>
        </div>
      )}
    </Karte>
  );
}
