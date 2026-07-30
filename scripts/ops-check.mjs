/**
 * Jedna komanda koja kaže u kakvom je stanju sajt: `npm run ops`
 *
 * Za razliku od drugih projekata, ovde nema Worker-a ni D1 baze — sajt je
 * statičan na Cloudflare Pages. Zato umesto grešaka Worker-a gledamo posete
 * iz Web Analytics-a.
 *
 * Tajne stoje van repozitorijuma (repo je javan):
 *   ~/.config/glass018.rs/gsc-key.json   servisni nalog za Search Console
 *   ~/.jamogu-cf-token                    Cloudflare API token
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const SAJT = 'https://glass018.rs';
const GSC_SITE = 'sc-domain:glass018.rs';
const CF_NALOG = '2fb3d178d5f36a51bbee103ec69d3ef7';

const dom = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const naslov = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const red = (a, b) => console.log(`  ${String(a).padEnd(30)} ${b}`);

function procitaj(p) {
  try {
    return fs.readFileSync(p, 'utf8').trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- sajt
async function proveriSajt() {
  naslov('SAJT');
  const strane = ['/', '/modeli/', '/radovi/', '/modeli/staklena-vrata/', '/robots.txt', '/sitemap-index.xml'];
  for (const s of strane) {
    const t0 = Date.now();
    try {
      const r = await fetch(SAJT + s, { redirect: 'manual' });
      const ms = Date.now() - t0;
      const znak = r.status === 200 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      red(`${znak} ${s}`, `${r.status}  ${ms} ms`);
    } catch (e) {
      red(`\x1b[31m✗\x1b[0m ${s}`, e.message);
    }
  }

  // www mora da preusmerava na goli domen
  try {
    const r = await fetch('https://www.glass018.rs/modeli/', { redirect: 'manual' });
    const cilj = r.headers.get('location') ?? '';
    const ok = r.status === 301 && cilj.startsWith(SAJT);
    red(`${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} www → apex`, `${r.status} ${cilj}`);
  } catch (e) {
    red('\x1b[31m✗\x1b[0m www → apex', e.message);
  }

  // indeksiranje i analitika — tihe greške koje se inače primete tek za mesec dana
  try {
    const html = await (await fetch(`${SAJT}/?ops=${Date.now()}`)).text();
    red(
      html.includes('cloudflareinsights') ? '\x1b[32m✓\x1b[0m analitika' : '\x1b[31m✗\x1b[0m analitika',
      html.includes('cloudflareinsights') ? 'beacon prisutan' : 'BEACON NEDOSTAJE'
    );
    const noindex = /name="robots"[^>]*noindex/.test(html);
    red(noindex ? '\x1b[31m✗\x1b[0m indeksiranje' : '\x1b[32m✓\x1b[0m indeksiranje', noindex ? 'NOINDEX JE UKLJUČEN' : 'dozvoljeno');
  } catch (e) {
    red('\x1b[31m✗\x1b[0m provera HTML-a', e.message);
  }
}

// ---------------------------------------------------------------- sadržaj
function proveriSadrzaj() {
  naslov('SADRŽAJ');
  const dirModeli = 'src/content/modeli';
  const dirSlike = 'src/assets/modeli';
  let objavljenih = 0;
  let skrivenih = 0;
  let ukupnoSlika = 0;

  for (const f of fs.readdirSync(dirModeli).filter((x) => x.endsWith('.md'))) {
    const t = fs.readFileSync(path.join(dirModeli, f), 'utf8');
    const skriven = /^objavljeno:\s*false/m.test(t);
    skriven ? skrivenih++ : objavljenih++;
    const id = f.replace(/\.md$/, '');
    const folder = path.join(dirSlike, id);
    const n = fs.existsSync(folder) ? fs.readdirSync(folder).filter((x) => /\.(jpe?g|png|webp)$/i.test(x)).length : 0;
    ukupnoSlika += n;
    if (n === 0) red(`\x1b[31m✗\x1b[0m ${id}`, 'NEMA FOTOGRAFIJA');
    else if (skriven) red(`\x1b[33m·\x1b[0m ${id}`, `${n} slika — nije objavljen`);
  }
  red('modela objavljeno', objavljenih + (skrivenih ? `  (skriveno: ${skrivenih})` : ''));
  red('fotografija ukupno', ukupnoSlika);
}

// ---------------------------------------------------------------- Cloudflare
async function proveriCloudflare() {
  naslov('CLOUDFLARE — posete (7 dana)');
  const token = process.env.CLOUDFLARE_API_TOKEN || procitaj(path.join(os.homedir(), '.jamogu-cf-token'));
  if (!token) return red('token', 'nema ga (~/.jamogu-cf-token)');

  // RUM podaci stoje na nivou NALOGA (ne zone), pa se filtriraju po hostu —
  // inače stignu i posete sa ostalih sajtova na istom Cloudflare nalogu.
  const upit = `
    query($a: String!, $od: Time!, $do: Time!) {
      viewer { accounts(filter: {accountTag: $a}) {
        rum: rumPageloadEventsAdaptiveGroups(
          limit: 10,
          filter: {datetime_geq: $od, datetime_leq: $do, requestHost: "glass018.rs"},
          orderBy: [count_DESC]
        ) { count dimensions { requestPath } }
      } }
    }`;
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: upit,
        variables: {
          a: CF_NALOG,
          od: new Date(Date.now() - 7 * 864e5).toISOString(),
          do: new Date().toISOString(),
        },
      }),
    });
    const j = await r.json();
    if (j.errors?.length) return red('nedostupno', j.errors[0].message);
    const rows = j.data?.viewer?.accounts?.[0]?.rum ?? [];
    if (!rows.length) return red('poseta', 'još nema podataka');
    red('učitavanja strana', rows.reduce((s, x) => s + x.count, 0));
    for (const x of rows.slice(0, 6)) red('  ' + x.dimensions.requestPath, x.count);
  } catch (e) {
    red('greška', e.message);
  }
}

// ---------------------------------------------------------------- Search Console
async function gscToken(kljuc) {
  const b64 = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sada = Math.floor(Date.now() / 1000);
  const ulaz =
    b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64(
      JSON.stringify({
        iss: kljuc.client_email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: kljuc.token_uri,
        iat: sada,
        exp: sada + 3600,
      })
    );
  const potpis = crypto.createSign('RSA-SHA256').update(ulaz).sign(kljuc.private_key);
  const r = await fetch(kljuc.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: ulaz + '.' + b64(potpis),
    }),
  });
  return (await r.json()).access_token;
}

async function proveriGSC() {
  naslov('GOOGLE SEARCH CONSOLE (7 dana, sa 2 dana kašnjenja)');
  const put = path.join(os.homedir(), '.config', 'glass018.rs', 'gsc-key.json');
  const sirovo = procitaj(put);
  if (!sirovo) return red('ključ', 'nema ga: ' + put);

  try {
    const tok = await gscToken(JSON.parse(sirovo));
    if (!tok) return red('prijava', 'nije uspela');

    const zovi = async (dimenzije) => {
      const r = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: dom(9), endDate: dom(2), dimensions: dimenzije, rowLimit: 10 }),
        }
      );
      return r.json();
    };

    const q = await zovi(['query']);
    if (q.error) return red('nedostupno', `${q.error.code} ${q.error.message}`);

    const rows = q.rows ?? [];
    if (!rows.length) {
      red('pretrage', 'još nema podataka (novo je — treba nekoliko dana)');
    } else {
      for (const r of rows)
        red(r.keys[0], `${r.clicks} klik / ${r.impressions} prikaz · poz. ${r.position.toFixed(1)}`);
    }

    const p = await zovi(['page']);
    if (p.rows?.length) {
      console.log();
      for (const r of p.rows.slice(0, 5))
        red(new URL(r.keys[0]).pathname, `${r.clicks} klik / ${r.impressions} prikaz`);
    }
  } catch (e) {
    red('greška', e.message);
  }
}

// ----------------------------------------------------------------
console.log(`\n\x1b[1m═══ ${SAJT} ═══\x1b[0m`);
await proveriSajt();
proveriSadrzaj();
await proveriCloudflare();
await proveriGSC();
console.log();
