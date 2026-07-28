import { getCollection, type CollectionEntry } from 'astro:content';

export type Model = CollectionEntry<'modeli'>;

/**
 * Sve fotografije modela. Učitavaju se iz `src/assets/`, pa ih Astro
 * optimizuje i pravi više veličina za `srcset` — zato slike stoje ovde,
 * a ne u `public/`.
 */
const sveSlike = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/modeli/**/*.{jpg,jpeg,png}',
  { eager: true }
);

/** Fotografije jednog modela, poređane po imenu fajla (01, 02, 03…). */
export function galerija(id: string): ImageMetadata[] {
  return Object.entries(sveSlike)
    .filter(([putanja]) => putanja.includes(`/modeli/${id}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, modul]) => modul.default);
}

/** Slika koja predstavlja model na karticama. */
export function predstavnik(model: Model): ImageMetadata | undefined {
  const slike = galerija(model.id);
  return slike[model.data.predstavnik - 1] ?? slike[0];
}

/** Svi modeli, poređani kako je zadato u sadržaju. */
export async function sviModeli(): Promise<Model[]> {
  const modeli = await getCollection('modeli');
  return modeli.sort((a, b) => a.data.redosled - b.data.redosled);
}

// ---------------------------------------------------------------------------
// Cene
// ---------------------------------------------------------------------------

// Sam račun živi u `cena.ts` — bez Astro uvoza, da može i u test i u browser.
export { CENA_STAKLA, MERE_MIN, povrsina, izracunaj, proveriMeru, poruka } from './cena';
import { CENA_STAKLA } from './cena';

export const dinar = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 });

/**
 * Naknada za izlazak van Niša. Plaća se jednom po poslu.
 * Poslednji stepen je „po dogovoru" jer za velike daljine ulazi i noćenje.
 */
export type Udaljenost = {
  id: string;
  naziv: string;
  opis: string;
  doplata: number;
  /** Za najveće daljine se prevoz dogovara posebno. */
  naUpit?: boolean;
};

export const udaljenost: Udaljenost[] = [
  { id: 'grad', naziv: 'Niš i prigradska naselja', opis: 'do 25 km', doplata: 0 },
  { id: 'blizu', naziv: 'Bliža okolina', opis: '25 – 60 km', doplata: 2500 },
  { id: 'srednje', naziv: 'Šire područje', opis: '60 – 120 km', doplata: 5000 },
  { id: 'daleko', naziv: 'Udaljeni gradovi', opis: '120 – 250 km', doplata: 8500 },
  { id: 'upit', naziv: 'Preko 250 km', opis: 'dogovor', doplata: 0, naUpit: true },
];

/**
 * Mere kojima kalkulator kreće, da odmah pokaže realnu cifru.
 * Nula znači da polje ostaje prazno.
 */
export function pocetneMere(model: Model) {
  if (model.id === 'ograde') return { sirina: 0, duzina: 400, visina: 110 };
  if (model.data.imaDubinu) return { sirina: 90, duzina: 90, visina: 195 };
  if (model.id === 'paravan') return { sirina: 90, duzina: 0, visina: 195 };
  return { sirina: 100, duzina: 0, visina: 195 };
}

/**
 * Cena koja se prikazuje na karticama i u zaglavljima grupa.
 *
 * Namerno se NE računa nikakva „od" cifra: prikazuje se tačno onaj broj koji je
 * Milan dao. Izmišljena „od" cena bi zvučala kao obećanje koje niko nije dao, a
 * mušterija je čita kao ponudu.
 *
 * Ograde nemaju osnovnu cenu — kod njih se plaća samo staklo.
 */
export function cenaZaPrikaz(model: Model) {
  if (model.data.osnovnaCena > 0) {
    return {
      labela: 'Osnovna cena',
      iznos: dinar.format(model.data.osnovnaCena),
      jedinica: 'RSD',
      dodatak: `+ staklo ${dinar.format(CENA_STAKLA)} RSD/m²`,
    };
  }
  return {
    labela: 'Cena stakla',
    iznos: dinar.format(CENA_STAKLA),
    jedinica: 'RSD/m²',
    dodatak: 'bez osnovne cene',
  };
}

