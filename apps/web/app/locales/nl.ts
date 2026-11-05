// All Dutch texts live here, so wording can be reviewed in one place.

/** Dutch possessive: Luca's, Noors, Thomas'. */
export function possessive(name: string): string {
  if (/[sxz]$/i.test(name)) return `${name}'`
  if (/[aeiouy]$/i.test(name)) return `${name}'s`
  return `${name}s`
}
export const t = {
  appName: 'Maakrijk',
  common: {
    back: 'Terug',
    cancel: 'Annuleren',
    save: 'Opslaan',
    close: 'Sluiten',
    settings: 'Instellingen',
    retry: 'Opnieuw proberen',
  },
  players: {
    title: 'Wie speelt er?',
    newPlayer: 'Nieuwe speler',
    manage: 'Spelers beheren',
    doneManaging: 'Klaar',
    edit: 'Aanpassen',
    remove: 'Verwijderen',
    play: (name: string) => `Spelen als ${name}`,
    empty: 'Maak eerst een speler aan.',
    newTitle: 'Nieuwe speler',
    editTitle: 'Speler aanpassen',
    nickname: 'Bijnaam',
    nicknameHint: 'Hoogstens 20 letters. Gebruik geen echte achternaam.',
    avatar: 'Kies een plaatje',
    avatarLabel: (n: number) => `Plaatje ${n}`,
    create: 'Maken',
    removeTitle: (name: string) => `${name} verwijderen?`,
    removeBody: 'Alles van deze speler wordt gewist. Dit kun je niet terugdraaien.',
    removeConfirm: 'Ja, verwijderen',
    switch: 'Wissel',
    limitReached: 'Er zijn al 8 spelers.',
  },
  start: {
    hello: (name: string) => `Hoi ${name}!`,
    title: 'Wat ga jij maken?',
  },
  start_cards: {
    play: 'Spelen',
    open: 'Verder',
  },
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
  stage: {
    seeAll: 'Alles bekijken',
    noWebglTitle: 'Je apparaat kan de spelwereld niet tekenen.',
    noWebglBody: 'Je kunt wel gewoon spelen met de knoppen hieronder.',
    worldLabel: 'Spelwereld',
  },
  settings: {
    title: 'Instellingen',
    reduceMotion: 'Minder beweging',
    bigText: 'Grote tekst',
    note: 'Deze instellingen gelden op dit apparaat.',
    done: 'Klaar',
  },
  errors: {
    offline: 'Geen verbinding met de server. Probeer het zo nog eens.',
    nickname_length: 'Een bijnaam heeft 1 tot 20 letters.',
    nickname_invalid: 'Deze bijnaam kan niet. Gebruik letters en cijfers.',
    nickname_taken: 'Deze bijnaam bestaat al. Kies een andere.',
    avatar_invalid: 'Kies een plaatje.',
    profile_limit: 'Er zijn al 8 spelers. Verwijder eerst een speler.',
    not_found: 'Deze speler bestaat niet meer.',
    unauthorized: 'Je sessie is verlopen. Ververs de pagina.',
    unknown: 'Er ging iets mis. Probeer het opnieuw.',
    // Game refusals (contract 0.2 §5). Calm, no blame.
    not_enough_coins: 'Daar heb je nog niet genoeg munten voor.',
    storage_full: 'Zoveel past er niet in je voorraad.',
    would_get_stuck: 'Dan heb je geen munten meer voor de rest van een kan. Koop eerst wat je nodig hebt.',
    not_enough_stock: 'Je hebt nog niet genoeg citroenen of suiker.',
    jug_not_empty: 'Er zit nog limonade in de kan. Verkoop die eerst.',
    jug_busy: 'De limonade wordt al gemaakt.',
    round_open: 'Je kraam is al open.',
    no_round: 'Je kraam is dicht.',
    nothing_to_sell: 'Maak eerst limonade.',
    customer_not_waiting: 'Er staat nu geen klant te wachten.',
    no_cups: 'De kan is leeg. Maak nieuwe limonade.',
    invalid_command: 'Dat kan nu niet.',
    command_conflict: 'Er ging iets mis. Probeer het opnieuw.',
    server_error: 'De server had een probleempje. Probeer het opnieuw.',
  },
  build: {
    serverOlder: 'De server is ouder dan deze pagina.',
    serverNewer: 'De server is nieuwer dan deze pagina. Ververs de pagina.',
    details: 'Details',
  },
  diagnose: {
    title: 'Diagnose',
    match: 'Pagina en server passen bij elkaar.',
    noServer: 'De server is niet bereikbaar.',
    webTarget: 'Web: doel',
    webCommit: 'Web: commit',
    webBuilt: 'Web: gebouwd',
    webContract: 'Web: verwacht contract',
    apiVersion: 'API: versie',
    apiCommit: 'API: commit',
    apiBuilt: 'API: gebouwd',
    apiContract: 'API: contract',
    database: 'Database',
    migration: 'Laatste migratie',
  },
} as const

/** Dutch text for an API error code. */
export function errorText(code: string): string {
  const map = t.errors as Record<string, string>
  return map[code] ?? t.errors.unknown
}
