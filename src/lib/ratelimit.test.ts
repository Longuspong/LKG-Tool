import { describe, it, expect } from 'vitest';
import { clientSchluessel, fehlversuchRegistrieren } from '@/lib/ratelimit';

function anfrage(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/data', { headers });
}

describe('clientSchluessel', () => {
  it('nimmt die erste IP aus x-forwarded-for', () => {
    expect(clientSchluessel(anfrage({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });
  it('faellt auf x-real-ip zurueck', () => {
    expect(clientSchluessel(anfrage({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
  });
  it('nutzt einen neutralen Sammelschluessel ohne IP', () => {
    expect(clientSchluessel(anfrage({}))).toBe('sammel');
  });
});

describe('fehlversuchRegistrieren', () => {
  it('blockiert erst, wenn mehr als die erlaubten Fehlversuche im Fenster liegen', () => {
    const req = anfrage({ 'x-forwarded-for': '203.0.113.10' });
    const t0 = 1_000_000;
    // Die ersten fuenf Fehlversuche sind noch erlaubt (nur 401, kein 429).
    for (let i = 0; i < 5; i++) {
      expect(fehlversuchRegistrieren(req, t0 + i * 100).blockieren).toBe(false);
    }
    // Der sechste im selben Fenster wird blockiert (429).
    const stand = fehlversuchRegistrieren(req, t0 + 600);
    expect(stand.blockieren).toBe(true);
    expect(stand.retryNachSek).toBeGreaterThan(0);
  });

  it('setzt den Zaehler zurueck, sobald das Fenster vorbei ist', () => {
    const req = anfrage({ 'x-forwarded-for': '203.0.113.11' });
    const t0 = 2_000_000;
    for (let i = 0; i < 6; i++) fehlversuchRegistrieren(req, t0 + i * 100); // blockiert am Ende
    // Weit nach dem Fenster (60 s) sind die alten Versuche verfallen.
    const spaeter = fehlversuchRegistrieren(req, t0 + 61_000);
    expect(spaeter.blockieren).toBe(false);
  });

  it('zaehlt verschiedene Clients getrennt', () => {
    const a = anfrage({ 'x-forwarded-for': '203.0.113.20' });
    const b = anfrage({ 'x-forwarded-for': '203.0.113.21' });
    const t0 = 3_000_000;
    for (let i = 0; i < 6; i++) fehlversuchRegistrieren(a, t0 + i * 100); // a blockiert
    // b ist davon unberuehrt.
    expect(fehlversuchRegistrieren(b, t0 + 600).blockieren).toBe(false);
  });
});
