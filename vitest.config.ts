import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Minimale Vitest-Konfiguration. Getestet wird die reine Fachlogik, dafuer
 * genuegt die Node-Umgebung (kein DOM noetig). Der "@/"-Alias spiegelt den
 * Pfad-Alias aus der tsconfig, damit Tests dieselben Importe wie die App nutzen.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
