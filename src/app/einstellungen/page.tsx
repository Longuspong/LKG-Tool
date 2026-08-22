'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/state/store';
import { exportJson, importJson, ImportErgebnis } from '@/lib/model/io';
import { RegelTermin, TERMIN_TYPEN } from '@/lib/model/types';
import { TYP_LABEL } from '@/lib/labels';
import { WOCHENTAGE_LANG, formatDatumMitTag, heuteIso } from '@/lib/date';
import { Feld, Karte, Knopf, cx, eingabeKlasse } from '@/components/ui';
import RotationEditor from '@/components/RotationEditor';

function downloadJson(text: string, dateiname: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function EinstellungenSeite() {
  const { data, aendern, ersetzen, setCode, meldungSetzen } = useApp();
  const dateiRef = useRef<HTMLInputElement>(null);
  const [importVorschau, setImportVorschau] = useState<ImportErgebnis | null>(null);

  if (!data) return <Karte titel="Einstellungen">Keine Daten geladen.</Karte>;

  // --- Backup / Export ---
  function backupHerunterladen() {
    const heute = heuteIso();
    downloadJson(exportJson(data!), `gemeindeplaner-backup-${heute}.json`);
    aendern((d) => {
      d.settings.letztesBackup = new Date().toISOString();
    });
    meldungSetzen({ art: 'ok', text: 'Backup heruntergeladen und Zeitpunkt vermerkt.' });
  }

  // --- Import ---
  async function importDateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setImportVorschau(importJson(text));
    e.target.value = '';
  }
  async function importUebernehmen() {
    if (!importVorschau?.data) return;
    await ersetzen(importVorschau.data);
    setImportVorschau(null);
    meldungSetzen({ art: 'ok', text: 'Daten importiert.' });
  }

  // --- Regeltermine ---
  function regelAendern(i: number, teil: Partial<RegelTermin>) {
    aendern((d) => {
      d.settings.regelTermine[i] = { ...d.settings.regelTermine[i], ...teil };
    });
  }

  const s = data.settings;

  return (
    <div className="space-y-4">
      {/* Backup / Grundlage */}
      <Karte titel="Backup & Grundlage (JSON)">
        <p className="mb-3 text-sm text-slate-500">
          Der komplette Bestand (Termine, Personen, Konfiguration) als eine Datei. Deine Grundlage zum Sichern und
          Wiederherstellen.
        </p>
        <div className="flex flex-wrap gap-2">
          <Knopf variante="primaer" onClick={backupHerunterladen}>
            ⬇ Backup herunterladen
          </Knopf>
          <Knopf variante="sekundaer" onClick={() => dateiRef.current?.click()}>
            ⬆ Import (JSON)
          </Knopf>
          <input ref={dateiRef} type="file" accept="application/json,.json" hidden onChange={importDateiGewaehlt} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Letztes Backup:{' '}
          {s.letztesBackup ? formatDatumMitTag(s.letztesBackup.slice(0, 10)) : 'noch keins'}
        </p>

        {importVorschau && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Import-Vorschau</p>
            {importVorschau.data && (
              <p className="mt-1 text-slate-600">
                {importVorschau.data.personen.length} Personen · {importVorschau.data.termine.length} Termine
              </p>
            )}
            {importVorschau.pruefung.fehler.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-red-600">
                {importVorschau.pruefung.fehler.slice(0, 5).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            {importVorschau.pruefung.warnungen.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-amber-600">
                {importVorschau.pruefung.warnungen.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <Knopf
                variante="primaer"
                onClick={importUebernehmen}
                disabled={!importVorschau.pruefung.ok}
              >
                Ersetzen &amp; übernehmen
              </Knopf>
              <Knopf variante="geist" onClick={() => setImportVorschau(null)}>
                Abbrechen
              </Knopf>
            </div>
            {!importVorschau.pruefung.ok && (
              <p className="mt-1 text-xs text-red-500">Import wegen Fehlern gesperrt.</p>
            )}
          </div>
        )}
      </Karte>

      {/* Regeltermine */}
      <Karte titel="Regeltermine (für den Slot-Generator)">
        <div className="space-y-3">
          {s.regelTermine.map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  value={r.label}
                  onChange={(e) => regelAendern(i, { label: e.target.value })}
                  className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input type="checkbox" checked={r.aktiv} onChange={(e) => regelAendern(i, { aktiv: e.target.checked })} />
                  aktiv
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Feld label="Wochentag">
                  <select
                    value={r.wochentag}
                    onChange={(e) => regelAendern(i, { wochentag: Number(e.target.value) })}
                    className={eingabeKlasse}
                  >
                    {WOCHENTAGE_LANG.map((w, idx) => (
                      <option key={idx} value={idx}>
                        {w}
                      </option>
                    ))}
                  </select>
                </Feld>
                <Feld label="Typ">
                  <select
                    value={r.typ}
                    onChange={(e) => regelAendern(i, { typ: e.target.value as RegelTermin['typ'] })}
                    className={eingabeKlasse}
                  >
                    {TERMIN_TYPEN.map((t) => (
                      <option key={t} value={t}>
                        {TYP_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </Feld>
                <Feld label="Uhrzeit">
                  <input
                    type="time"
                    value={r.uhrzeit}
                    onChange={(e) => regelAendern(i, { uhrzeit: e.target.value })}
                    className={eingabeKlasse}
                  />
                </Feld>
                <Feld label="1. im Monat (optional)">
                  <input
                    type="time"
                    value={r.ersterImMonatUhrzeit ?? ''}
                    onChange={(e) => regelAendern(i, { ersterImMonatUhrzeit: e.target.value || null })}
                    className={eingabeKlasse}
                  />
                </Feld>
                <Feld label="Ort">
                  <input
                    value={r.ort}
                    onChange={(e) => regelAendern(i, { ort: e.target.value })}
                    className={eingabeKlasse}
                  />
                </Feld>
              </div>
            </div>
          ))}
        </div>
      </Karte>

      {/* Rotationen */}
      <RotationEditor />

      {/* Allgemeine Einstellungen */}
      <Karte titel="Allgemein">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Feld label="Standard-Ort für neue Termine">
            <input
              value={s.ort}
              onChange={(e) => aendern((d) => void (d.settings.ort = e.target.value))}
              className={eingabeKlasse}
            />
          </Feld>
          <Feld label="Backup-Erinnerung nach (Tagen)">
            <input
              type="number"
              value={s.backupErinnerungTage}
              onChange={(e) => aendern((d) => void (d.settings.backupErinnerungTage = Number(e.target.value) || 0))}
              className={eingabeKlasse}
            />
          </Feld>
        </div>
        <RollenEditor />
      </Karte>

      {/* Zugriffscode */}
      <ZugriffsCode setCode={setCode} />

      {/* Info */}
      <Karte titel="Über">
        <p className="text-sm text-slate-500">
          Gemeindeplaner · Phase 1 (MVP). Daten liegen als eine JSON im Vercel Blob (Single Point of Truth) mit lokalem
          IndexedDB-Cache. Änderungen werden zwischen deinen Geräten per Versionsprüfung abgeglichen.
        </p>
        <p className="mt-2 text-xs text-slate-400">Datenversion: {data.version} · Schema: {data.schema}</p>
      </Karte>
    </div>
  );
}

function RollenEditor() {
  const { data, aendern } = useApp();
  const [neu, setNeu] = useState('');
  const rollen = data?.settings.rollen ?? [];

  function hinzufuegen() {
    const r = neu.trim().toLowerCase();
    if (!r || rollen.includes(r)) return;
    aendern((d) => void d.settings.rollen.push(r));
    setNeu('');
  }
  function entfernen(r: string) {
    aendern((d) => void (d.settings.rollen = d.settings.rollen.filter((x) => x !== r)));
  }

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-medium text-slate-500">Rollen</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {rollen.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm capitalize text-slate-600">
            {r}
            <button onClick={() => entfernen(r)} className="text-slate-400 hover:text-red-500" aria-label="Entfernen">
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), hinzufuegen())}
          placeholder="Neue Rolle"
          className={cx(eingabeKlasse, 'flex-1')}
        />
        <Knopf variante="sekundaer" onClick={hinzufuegen}>
          Hinzufügen
        </Knopf>
      </div>
    </div>
  );
}

function ZugriffsCode({ setCode }: { setCode: (c: string) => Promise<void> }) {
  const [wert, setWert] = useState('');
  return (
    <Karte titel="Zugriffscode (dieses Gerät)">
      <p className="mb-3 text-sm text-slate-500">
        Der Code wird nur lokal auf diesem Gerät gemerkt und bei jeder Server-Anfrage mitgeschickt. Der eigentliche Code
        wird server-seitig über die Umgebungsvariable <code className="rounded bg-slate-100 px-1">APP_ACCESS_CODE</code>{' '}
        festgelegt.
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder="Neuen Code merken"
          className={cx(eingabeKlasse, 'flex-1')}
        />
        <Knopf variante="sekundaer" onClick={() => wert && setCode(wert.trim())}>
          Merken
        </Knopf>
      </div>
    </Karte>
  );
}
