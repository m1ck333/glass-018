// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Statički sajt — build izlazi u ./dist, spremno za Cloudflare Pages.
// U Cloudflare Pages podesiti: build command `npm run build`, output dir `dist`.
export default defineConfig({
  // Menja se na pravi domen kad ga Milan izabere. Utiče na kanonske
  // adrese, sitemap i robots.txt.
  site: 'https://glass018.pages.dev',
  output: 'static',
  server: {
    port: 4491,
    host: true,
  },
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // 404 nema šta da traži u sitemapu
      filter: (stranica) => !stranica.includes('/404'),
    }),
  ],
});
