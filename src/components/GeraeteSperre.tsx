'use client';

import { useEffect, useState } from 'react';
import { sperreAktiv, setzeSperre, pruefeSperre, entferneSperre, cryptoVerfuegbar } from '@/lib/lock';
import { Feld, Karte, Knopf, cx, eingabeKlasse } from './ui';

const MIN_LAENGE = 4;

type Rueck = { art: 'ok' | 'fehler'; text: string } | null;

/**
 * Einstellungs-Karte fuer die lokale Geraete-Sperre (Passcode beim Oeffnen).
 * Zum Aendern/Entfernen wird der aktuelle Passcode verlangt.
 */
export default function GeraeteSperre() {
  const [aktiv, setAktiv] = useState(false);
  const [verfuegbar, setVerfuegbar] = useState(true);
  const [alt, setAlt] = useState('');
  const [neu, setNeu] = useState('');
  const [neu2, setNeu2] = useState('');
  const [rueck, setRueck] = useState<Rueck>(null);

  useEffect(() => {
    setAktiv(sperreAktiv());
    setVerfuegbar(cryptoVerfuegbar());
  }, []);

  function zuruecksetzen() {
    setAlt('');
    setNeu('');
    setNeu2('');
  }

  async function einrichtenOderAendern() {
    setRueck(null);
    if (aktiv) {
      const ok = await pruefeSperre(alt);
      if (!ok) return setRueck({ art: 'fehler', text: 'Aktueller Passcode ist falsch.' });
    }
    if (neu.length < MIN_LAENGE) {
      return setRueck({ art: 'fehler', text: `Passcode braucht mindestens ${MIN_LAENGE} Zeichen.` });
    }
    if (neu !== neu2) {
      return setRueck({ art: 'fehler', text: 'Die beiden Eingaben stimmen nicht überein.' });
    }
    try {
      await setzeSperre(neu);
    } catch {
      return setRueck({ art: 'fehler', text: 'Konnte den Passcode nicht setzen (Verschlüsselung nicht verfügbar).' });
    }
    setAktiv(true);
    zuruecksetzen();
    setRueck({ art: 'ok', text: 'Passcode gespeichert. Er wird beim nächsten Öffnen verlangt.' });
  }

  async function entfernen() {
    setRueck(null);
    const ok = await pruefeSperre(alt);
    if (!ok) return setRueck({ art: 'fehler', text: 'Aktueller Passcode ist falsch.' });
    entferneSperre();
    setAktiv(false);
    zuruecksetzen();
    setRueck({ art: 'ok', text: 'Geräte-Sperre entfernt.' });
  }

  return (
    <Karte titel="Geräte-Sperre (Passcode beim Öffnen)">
      <p className="mb-3 text-sm text-slate-500">
        Optionaler <strong>Sichtschutz</strong> nur auf diesem Gerät: Beim Öffnen wird ein Passcode verlangt. Das ist
        keine Verschlüsselung – es verhindert nur zufälliges Mitlesen. Der Server-Zugriffscode ist davon unabhängig.
      </p>

      {!verfuegbar ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Auf diesem Gerät/Kontext nicht verfügbar (benötigt HTTPS). Im installierten Betrieb funktioniert es.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500">
            Status:{' '}
            {aktiv ? (
              <span className="text-emerald-600">aktiv</span>
            ) : (
              <span className="text-slate-500">nicht eingerichtet</span>
            )}
          </p>

          {aktiv && (
            <Feld label="Aktueller Passcode">
              <input
                type="password"
                inputMode="numeric"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Feld label={aktiv ? 'Neuer Passcode' : 'Passcode'}>
              <input
                type="password"
                inputMode="numeric"
                value={neu}
                onChange={(e) => setNeu(e.target.value)}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
            <Feld label="Wiederholen">
              <input
                type="password"
                inputMode="numeric"
                value={neu2}
                onChange={(e) => setNeu2(e.target.value)}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
          </div>

          <div className="flex flex-wrap gap-2">
            <Knopf variante="primaer" onClick={einrichtenOderAendern}>
              {aktiv ? 'Passcode ändern' : 'Passcode einrichten'}
            </Knopf>
            {aktiv && (
              <Knopf variante="gefahr" onClick={entfernen}>
                Sperre entfernen
              </Knopf>
            )}
          </div>
        </div>
      )}

      {rueck && (
        <p
          className={cx(
            'mt-3 rounded-lg px-3 py-2 text-sm',
            rueck.art === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
          )}
        >
          {rueck.text}
        </p>
      )}
    </Karte>
  );
}
