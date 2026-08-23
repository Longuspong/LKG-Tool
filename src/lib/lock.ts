/**
 * Geraete-Sperre ("Passcode beim Oeffnen", Phase 5).
 *
 * Ehrliche Einordnung: Das ist ein lokaler *Sichtschutz*, keine Verschluesselung.
 * Die Daten liegen (als Offline-Cache) ohnehin auf dem Geraet; die Sperre verhindert
 * nur, dass jemand die geoeffnete App/PWA versehentlich mitliest. Der eigentliche
 * Server-Zugriffscode (APP_ACCESS_CODE) ist davon unabhaengig.
 *
 * Gespeichert wird NUR ein Salt + SHA-256(Salt+PIN) im localStorage – nie die PIN
 * selbst. Die Pruefung laeuft rein lokal, es geht nichts ans Netz.
 */

const LS_LOCK = 'gemeindeplaner.sperre';

interface SperrKonfig {
  salt: string; // Hex
  hash: string; // Hex, SHA-256(salt + pin)
}

function lese(): SperrKonfig | null {
  try {
    const roh = localStorage.getItem(LS_LOCK);
    if (!roh) return null;
    const o = JSON.parse(roh);
    if (o && typeof o.salt === 'string' && typeof o.hash === 'string') return o;
    return null;
  } catch {
    return null;
  }
}

/** Ist eine Sperre auf diesem Geraet eingerichtet? */
export function sperreAktiv(): boolean {
  return lese() !== null;
}

/** Steht die Web-Crypto-API zur Verfuegung? (Nur ueber HTTPS/localhost.) */
export function cryptoVerfuegbar(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function hex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(text: string): Promise<string> {
  const daten = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', daten);
  return hex(digest);
}

/** Richtet eine neue PIN ein (mit frischem Zufalls-Salt). */
export async function setzeSperre(pin: string): Promise<void> {
  if (!cryptoVerfuegbar()) throw new Error('Sichere Verschluesselung ist hier nicht verfuegbar.');
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = hex(saltBytes);
  const hash = await sha256Hex(salt + pin);
  localStorage.setItem(LS_LOCK, JSON.stringify({ salt, hash }));
}

/** Prueft eine eingegebene PIN gegen die gespeicherte Sperre. */
export async function pruefeSperre(pin: string): Promise<boolean> {
  const conf = lese();
  if (!conf || !cryptoVerfuegbar()) return false;
  const hash = await sha256Hex(conf.salt + pin);
  // Laengen sind gleich (Hex von SHA-256); einfacher Vergleich genuegt lokal.
  return hash === conf.hash;
}

/** Entfernt die Sperre von diesem Geraet. */
export function entferneSperre(): void {
  try {
    localStorage.removeItem(LS_LOCK);
  } catch {
    /* ignoriert */
  }
}
