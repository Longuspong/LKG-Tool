'use client';

import { useApp } from '@/state/store';
import { RotationsRolle, ROTATIONS_ROLLEN, effektiveReihenfolge } from '@/lib/model/rotation';
import { rolleLabel } from '@/lib/labels';
import { Feld, Karte, Knopf, cx } from './ui';

/**
 * Pflegt die Rotations-Reihenfolgen (Einleitung/Fahrdienst): Personen
 * hinzufuegen, entfernen, sortieren und festlegen, mit wem die Rotation
 * beginnt. Die eigentliche Verteilung passiert im Kalender ("Rotation").
 */
export default function RotationEditor() {
  return (
    <Karte titel="Rotationen (Einleitung / Fahrdienst)">
      <p className="mb-3 text-sm text-slate-500">
        Reihenfolge, in der die Dienste reihum verteilt werden. Im Kalender unter „Rotation" wird
        daraus für einen Zeitraum ein Vorschlag erzeugt – Event-Tage pausieren automatisch.
      </p>
      <div className="space-y-4">
        {ROTATIONS_ROLLEN.map((r) => (
          <ReiheEditor key={r} rolle={r} />
        ))}
      </div>
    </Karte>
  );
}

function ReiheEditor({ rolle }: { rolle: RotationsRolle }) {
  const { data, aendern } = useApp();
  if (!data) return null;

  const personen = data.personen;
  const reihe = data.rotation[rolle];
  const nameVon = (id: string) => personen.find((p) => p.id === id)?.name ?? id;
  const effektiv = effektiveReihenfolge(reihe, personen);
  const n = effektiv.length;
  const beginntMit = n > 0 ? effektiv[(((reihe.startIndex % n) + n) % n)] : null;

  // Kandidaten zum Hinzufuegen: aktive Personen, die noch nicht in der Reihe
  // stehen; Personen mit passender Rolle zuerst.
  const kandidaten = personen
    .filter((p) => p.aktiv && !reihe.reihenfolge.includes(p.id))
    .sort((a, b) => {
      const ar = a.rollen.includes(rolle) ? 0 : 1;
      const br = b.rollen.includes(rolle) ? 0 : 1;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });

  function hinzufuegen(id: string) {
    if (!id) return;
    aendern((d) => {
      if (!d.rotation[rolle].reihenfolge.includes(id)) d.rotation[rolle].reihenfolge.push(id);
    });
  }
  function entfernen(id: string) {
    aendern((d) => {
      d.rotation[rolle].reihenfolge = d.rotation[rolle].reihenfolge.filter((x) => x !== id);
    });
  }
  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    aendern((d) => {
      const arr = d.rotation[rolle].reihenfolge;
      if (ziel < 0 || ziel >= arr.length) return;
      [arr[index], arr[ziel]] = [arr[ziel], arr[index]];
    });
  }
  function startVerschieben(richtung: -1 | 1) {
    aendern((d) => {
      const len = d.rotation[rolle].reihenfolge.length || 1;
      d.rotation[rolle].startIndex = (((d.rotation[rolle].startIndex + richtung) % len) + len) % len;
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{rolleLabel(rolle)}</span>
        {beginntMit && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>beginnt mit</span>
            <button
              onClick={() => startVerschieben(-1)}
              className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100"
              aria-label="Startperson zurück"
            >
              ‹
            </button>
            <span className="font-medium text-slate-700">{nameVon(beginntMit)}</span>
            <button
              onClick={() => startVerschieben(1)}
              className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100"
              aria-label="Startperson vor"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {reihe.reihenfolge.length === 0 ? (
        <p className="mb-2 text-sm text-slate-400">Noch niemand in der Reihenfolge.</p>
      ) : (
        <ol className="mb-2 divide-y divide-slate-100">
          {reihe.reihenfolge.map((id, i) => {
            const fehlt = !personen.some((p) => p.id === id);
            const inaktiv = personen.find((p) => p.id === id)?.aktiv === false;
            return (
              <li key={id} className="flex items-center gap-2 py-1.5">
                <span className="w-5 text-xs text-slate-400">{i + 1}.</span>
                <span className={cx('flex-1 text-sm', fehlt || inaktiv ? 'text-slate-400' : 'text-slate-700')}>
                  {nameVon(id)}
                  {fehlt && <span className="ml-1 text-xs text-red-400">(gelöscht)</span>}
                  {!fehlt && inaktiv && <span className="ml-1 text-xs text-amber-500">(inaktiv)</span>}
                </span>
                <button
                  onClick={() => verschieben(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Nach oben"
                >
                  ↑
                </button>
                <button
                  onClick={() => verschieben(i, 1)}
                  disabled={i === reihe.reihenfolge.length - 1}
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Nach unten"
                >
                  ↓
                </button>
                <button
                  onClick={() => entfernen(id)}
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                  aria-label="Entfernen"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <Feld label="Person hinzufügen">
        <select
          value=""
          onChange={(e) => {
            hinzufuegen(e.target.value);
            e.target.value = '';
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">＋ auswählen…</option>
          {kandidaten.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.rollen.includes(rolle) ? '' : ' (andere Rolle)'}
            </option>
          ))}
        </select>
      </Feld>
    </div>
  );
}
