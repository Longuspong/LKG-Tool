# Gemeindeplaner (PWA)

Kleine, wartbare Terminplanung für eine landeskirchliche Gemeinschaft.
Hobbyprojekt für **eine** Person, nutzbar auf **max. 2 Geräten** (Telefon + PC).
Wichtigstes Ziel: **nichts übersehen oder doppelt planen.**

> **Status: Phase 5 fertig.** Der Bestand lässt sich jetzt **austauschen und
> ausdrucken**: der Kalender als **ICS** (zum Abonnieren im Telefon-/PC-Kalender),
> Termine und Kontakte als **CSV** (für Excel &amp; Co.), und die Kontaktliste per
> **CSV-Import** einlesen (additiv, mit Vorschau – nichts wird gelöscht). Eine eigene
> **Druck-Ansicht** (`/drucken`) erzeugt einen sauberen Dienstplan zum Aushängen.
> Zusätzlich schützt ein optionaler **Passcode beim Öffnen** die App auf dem Gerät.
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

## Kontakt-Archiv (Personen)

Die Personen-Seite (`src/app/personen/page.tsx`) ist zugleich das **Archiv**:
kein separater Datentopf, sondern die Kontaktliste mit den live aus den Terminen
abgeleiteten Kennzahlen.

- **Suchen** nach Name, Dienstnummer, Telefon oder E-Mail.
- **Filtern** nach Rolle (Chips aus den Einstellungen) und Status
  (aktiv / inaktiv / alle).
- **Sortieren** nach Name, Häufigkeit, „zuletzt da", „am längsten nicht da"
  (gut, um niemanden zu übersehen) oder nächstem Termin.
- **Detail-Karte** (`PersonDetail`): Stammdaten mit Telefon-/Mail-Link,
  Kennzahlen (Besuche gesamt und je Rolle, letzter/nächster Termin als
  Relativangabe) und die **komplette Historie**. Von dort direkt die Person
  bearbeiten oder einen Termin öffnen.

Die volle Historie kommt aus `archivFuer` in `src/lib/model/derive.ts` –
vergangene Beteiligungen absteigend, kommende aufsteigend, nichts gespeichert.

## Offene Stunden: Kontakt-Workflow & Vorschläge

„Offene Stunden" (`src/app/offen/page.tsx`) ist die **Arbeitsliste**: gezeigt wird
nur, was noch etwas braucht, gruppiert nach Dringlichkeit (`offenPhase` in
`src/lib/model/gaps.ts`):

1. **Absage – neu besetzen** (jemand hat abgesagt, der Slot hängt),
2. **Ohne Prediger** (fehlt komplett),
3. **Kontakt offen** (Prediger steht, noch nicht angefragt),
4. **Rückmeldung ausstehend** (angefragt, wartet auf Zu-/Absage).

Ein Klick öffnet den geführten Ablauf (`KontaktWorkflow`); „Alle durchgehen"
blättert die ganze Liste chronologisch durch (die Reihenfolge wird beim Start
eingefroren, damit erledigte Slots die Navigation nicht verschieben).

**Vorschlagsfunktion** (`src/lib/model/vorschlag.ts`): Für einen offenen Slot
werden die aktiven Personen live gerankt – wie alles hier **abgeleitet, nichts
gespeichert**. Leitgedanke „nichts übersehen": Wer **am längsten nicht dran** war,
steht oben. Reihenfolge:

1. passende Rolle zuerst,
2. nicht am selben Tag schon verplant (Doppelbuchung vermeiden),
3. längste Pause in dieser Rolle zuerst („noch nie" ganz oben),
4. weniger Einsätze zuerst (Ausgleich), dann Name.

Jede Zeile nennt die Begründung („zuletzt vor 3 Wochen · 2× Prediger") und warnt
bei Doppelbuchung.

**Statuskette** (`src/lib/model/workflow.ts`): reine Mutatoren bündeln die
sinnvollen Übergänge an einer Stelle, damit `status` (offen/besetzt/bestätigt)
und `kontaktStatus` (offen/kontaktiert/bestätigt/abgesagt) nicht auseinander­
laufen: zuweisen → besetzt, kontaktiert, Zusage → bestätigt, Absage → neu
besetzen. Anruf-/Mail-Knöpfe nutzen die im Archiv gepflegten Kontaktdaten.

Das Dashboard leitet seine Prediger-Listen (ohne Prediger, Kontakt offen,
Absagen) in denselben Workflow; die anderen Lücken öffnen weiter das Formular.

## Austausch, Druck & Geräte-Sperre (Phase 5)

Alles Weitere sitzt in den **Einstellungen** bzw. unter `/drucken` und hält sich an
das Grundprinzip: exportiert wird der abgeleitete Bestand, nichts wird doppelt
gepflegt.

- **ICS-Export** (`src/lib/model/ics.ts`): der Kalender als `.ics` zum Abonnieren
  bzw. Importieren im normalen Kalenderprogramm. Uhrzeiten sind bewusst *lokale,
  schwebende* Zeit ohne Zeitzone (10:00 bleibt überall 10:00). Bewusst **nur
  Export** – die App bleibt die alleinige Planungsquelle.
- **CSV-Export** (`src/lib/model/csv.ts`): Termine und Personen als CSV. Trenner ist
  das Semikolon mit UTF-8-BOM, damit deutsches Excel ohne Nachfrage sauber öffnet.
- **CSV-Import der Kontaktliste**: robuster, abhängigkeitsfreier Parser (erkennt
  `;`, `,` oder Tab und gequotete Felder). Bestehende Kontakte werden über
  Dienstnummer bzw. Name **erkannt und aktualisiert**, Neue angelegt – **nie
  gelöscht** (sonst bräche die abgeleitete Historie). Fehlende Spalten überschreiben
  keine vorhandenen Werte. Eine Vorschau zeigt „x neu · y aktualisiert“.
- **Druck-Ansicht** (`src/app/drucken/page.tsx`): ein sauberer Dienstplan
  (Monat/Quartal) als Tabelle zum Aushängen. Die Bedienelemente tragen `kein-druck`;
  die `@media print`-Regeln (in `globals.css`) blenden die App-Hülle aus, wiederholen
  die Kopfzeile je Seite und verhindern Zeilenumbrüche mitten im Termin.
- **Passcode beim Öffnen** (`src/lib/lock.ts`, `src/components/AppLock.tsx`): eine
  optionale **lokale Geräte-Sperre**. Ehrlich eingeordnet ist das ein *Sichtschutz*,
  keine Verschlüsselung – die Daten liegen als Offline-Cache ohnehin auf dem Gerät.
  Gespeichert wird nur `Salt + SHA-256(Salt+PIN)` (Web Crypto), nie die PIN selbst;
  die Prüfung läuft rein lokal. Der Server-Zugriffscode (`APP_ACCESS_CODE`) bleibt
  davon unberührt. Die App sperrt beim Laden und nach längerem Wegklicken erneut.

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
    offen/page.tsx           Offene Stunden (Kontakt-Workflow: Arbeitsliste + Durchlauf)
    personen/page.tsx        Kontakt-Archiv (Suche/Filter/Sortierung + Detail)
    drucken/page.tsx         Druck-Ansicht: Dienstplan (Monat/Quartal) zum Aushängen
    einstellungen/page.tsx   Import/Export/Backup, CSV/ICS, Regeltermine, Sperre
    api/data/route.ts        GET/POST auf den gesamten Bestand (Versionsprüfung)
  lib/
    model/                   Datenmodell: types, validate, derive, gaps,
                             vorschlag, workflow, rotation, slots, io, csv, ics …
    storage/                 Speicher-Schicht (Interface + Blob/Datei/IndexedDB/Client)
    date.ts, labels.ts, auth.ts, lock.ts, download.ts
  components/                UI-Bausteine (Shell, Navigation, Formulare,
                             DatenAustausch, GeraeteSperre, AppLock …)
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
- **Phase 3 – Kontakt-Archiv (fertig):** Personen-Seite als Archiv-Sicht mit
  Suche, Rollen-/Status-Filter und mehreren Sortierungen; Detail-Karte
  (`PersonDetail`) mit Kennzahlen und voller abgeleiteter Historie
  (`archivFuer` in `src/lib/model/derive.ts`).
- **Phase 4 – Kontakt-Workflow (fertig):** „Offene Stunden" als nach Dringlichkeit
  gruppierte Arbeitsliste mit Durchlauf, Vorschlagsfunktion („am längsten nicht
  dran zuerst", `src/lib/model/vorschlag.ts`), gebündelter Statuskette
  (`src/lib/model/workflow.ts`) und geführtem Ablauf (`KontaktWorkflow`) inkl.
  Anruf-/Mail-Direktknöpfen; Dashboard leitet die Prediger-Lücken hierher.
- **Phase 5 – Austausch, Druck & Sperre (fertig):** ICS-Export des Kalenders und
  CSV-Export von Terminen/Personen (`src/lib/model/ics.ts`, `src/lib/model/csv.ts`),
  additiver CSV-Import der Kontaktliste mit Vorschau, eigene Druck-Ansicht
  (`src/app/drucken/page.tsx`) mit Feinschliff der `@media print`-Regeln sowie
  optionaler lokaler Passcode beim Öffnen (`src/lib/lock.ts`, `AppLock`).
