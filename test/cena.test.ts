import { test } from 'node:test';
import assert from 'node:assert/strict';
import { izracunaj, povrsina, proveriMeru, poruka, CENA_STAKLA, MERE_MIN } from '../src/lib/cena.ts';

/**
 * Cene su Milanove i mušterija ih čita kao ponudu — zato su ovde zakucane
 * kao regresioni test. Ako neko promeni formulu, ovo pukne.
 */
const OSNOVA = {
  paravan: 6700,
  ravnaSarke: 18900,
  ravnaKlizna: 19200,
  ugaonaSarke: 20200,
  ugaona135: 20400,
  ugaonaKlizna: 20500,
  alfaKlizna: 26300,
  ograde: 0,
};

test('cena stakla je 9.000 po kvadratu', () => {
  assert.equal(CENA_STAKLA, 9000);
});

test('površina ravne kabine je širina × visina', () => {
  assert.equal(povrsina(100, 0, 195), 1.95);
});

test('površina ugaone kabine sabira obe staklene strane', () => {
  // 90 + 90 = 180 cm stakla po širini, visina 195
  assert.equal(Number(povrsina(90, 90, 195).toFixed(4)), 3.51);
});

test('redosled širine i dužine ne menja rezultat', () => {
  assert.equal(povrsina(120, 80, 195), povrsina(80, 120, 195));
});

test('ugaona kabina 90+90×195 košta 51.790 RSD', () => {
  const r = izracunaj({ osnovnaCena: OSNOVA.ugaonaSarke, sirina: 90, duzina: 90, visina: 195 });
  assert.equal(Math.round(r.ukupno), 51790);
  assert.equal(Math.round(r.staklo), 31590);
});

test('ravna kabina sa šarkama 100×195 košta 36.450 RSD', () => {
  const r = izracunaj({ osnovnaCena: OSNOVA.ravnaSarke, sirina: 100, duzina: 0, visina: 195 });
  assert.equal(Math.round(r.ukupno), 36450);
});

test('paravan 90×195 košta 22.495 RSD', () => {
  const r = izracunaj({ osnovnaCena: OSNOVA.paravan, sirina: 90, duzina: 0, visina: 195 });
  assert.equal(Math.round(r.ukupno), 22495);
});

test('ograda nema osnovnu cenu — plaća se samo staklo', () => {
  const r = izracunaj({ osnovnaCena: OSNOVA.ograde, sirina: 0, duzina: 400, visina: 110 });
  assert.equal(Math.round(r.ukupno), Math.round(r.staklo));
  assert.equal(Math.round(r.ukupno), 39600);
});

test('doplata za udaljenost se dodaje na kraj, ne množi se', () => {
  const bez = izracunaj({ osnovnaCena: OSNOVA.alfaKlizna, sirina: 90, duzina: 90, visina: 195 });
  const sa = izracunaj({ osnovnaCena: OSNOVA.alfaKlizna, sirina: 90, duzina: 90, visina: 195, doplata: 5000 });
  assert.equal(Math.round(sa.ukupno - bez.ukupno), 5000);
});

test('ugaona je skuplja od ravne pri istim merama — zbog druge strane', () => {
  const ravna = izracunaj({ osnovnaCena: OSNOVA.ravnaKlizna, sirina: 90, duzina: 0, visina: 195 });
  const ugaona = izracunaj({ osnovnaCena: OSNOVA.ugaonaKlizna, sirina: 90, duzina: 90, visina: 195 });
  assert.ok(ugaona.ukupno > ravna.ukupno);
});

// --- provera unosa ---

test('prazno polje je dozvoljeno i ne javlja grešku', () => {
  const p = proveriMeru('duzina', '');
  assert.deepEqual(p, { v: 0, greska: '', prazno: true });
});

test('mera ispod minimuma javlja grešku i ne ispravlja se u tišini', () => {
  const p = proveriMeru('sirina', '12');
  assert.equal(p.v, 12, 'vrednost ostaje ono što je korisnik uneo');
  assert.match(p.greska, /ne može biti manja od 30 cm/);
});

test('visina ispod 100 cm javlja grešku', () => {
  assert.match(proveriMeru('visina', '50').greska, /ne može biti manja od 100 cm/);
});

test('mera tačno na minimumu prolazi', () => {
  for (const [ime, min] of Object.entries(MERE_MIN)) {
    const p = proveriMeru(ime as keyof typeof MERE_MIN, String(min));
    assert.equal(p.greska, '', `${ime} na ${min} cm mora da prođe`);
  }
});

test('tekst umesto broja javlja grešku', () => {
  assert.match(proveriMeru('sirina', 'abc').greska, /Unesite broj/);
  assert.match(proveriMeru('sirina', '-5').greska, /Unesite broj/);
  assert.match(proveriMeru('sirina', '0').greska, /Unesite broj/);
});

// --- poruka za Viber ---

test('poruka sadrži model, mere i procenu', () => {
  const t = poruka({
    model: 'Ugaona kabina sa kliznim vratima',
    sirina: 90, duzina: 90, visina: 195,
    ukupno: 51790,
    udaljenost: 'Niš i prigradska naselja',
  });
  assert.match(t, /Ugaona kabina sa kliznim vratima/);
  assert.match(t, /širina 90 cm/);
  assert.match(t, /dužina 90 cm/);
  assert.match(t, /51\.790 RSD/);
});

test('poruka izostavlja praznu meru', () => {
  const t = poruka({ model: 'Tuš paravan', sirina: 90, duzina: 0, visina: 195, ukupno: 22495, udaljenost: 'Niš' });
  assert.ok(!t.includes('dužina'), 'prazna dužina ne sme da se pomene');
});
