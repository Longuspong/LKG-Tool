# Daten-Importe

Fertige `DataFile`-JSONs zum Einlesen über **Einstellungen → „⬆ Import (JSON)"**.
Der Import zeigt zuerst eine Vorschau (mit Validierung) und **ersetzt** beim
Übernehmen den kompletten Bestand – also am besten in eine leere App importieren
oder vorher ein Backup exportieren.

## `Limbach-Oberfrohna_2026-Q4.json`

Nur die Gemeinde **Limbach-Oberfrohna**, 4. Quartal 2026 (Okt–Dez), aus dem
Quartalsplan des Bezirks Chemnitz-Land (Sächsischer Gemeinschaftsverband).

- **32 Personen** – die komplette Prediger-Legende (Nummern + Kürzel im Notizfeld).
- **36 Termine**:
  - Sonntag – Gemeinschaftsstunde (Standard 10:00, 1. Sonntag 15:00)
  - Mittwoch – Bibel-/Frauenstunde (19:30)
  - Donnerstag – Jugendstunde „Limbach J" (19:00)
  - Freitag – „Limbach MG" (19:30)

### Übernommene Konventionen aus dem Plan

| Plan-Zeichen | Abbildung im Datensatz |
|---|---|
| Prediger-Nummer / Kürzel (z. B. `4`, `DU`, `TZ`) | mit Person verknüpft (`predigerId`) |
| `E` (Eigenbesetzung) | Status *besetzt*, ohne Person, Hinweis im Kommentar |
| `S` (selbst besetzen, gelb) | Status *offen* (erscheint im Dashboard als Lücke) |
| Gastprediger-Nummern `132` / `138` / `145` (nicht in der Legende) | ohne Person, Nummer im Kommentar |
| `F` (Frauenstunde) | Hinweis im Kommentar |
| veränderte Zeiten (rot) | als `uhrzeit` übernommen |
| `mA` / „mit Abendmahl" | `abendmahl: true` |

### Besonderheiten (aus den Zell-Notizen der Quelle)

- **So 04.10.** Erntedankstunde, wenn möglich mit Abendmahl.
- **So 01.11.** Es entfällt die Gemeinschaftsstunde (Verabschiedung Pfr. Schubert
  in der Stadtkirche Limbach, 14:00) → als Ereignis (`event`) hinterlegt, keine Lücke.
- **So 08.11.** Eigenbesetzung mit Thomas Lange (Mission Osteuropa).
- **So 06.12.** Austauschdienst (Thomas Zeschke, Bezirk Chemnitz Stadt), mit Abendmahl.
- **Mi 28.10.** Austauschdienst (Daniel Ulbricht, Bezirk Rochlitz).
- „**Lupla J**" (Mittwoch-Jugend) ist **Lutherplatz** (Chemnitz), nicht Limbach –
  daher nicht enthalten.
- „**MG**" (Freitag) ist im Plan nicht ausgeschrieben; Bezeichnung 1:1 übernommen.
