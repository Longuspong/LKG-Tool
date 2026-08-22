'use client';

import { useState } from 'react';
import { useApp } from '@/state/store';
import { Person } from '@/lib/model/types';
import { naechstePersonId } from '@/lib/model/ids';
import { Feld, Knopf, Modal, cx, eingabeKlasse } from './ui';

function leer(): Person {
  return {
    id: '',
    name: '',
    dienstnummer: null,
    email: '',
    telefon: '',
    rollen: [],
    notiz: '',
    aktiv: true,
  };
}

/** Anlegen/Bearbeiten einer Person (Kontakt). Loeschen gibt es bewusst nicht –
 *  stattdessen "deaktivieren", damit die abgeleitete Historie intakt bleibt. */
export default function PersonFormular({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { data, aendern } = useApp();
  const rollenAuswahl = data?.settings.rollen ?? [];
  const [e, setE] = useState<Person>(person ? { ...person } : leer());
  const [fehler, setFehler] = useState<string | null>(null);
  const istNeu = !person;

  function setzen<K extends keyof Person>(feld: K, wert: Person[K]) {
    setE((p) => ({ ...p, [feld]: wert }));
  }
  function rolleUmschalten(r: string) {
    setE((p) => ({
      ...p,
      rollen: p.rollen.includes(r) ? p.rollen.filter((x) => x !== r) : [...p.rollen, r],
    }));
  }

  async function speichern() {
    if (!e.name.trim()) return setFehler('Name ist Pflicht.');
    const id = e.id || naechstePersonId(data?.personen ?? []);
    const person: Person = { ...e, id, name: e.name.trim() };
    await aendern((d) => {
      const i = d.personen.findIndex((p) => p.id === id);
      if (i >= 0) d.personen[i] = person;
      else d.personen.push(person);
    });
    onClose();
  }

  return (
    <Modal
      offen
      onSchliessen={onClose}
      titel={istNeu ? 'Neue Person' : 'Person bearbeiten'}
      fuss={
        <>
          {!istNeu && (
            <Knopf
              variante={e.aktiv ? 'gefahr' : 'sekundaer'}
              className="mr-auto"
              onClick={() => setzen('aktiv', !e.aktiv)}
            >
              {e.aktiv ? 'Deaktivieren' : 'Aktivieren'}
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

        <Feld label="Name">
          <input value={e.name} onChange={(ev) => setzen('name', ev.target.value)} className={eingabeKlasse} autoFocus />
        </Feld>

        <div className="grid grid-cols-2 gap-3">
          <Feld label="Dienstnummer">
            <input
              type="number"
              value={e.dienstnummer ?? ''}
              onChange={(ev) => setzen('dienstnummer', ev.target.value === '' ? null : Number(ev.target.value))}
              className={eingabeKlasse}
            />
          </Feld>
          <Feld label="Telefon">
            <input value={e.telefon ?? ''} onChange={(ev) => setzen('telefon', ev.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>

        <Feld label="E-Mail">
          <input type="email" value={e.email ?? ''} onChange={(ev) => setzen('email', ev.target.value)} className={eingabeKlasse} />
        </Feld>

        <Feld label="Rollen">
          <div className="flex flex-wrap gap-2">
            {rollenAuswahl.length === 0 && <span className="text-xs text-slate-400">Keine Rollen definiert.</span>}
            {rollenAuswahl.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => rolleUmschalten(r)}
                className={cx(
                  'rounded-full px-3 py-1 text-sm capitalize',
                  e.rollen.includes(r) ? 'bg-marke text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Feld>

        <Feld label="Notiz">
          <textarea value={e.notiz ?? ''} onChange={(ev) => setzen('notiz', ev.target.value)} rows={2} className={eingabeKlasse} />
        </Feld>
      </div>
    </Modal>
  );
}
