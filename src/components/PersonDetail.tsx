'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Person, Termin } from '@/lib/model/types';
import { archivFuer, Rollenbeteiligung, TerminBeteiligung } from '@/lib/model/derive';
import { formatDatum, formatDatumMitTag, formatRelativeTage, heuteIso, tageDifferenz } from '@/lib/date';
import { TYP_KURZ, rolleLabel } from '@/lib/labels';
import { Abzeichen, Knopf, Leer, Modal, cx } from './ui';

/**
 * Kontakt-Archiv einer Person (Phase 3): Stammdaten + die vollstaendige,
 * aus den Terminen abgeleitete Historie. Nichts hiervon ist gespeichert –
 * alle Zahlen entstehen live aus `archivFuer`, koennen also nicht auseinander
 * driften. Von hier aus: Person bearbeiten oder einen Termin oeffnen.
 */
export default function PersonDetail({
  person,
  onClose,
  onBearbeiten,
  onTermin,
}: {
  person: Person;
  onClose: () => void;
  onBearbeiten: (p: Person) => void;
  onTermin: (t: Termin) => void;
}) {
  const termine = useApp((s) => s.data?.termine ?? []);
  const [alleZeigen, setAlleZeigen] = useState(false);

  const archiv = useMemo(() => archivFuer(person.id, termine), [person.id, termine]);
  const terminMap = useMemo(() => {
    const m = new Map<string, Termin>();
    for (const t of termine) m.set(t.id, t);
    return m;
  }, [termine]);

  const heute = heuteIso();
  const START = 8;
  const sichtbareVergangene = alleZeigen ? archiv.vergangene : archiv.vergangene.slice(0, START);

  const rollenMitZahl = (Object.entries(archiv.proRolle) as [Rollenbeteiligung, number][])
    .filter(([, n]) => n > 0);

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel={
        <span className="flex items-center gap-2">
          <span className={person.aktiv ? '' : 'text-slate-400'}>{person.name}</span>
          {!person.aktiv && <Abzeichen ton="grau">inaktiv</Abzeichen>}
        </span>
      }
      fuss={
        <>
          <Knopf variante="geist" onClick={onClose}>
            Schließen
          </Knopf>
          <Knopf variante="primaer" onClick={() => onBearbeiten(person)}>
            ✎ Bearbeiten
          </Knopf>
        </>
      }
    >
      <div className="space-y-4">
        {/* Rollen + Dienstnummer */}
        <div className="flex flex-wrap items-center gap-1.5">
          {person.dienstnummer != null && (
            <span className="text-xs font-medium text-slate-400">#{person.dienstnummer}</span>
          )}
          {person.rollen.length === 0 ? (
            <span className="text-xs text-slate-400">Keine Rollen</span>
          ) : (
            person.rollen.map((r) => (
              <Abzeichen key={r} ton="lila">
                {rolleLabel(r)}
              </Abzeichen>
            ))
          )}
        </div>

        {/* Kontaktdaten */}
        {(person.telefon || person.email || person.notiz) && (
          <div className="space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
            {person.telefon && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-slate-400">Telefon</span>
                <a href={`tel:${person.telefon}`} className="font-medium text-marke hover:underline">
                  {person.telefon}
                </a>
              </div>
            )}
            {person.email && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-slate-400">E-Mail</span>
                <a href={`mailto:${person.email}`} className="truncate font-medium text-marke hover:underline">
                  {person.email}
                </a>
              </div>
            )}
            {person.notiz && (
              <div className="flex gap-2">
                <span className="w-14 shrink-0 text-xs text-slate-400">Notiz</span>
                <span className="whitespace-pre-wrap text-slate-600">{person.notiz}</span>
              </div>
            )}
          </div>
        )}

        {/* Kennzahlen */}
        <div className="grid grid-cols-2 gap-2">
          <Kachel gross wert={String(archiv.anzahlBesuche)} label="× dabei (gesamt)" />
          <Kachel
            wert={archiv.letzterBesuch ? formatDatum(archiv.letzterBesuch) : '—'}
            label={
              archiv.tageSeitLetztem != null ? `zuletzt · ${formatRelativeTage(-archiv.tageSeitLetztem)}` : 'noch nie da'
            }
          />
          <Kachel
            wert={archiv.naechsterTermin ? formatDatum(archiv.naechsterTermin) : '—'}
            label={
              archiv.naechsterTermin
                ? `nächster · ${formatRelativeTage(tageDifferenz(heute, archiv.naechsterTermin))}`
                : 'kein Termin geplant'
            }
          />
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="text-xs text-slate-400">nach Rolle</div>
            {rollenMitZahl.length === 0 ? (
              <div className="mt-1 text-sm text-slate-400">—</div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {rollenMitZahl.map(([r, n]) => (
                  <Abzeichen key={r} ton="grau">
                    {rolleLabel(r)} {n}
                  </Abzeichen>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kommende Termine */}
        {archiv.kommende.length > 0 && (
          <div>
            <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kommende Termine ({archiv.kommende.length})
            </h4>
            <div className="divide-y divide-slate-100">
              {archiv.kommende.map((b) => (
                <BeteiligungsZeile key={b.terminId} b={b} termin={terminMap.get(b.terminId)} heute={heute} onClick={onTermin} />
              ))}
            </div>
          </div>
        )}

        {/* Verlauf */}
        <div>
          <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Verlauf ({archiv.vergangene.length})
          </h4>
          {archiv.vergangene.length === 0 ? (
            <Leer>Noch keine vergangenen Termine.</Leer>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {sichtbareVergangene.map((b) => (
                  <BeteiligungsZeile key={b.terminId} b={b} termin={terminMap.get(b.terminId)} heute={heute} onClick={onTermin} />
                ))}
              </div>
              {archiv.vergangene.length > START && (
                <button
                  onClick={() => setAlleZeigen((v) => !v)}
                  className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-marke hover:bg-slate-50"
                >
                  {alleZeigen ? 'Weniger anzeigen' : `Alle ${archiv.vergangene.length} anzeigen`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Kachel({ wert, label, gross }: { wert: string; label: string; gross?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className={cx('font-semibold text-slate-800', gross ? 'text-2xl' : 'text-base')}>{wert}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

/** Eine Termin-Beteiligung als anklickbare Zeile (Rolle der Person hervorgehoben). */
function BeteiligungsZeile({
  b,
  termin,
  heute,
  onClick,
}: {
  b: TerminBeteiligung;
  termin: Termin | undefined;
  heute: string;
  onClick: (t: Termin) => void;
}) {
  if (!termin) return null;
  const kuenftig = b.datum > heute;
  return (
    <button
      onClick={() => onClick(termin)}
      className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-slate-50"
    >
      <div className="w-28 shrink-0">
        <div className={cx('text-sm font-medium', kuenftig ? 'text-slate-800' : 'text-slate-600')}>
          {formatDatumMitTag(b.datum)}
        </div>
        <div className="text-xs text-slate-400">{termin.uhrzeit} Uhr</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
        {b.rollen.map((r) => (
          <Abzeichen key={r} ton="lila">
            {rolleLabel(r)}
          </Abzeichen>
        ))}
        {termin.istEvent && <Abzeichen ton="gelb">Event</Abzeichen>}
      </div>
      <Abzeichen ton="grau">{TYP_KURZ[termin.typ]}</Abzeichen>
    </button>
  );
}
