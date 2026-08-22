import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ruhige, gut lesbare Grundfarbe. Bewusst dezent gehalten (Hobbyprojekt).
        marke: {
          DEFAULT: '#4f46e5',
          dunkel: '#4338ca',
          hell: '#eef2ff',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
