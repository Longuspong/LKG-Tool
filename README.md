# Gemeindeplaner (PWA)

Kleine, wartbare Terminplanung für eine landeskirchliche Gemeinschaft.
Hobbyprojekt für **eine** Person, nutzbar auf **max. 2 Geräten** (Telefon + PC).
Wichtigstes Ziel: **nichts übersehen oder doppelt planen.**

> **Status: Phase 2 fertig.** Auf dem MVP (Datenmodell, Speicher-Schicht mit
> Versionsprüfung, JSON-Backup, Kalender-CRUD, Monats-/Quartalsansicht,
> Dashboard-Lücken, PWA) baut jetzt die **Rotations-Engine** für Einleitung und
> Fahrdienst auf: reihum verteilen mit Event-Pausierung, Vorschau und manuellem
> Tausch, plus Reihenfolge-Editor in den Einstellungen.
> Phasen 3–5 (volles Archiv, Kontakt-Workflow, CSV/ICS/Druck) folgen.
> Siehe [Fahrplan](#fahrplan).

---

## Grundprinzip: eine Datenbasis, mehrere Sichten

Kalender, Kontakte und „offene Stunden" sind **keine getrennten Datentöpfe**,
sondern drei Sichten auf denselben Bestand:

- Ein Prediger im Kalender **ist** ein Kontakt (verknüpft über `Person.id`).
- „Wie oft war Person X da / wann zuletzt" wird **aus den Terminen berechnet**
  (`src/lib/model/derive.ts`), nie separat gepflegt.
- „Offene Stunden" sind einfach Termine mit `status: "offen"`.

So kann nichts auseinanderdriften.

---

## Rotation (Einleitung / Fahrdienst)

Wiederkehrende Dienste werden **reihum** auf die Gemeinschaftsstunden verteilt.
Bedienung: im Kalender auf **„🔁 Rotation"**, Zeitraum wählen, Vorschau prüfen,
bei Bedarf einzelne Zeilen von Hand tauschen, dann festschreiben. Die
Reihenfolge selbst pflegst du in den Einstellungen unter **„Rotationen"**.

Die Engine (`src/lib/model/rotation.ts`) ist bewusst **positionsbasiert** statt
mit wanderndem Zeiger: Wer an einem Termin dran ist, ergibt sich aus der
chronologischen Position des Slots unter allen betroffenen Terminen —
`person = reihenfolge[(startIndex + position) % anzahl]`. Daraus folgt:

- **Event-Pausierung:** Event-Tage sind keine betroffenen Slots und verschieben
  die Zählung nicht – die Rotation „wartet" einfach.
- **Driftfrei & idempotent:** Denselben Zeitraum mehrfach zu planen ändert
  nichts; die Fortsetzung über Quartalsgrenzen ergibt sich von selbst.
- **Zwei Modi:** *Nur Lücken füllen* (bestehende Einteilungen bleiben) oder
  *ganzen Zeitraum neu verteilen*.
- **Manueller Tausch** in der Vorschau verschiebt die anderen Termine nicht
  (kein Kaskaden-Effekt); mit *nur Lücken* bleibt eine Handeinteilung dauerhaft.

## Technik

- **Next.js 14 (App Router) + TypeScript** – Frontend und die beiden
  Blob-API-Routen laufen als ein Deploy auf Vercel.
- **Tailwind CSS** – leichtgewichtiges Styling, mobile-first.
- **Vercel Blob** (`@vercel/blob`) als „Single Point of Truth"; Token nur
  serverseitig.
- **IndexedDB** (`idb`) als lokaler Offline-Cache.
- **Zustand** als schlanker App-State.
- **PWA**: eigenes `manifest.webmanifest` + selbst geschriebener Service Worker
  (`public/sw.js`), keine schwere PWA-Library.

### Projektstruktur

```
src/
  app/
    page.tsx                 Dashboard (Lücken-/Kollisionsanzeige)
    kalender/page.tsx        Monat/Quartal/Liste, CRUD, Slot-Generator
    offen/page.tsx           Offene Stunden (To-do-Liste)
    personen/page.tsx        Kontakte (Grundfunktionen + abgeleitete Historie)
    einstellungen/page.tsx   Import/Export/Backup, Regeltermine, Zugriffscode
    api/data/route.ts        GET/POST auf den gesamten Bestand (Versionsprüfung)
  lib/
    model/                   Datenmodell: types, validate, derive, gaps, slots, io …
    storage/                 Speicher-Schicht (Interface + Blob/Datei/IndexedDB/Client)
    date.ts, labels.ts, auth.ts
  components/                UI-Bausteine (Shell, Navigation, Formulare …)
  state/store.ts             App-State + Sync-Logik (Optimistic Concurrency)
```

---

## Speicher & Sync (das Herzstück)

Der gesamte Bestand ist **eine JSON-Datei** (`DataFile`) mit zwei Metafeldern:
`version` (Ganzzahl) und `updatedAt` (ISO).

- **Laden:** App zeigt sofort die lokale IndexedDB-Kopie und holt parallel
  `GET /api/data`. Ist die Remote-Version neuer, wird lokal aktualisiert.
- **Speichern:** Änderung sofort in IndexedDB, dann `POST /api/data` mit der
  `baseVersion`, die geladen wurde.
- **Optimistic Concurrency:** Die Server-Route lädt vor dem Schreiben den
  aktuellen Stand. Passt die `baseVersion` **nicht**, hat das andere Gerät
  zwischendurch gespeichert → **Schreiben wird abgelehnt** (HTTP 409), der
  Client zeigt „Auf dem anderen Gerät wurde geändert" statt blind zu
  überschreiben. Bei Erfolg erhöht der Server `version` um 1 (Server ist
  autoritativ).
- **Offline:** Änderungen bleiben lokal mit „pending"-Flag und werden beim
  nächsten Online-Zustand nachgereicht (dieselbe Versionsprüfung greift).

Der `BLOB_READ_WRITE_TOKEN` bleibt **ausschließlich serverseitig** – der Browser
sieht nur die beiden API-Routen, nie die Blob-URL.

### Backups

- Jederzeit **JSON-Voll-Export** und **-Import** in den Einstellungen.
- Optische **Erinnerung**, wenn das letzte manuelle Backup zu lange her ist.
- Optional legt der Server bei jedem Schreiben zusätzlich eine versionierte
  Kopie ab (`BLOB_KEEP_BACKUPS=true` → `backups/data-<zeitstempel>.json`).

---

## Zugriffsschutz

Die Daten enthalten Telefonnummern. Ist `APP_ACCESS_CODE` gesetzt, verlangen die
API-Routen diesen Code im Header `x-access-code`. Die App fragt ihn einmal ab und
merkt ihn lokal (nur auf dem Gerät). Ohne gesetzten Code ist der Schutz aus (nur
für lokale Entwicklung sinnvoll).

---

## Lokale Entwicklung

```bash
npm install
cp .env.local.example .env.local   # Werte optional eintragen
npm run dev                        # http://localhost:3000
```

**Ohne `BLOB_READ_WRITE_TOKEN`** nutzt die Speicher-Schicht automatisch einen
**lokalen Datei-Fallback** unter `./.data/data.json` – so läuft und testet die App
komplett ohne Vercel-Konto. Sobald ein Token gesetzt ist, wird Vercel Blob genutzt.

Nützliche Skripte:

```bash
npm run typecheck   # TypeScript prüfen
npm run build       # Produktionsbuild
npm run icons       # PWA-Icons neu erzeugen (dependency-frei, nur Node)
```

---

## Deployment auf Vercel

1. Repo mit Vercel verbinden (Framework wird als **Next.js** erkannt).
2. **Blob-Store** anlegen: Vercel-Projekt → *Storage* → *Blob* → *Create* /
   *Connect*. Das setzt `BLOB_READ_WRITE_TOKEN` als Environment-Variable.
3. **Zugriffscode** setzen: Environment-Variable `APP_ACCESS_CODE` mit einem
   selbst gewählten Wert.
4. Optional: `BLOB_KEEP_BACKUPS=true`, `BLOB_DATA_PATH=gemeindeplaner/data.json`.
5. Deployen. Auf dem Telefon über „Zum Startbildschirm hinzufügen" installieren.

Der Gratis-Hobby-Tarif reicht (Vercel Blob: 1 GB frei – für eine kleine JSON mehr
als genug).

---

## Getestet (Phase-1-Abnahme)

Das kritische 2-Geräte-Szenario wurde gegen die laufende App geprüft:

- Gerät A speichert (`baseVersion 1` → `version 2`). ✅
- Gerät B speichert veraltet (`baseVersion 1`) → **409 Konflikt**, nichts
  überschrieben, Serverstand zurückgegeben. ✅
- Gerät B mit korrekter `baseVersion 2` → `version 3`. ✅
- Zugriffscode: ohne/falsch → 401, richtig → 200. ✅
- Validierung: Termin mit unbekannter `predigerId` → 422 (referenzielle
  Integrität). ✅
- Browser-Durchlauf (Chromium): Dashboard rendert, Slot-Generator erzeugt die
  Regeltermine (erster Sonntag 15:00, sonst 10:00; Mittwoch 19:30), Lücken
  erscheinen, Daten bleiben nach Reload erhalten. ✅

---

## Fahrplan

- **Phase 1 – MVP (fertig):** Datenmodell, Speicher-Schicht + Versionsprüfung,
  JSON-Backup, Kalender-CRUD, Monats-/Quartalsansicht, Dashboard-Lücken, PWA.
- **Phase 2 – Rotations-Engine (fertig):** Einleitung/Fahrdienst reihum verteilen
  (`src/lib/model/rotation.ts`), Event-Pausierung, positionsbasiert und damit
  driftfrei/idempotent, Vorschau mit manuellem Tausch (`RotationsModal`),
  Reihenfolge-Editor in den Einstellungen (`RotationEditor`).
- **Phase 3:** Volles Archiv/Kontakte mit Historie, Suche und Filtern.
- **Phase 4:** „Offene Stunden" mit Kontakt-Workflow und Vorschlagsfunktion.
- **Phase 5:** CSV-/ICS-Import/Export, Druck-Ansicht, Feinschliff, Passcode beim
  Öffnen.
