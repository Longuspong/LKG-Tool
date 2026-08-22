'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/state/store';
import { Termin } from '@/lib/model/types';
import { berechneLuecken, kommendeTermine, anzahlOffenePunkte } from '@/lib/model/gaps';
import { formatDatumMitTag } from '@/lib/date';
import { Abzeichen, Karte, Knopf, Leer, cx } from '@/components/ui';
import TerminZeile from '@/components/TerminZeile';
import TerminFormular from '@/components/TerminFormular';

export default function Dashboard() {
  const data = useApp((s) => s.data);
  const [bearbeite, setBearbeite] = useState<Termin | null>(null);
  const [neu, setNeu] = useState(false);

  const luecken = useMemo(() => (data ? berechneLuecken(data.termine) : null), [data]);
  const kommend = useMemo(() => (data ? kommendeTermine(data.termine).slice(0, 8) : []), [data]);

  if (!data) {
    return (
      <Karte titel="Willkommen">
        <p className="text-sm text-slate-500">
          Noch keine Daten geladen. Lege in den Einstellungen ein Backup an oder starte im Kalender.
        </p>
      </Karte>
    );
  }

  const offenePunkte = luecken ? anzahlOffenePunkte(luecken) : 0;
  const nameVon = (id?: string | null) => (id ? data.personen.find((p) => p.id === id)?.name ?? '??' : '');

  return (
    <div className="space-y-4">
      {/* Kachelmenue */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kachel href="/kalender" icon="📅" titel="Kalender" hinweis={`${data.termine.length} Termine`} />
        <Kachel
          href="/offen"
          icon="📋"
          titel="Offene Stunden"
          hinweis={`${data.termine.filter((t) => t.status === 'offen').length} offen`}
        />
        <Kachel href="/personen" icon="👥" titel="Personen" hinweis={`${data.personen.filter((p) => p.aktiv).length} aktiv`} />
        <Kachel href="/einstellungen" icon="⚙️" titel="Einstellungen" hinweis="Import / Backup" />
      </div>

      {/* Luecken-Anzeige */}
      <Karte
        titel={
          <span className="flex items-center gap-2">
            Worum ich mich kümmern sollte
            {offenePunkte > 0 ? (
              <Abzeichen ton="rot">{offenePunkte}</Abzeichen>
            ) : (
              <Abzeichen ton="gruen">alles erledigt</Abzeichen>
            )}
          </span>
        }
        aktion={
          <Knopf variante="primaer" onClick={() => setNeu(true)}>
            ＋ Termin
          </Knopf>
        }
      >
        {luecken && offenePunkte === 0 ? (
          <Leer>Keine offenen Punkte in den kommenden Terminen. 🎉</Leer>
        ) : (
          luecken && (
            <div className="space-y-4">
              <LueckenListe titel="Ohne Prediger" ton="rot" termine={luecken.ohnePrediger} onKlick={setBearbeite} />
              <LueckenListe titel="Ohne Einleitung" ton="gelb" termine={luecken.ohneEinleitung} onKlick={setBearbeite} />
              <LueckenListe titel="Ohne Fahrdienst" ton="gelb" termine={luecken.ohneFahrdienst} onKlick={setBearbeite} />
              <LueckenListe
                titel="Kontakt noch offen"
                ton="blau"
                termine={luecken.kontaktOffen}
                onKlick={setBearbeite}
              />

              {luecken.kollisionen.length > 0 && (
                <div>
                  <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kollisions-Warnungen <Abzeichen ton="rot">{luecken.kollisionen.length}</Abzeichen>
                  </h3>
                  <ul className="space-y-1">
                    {luecken.kollisionen.map((k, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                      >
                        <span className="font-medium">{formatDatumMitTag(k.datum)}:</span> {k.beschreibung}
                        {k.personId && <> ({nameVon(k.personId)})</>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}
      </Karte>

      {/* Kommende Termine */}
      <Karte titel="Nächste Termine" aktion={<Link href="/kalender" className="text-xs font-medium text-marke">alle →</Link>}>
        {kommend.length === 0 ? (
          <Leer>Keine kommenden Termine. Lege im Kalender welche an oder erzeuge Regeltermine.</Leer>
        ) : (
          <div className="divide-y divide-slate-100">
            {kommend.map((t) => (
              <TerminZeile key={t.id} termin={t} onClick={setBearbeite} />
            ))}
          </div>
        )}
      </Karte>

      {(bearbeite || neu) && (
        <TerminFormular
          termin={bearbeite}
          onClose={() => {
            setBearbeite(null);
            setNeu(false);
          }}
        />
      )}
    </div>
  );
}

function Kachel({ href, icon, titel, hinweis }: { href: string; icon: string; titel: string; hinweis: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-marke/40"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold text-slate-800">{titel}</span>
      <span className="text-xs text-slate-400">{hinweis}</span>
    </Link>
  );
}

function LueckenListe({
  titel,
  ton,
  termine,
  onKlick,
}: {
  titel: string;
  ton: 'rot' | 'gelb' | 'blau';
  termine: Termin[];
  onKlick: (t: Termin) => void;
}) {
  if (termine.length === 0) return null;
  return (
    <div>
      <h3 className={cx('mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500')}>
        {titel} <Abzeichen ton={ton}>{termine.length}</Abzeichen>
      </h3>
      <div className="divide-y divide-slate-100">
        {termine.slice(0, 6).map((t) => (
          <TerminZeile key={t.id} termin={t} onClick={onKlick} />
        ))}
        {termine.length > 6 && <p className="px-3 py-1 text-xs text-slate-400">… und {termine.length - 6} weitere</p>}
      </div>
    </div>
  );
}
