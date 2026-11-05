// Dutch texts for the lemonade stand. Change wording here; no code changes needed.
import { possessive } from '../common'

const munten = (n: number) => (n === 1 ? '1 munt' : `${n} munten`)
const bekers = (n: number) => (n === 1 ? '1 beker' : `${n} bekers`)

export const lemonade = {
  lemonade: {
    name: 'Limonade',
    title: (name: string) => `${possessive(name)} Limonade`,
    coins: (n: number) => `${n} munten`,
    /** Under the coins: what the stand earns by itself. */
    perMinute: (n: number) => `Vanzelf: +${n} per minuut`,
    /** Goal card: the stand works by itself; upgrades make it faster. */
    goal: {
      wait: 'Je kraam verkoopt vanzelf! Spaar voor een verbetering.',
      waitHint: 'Tik op de pers om sneller te sparen.',
      upgrade: {
        helper: 'Neem een hulpje aan: dan verkoopt je kraam sneller vanzelf. Tik op het bordje.',
        advert: 'Maak reclame: dan komen er vanzelf meer klanten. Tik op het grote bord.',
        tree: 'Plant een citroenboom: dan wordt elke kan goedkoper. Tik op het plantje.',
        press: 'Je kunt de pers verbeteren. Tik op het pijltje.',
      },
    },
    /** Progress bar over the jug: the next cup sold by itself. */
    nextCup: 'Volgende beker',
    /** Labels of the tappable objects (read aloud, also used by tests). */
    tap: {
      press: (cups: number, price: number) => `Pers limonade: ${bekers(cups)}, ${munten(cups * price)}`,
      till: 'Bekijk je kassa',
      advert: 'Reclamebord',
      upgrade: (name: string) => `Verbeter: ${name}`,
    },
    jug: (n: number) => `In de kan: ${bekers(n)}`,
    /** Floating text after a tap or helper sale. */
    earned: (n: number) => `+${n}`,
    /** Floating text when a tap starts a new jug: its ingredients are paid. */
    ingredients: (n: number) => `-${n} citroenen en suiker`,
  },
  /** Upgrades, by id (manifest v2). `effect` describes one level. */
  upgrades: {
    // `effect` gets the number from the server: cups per tap, cups per
    // minute by itself, or what one jug costs.
    press: {
      name: 'Betere pers',
      effect: (n: number) => `${bekers(n)} per tik`,
      explain: 'Met een betere pers verkoop je meer bekers als je zelf op de pers tikt.',
    },
    helper: {
      name: 'Hulpje',
      effect: (n: number) => `${bekers(n)} per minuut vanzelf`,
      explain: 'Een hulpje verkoopt limonade voor je, ook als je even weg bent (tot 2 uur).',
    },
    advert: {
      name: 'Reclame',
      effect: (n: number) => `${bekers(n)} per minuut vanzelf`,
      explain: 'Met reclame komen er meer klanten. Alles wat vanzelf gaat, gaat de helft sneller.',
    },
    tree: {
      name: 'Citroenboom',
      effect: (n: number) => `Een kan kost ${munten(n)}`,
      explain: 'Met een eigen boom hoef je geen citroenen meer te kopen. Elke kan kost dan minder.',
    },
  },
  upgrade: {
    now: 'Nu',
    next: 'Straks',
    price: 'Prijs',
    balance: 'Jij hebt',
    buy: 'Verbeteren',
    close: 'Sluiten',
    max: 'Dit is al de beste!',
    short: (n: number) => `Je hebt nog ${munten(n)} nodig.`,
    level: (level: number, max: number) => `Niveau ${level} van ${max}`,
  },
  stats: {
    title: 'Je kassa',
    cups: (n: number) => `Je hebt ${bekers(n)} verkocht.`,
    byHelpers: (n: number) => `Vanzelf verkocht: ${bekers(n)}.`,
    sold: 'Verkocht',
    materials: 'Materialen',
    left: 'Over',
    coins: 'munten',
    explain: 'Over is wat je verdiend hebt, na de citroenen en suiker.',
    invested: (n: number) => `Uitgegeven aan verbeteringen: ${munten(n)}.`,
    jugCost: (cost: number, cups: number) => `Eén kan kost ${munten(cost)} en geeft ${bekers(cups)}.`,
    close: 'Verder spelen',
  },
  away: {
    title: 'Welkom terug!',
    sold: (cups: number) => `Je kraam verkocht ${bekers(cups)} terwijl je weg was.`,
    earned: (n: number) => `Dat leverde ${munten(n)} op.`,
    capped: 'Je kraam werkt maximaal 2 uur door als je weg bent.',
    ok: 'Fijn!',
  },
  /** Lemonade refusal codes (contract 0.2 §5). Calm, no blame. */
  errors: {
    would_get_stuck: 'Dan heb je geen munten meer voor je volgende kan limonade. Verkoop eerst nog wat.',
    max_level: 'Dit is al de beste die er is.',
    too_fast: 'Rustig aan, de pers moet even bijkomen.',
  },
} as const
