// Dutch texts for the lemonade stand. Change wording here; no code changes needed.
import { possessive } from '../common'

const munten = (n: number) => (n === 1 ? '1 munt' : `${n} munten`)
const bekers = (n: number) => (n === 1 ? '1 beker' : `${n} bekers`)

export const lemonade = {
  lemonade: {
    name: 'Limonade',
    title: (name: string) => `${possessive(name)} Limonade`,
    coins: (n: number) => `${n} munten`,
    perMinute: (n: number) => `+${n} per minuut`,
    /** Goal card: what to do next. */
    goal: {
      tap: 'Tik op de pers om limonade te verkopen',
      upgrade: 'Je kunt iets verbeteren! Tik op het pijltje',
    },
    /** Labels of the tappable objects (read aloud, also used by tests). */
    tap: {
      press: (cups: number, price: number) => `Pers limonade: ${bekers(cups)}, ${munten(cups * price)}`,
      till: 'Bekijk je kassa',
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
    press: {
      name: 'Betere pers',
      effect: (level: number) => `${bekers(level + 1)} per tik`,
      explain: 'Met een betere pers maak je meer bekers per tik.',
    },
    helper: {
      name: 'Hulpje',
      // Each level sells 30 cups a minute (manifest: 500 thousandths per second).
      effect: (level: number) => (level === 0 ? 'Nog geen hulp' : `${level * 30} bekers per minuut`),
      explain: 'Een hulpje verkoopt limonade voor je, ook als je even weg bent (tot 2 uur).',
    },
    tree: {
      name: 'Citroenboom',
      effect: (level: number) => (level === 0 ? 'Citroenen kopen' : 'Gratis citroenen'),
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
    byHelpers: (n: number) => `Je hulpjes verkochten er ${n}.`,
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
    sold: (cups: number) => `Je hulpjes verkochten ${bekers(cups)} terwijl je weg was.`,
    earned: (n: number) => `Dat leverde ${munten(n)} op.`,
    capped: 'Hulpjes werken maximaal 2 uur als je weg bent.',
    ok: 'Fijn!',
  },
  /** Lemonade refusal codes (contract 0.2 §5). Calm, no blame. */
  errors: {
    would_get_stuck: 'Dan heb je geen munten meer voor je volgende kan limonade. Verkoop eerst nog wat.',
    max_level: 'Dit is al de beste die er is.',
    too_fast: 'Rustig aan, de pers moet even bijkomen.',
  },
} as const
