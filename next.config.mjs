/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Service Worker und Manifest liegen statisch in /public und werden nicht von Next
  // gebundlet. Wir setzen nur sinnvolle Header fuer den SW (kein aggressives Caching).
  async headers() {
    return [
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
