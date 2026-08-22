'use client';

import { useEffect } from 'react';

/** Registriert den Service Worker (nur im Browser, nur in Produktion sinnvoll,
 *  aber auch im Dev unschaedlich). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const reg = () =>
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('SW-Registrierung fehlgeschlagen:', e);
      });
    // Nach dem Load registrieren, um den ersten Seitenaufbau nicht zu bremsen.
    if (document.readyState === 'complete') reg();
    else window.addEventListener('load', reg, { once: true });
  }, []);
  return null;
}
