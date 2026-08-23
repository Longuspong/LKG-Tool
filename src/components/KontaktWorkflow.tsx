'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { Person, Termin } from '@/lib/model/types';
import { Vorschlag, vorschlaege } from '@/lib/model/vorschlag';
import { offenPhase } from '@/lib/model/gaps';
import {
  alsAbgesagt,
  alsBestaetigt,
  alsKontaktiert,
  predigerFreigeben,
  predigerZuweisen,
} from '@/lib/model/workflow';
import {
  formatDatumMitTag,
  formatRelativeTage,
  heuteIso,
  tageDifferenz,
} from '@/lib/date';
import {
  KONTAKT_LABEL,
  KONTAKT_TON,
  OFFEN_PHASE_LABEL,
  OFFEN_PHASE_TON,
  TYP_LABEL,
} from '@/lib/labels';
import { Abzeichen, Knopf, Leer, Modal, cx } from './ui';
import { PersonSelect } from './PersonAuswahl';

/**
 * Gefuehrter Kontakt-Workflow fuer EINEN offenen Slot (Phase 4).
 *
 * Zwei Zustaende:
 *   1. Noch kein Prediger  -> Vorschlagsliste (fair sortiert) + manuelle Auswahl.
 *   2. Prediger steht       -> Kontaktdaten (Anruf/Mail) + Statusschritte
 *                              (kontaktiert / Zusage / Absage / andere Person).
 *
 * Der Termin wird live aus dem Store gelesen, damit die Ansicht nach jeder
 * Aktion sofort den neuen Stand zeigt. Ueber `weiter`/`zurueck` laesst sich die
 * ganze Arbeitsliste am Stueck durchgehen.
 */
export default function KontaktWorkflow({
  terminId,
  onClose,
  onDetails,
  weiter,
  zurueck,
  position,
}: {
  terminId: string;
  onClose: () => void;
  onDetails?: (t: Termin) => void;
  weiter?: () => void;
  zurueck?: () => void;
  position?: { index: number; total: number };
}) {
  const { data, aendern } = useApp();
  const [alle, setAlle] = useState(false);

  const termin = useMemo(
    () => data?.termine.find((t) => t.id === terminId) ?? null,
    [data, terminId],
  );

  const vs = useMemo<Vorschlag[]>(() => {
    if (!termin || !data) return [];
    return vorschlaege({
      rolle: 'prediger',
      termin,
      personen: data.personen,
      termine: data.termine,
    });
  }, [termin, data]);

  if (!termin) {
    return (
      <Modal offen onSchliessen={onClose} titel="Slot nicht gefunden">
        <Leer>Dieser Termin existiert nicht mehr.</Leer>
      </Modal>
    );
  }

  const prediger: Person | null =
    (termin.predigerId && data?.personen.find((p) => p.id === termin.predigerId)) || null;
  const phase = offenPhase(termin);
  const erledigt = phase === null;

  async function mutTermin(fn: (t: Termin) => void) {
    await aendern((d) => {
      const t = d.termine.find((x) => x.id === terminId);
      if (t) fn(t);
    });
  }

  const START = 5;
  const sichtbar = alle ? vs : vs.slice(0, START);

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel={
        <span className="flex items-center gap-2">
          Offene Stunde
          {position && (
            <span className="text-xs font-normal text-slate-400">
              {position.index + 1} / {position.total}
            </span>
          )}
        </span>
      }
      fuss={
        <>
          {zurueck && (
            <Knopf variante="geist" onClick={zurueck} className="mr-auto">
              ← Zurück
            </Knopf>
          )}
          <Knopf variante="geist" onClick={onClose}>
            Schließen
          </Knopf>
          {weiter && (
            <Knopf variante={erledigt ? 'primaer' : 'sekundaer'} onClick={weiter}>
              Weiter →
            </Knopf>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Slot-Kopf */}
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {formatDatumMitTag(termin.datum)} · {termin.uhrzeit} Uhr
              </div>
              <div className="text-xs text-slate-500">
                {TYP_LABEL[termin.typ]} · {termin.ort}
              </div>
            </div>
            {phase ? (
              <Abzeichen ton={OFFEN_PHASE_TON[phase]}>{OFFEN_PHASE_LABEL[phase]}</Abzeichen>
            ) : (
              <Abzeichen ton="gruen">erledigt ✓</Abzeichen>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {termin.istEvent && <Abzeichen ton="gelb">Event</Abzeichen>}
            {termin.abendmahl && <Abzeichen ton="grau">Abendmahl</Abzeichen>}
          </div>
        </div>

        {/* Zustand 2: Prediger steht -> Kontakt + Statusschritte */}
        {prediger ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-800">
                    {prediger.name}
                    {prediger.dienstnummer != null && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        #{prediger.dienstnummer}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    <Abzeichen ton={KONTAKT_TON[termin.kontaktStatus]}>
                      {KONTAKT_LABEL[termin.kontaktStatus]}
                    </Abzeichen>
                  </div>
                </div>
                <button
                  onClick={() => onDetails?.(termin)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-marke hover:bg-slate-50"
                >
                  ✎ Details
                </button>
              </div>

              {/* Direkte Kontaktwege */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {prediger.telefon ? (
                  <a
                    href={`tel:${prediger.telefon}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-marke px-3 py-2 text-sm font-medium text-white hover:bg-marke-dunkel"
                  >
                    📞 {prediger.telefon}
                  </a>
                ) : null}
                {prediger.email ? (
                  <a
                    href={`mailto:${prediger.email}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-marke ring-1 ring-slate-300 hover:bg-slate-50"
                  >
                    ✉️ E-Mail
                  </a>
                ) : null}
                {!prediger.telefon && !prediger.email && (
                  <span className="text-xs text-slate-400">
                    Keine Kontaktdaten hinterlegt – über „Details“ ergänzen.
                  </span>
                )}
              </div>
            </div>

            {/* Statusschritte je nach Kontaktstand */}
            {termin.kontaktStatus === 'abgesagt' ? (
              <div className="space-y-2">
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {prediger.name} hat abgesagt. Bitte jemand anderen anfragen.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Knopf variante="primaer" onClick={() => mutTermin(predigerFreigeben)}>
                    ↷ Andere Person wählen
                  </Knopf>
                  <Knopf variante="sekundaer" onClick={() => mutTermin(alsBestaetigt)}>
                    ✅ Doch Zusage
                  </Knopf>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {termin.kontaktStatus === 'offen' && (
                  <Knopf variante="primaer" onClick={() => mutTermin(alsKontaktiert)}>
                    📞 Als kontaktiert
                  </Knopf>
                )}
                {termin.kontaktStatus !== 'bestaetigt' && (
                  <Knopf
                    variante={termin.kontaktStatus === 'kontaktiert' ? 'primaer' : 'sekundaer'}
                    onClick={() => mutTermin(alsBestaetigt)}
                  >
                    ✅ Zusage
                  </Knopf>
                )}
                {termin.kontaktStatus === 'bestaetigt' && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    ✓ Bestätigt – alles erledigt
                  </span>
                )}
                <Knopf variante="gefahr" onClick={() => mutTermin(alsAbgesagt)}>
                  🚫 Absage
                </Knopf>
                <Knopf variante="geist" onClick={() => mutTermin(predigerFreigeben)}>
                  ↷ Andere Person
                </Knopf>
              </div>
            )}
          </div>
        ) : (
          /* Zustand 1: Noch kein Prediger -> Vorschlaege + manuelle Auswahl */
          <div className="space-y-3">
            <div>
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Vorschläge · am längsten nicht dran zuerst
              </h4>
              {vs.length === 0 ? (
                <Leer>Keine aktiven Personen. Lege zuerst Kontakte an.</Leer>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {sichtbar.map((v) => (
                    <VorschlagsZeile
                      key={v.person.id}
                      v={v}
                      onWaehlen={() => mutTermin((t) => predigerZuweisen(t, v.person.id))}
                    />
                  ))}
                  {vs.length > START && (
                    <button
                      onClick={() => setAlle((a) => !a)}
                      className="w-full rounded-b-xl py-1.5 text-xs font-medium text-marke hover:bg-slate-50"
                    >
                      {alle ? 'Weniger anzeigen' : `Alle ${vs.length} anzeigen`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                … oder direkt wählen / neu anlegen
              </span>
              <PersonSelect
                wert={null}
                onChange={(id) => id && mutTermin((t) => predigerZuweisen(t, id))}
                rolle="prediger"
                leerLabel="— Person wählen —"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Eine Vorschlagszeile mit Fairness-Begründung und „Wählen“-Knopf. */
function VorschlagsZeile({ v, onWaehlen }: { v: Vorschlag; onWaehlen: () => void }) {
  const heute = heuteIso();
  const grund =
    v.tageSeit == null
      ? 'noch nie als Prediger'
      : `zuletzt ${formatRelativeTage(-v.tageSeit)} · ${v.anzahlRolle}× Prediger`;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cx('truncate text-sm font-medium', v.hatRolle ? 'text-slate-800' : 'text-slate-500')}>
            {v.person.name}
          </span>
          {!v.hatRolle && <Abzeichen ton="grau">keine Prediger-Rolle</Abzeichen>}
          {v.schonAmTag && <Abzeichen ton="rot">am selben Tag verplant</Abzeichen>}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {grund}
          {v.naechsterEigenerTermin && (
            <> · nächster Einsatz {formatRelativeTage(tageDifferenz(heute, v.naechsterEigenerTermin))}</>
          )}
        </div>
      </div>
      <Knopf variante="sekundaer" onClick={onWaehlen} className="shrink-0 px-3 py-1.5">
        Wählen
      </Knopf>
    </div>
  );
}
