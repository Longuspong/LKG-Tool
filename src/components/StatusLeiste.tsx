'use client';

import Link from 'next/link';
import { useApp } from '@/state/store';
import { Knopf, cx } from './ui';
import { formatDatumMitTag, heuteIso, tageDifferenz } from '@/lib/date';

/** Konflikt-Banner: das andere Geraet hat zwischendurch gespeichert. */
function Konfliktbanner() {
  const { konflikt, konfliktServerUebernehmen, konfliktTrotzdemSpeichern, speichert } = useApp();
  if (!konflikt) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-amber-800">Auf dem anderen Geraet wurde geaendert.</p>
        <p className="mt-0.5 text-xs text-amber-700">
          Serverstand vom {formatDatumMitTag(konflikt.updatedAt.slice(0, 10))} (Version {konflikt.version}). Um nichts
          unbemerkt zu ueberschreiben, bitte entscheiden:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Knopf variante="primaer" onClick={() => konfliktServerUebernehmen()} disabled={speichert}>
            Serverstand laden
          </Knopf>
          <Knopf variante="gefahr" onClick={() => konfliktTrotzdemSpeichern()} disabled={speichert}>
            Meine Version behalten
          </Knopf>
        </div>
      </div>
    </div>
  );
}

/** Transiente Meldung (Toast). */
function MeldungToast() {
  const { meldung, meldungSetzen } = useApp();
  if (!meldung) return null;
  const ton =
    meldung.art === 'ok'
      ? 'bg-emerald-600'
      : meldung.art === 'warnung'
      ? 'bg-amber-600'
      : meldung.art === 'fehler'
      ? 'bg-red-600'
      : 'bg-slate-700';
  return (
    <div className="kein-druck fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 sm:bottom-6">
      <button
        onClick={() => meldungSetzen(null)}
        className={cx('max-w-md rounded-xl px-4 py-2 text-sm text-white shadow-lg', ton)}
      >
        {meldung.text}
      </button>
    </div>
  );
}

/** Erinnerung, wenn das letzte manuelle Backup zu lange her ist. */
function BackupErinnerung() {
  const data = useApp((s) => s.data);
  if (!data) return null;
  const { letztesBackup, backupErinnerungTage } = data.settings;
  const faellig =
    !letztesBackup || tageDifferenz(letztesBackup.slice(0, 10), heuteIso()) >= backupErinnerungTage;
  if (!faellig) return null;
  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-2">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <p className="text-xs text-sky-800">
          {letztesBackup
            ? `Dein letztes Backup ist vom ${formatDatumMitTag(letztesBackup.slice(0, 10))}.`
            : 'Du hast noch kein manuelles Backup erstellt.'}{' '}
          Sicher ist sicher.
        </p>
        <Link href="/einstellungen" className="whitespace-nowrap text-xs font-semibold text-sky-700 underline">
          Backup jetzt
        </Link>
      </div>
    </div>
  );
}

export default function StatusLeiste() {
  return (
    <div className="kein-druck">
      <Konfliktbanner />
      <BackupErinnerung />
      <MeldungToast />
    </div>
  );
}
