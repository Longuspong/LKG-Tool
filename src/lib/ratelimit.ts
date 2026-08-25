/**
 * Sehr leichtes In-Memory-Rate-Limit gegen Brute-Force auf den Zugriffscode.
 *
 * Es zaehlen ausschliesslich FEHLGESCHLAGENE Code-Versuche – ein Geraet mit dem
 * korrekten Code stoesst also nie an die Grenze (normaler Betrieb bleibt
 * unbeeinflusst). Pro Client (IP) wird ein gleitendes Zeitfenster gefuehrt;
 * ueberschreitet die Zahl der Fehlversuche darin die Grenze, soll die Route mit
 * HTTP 429 antworten.
 *
 * EHRLICHE EINSCHRAENKUNG: In der Serverless-Umgebung (Vercel) lebt dieser
 * Speicher PRO INSTANZ und wird NICHT global geteilt. Fuer ein
 * Zwei-Geraete-Hobbyprojekt ist das eine sinnvolle Bremse, aber kein harter
 * Schutz – ein verteilter Angriff ueber mehrere Instanzen umginge ihn. Wer
 * echten Schutz braucht, muesste den Zaehler in einen geteilten Speicher
 * (z.B. KV/Redis) auslagern.
 */

const FENSTER_MS = 60_000; // Beobachtungsfenster: 1 Minute
const MAX_FEHLVERSUCHE = 5; // so viele Fehlversuche pro Fenster sind noch ok

// key (Client-IP) -> Zeitstempel (ms) der juengsten Fehlversuche im Fenster.
const fehlversuche = new Map<string, number[]>();

/** Ermittelt einen stabilen Client-Schluessel aus den Proxy-Headern. */
export function clientSchluessel(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const erste = xff.split(',')[0]?.trim();
    if (erste) return erste;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return 'sammel'; // neutraler Sammelschluessel, wenn keine IP erkennbar ist
}

/** Liefert die noch im Fenster liegenden Fehlversuche und raeumt Altes auf. */
function frischeFehler(key: string, jetzt: number): number[] {
  const alle = fehlversuche.get(key) ?? [];
  const frisch = alle.filter((t) => jetzt - t < FENSTER_MS);
  if (frisch.length > 0) fehlversuche.set(key, frisch);
  else fehlversuche.delete(key);
  return frisch;
}

export interface RateLimitStand {
  blockieren: boolean; // true -> mit 429 antworten
  retryNachSek: number; // Hinweis fuer den Retry-After-Header
}

/**
 * Registriert einen Fehlversuch und meldet, ob der Client jetzt zu blockieren
 * ist (mehr Fehlversuche im Fenster als erlaubt). `jetzt` ist injizierbar,
 * damit sich das Zeitfenster deterministisch testen laesst.
 */
export function fehlversuchRegistrieren(req: Request, jetzt: number = Date.now()): RateLimitStand {
  const key = clientSchluessel(req);
  const frisch = frischeFehler(key, jetzt);
  frisch.push(jetzt);
  fehlversuche.set(key, frisch);

  const blockieren = frisch.length > MAX_FEHLVERSUCHE;
  const aeltester = frisch[0];
  const retryNachSek = Math.max(1, Math.ceil((aeltester + FENSTER_MS - jetzt) / 1000));
  return { blockieren, retryNachSek };
}
