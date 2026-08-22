'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import {
  MONATE,
  dateZuIso,
  formatDatumMitTag,
  heuteIso,
  quartalVonMonat,
  monatsbereich,
  ausIso,
} from '@/lib/date';
import { TYP_KURZ } from '@/lib/labels';
import { Karte, Knopf, Leer, Modal, cx } from '@/components/ui';
import TerminZeile from '@/components/TerminZeile';
import TerminFormular from '@/components/TerminFormular';
import GeneratorModal from '@/components/GeneratorModal';

type Ansicht = 'monat' | 'quartal' | 'liste';

export default function KalenderSeite() {
  const data = useApp((s) => s.data);
  const heute = heuteIso();
  const { jahr: hJahr, monat: hMonat } = ausIso(heute);

  const [ansicht, setAnsicht] = useState<Ansicht>('monat');
  const [jahr, setJahr] = useState(hJahr);
  const [monat, setMonat] = useState(hMonat); // 1-12
  const [edit, setEdit] = useState<Termin | null>(null);
  const [neuDatum, setNeuDatum] = useState<string | null>(null);
  const [neu, setNeu] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [generator, setGenerator] = useState(false);
  const [filterPerson, setFilterPerson] = useState('');

  const termine = data?.termine ?? [];

  function schritt(richtung: number) {
    if (ansicht === 'quartal') {
      let m = monat + richtung * 3;
      let j = jahr;
      while (m > 12) { m -= 12; j++; }
      while (m < 1) { m += 12; j--; }
      setMonat(m);
      setJahr(j);
    } else {
      let m = monat + richtung;
      let j = jahr;
      if (m > 12) { m = 1; j++; }
      if (m < 1) { m = 12; j--; }
      setMonat(m);
      setJahr(j);
    }
  }

  function heuteSetzen() {
    setJahr(hJahr);
    setMonat(hMonat);
  }

  const periodenTitel =
    ansicht === 'quartal'
      ? `Q${quartalVonMonat(monat)} ${jahr}`
      : ansicht === 'monat'
      ? `${MONATE[monat - 1]} ${jahr}`
      : 'Alle Termine';

  return (
    <div className="space-y-4">
      {/* Steuerleiste */}
      <div className="kein-druck flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
          {(['monat', 'quartal', 'liste'] as Ansicht[]).map((a) => (
            <button
              key={a}
              onClick={() => setAnsicht(a)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-sm font-medium capitalize',
                ansicht === a ? 'bg-white text-marke shadow-sm' : 'text-slate-500',
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Knopf variante="sekundaer" onClick={() => setGenerator(true)}>
          ↻ Regeltermine
        </Knopf>
        <Knopf variante="primaer" onClick={() => setNeu(true)}>
          ＋ Termin
        </Knopf>
      </div>

      {ansicht !== 'liste' && (
        <div className="kein-druck flex items-center justify-between">
          <Knopf variante="geist" onClick={() => schritt(-1)}>
            ‹
          </Knopf>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{periodenTitel}</span>
            <button onClick={heuteSetzen} className="text-xs font-medium text-marke hover:underline">
              heute
            </button>
          </div>
          <Knopf variante="geist" onClick={() => schritt(1)}>
            ›
          </Knopf>
        </div>
      )}

      {ansicht === 'monat' && (
        <MonatsGitter jahr={jahr} monat={monat} termine={termine} heute={heute} onTag={setTag} />
      )}

      {ansicht === 'quartal' && <QuartalsAnsicht jahr={jahr} monat={monat} termine={termine} onEdit={setEdit} />}

      {ansicht === 'liste' && (
        <ListenAnsicht
          termine={termine}
          onEdit={setEdit}
          filterPerson={filterPerson}
          setFilterPerson={setFilterPerson}
        />
      )}

      {/* Tages-Detail */}
      {tag && (
        <TagModal
          datum={tag}
          termine={termine.filter((t) => t.datum === tag).sort((a, b) => a.uhrzeit.localeCompare(b.uhrzeit))}
          onClose={() => setTag(null)}
          onEdit={(t) => {
            setTag(null);
            setEdit(t);
          }}
          onNeu={(d) => {
            setTag(null);
            setNeuDatum(d);
          }}
        />
      )}

      {(edit || neu || neuDatum) && (
        <TerminFormular
          termin={edit}
          datumVorgabe={neuDatum ?? undefined}
          onClose={() => {
            setEdit(null);
            setNeu(false);
            setNeuDatum(null);
          }}
        />
      )}

      {generator && <GeneratorModal jahr={jahr} monat={monat} onClose={() => setGenerator(false)} />}
    </div>
  );
}

// --- Monatsgitter ----------------------------------------------------------
function monatsWochen(jahr: number, monat: number): string[][] {
  const erster = new Date(jahr, monat - 1, 1);
  const versatz = (erster.getDay() + 6) % 7; // 0 = Montag
  const cur = new Date(jahr, monat - 1, 1 - versatz);
  const wochen: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const reihe: string[] = [];
    for (let d = 0; d < 7; d++) {
      reihe.push(dateZuIso(cur));
      cur.setDate(cur.getDate() + 1);
    }
    wochen.push(reihe);
  }
  return wochen;
}

function MonatsGitter({
  jahr,
  monat,
  termine,
  heute,
  onTag,
}: {
  jahr: number;
  monat: number;
  termine: Termin[];
  heute: string;
  onTag: (datum: string) => void;
}) {
  const wochen = useMemo(() => monatsWochen(jahr, monat), [jahr, monat]);
  const proTag = useMemo(() => {
    const m = new Map<string, Termin[]>();
    for (const t of termine) {
      const arr = m.get(t.datum) ?? [];
      arr.push(t);
      m.set(t.datum, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.uhrzeit.localeCompare(b.uhrzeit));
    return m;
  }, [termine]);

  return (
    <Karte className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 pb-1 text-center text-xs font-medium text-slate-400">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {wochen.flat().map((iso) => {
          const imMonat = ausIso(iso).monat === monat;
          const liste = proTag.get(iso) ?? [];
          const istHeute = iso === heute;
          return (
            <button
              key={iso}
              onClick={() => onTag(iso)}
              className={cx(
                'flex min-h-[64px] flex-col gap-0.5 border-b border-r border-slate-100 p-1 text-left align-top',
                !imMonat && 'bg-slate-50/60 text-slate-300',
              )}
            >
              <span
                className={cx(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  istHeute ? 'bg-marke font-semibold text-white' : imMonat ? 'text-slate-600' : 'text-slate-300',
                )}
              >
                {ausIso(iso).tag}
              </span>
              <div className="flex flex-col gap-0.5">
                {liste.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className={cx(
                      'truncate rounded px-1 text-[10px] leading-tight',
                      t.status === 'offen'
                        ? 'bg-amber-100 text-amber-700'
                        : t.istEvent
                        ? 'bg-marke-hell text-marke-dunkel'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {t.uhrzeit} {TYP_KURZ[t.typ]}
                  </span>
                ))}
                {liste.length > 3 && <span className="px-1 text-[10px] text-slate-400">+{liste.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </Karte>
  );
}

// --- Quartalsansicht -------------------------------------------------------
function QuartalsAnsicht({
  jahr,
  monat,
  termine,
  onEdit,
}: {
  jahr: number;
  monat: number;
  termine: Termin[];
  onEdit: (t: Termin) => void;
}) {
  const q = quartalVonMonat(monat);
  const startMonat = (q - 1) * 3 + 1;
  const monate = [startMonat, startMonat + 1, startMonat + 2];

  return (
    <div className="space-y-4">
      <div className="kein-druck flex justify-end">
        <Knopf variante="sekundaer" onClick={() => window.print()}>
          🖨 Drucken
        </Knopf>
      </div>
      {monate.map((m) => {
        const { start, ende } = monatsbereich(jahr, m);
        const liste = termine
          .filter((t) => t.datum >= start && t.datum <= ende)
          .sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));
        return (
          <Karte key={m} titel={`${MONATE[m - 1]} ${jahr}`}>
            {liste.length === 0 ? (
              <Leer>Keine Termine.</Leer>
            ) : (
              <div className="divide-y divide-slate-100">
                {liste.map((t) => (
                  <TerminZeile key={t.id} termin={t} onClick={onEdit} />
                ))}
              </div>
            )}
          </Karte>
        );
      })}
    </div>
  );
}

// --- Listenansicht (inkl. Personen-Sicht) ----------------------------------
function ListenAnsicht({
  termine,
  onEdit,
  filterPerson,
  setFilterPerson,
}: {
  termine: Termin[];
  onEdit: (t: Termin) => void;
  filterPerson: string;
  setFilterPerson: (v: string) => void;
}) {
  const personen = useApp((s) => s.data?.personen ?? []);
  const [nurKommende, setNurKommende] = useState(true);
  const heute = heuteIso();

  const gefiltert = useMemo(() => {
    let l = [...termine];
    if (nurKommende) l = l.filter((t) => t.datum >= heute);
    if (filterPerson) {
      l = l.filter(
        (t) =>
          t.predigerId === filterPerson ||
          t.einleitungId === filterPerson ||
          t.fahrdienstIds.includes(filterPerson),
      );
    }
    return l.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));
  }, [termine, nurKommende, filterPerson, heute]);

  return (
    <Karte
      titel="Termine"
      aktion={
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={nurKommende} onChange={(e) => setNurKommende(e.target.checked)} />
          nur kommende
        </label>
      }
    >
      <div className="mb-3">
        <select
          value={filterPerson}
          onChange={(e) => setFilterPerson(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Personen-Sicht: alle Personen</option>
          {[...personen]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>
      {gefiltert.length === 0 ? (
        <Leer>Keine Termine gefunden.</Leer>
      ) : (
        <div className="divide-y divide-slate-100">
          {gefiltert.map((t) => (
            <TerminZeile key={t.id} termin={t} onClick={onEdit} />
          ))}
        </div>
      )}
    </Karte>
  );
}

// --- Tages-Detail-Modal ----------------------------------------------------
function TagModal({
  datum,
  termine,
  onClose,
  onEdit,
  onNeu,
}: {
  datum: string;
  termine: Termin[];
  onClose: () => void;
  onEdit: (t: Termin) => void;
  onNeu: (datum: string) => void;
}) {
  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel={formatDatumMitTag(datum)}
      fuss={
        <Knopf variante="primaer" onClick={() => onNeu(datum)}>
          ＋ Termin an diesem Tag
        </Knopf>
      }
    >
      {termine.length === 0 ? (
        <Leer>Keine Termine an diesem Tag.</Leer>
      ) : (
        <div className="divide-y divide-slate-100">
          {termine.map((t) => (
            <TerminZeile key={t.id} termin={t} onClick={onEdit} zeigeDatum={false} />
          ))}
        </div>
      )}
    </Modal>
  );
}
