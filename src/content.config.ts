import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Jedan fajl po modelu. Ovde su i cene — namerno u sadržaju, a ne u kodu,
 * da bi se kasnije mogao dodati CMS bez prepravljanja sajta.
 *
 * Fotografije se NE navode ovde: čitaju se iz `src/assets/modeli/<id>/`.
 * Dodavanje slike = ubacivanje fajla u taj folder, ništa drugo.
 */
const modeli = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/modeli' }),
  schema: z.object({
    /** Kratak naziv — kartice i navigacija. */
    naziv: z.string(),
    /** Pun naziv — naslov strane i SEO. */
    naslovStrane: z.string(),
    /** Jedna rečenica ispod naziva na kartici. */
    kratko: z.string(),
    /** Uvodni pasus na strani modela. */
    uvod: z.string(),
    /** Kome model odgovara. */
    zaKoga: z.string(),
    /** Šta ulazi u osnovnu cenu. */
    detalji: z.array(z.string()),

    /** Okov, profili i ugradnja, bez stakla. Ograde nemaju — samo staklo. */
    osnovnaCena: z.number(),

    /** Ugaone kabine imaju drugu staklenu stranu, pa se meri i dubina. */
    imaDubinu: z.boolean().default(false),
    /** Kod ograda se prva mera zove „dužina", a ne „širina". */
    labelA: z.string().default('Širina'),
    labelB: z.string().default('Dubina'),

    /** Dok je `false`, model se nigde ne prikazuje — čeka podatke od Milana.
     *  Tako slike i tekst mogu da stoje spremni, a da sajt ostane tačan. */
    objavljeno: z.boolean().default(true),
    /** Redni broj slike iz foldera koja predstavlja model (1 = prva). */
    predstavnik: z.number().default(1),
    redosled: z.number(),
  }),
});

export const collections = { modeli };
