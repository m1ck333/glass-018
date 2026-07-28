import type { APIRoute } from 'astro';
import { site } from '../data/site';

/**
 * robots.txt se generiše, a ne stoji kao statični fajl, da bi pratio
 * `site.preview` — dok je sajt na privremenoj adresi, indeksiranje je
 * zabranjeno; kad se uveže pravi domen, dozvoljeno je i nudi se sitemap.
 */
export const GET: APIRoute = ({ site: adresa }) => {
  const telo = site.preview
    ? ['User-agent: *', 'Disallow: /', ''].join('\n')
    : [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL('sitemap-index.xml', adresa).href}`,
        '',
      ].join('\n');

  return new Response(telo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
