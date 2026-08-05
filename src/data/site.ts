/**
 * Centralni podaci o firmi — jedini izvor imena, telefona i navigacije.
 *
 * IME FIRME JOŠ NIJE ODLUČENO. Trenutno stoji radno ime „Glass 018" (018 je
 * pozivni broj Niša). Milanovo lično ime neće biti u imenu firme. Kad se ime izabere, menjaju se
 * SAMO `name`, `znak` i `fullName` ispod — nigde drugde u kodu ime nije upisano
 * (podnožje, zaglavlje, SEO i JSON-LD ga svi čitaju odavde).
 */

export const site = {
  /** TODO: RADNO IME. „018" je pozivni broj Niša — lokalni signal i za Google. */
  name: 'Glass 018',
  /** Reč pored imena u zaglavlju i podnožju. */
  znak: 'niš',
  /** TODO: privremeno — uskladiti sa imenom firme kad bude poznato. */
  fullName: 'Glass 018 — tuš kabine i staklene ograde',
  /** Kratak oblik za <title> — Google odseca naslove preko ~60 znakova. */
  kratkoIme: 'Glass 018',
  tagline: 'Tuš kabine, paravani i staklene ograde po meri — izrada i ugradnja.',
  city: 'Niš',
  region: 'Niš i okolina',
  yearsExperience: 10,
  /** Broj ugrađenih kabina, vrata i ograda. */
  projectsDone: 1000,

  phone: '+381 65 5246 282',
  phoneHref: '+381655246282',
  /** Viber koristi isti broj, bez razmaka i sa pozivnim brojem. */
  viber: '+381655246282',

  workingHours: 'Ponedeljak — Subota, 07:00–18:00',

  /**
   * Potpis autora sajta u podnožju — diskretno, da ne odvlači pažnju sa
   * Milanovog telefona.
   *
   * Adresa se ne ispisuje u HTML kao `mailto:` nego je sastavlja skripta iz dva
   * dela pri kliku. Roboti koji kupe adrese sa sajtova čitaju gotov HTML, pa im
   * ovako ostaje samo tekst bez upotrebljivog linka.
   */
  autor: {
    /** Tekst koji se vidi — adresa se nigde ne ispisuje. */
    ime: 'Miloš Mitrović',
    korisnik: 'milos.micke.mitrovic',
    domen: 'gmail.com',
  },
  /** Isto radno vreme, u obliku koji razume Google (schema.org). */
  radnoVreme: {
    dani: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    od: '07:00',
    do: '18:00',
  },

  /**
   * PREGLED PRE PUŠTANJA U RAD.
   * Dok je `true`, sajt traži od pretraživača da ga NE indeksiraju
   * (`noindex` + `Disallow: /` u robots.txt).
   *
   * Zašto: adresa na `*.pages.dev` je javna, a cene i tekstovi su još
   * izmišljeni — ne želimo da Google to indeksira i da se kasnije bije sa
   * pravim domenom kao duplikat, ni da Milanove mušterije nađu lažne cene.
   *
   * Postaviti na `false` u istom koraku kad se uveže pravi domen.
   */
  preview: false,

  /**
   * Privremena adresa projekta na Cloudflare Pages. Ne može da se obriše, pa se
   * posetioci sa nje šalju na pravi domen — da se dve iste adrese ne bore u
   * Google rezultatima. Adrese pojedinačnih deploy-eva (heš ispred) se ne diraju,
   * jer služe za proveru pre puštanja.
   */
  pagesDomen: 'glass018.pages.dev',

  /**
   * Cloudflare Web Analytics — besplatno, bez kolačića, ne traži pristanak.
   * Ubacuje se ručno jer automatsko ubacivanje na Pages sajtovima ne radi
   * pouzdano, a tiho daje nula podataka (statistika ostane prazna mesecima
   * a niko ne zna zašto). Ovako je u kodu i može da se proveri.
   */
  analitikaToken: 'ccf22241b9e446bd857250768166c8ee',
} as const;

/** Viber deep link — radi i na telefonu i na desktop aplikaciji. */
export const viberHref = `viber://chat?number=${encodeURIComponent(site.viber)}`;

/** Sajt je namenjen dolasku preko Google pretrage i oglasa — zato malo strana
 *  i poziv na akciju (telefon / Viber) na svakoj od njih. */
export const nav = [
  /** „Početna" stoji izričito — logo vodi na početnu, ali se na to ne oslanjamo,
   *  jer dobar deo posetilaca tu prečicu ne poznaje. */
  { label: 'Početna', href: '/' },
  { label: 'Modeli i cene', href: '/modeli/' },
  { label: 'Radovi', href: '/radovi/' },
] as const;
