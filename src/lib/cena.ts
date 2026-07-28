/**
 * Račun cene — jedini izvor istine.
 *
 * Namerno bez ijednog Astro uvoza, da bi mogao da se pokrene i u testu
 * (`npm test`) i u browseru. Kalkulator uvozi baš ove funkcije, pa test
 * proverava kod koji zaista radi, a ne njegovu kopiju.
 *
 * Formula je Milanova:
 *   površina = (širina + dužina) × visina        [mere u cm]
 *   staklo   = površina × 9.000 RSD
 *   ukupno   = osnovna cena modela + staklo + doplata za udaljenost
 *
 * Ugaona kabina ima dve staklene strane, pa se unose i širina i dužina.
 * Ravna kabina, paravan i ograda popunjavaju samo jednu — druga ostaje prazna.
 */

/** Cena kaljenog stakla po kvadratnom metru. Jedna vrsta stakla. */
export const CENA_STAKLA = 9000;

/** Najmanje mere koje se u praksi izrađuju. Prazno polje je i dalje dozvoljeno. */
export const MERE_MIN = {
  sirina: 30,
  duzina: 30,
  visina: 100,
} as const;

export type ImeMere = keyof typeof MERE_MIN;

export const NAZIV_MERE: Record<ImeMere, string> = {
  sirina: 'Širina',
  duzina: 'Dužina',
  visina: 'Visina',
};

export type Provera = {
  /** Vrednost u centimetrima; 0 ako je polje prazno. */
  v: number;
  /** Poruka za korisnika, prazna ako je sve u redu. */
  greska: string;
  prazno: boolean;
};

/**
 * Čita i proverava jednu meru.
 *
 * Vrednost se NIKAD ne ispravlja u tišini — ako je manja od dozvoljene, vraća
 * se poruka, a cena se ne prikazuje. (Ranije se tiho dizala na minimum, pa su
 * i 1 cm i 12 cm davali isti rezultat, što je izgledalo kao pokvaren račun.)
 */
export function proveriMeru(ime: ImeMere, sirovo: string): Provera {
  const tekst = sirovo.trim();
  if (tekst === '') return { v: 0, greska: '', prazno: true };

  const n = Number(tekst);
  if (!Number.isFinite(n) || n <= 0) {
    return { v: 0, greska: 'Unesite broj u centimetrima.', prazno: false };
  }

  const najmanje = MERE_MIN[ime];
  if (n < najmanje) {
    return { v: n, greska: `${NAZIV_MERE[ime]} ne može biti manja od ${najmanje} cm.`, prazno: false };
  }

  return { v: n, greska: '', prazno: false };
}

/** Površina stakla u kvadratnim metrima. Mere ulaze u centimetrima. */
export function povrsina(sirinaCm: number, duzinaCm: number, visinaCm: number): number {
  return ((sirinaCm + duzinaCm) / 100) * (visinaCm / 100);
}

export type Stavke = {
  osnovnaCena: number;
  sirina: number;
  duzina: number;
  visina: number;
  doplata?: number;
};

export type Racun = {
  povrsina: number;
  staklo: number;
  ukupno: number;
};

/** Ceo račun za jedan komad. */
export function izracunaj({ osnovnaCena, sirina, duzina, visina, doplata = 0 }: Stavke): Racun {
  const p = povrsina(sirina, duzina, visina);
  const staklo = p * CENA_STAKLA;
  return { povrsina: p, staklo, ukupno: osnovnaCena + staklo + doplata };
}

/**
 * Poruka koju mušterija šalje Milanu — sa modelom, merama i procenom.
 * Bez ovoga u poruci stigne samo „koliko košta?", pa se sve meri iznova.
 */
export function poruka(o: {
  model: string;
  sirina: number;
  duzina: number;
  visina: number;
  ukupno: number;
  udaljenost: string;
}): string {
  const mere = [
    o.sirina > 0 ? `širina ${o.sirina} cm` : '',
    o.duzina > 0 ? `dužina ${o.duzina} cm` : '',
    o.visina > 0 ? `visina ${o.visina} cm` : '',
  ].filter(Boolean);

  return [
    `Zdravo, zanima me: ${o.model}.`,
    `Mere: ${mere.join(', ')}.`,
    `Procena sa sajta: ${new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(
      Math.round(o.ukupno)
    )} RSD (${o.udaljenost}).`,
  ].join('\n');
}
