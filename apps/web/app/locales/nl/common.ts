// Shared Dutch texts: app shell, players, settings and platform errors.
// Texts for one game live in ./games/<game>.ts.

/** Dutch possessive: Luca's, Noors, Thomas'. */
export function possessive(name: string): string {
  if (/[sxz]$/i.test(name)) return `${name}'`
  if (/[aeiouy]$/i.test(name)) return `${name}'s`
  return `${name}s`
}

export const common = {
  appName: 'Maakrijk',
  common: {
    back: 'Terug',
    cancel: 'Annuleren',
    save: 'Opslaan',
    close: 'Sluiten',
    settings: 'Instellingen',
    retry: 'Opnieuw proberen',
    loading: 'Laden',
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
  /** Platform error codes. Game refusals live in the game's own file. */
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
    // Shared game-core refusals (contract 0.2 §5). Calm, no blame.
    not_enough_coins: 'Daar heb je nog niet genoeg munten voor.',
    storage_full: 'Zoveel past er niet in je voorraad.',
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
