# Maakrijk — verschillenoverzicht

Status: inspectie 2026-11-05, commit `9a929e0` op `main`.

## Uitgangssituatie

- `~/maakrijk` bevat alleen `README.md`, `docs/` en drie designs. Geen code, migraties, tests of startcommando's.
- Besluit gebruiker (D1): Maakrijk wordt opnieuw gebouwd in `~/maakrijk`. `~/mym` ("Van Grond tot Klant") is alleen referentie en wordt niet gewijzigd. Niet-gecommitte wijzigingen in `~/mym` worden genegeerd (D2).
- Daarom staat elk onderdeel hieronder in `~/maakrijk` op **Niet aanwezig**. De kolom "Referentie in ~/mym" zegt wat er te leren of te hergebruiken valt. Die code is gelezen, niet gedraaid: status **Nog niet gecontroleerd**.

### Uitgevoerde controles
| Controle | Resultaat |
|---|---|
| `git status`, branches, log, remotes in `~/maakrijk` | `main`, schoon, 2 commits, `origin` = `github.com/Haxfx/maakrijk` |
| Bestandslijst `~/maakrijk` | 11 bestanden, alleen docs |
| Tools | rustc/cargo 1.88.0, node 22.23.3, npm 12.2.0, docker 28.0.1, psql 14 client, gh 2.103.0; geen pnpm; geen lokale Postgres-rol |
| Draaiende containers | `aven-dev-postgres-1` op 5433, `kiddos-db-1` op 5434 (andere projecten, niet aanraken) |
| `~/mym` git | `master` op `3699fe4`, 15 gewijzigde + ~10 nieuwe bestanden, geen remote, worktrees `mym-dev-34579e4` en `mym-api-f67910a` |
| `~/mym` database | volume `mym_vgk-db`, container `mym-db-1` gestopt (poort 5440). Niet gestart, niet gelezen |
| `~/mym` tests | Niet gedraaid: geen bewijs dat ze slagen |

## Overzicht per onderdeel

| Onderdeel | Verwachte werking (bron) | Huidig in maakrijk | Referentie in ~/mym | Bewijs / controle | Ontbrekend werk | Risico |
|---|---|---|---|---|---|---|
| Repo-structuur, startcommando's | Eén Nuxt-app, één Rust-service, Postgres via Compose, `.env.example` (`01` §6) | Niet aanwezig | `apps/web`, `services/api`, `docker-compose.yml` | Bestandslijst | Alles | Laag |
| Dev/preview-scheiding | Aparte DB en buildoutput, diagnose toont versies (`01` §6, `00` M0) | Niet aanwezig | `scripts/*`, `VGK_BUILD_TARGET`, `/api/version` | Gelezen `dev-preview.md` | Poorten, DB's, buildmappen, versie-endpoint | Middel: poortconflict met mym/kiddos/aven |
| Huishouden en profielen | Anoniem huishouden, bijnaam + avatar (`01` §4) | Niet aanwezig | Cookie met SHA-256-hash (D9) | Gelezen | Sessiemodel dat ook in iOS-shell werkt | **Hoog**: same-origin cookie werkt niet vanuit een native app-origin |
| Commandpipeline + idempotentie | Lock, servertijd, command-ID + payloadhash, atomair (`01` §8, `05` §9) | Niet aanwezig | Per modus een eigen command-tabel (3×) | Migratienamen | Eén gedeelde pipeline | Hoog: kern van alle garanties |
| Munten-ledger | Append-only, unieke referentie, saldo ≥ 0, reconstrueerbaar (`03` §4) | Niet aanwezig | 3 ledgers: `economy_transactions`, `factory_ledger`, `lemonade_ledger` | Migratienamen | Eén ledger per game-instantie | Hoog |
| Sterren-ledger | Eén per profiel, uniek op achievementKey (`04` §5) | Niet aanwezig | `star_awards` | Migratienaam | Platformledger | Middel |
| Scenario-manifest + validatie | Versie, hash, onveranderlijk, fout bij onbekende referentie (`05` §4) | Niet aanwezig | JSON-templates voor boerderij/bakkerij; limonade en fabriek hard-coded | Bestandslijst | Schema, validator, registry | Middel |
| Objecten/capabilities | Source, Processor, Storage, Vehicle, ServicePoint, ConstructionSlot, CareState (`05` §5) | Niet aanwezig | Lineaire keten in `domain/` | Gelezen D3 | Getypeerd componentmodel | Middel: te vroeg te generiek maken |
| Inventory + reserveringen | Eén plek: beschikbaar/gereserveerd/productie/onderweg (`05` §6) | Niet aanwezig | Per engine | — | Gedeeld | Hoog: dubbele voorraad |
| Orders | Statusmachine, prijs bevriezen bij acceptatie (`02` §4) | Niet aanwezig | `orders` (boerderij) | Migratienaam | Gedeeld ordermodel | Middel |
| Winkelcatalogus + aankoop | Server-beschikbaarheid met reden, atomaire plaatsing + betaling (`02` §2–3) | Niet aanwezig | `session_upgrades`, `LemonadeUpgrades.vue` | Gelezen round3 | Gedeelde catalogus en upgrade-effecten | Hoog: dubbele betaling |
| Vastlooppreventie | Reserve voor lopende order (`03` §7) | Niet aanwezig | `money_needed` (D6) | Gelezen | Gedeelde regel | Middel |
| Progressie/hoofdstukken | Taken met scope + baseline, eenmalige beloning, grantedAt/seenAt (`04` §2) | Niet aanwezig | `game_progress`, `progress_tasks`, `progress_rewards` | Migratienamen | Gedeelde motor | Middel |
| Limonadekraam | Kopen → kan maken → open → bedienen; upgrades (`02` §5) | Niet aanwezig | `lemonade/engine.rs` + Three.js-kraam | Gelezen round3 | Scenario op platform | Middel |
| Boerderij | Akkers, tractoren met reservering, melkketen (`02` §6) | Niet aanwezig | `domain/` + `dairy.rs`, SVG | Bestandslijst | Scenario op platform, Three.js | Hoog: meerdere voertuigen |
| Speelgoedfabriek | Auto + 4 wielen + doos, lift, werkbanken (`02` §7) | Niet aanwezig | `factory/engine.rs`, SVG | Bestandslijst | Scenario op platform | Middel |
| Plantenkraam | Manifest-only proef (`05` §16) | Niet aanwezig | — | — | Alles | Middel |
| Armbandjesatelier | Scenario-eigen patroonregel (`05` §16) | Niet aanwezig | — | — | Alles | Middel |
| Builder/sandbox | Plaatsen, routes, valideren, testspelen, geen campagnebeloning (`02` §9) | Niet aanwezig | `bouwen.vue`, remix van boerderij | Bestandslijst | Alles | Hoog: farming via sandbox |
| Three.js-wereld | Orthografisch, flat, DOM-overlay, pan/zoom, "Alles" (`01` §5, D3) | Niet aanwezig | `three/stage.ts`, `toyKit.ts` | Gelezen D12, D14 | Gedeelde stage + per scenario | Middel: art-kwaliteit uit code-primitieven haalt de designs niet |
| Nuxt-shell en UI | Kopbalk, doelkaart, onderste nav, instellingen (designs) | Niet aanwezig | Componenten per modus | Bestandslijst | Gedeelde shell + designsysteem | Laag |
| Instellingen, toegankelijkheid | Minder beweging, grote tekst, audio apart (designs, `01` §11) | Niet aanwezig | `stores/settings.ts` | — | Alles | Laag |
| Audio | Muziek/effecten apart, start na interactie (`01` §11) | Niet aanwezig | `useSound.ts`, `docs/audio.md` | — | Alles; menselijk luisteren apart | Laag |
| Ouderpagina + reset | Drie resetvormen, ouderpoort (`04` §7) | Niet aanwezig | `ouders.vue` | — | Alles | Middel |
| OpenAPI + TS-types | Gegenereerd contract (`01` §6) | Niet aanwezig | `utoipa`, `contracts/openapi` | Bestandslijst | Alles | Laag |
| Conformance-suite | Eén suite voor alle scenario's (`05` §15) | Niet aanwezig | Losse tests per modus | — | Alles | Middel |
| Balans-simulatie | Deterministische harness met Rust-regels, CSV (`03` §9) | Niet aanwezig | — | — | Alles | Laag |
| iOS-verpakking | App Store-geschikt (D4) | Niet aanwezig | — | — | Shell-keuze, auth, Kids-regels, WebKit-tests | **Hoog** als het laat wordt ontdekt |
| PWA | App-shell caching (`01` §6) | Niet aanwezig | Service worker | — | Afstemmen met iOS-shell | Laag |

## Duplicatie in de referentie (les voor de nieuwe opzet)

`~/mym` heeft drie losse engines (`domain/`, `factory/`, `lemonade/`), elk met eigen gametabel, ledger en commandlog. Dat is precies wat `05` §2 verbiedt. De nieuwe opbouw maakt één pipeline, één ledger en één commandlog, en laat scenario's daarop draaien.

## Bestaande spelers

De spelers en voortgang in `vgk` gaan niet automatisch mee (D1). `~/mym` blijft als aparte app bestaan. Een import van `vgk`-profielen is niet gepland; als dat later gewenst is, wordt het een eigen release met toestemming.
