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
  // Cloudflare GraphQL ume da vrati „Internal server error" bez razloga i
  // proradi na sledeći pokušaj. Bez ovoga izveštaj laže da nema poseta.
  const zovi = async () => {
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
    return r.json();
  };

  try {
    let j = await zovi();
    for (let i = 0; i < 2 && j.errors?.length; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      j = await zovi();
    }
    if (j.errors?.length) return red('nedostupno', j.errors[0].message + '  (3 pokušaja)');
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

/** Pretrage i strane iz Search Console-a, sa poređenjem prema prethodnoj nedelji. */
async function gscUpit(tok, telo) {
  const r = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify(telo),
    }
  );
  return r.json();
}

/**
 * Da li je Google stvarno indeksirao stranu — isto što i „URL Inspection" u
 * Search Console-u, samo za sve strane odjednom. Ovo je jedina provera koja
 * hvata „Discovered - currently not indexed": strana postoji, sitemap je
 * ispravan, a Google je jednostavno nije uzeo.
 */
async function proveriIndeksiranje(tok, adrese) {
  naslov('INDEKSIRANJE');
  const stanja = new Map();
  for (const adresa of adrese) {
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: adresa, siteUrl: GSC_SITE }),
      });
      const j = await r.json();
      if (j.error) {
        red('\x1b[31m✗\x1b[0m ' + new URL(adresa).pathname, `${j.error.code} ${j.error.message}`);
        continue;
      }
      const s = j.inspectionResult?.indexStatusResult ?? {};
      const stanje = s.coverageState ?? 'nepoznato';
      stanja.set(stanje, (stanja.get(stanje) ?? 0) + 1);
      const ok = s.verdict === 'PASS';
      if (!ok) red(`\x1b[33m·\x1b[0m ${new URL(adresa).pathname}`, stanje);
    } catch (e) {
      red('\x1b[31m✗\x1b[0m ' + new URL(adresa).pathname, e.message);
    }
  }
  for (const [stanje, broj] of [...stanja].sort((a, b) => b[1] - a[1])) {
    const dobro = /Submitted and indexed|URL is on Google/i.test(stanje);
    red(`${dobro ? '\x1b[32m✓\x1b[0m' : '\x1b[33m·\x1b[0m'} ${stanje}`, `${broj} ${broj === 1 ? 'strana' : 'strana'}`);
  }
}

/** Adrese svih strana, onako kako ih Google vidi — iz živog sitemap-a. */
async function adreseIzSitemapa() {
  const uzmi = async (u) => (await (await fetch(u)).text());
  const glavni = await uzmi(`${SAJT}/sitemap-index.xml`);
  const deca = [...glavni.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const adrese = [];
  for (const d of deca) {
    const x = await uzmi(d);
    adrese.push(...[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return [...new Set(adrese)];
}

async function proveriGSC() {
  const put = path.join(os.homedir(), '.config', 'glass018.rs', 'gsc-key.json');
  const sirovo = procitaj(put);
  if (!sirovo) {
    naslov('GOOGLE SEARCH CONSOLE');
    return red('ključ', 'nema ga: ' + put);
  }

  let tok;
  try {
    tok = await gscToken(JSON.parse(sirovo));
  } catch (e) {
    naslov('GOOGLE SEARCH CONSOLE');
    return red('prijava', e.message);
  }
  if (!tok) {
    naslov('GOOGLE SEARCH CONSOLE');
    return red('prijava', 'nije uspela');
  }

  // Google kasni oko dva dana, pa se meri 7 dana koji se završavaju pre dva dana,
  // i porede se sa 7 dana pre toga — inače se svaki dan gleda nepotpun podatak.
  const sada = { od: dom(9), do: dom(3) };
  const pre = { od: dom(16), do: dom(10) };

  naslov(`GOOGLE SEARCH CONSOLE (${sada.od} — ${sada.do})`);

  const zbir = (r) =>
    (r.rows ?? []).reduce(
      (a, x) => ({ klik: a.klik + x.clicks, prikaz: a.prikaz + x.impressions }),
      { klik: 0, prikaz: 0 }
    );

  const [sad, ranije] = await Promise.all([
    gscUpit(tok, { startDate: sada.od, endDate: sada.do, dimensions: ['date'], rowLimit: 30 }),
    gscUpit(tok, { startDate: pre.od, endDate: pre.do, dimensions: ['date'], rowLimit: 30 }),
  ]);
  if (sad.error) return red('nedostupno', `${sad.error.code} ${sad.error.message}`);

  const a = zbir(sad);
  const b = zbir(ranije);
  const razlika = (novo, staro) => {
    if (staro === 0) return novo === 0 ? '' : '  \x1b[32m(novo)\x1b[0m';
    const p = Math.round(((novo - staro) / staro) * 100);
    const boja = p >= 0 ? '\x1b[32m' : '\x1b[31m';
    return `  ${boja}${p >= 0 ? '+' : ''}${p}%\x1b[0m prema prethodnih 7 dana`;
  };
  red('klikova', a.klik + razlika(a.klik, b.klik));
  red('prikaza', a.prikaz + razlika(a.prikaz, b.prikaz));
  red('CTR', a.prikaz ? ((a.klik / a.prikaz) * 100).toFixed(1) + ' %' : '—');

  const pretrage = await gscUpit(tok, {
    startDate: sada.od,
    endDate: sada.do,
    dimensions: ['query'],
    rowLimit: 25,
  });
  const redovi = pretrage.rows ?? [];
  if (!redovi.length) {
    red('pretrage', 'još nema podataka');
  } else {
    console.log('\n  \x1b[1mPretrage\x1b[0m');
    for (const r of redovi.slice(0, 8))
      red('  ' + r.keys[0], `${r.clicks} klik / ${r.impressions} prikaz · poz. ${r.position.toFixed(1)}`);

    // Pozicije 11—20 su druga strana Google-a. Tu je najlakši dobitak: strana
    // je već relevantna, fali joj malo da pređe na prvu.
    const blizu = redovi.filter((r) => r.position > 10 && r.position <= 20);
    if (blizu.length) {
      console.log('\n  \x1b[1mNa drugoj strani (najlakše se dobija)\x1b[0m');
      for (const r of blizu.slice(0, 6))
        red('  ' + r.keys[0], `poz. ${r.position.toFixed(1)} · ${r.impressions} prikaz`);
    }
  }

  const strane = await gscUpit(tok, {
    startDate: sada.od,
    endDate: sada.do,
    dimensions: ['page'],
    rowLimit: 25,
  });
  if (strane.rows?.length) {
    console.log('\n  \x1b[1mStrane\x1b[0m');
    for (const r of strane.rows.slice(0, 8)) {
      const u = new URL(r.keys[0]);
      // http:// i www. se pojavljuju kao zasebne strane dok ih Google ne spoji.
      // Bez ovoga se ista strana prikaže dvaput bez objašnjenja.
      const kanonski = u.protocol === 'https:' && u.host === 'glass018.rs';
      const ime = kanonski ? u.pathname : `${u.pathname}  \x1b[33m[${u.protocol}//${u.host}]\x1b[0m`;
      red('  ' + ime, `${r.clicks} klik / ${r.impressions} prikaz · poz. ${r.position.toFixed(1)}`);
    }
  }

  return tok;
}

// ----------------------------------------------------------------
console.log(`\n\x1b[1m═══ ${SAJT} ═══\x1b[0m`);
await proveriSajt();
proveriSadrzaj();
await proveriCloudflare();
const tok = await proveriGSC();
if (tok) await proveriIndeksiranje(tok, await adreseIzSitemapa());
console.log();
