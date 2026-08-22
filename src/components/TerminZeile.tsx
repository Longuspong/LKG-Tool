'use client';

import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import { Abzeichen, cx } from './ui';
import { formatDatumMitTag } from '@/lib/date';
import { KONTAKT_LABEL, KONTAKT_TON, STATUS_LABEL, STATUS_TON, TYP_KURZ } from '@/lib/labels';

/** Einheitliche Darstellung eines Termins als anklickbare Zeile. */
export default function TerminZeile({
  termin,
  onClick,
  zeigeDatum = true,
}: {
  termin: Termin;
  onClick?: (t: Termin) => void;
  zeigeDatum?: boolean;
}) {
  const personen = useApp((s) => s.data?.personen ?? []);
  const name = (id?: string | null) => (id ? personen.find((p) => p.id === id)?.name ?? '??' : null);
  const predigerName = name(termin.predigerId);
  const fahrer = termin.fahrdienstIds.map((id) => name(id)).filter(Boolean);

  return (
    <button
      onClick={() => onClick?.(termin)}
      className={cx(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="w-24 shrink-0">
        {zeigeDatum && <div className="text-sm font-medium text-slate-800">{formatDatumMitTag(termin.datum)}</div>}
        <div className="text-xs text-slate-500">{termin.uhrzeit} Uhr</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Abzeichen ton="lila">{TYP_KURZ[termin.typ]}</Abzeichen>
          {termin.istEvent && <Abzeichen ton="gelb">Event</Abzeichen>}
          {termin.abendmahl && <Abzeichen ton="grau">Abendmahl</Abzeichen>}
        </div>
        <div className="mt-0.5 truncate text-sm">
          {predigerName ? (
            <span className="text-slate-800">{predigerName}</span>
          ) : (
            <span className="font-medium text-red-500">kein Prediger</span>
          )}
          {termin.einleitungId && <span className="text-slate-400"> · Einl.: {name(termin.einleitungId)}</span>}
          {fahrer.length > 0 && <span className="text-slate-400"> · Fahrt: {fahrer.join(', ')}</span>}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Abzeichen ton={STATUS_TON[termin.status]}>{STATUS_LABEL[termin.status]}</Abzeichen>
        {termin.predigerId && termin.kontaktStatus !== 'bestaetigt' && (
          <Abzeichen ton={KONTAKT_TON[termin.kontaktStatus]}>{KONTAKT_LABEL[termin.kontaktStatus]}</Abzeichen>
        )}
      </div>
    </button>
  );
}
