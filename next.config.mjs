const istEntwicklung = process.env.NODE_ENV !== 'production';

/**
 * Zurueckhaltende Content-Security-Policy. Erlaubt genau, was die App braucht:
 * eigene Herkunft fuer Skripte/Styles/Bilder, den eigenen Service Worker, das
 * Manifest, die eigenen Icons und die Fetches an /api. `'unsafe-inline'` ist
 * fuer die Inline-Runtime von Next.js (Hydration) und inline-Styles noetig;
 * `'unsafe-eval'` NUR im Dev-Modus (Hot Reload) – in Produktion faellt es weg.
 *
 * Wenn die App spaeter etwas Externes laedt (Font, Analytics, ...), hier gezielt
 * die passende Direktive lockern – nicht die ganze CSP entfernen.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${istEntwicklung ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'self'",
].join('; ');

// Billige, globale Haertung fuer alle Antworten.
const sicherheitsHeader = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' }, // Clickjacking-Schutz (zusaetzlich zu frame-ancestors)
  { key: 'Content-Security-Policy', value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Sicherheits-Header global auf alle Routen.
        source: '/:path*',
        headers: sicherheitsHeader,
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // API niemals cachen (immer frische Versionspruefung).
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
