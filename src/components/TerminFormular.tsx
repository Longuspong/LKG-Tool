'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Termin, TERMIN_STATUS, TERMIN_TYPEN, KONTAKT_STATUS, TerminTyp } from '@/lib/model/types';
import { terminId } from '@/lib/model/ids';
import { istIsoDatum, istUhrzeit } from '@/lib/date';
import { TYP_LABEL, STATUS_LABEL, KONTAKT_LABEL } from '@/lib/labels';
import { Feld, Knopf, Modal, eingabeKlasse } from './ui';
import { PersonSelect, PersonMulti } from './PersonAuswahl';

function neuerEntwurf(datum: string, ort: string): Termin {
  return {
    id: '',
    datum,
    uhrzeit: '10:00',
    ort,
    typ: 'gemeinschaftsstunde',
    predigerId: null,
    abendmahl: false,
    einleitungId: null,
    fahrdienstIds: [],
    kommentar: '',
    istEvent: false,
    status: 'offen',
    kontaktStatus: 'offen',
  };
}

/**
 * Anlegen/Bearbeiten/Loeschen eines Termins – der granulare Eingriff an genau
 * einem Datensatz (Prediger, Einleitung, Fahrdienst, Abendmahl, Status …).
 */
export default function TerminFormular({
  termin,
  datumVorgabe,
  onClose,
}: {
  termin: Termin | null; // null = neu
  datumVorgabe?: string;
  onClose: () => void;
}) {
  const { data, aendern } = useApp();
  const standardOrt = data?.settings.ort ?? 'Gemeinschaftshaus';
  const [entwurf, setEntwurf] = useState<Termin>(
    termin ? { ...termin } : neuerEntwurf(datumVorgabe ?? '', standardOrt),
  );
  const [fehler, setFehler] = useState<string | null>(null);
  const istNeu = !termin;

  function setzen<K extends keyof Termin>(feld: K, wert: Termin[K]) {
    setEntwurf((e) => ({ ...e, [feld]: wert }));
  }

  function typWechseln(typ: TerminTyp) {
    setEntwurf((e) => ({ ...e, typ, istEvent: typ === 'event' ? true : e.istEvent }));
  }

  const andereTermine = useMemo(
    () => (data?.termine ?? []).filter((t) => t.id !== termin?.id),
    [data, termin],
  );

  async function speichern() {
    if (!istIsoDatum(entwurf.datum)) return setFehler('Bitte ein gültiges Datum wählen.');
    if (!istUhrzeit(entwurf.uhrzeit)) return setFehler('Bitte eine gültige Uhrzeit (HH:MM) wählen.');
    const id = entwurf.id || terminId(entwurf.datum, entwurf.uhrzeit, andereTermine);
    const gespeichert: Termin = { ...entwurf, id };
    await aendern((d) => {
      const i = d.termine.findIndex((t) => t.id === id);
      if (i >= 0) d.termine[i] = gespeichert;
      else d.termine.push(gespeichert);
    });
    onClose();
  }

  async function loeschen() {
    if (!termin) return;
    if (!confirm('Diesen Termin wirklich löschen?')) return;
    await aendern((d) => {
      d.termine = d.termine.filter((t) => t.id !== termin.id);
    });
    onClose();
  }

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel={istNeu ? 'Neuer Termin' : 'Termin bearbeiten'}
      fuss={
        <>
          {!istNeu && (
            <Knopf variante="gefahr" onClick={loeschen} className="mr-auto">
              Löschen
            </Knopf>
          )}
          <Knopf variante="geist" onClick={onClose}>
            Abbrechen
          </Knopf>
          <Knopf variante="primaer" onClick={speichern}>
            Speichern
          </Knopf>
        </>
      }
    >
      <div className="space-y-3">
        {fehler && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{fehler}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Datum">
            <input
              type="date"
              value={entwurf.datum}
              onChange={(e) => setzen('datum', e.target.value)}
              className={eingabeKlasse}
            />
          </Feld>
          <Feld label="Uhrzeit">
            <input
              type="time"
              value={entwurf.uhrzeit}
              onChange={(e) => setzen('uhrzeit', e.target.value)}
              className={eingabeKlasse}
            />
          </Feld>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Typ">
            <select
              value={entwurf.typ}
              onChange={(e) => typWechseln(e.target.value as TerminTyp)}
              className={eingabeKlasse}
            >
              {TERMIN_TYPEN.map((t) => (
                <option key={t} value={t}>
                  {TYP_LABEL[t]}
                </option>
              ))}
            </select>
          </Feld>
          <Feld label="Ort">
            <input value={entwurf.ort} onChange={(e) => setzen('ort', e.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>

        <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={entwurf.istEvent}
              onChange={(e) => setzen('istEvent', e.target.checked)}
              className="h-4 w-4"
            />
            Event-Tag (Rotation pausiert)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={entwurf.abendmahl}
              onChange={(e) => setzen('abendmahl', e.target.checked)}
              className="h-4 w-4"
            />
            Abendmahl
          </label>
        </div>

        <Feld label="Prediger">
          <PersonSelect wert={entwurf.predigerId ?? null} onChange={(id) => setzen('predigerId', id)} rolle="prediger" />
        </Feld>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Feld label="Einleitung">
            <PersonSelect
              wert={entwurf.einleitungId ?? null}
              onChange={(id) => setzen('einleitungId', id)}
              rolle="einleitung"
            />
          </Feld>
          <Feld label="Fahrdienst">
            <PersonMulti
              werte={entwurf.fahrdienstIds}
              onChange={(ids) => setzen('fahrdienstIds', ids)}
              rolle="fahrdienst"
            />
          </Feld>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Status">
            <select
              value={entwurf.status}
              onChange={(e) => setzen('status', e.target.value as Termin['status'])}
              className={eingabeKlasse}
            >
              {TERMIN_STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Feld>
          <Feld label="Kontakt-Status">
            <select
              value={entwurf.kontaktStatus}
              onChange={(e) => setzen('kontaktStatus', e.target.value as Termin['kontaktStatus'])}
              className={eingabeKlasse}
            >
              {KONTAKT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {KONTAKT_LABEL[s]}
                </option>
              ))}
            </select>
          </Feld>
        </div>

        <Feld label="Kommentar">
          <textarea
            value={entwurf.kommentar ?? ''}
            onChange={(e) => setzen('kommentar', e.target.value)}
            rows={2}
            className={eingabeKlasse}
          />
        </Feld>
      </div>
    </Modal>
  );
}
