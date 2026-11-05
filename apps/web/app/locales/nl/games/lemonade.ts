// Dutch texts for the lemonade stand. Change wording here; no code changes needed.
import { possessive } from '../common'

export const lemonade = {
  lemonade: {
    name: 'Limonade',
    title: (name: string) => `${possessive(name)} Limonade`,
    coins: (n: number) => `${n} munten`,
    goal: {
      buy: 'Koop citroenen en suiker',
      make: 'Maak een kan limonade',
      open: 'Open je kraam',
      serve: 'Geef de klant een beker',
      waitJug: 'Even wachten: de limonade wordt gemaakt',
      waitCustomer: 'Wacht op de volgende klant',
      summary: 'Je ronde is klaar!',
    },
    recipe: (lemons: number, sugar: number, cups: number) => `${lemons} citroenen + ${sugar} suiker = ${cups} bekers`,
    stock: 'Voorraad',
    lemons: 'Citroenen',
    sugar: 'Suiker',
    buyForJug: (cost: number) => `Koop voor 1 kan · ${cost} munten`,
    buyOneLemon: '+1 citroen',
    buyOneSugar: '+1 suiker',
    make: 'Maak limonade',
    making: 'De limonade wordt gemaakt…',
    open: 'Open de kraam',
    inJug: 'In de kan:',
    cups: (n: number) => (n === 1 ? '1 beker' : `${n} bekers`),
    serve: 'Geef een beker',
    close: 'Kraam sluiten',
    customers: (served: number, total: number) => `Klanten ${served}/${total}`,
    sending: 'Even geduld…',
  },
  summary: {
    title: 'Ronde klaar!',
    cupsSold: (cups: number, customers: number) =>
      cups === customers ? `Je hebt alle ${customers} klanten geholpen.` : `Je hebt ${cups} van de ${customers} klanten geholpen.`,
    sold: 'Verkocht',
    materials: 'Materialen',
    left: 'Over',
    coins: 'munten',
    explain: 'Over is wat je verdiend hebt, na de citroenen en suiker.',
    next: 'Volgende ronde',
  },
  /** Lemonade refusal codes (contract 0.2 §5). Calm, no blame. */
  errors: {
    would_get_stuck: 'Dan heb je geen munten meer voor de rest van een kan. Koop eerst wat je nodig hebt.',
    not_enough_stock: 'Je hebt nog niet genoeg citroenen of suiker.',
    jug_not_empty: 'Er zit nog limonade in de kan. Verkoop die eerst.',
    jug_busy: 'De limonade wordt al gemaakt.',
    round_open: 'Je kraam is al open.',
    no_round: 'Je kraam is dicht.',
    nothing_to_sell: 'Maak eerst limonade.',
    customer_not_waiting: 'Er staat nu geen klant te wachten.',
    no_cups: 'De kan is leeg. Maak nieuwe limonade.',
  },
} as const
