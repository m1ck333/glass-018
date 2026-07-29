# Glass 018 — sajt staklorezca iz Niša

Tuš kabine, paravani i staklene ograde po meri. Klijent je **Milan**, majstor iz
Niša; ime firme još nije odlučeno pa je „Glass 018" radno (018 = pozivni broj
Niša). Njegovo lično ime neće biti u imenu firme.

**Namena sajta je dolazak mušterija preko Google pretrage i plaćenih oglasa**,
ne klasičan portfolio. Otud: malo strana, cena vidljiva odmah, telefon i Viber
na dohvat ruke svuda, strane modela kao dolazne strane za oglase.

Uživo: <https://glass018.rs> — indeksiranje uključeno (`site.preview = false`).
`glass018.pages.dev` i dalje postoji (ne može da se obriše) ali skripta u
`Osnovni.astro` sa nje šalje na pravi domen, da se dve iste adrese ne bore u
Google rezultatima.

## Komande

```bash
npm run dev      # http://localhost:4491  — POKREĆE KORISNIK, ne Claude
npm run build    # izlaz u ./dist
npm test         # 17 testova računa cene (node --test, bez zavisnosti)
npx astro check  # mora biti 0 grešaka
```

Postavljanje (samo uz izričito odobrenje korisnika):

```bash
npm run build
export CLOUDFLARE_API_TOKEN=...        # token stoji lokalno kod korisnika
npx wrangler pages deploy dist --project-name glass018 --branch main
```

Posle deploy-a edge ume da vrati `523` desetak sekundi — to je propagacija,
ne greška. Sačekati pa proveriti ponovo.

## Strane

```
/                    Početna — hero, modeli sa cenama, traka radova, zašto, proces
/modeli/             Svi modeli + objašnjenje kako se cena računa
/modeli/<model>/     Model: foto, šta ulazi u cenu, KALKULATOR, galerija tog
                     modela, ostali modeli (+ mrvice i BreadcrumbList)
/radovi/             Sve fotografije grupisane po modelu; svaka vodi na cenu
/404
```

Veza ide u oba smera: sa cena na galeriju i sa galerije na cenu.

## Cene

**Formula je Milanova i mušterija je čita kao ponudu — ne dirati bez njegove
potvrde.**

```
površina = (širina + dužina) ÷ 100 × visina ÷ 100     [m², mere u cm]
staklo   = površina × 9.000 RSD
ukupno   = osnovna cena modela + staklo + doplata za udaljenost
```

Ugaona kabina ima dve staklene strane pa se unose obe mere; ravna kabina i
paravan popunjavaju samo širinu, ograda samo dužinu. Prazno polje = 0.
Ograde nemaju osnovnu cenu — plaća se samo staklo.

| Šta                    | Gde                                             |
| ---------------------- | ----------------------------------------------- |
| Osnovna cena po modelu | `osnovnaCena` u `src/content/modeli/<model>.md` |
| Cena stakla po m²      | `CENA_STAKLA` u `src/lib/cena.ts`               |
| Najmanje mere          | `MERE_MIN` u `src/lib/cena.ts` (30/30/100 cm)   |
| Doplata za udaljenost  | `udaljenost` u `src/lib/modeli.ts`              |

`src/lib/cena.ts` je **jedini izvor računa** — bez Astro uvoza, pa isti kod ide
i u test i u browser. Kalkulator ga uvozi; nema kopije formule.

Na karticama se prikazuje **tačna osnovna cena**, nikad izmišljena „od" cifra.

## Fotografije

Stoje u `src/assets/modeli/<model>/`, **ne** u `public/` — tako ih Astro
optimizuje (WebP, više veličina, `srcset`, upisane dimenzije).

**Dodavanje = ubaciti fajl u folder modela.** Galerija se čita iz foldera,
ništa se ne upisuje u kod. Redosled ide po imenu (`01.jpg`, `02.jpg`…), a koja
je glavna bira `predstavnik` u markdownu (redni broj, 1 = prva).

Originali pune rezolucije su samo u korisnikovom `~/Downloads` — u repou su
smanjene na 1600 px.

## Pravila

- **Sve na srpskom, latinicom** — i tekst i komentari u kodu. Ćirilica se
  potkrade kroz kopiranje: `grep -rlP '[\x{0400}-\x{04FF}]' src/`
- **Ne izmišljati činjenice o poslu.** Cene, rokovi, garancije i mere mušterija
  čita kao ponudu. Ako podatak nije stigao od Milana — pitati, ne popunjavati
  pretpostavkom. (Sajt je dvaput prepisivan jer je zanat bio pogrešno shvaćen:
  prvo kao adaptacija kupatila, pa kao paravani za kadu, i tek onda tačno.)
- **Nema tvrdo kodiranih boja.** Sve su promenljive u dva bloka u
  `src/styles/global.css` (`:root` i `:root[data-theme='light']`). Kontrast je
  podešen na WCAG AA — proveriti pre menjanja bilo koje boje teksta.
- **Cene u sadržaju, ne u kodu** (`src/content/modeli/*.md`) — namerno, da bi se
  kasnije mogao dodati Git CMS (Sveltia/Decap) bez prepravke.
- **Ime firme dolazi iz `src/data/site.ts`** (`name`, `fullName`, `kratkoIme`).
  Nigde se ne kuca direktno.
- **Ne pokretati server.** Korisnik sam pokreće `npm run dev`. Isto važi za
  `git push` i deploy — samo uz njegovo odobrenje.

## Zamke na koje smo već naleteli

- `<fieldset>` ima podrazumevano `min-width: min-content` i **ne skuplja se** —
  u mreži je razvukao celu stranu na telefonu. Rešenje: `min-width: 0`.
- Element sa `backdrop-filter` postaje blok sadržaja za `position: fixed`
  potomke. Zamućenje zaglavlja je zato na `.zag::before`, ne na `.zag` — inače
  se mobilni meni otvara kao tanka linija.
- Astro scoped CSS ne hvata elemente koje pravi JavaScript (nemaju
  `data-astro-cid-*`) — za njih `:global(...)`.
- Skripte se vezuju na `astro:page-load`, ne na prvo učitavanje — zbog
  `ClientRouter` prelaza DOM je nov na svakoj navigaciji.
- Posle izmene stilova komponente Vite ume da servira **stari** CSS. Ako se
  izmena ne vidi u `npm run dev`, proveriti `dist` pre nego što se traži greška
  u kodu.
- Mreža sa neparnim brojem stavki (7 modela u 4 kolone) ostavlja praznu ćeliju
  koja se vidi kao siv pravougaonik ako se koristi trik sa pozadinskom linijom.

## Provera rasporeda bez screenshot-a

Chrome ekstenzija je povezana. Stranu učitati u `<iframe>` širine 390 px i naći
elemente kojima `getBoundingClientRect().right` prelazi `clientWidth` — tako je
nađeno prelivanje koje se iz koda nije videlo.

## Šta je ostalo (dashboard, token ne može)

1. **Redirect Rule** apex↔www.
2. **Cloudflare Web Analytics** za `glass018.rs`.
3. **Google Search Console** — dodati domen i poslati sitemap.
4. **Google Business Profile** — besplatno i najvažnije za lokalnu pretragu;
   pripremljen tekst je u `docs/google-profil.md`.

Podaci koje Milan nije potvrdio: najmanje mere (30/30/100 cm), radno vreme i
opisi modela (moja formulacija po njegovim slikama — svesno pušteno tako).

## Struktura

```
src/
  assets/modeli/  Fotografije, jedan folder po modelu
  components/     Zaglavlje, Podnozje, PozivTraka, ModelKartica, Kalkulator,
                  TerenTabela, StranaZaglavlje, Znak
  content/modeli/ Jedan markdown po modelu — nazivi, tekstovi, OSNOVNE CENE
  data/site.ts    Firma, telefon, navigacija, preview prekidač, potpis autora
  layouts/        Osnovni.astro — <head>, SEO, JSON-LD, teme, prelazi
  lib/cena.ts     Račun cene (čist, testiran, koristi ga i browser)
  lib/modeli.ts   Galerije iz foldera, modeli, udaljenosti
  pages/          index, modeli, radovi, 404, robots.txt.ts
  styles/         global.css — teme, tipografija, dugmad
test/             npm test
```

## Dizajn

Tamni editorijal: ugalj `#0c0c0d` + mesing `#c8a26a`, Fraunces za naslove,
Inter za tekst. Svetla tema ima toplu bež podlogu i potamnjen mesing radi
kontrasta. Fontovi lokalno (`@fontsource`), bez poziva ka Google Fonts.

Namerno vođen kao portfolio majstora, ne kao prodavnica — bez korpe, bez
product grida i bez svetle Shopify estetike. Klijent je izričito tražio da ne
liči na <https://cristallo.rs> (sajt njegovog prijatelja, isti posao).
