# Release 0.2 limonade-ronde — RC 1

| | |
|---|---|
| Release | 0.2 limonadekraam: eerste ronde |
| RC | 1 |
| Releasebranch | `release/0.2-limonade-ronde` |
| Geteste code-commit | `228d0b6` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `228d0b6`, contract 1 |
| Backend | `maakrijk-api` commit `228d0b6`, contract 1, migratie `20261105000002` (pakketversie staat nog op 0.1.0, zie beperkingen) |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 (`scripts/preview-api.sh`) → `maakrijk_preview` → commit `228d0b6`. Controleer dit zelf op http://127.0.0.1:8802/diagnose.

## Wat zit erin

| Feature | Branch | Wat je merkt |
|---|---|---|
| Contract | `feature/0.2-contract` | Afspraken game-core in `docs/build/contracts/0.2-game-core.md` |
| Command-pipeline | `feature/0.2-command-pipeline` | Elke actie heeft een command-ID; dubbel tikken of opnieuw versturen voert niets twee keer uit; servertijd bepaalt wanneer de kan klaar is |
| Platformsystemen | `feature/0.2-systems` | Gedeelde ledger (bedrijfsgeld), scenario-manifest, voorraad, processor en klantenpunt; geen negatieve voorraad of saldo |
| Limonaderegels | `feature/0.2-limonade-regels` | Kopen, kan maken, kraam openen, klant bedienen, kraam sluiten; vastlooppreventie |
| Conformance v1 | `feature/0.2-conformance-v1` | Gedeelde testsuite die elke toekomstige game moet doorlopen |
| Three.js-stage | `feature/0.2-three-stage` | Gedeelde 3D-wereld met "Alles bekijken", pan/zoom, pauze bij verborgen tab, melding zonder WebGL |
| Limonadewereld | `feature/0.2-limonade-wereld` | Kraam, kratten, suikerpot, kan, klanten; doelkaart en knoppen onderin |
| Rondeoverzicht | `feature/0.2-rondeoverzicht` | "Ronde klaar!" met verkocht / materialen / over |
| Taalbestanden | `feature/0.2-taalbestanden` | Alle teksten in `apps/web/app/locales/nl/common.ts` en per game in `locales/nl/games/lemonade.ts` (D11) |

## Uitgevoerde tests (op `228d0b6`)

| Test | Commando | Resultaat |
|---|---|---|
| Rust-format | `cargo fmt --check` | ok |
| Rust unit + API + conformance tegen PostgreSQL (`maakrijk_test`) | `cargo test` | 57 geslaagd, 0 mislukt |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen |
| Contract actueel | `cargo run --bin export-openapi -- --check`, `npm run check:api` | ok |
| Frontend unit | `npx vitest run` | 21 geslaagd |
| Typecheck | `npx nuxt typecheck` | ok (exit 0) |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright Chromium | `npm run e2e` | 26 geslaagd: volledige ronde, vroeg sluiten, refresh tijdens maken, weigering verandert niets, stage tekent alleen bij verandering, wereld + knop zichtbaar op 390×844 en 844×390, alle 0.1-scenario's |
| Playwright WebKit | `E2E_WEBKIT=1 npm run e2e` | **Niet uitgevoerd**: WebKit start niet, systeembibliotheken ontbreken (`libgtk-4.so.1`, `libgraphene-1.0.so.0`, …). Installeren vraagt `sudo npx playwright install-deps webkit`. |
| Upgrade bestaande voortgang | preview-API gestart op `maakrijk_preview` met 41 bestaande profielen uit 0.1 | migratie `20261105000002` toegepast, 41 profielen behouden. Backup vooraf: `pg_dump` van `maakrijk_preview` (scratchpad, niet gecommit) |
| Scenario door de echte UI | Playwright-script tegen 8802, 6 runs (telefoon, liggend, tablet, desktop, grote tekst, minder beweging) | elke run: 12 → 8 munten, Citroenen 3 · Suiker 1; refresh tijdens maken → kan 4 bekers, geen tweede kan; dubbel tikken op "Geef een beker" → één betaling; eind 16 munten; overzicht 8 / 4 / 4 |

## Visuele review

**Niet onafhankelijk.** Een aparte review-agent kon niet starten: een plugin-hook (context-mode) wijzigt de agent-aanroep, waardoor auto mode die niet kon goedkeuren. De review is gedaan door de bouwende agent zelf.

Bekeken tegen `docs/design/239d….png` ("Bestelling klaar!"):

| # | Bevinding | Ernst | Screenshot |
|---|---|---|---|
| V1 | Geen overlap; wereld en "Geef een beker" samen zichtbaar zonder scrollen op alle viewports | ok | `telefoon-3-klant.png`, `telefoon-liggend-3-klant.png` |
| V2 | Overzicht volgt de opbouw van het design (drie kolommen met munt, één grote knop). Mijlpaal/sterren en illustratie ontbreken bewust (sterren = 0.3) | ok | `telefoon-4-overzicht.png` |
| V3 | Stijl is low-poly 3D (besluit D3), niet de geïllustreerde 2D-stijl van de designs. Kleuren (petrol, crème, goud) sluiten aan | info | alle |
| V4 | Grote tekst: knoppen onder elkaar rechts uitgelijnd; alles bereikbaar, maar oogt minder rustig | minor | `telefoon-grote-tekst-3-klant.png` |
| V5 | Telefoon portrait: veel leeg gras onder de kraam; kraam mag groter in beeld | minor | `telefoon-3-klant.png` |
| V6 | Halfdoorzichtige suikerpot staat op het pad naast de krat; leest niet direct als suiker | minor | `desktop-3-klant.png` |
| V7 | Titel gebruikt bezittelijke vorm: "Luca's Limonade". Testnamen met cijfers geven "RC2-0-4584s" (alleen een testartefact) | nit | `telefoon-1-start.png` |

Weigeringsmelding: gedekt door Playwright-test "a refusal is explained and changes nothing"; geen aparte screenshot.

Eerlijke beperkingen: alleen Chromium met software-WebGL in WSL; geen echte telefoon of tablet; geen audio (valt buiten scope).

## Screenshots

`docs/releases/0.2/screenshots/`: `<viewport>-<stap>.png`, met viewport `telefoon` (390×844), `telefoon-liggend` (844×390), `tablet` (820×1180), `desktop` (1440×900), `telefoon-grote-tekst`, `telefoon-minder-beweging`, en stappen `1-start`, `2-maken`, `3-klant`, `4-overzicht`.

## Bekende beperkingen

- WebKit-tests niet gedraaid (zie boven): acceptatiecriterium "Playwright groen in WebKit" is nog **open**.
- API-pakketversie meldt nog `0.1.0` op `/api/version`; commit en migratie kloppen wel.
- Geen upgrades, winkel, sterren, roze limonade of audio (buiten scope 0.2).
- `maakrijk_dev` is nog **niet** gemigreerd; dat gebeurt pas na jouw goedkeuring en toestemming.
- Bij de crash van 11:50 zijn eventuele niet-gecommitte wijzigingen na `a2b3566` verloren gegaan; de gecommitte stand is volledig hersteld.

## Migraties

Nieuw: `20261105000002` (`game_instances`, `game_snapshots`, `game_commands`, `economy_transactions`, `scenario_definitions`). Toegepast op `maakrijk_test` en `maakrijk_preview`. Niet op `maakrijk_dev`. Bestaande profielen blijven ongewijzigd.

## Handmatige testlijst

Gebruik http://127.0.0.1:8802 en maak een **nieuwe** speler "Limo-test". Bestaande spelers worden niet aangeraakt. Elke stap verandert alleen de gegevens van Limo-test in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| 1 | Kies Limo-test → Limonade → Spelen | Kraam in beeld, "12 munten", doel "Koop citroenen en suiker" |
| 2 | Tik "Koop voor 1 kan · 4 munten" | 8 munten; Citroenen 3 · Suiker 1 |
| 3 | Tik "Maak limonade", ververs de pagina meteen | Voortgangsbalk; na ~3 s "4 bekers"; geen tweede kan, voorraad 0 |
| 4 | Tik "Open de kraam" | Klant loopt naar de kraam; "Klanten 0/4" |
| 5 | Tik twee keer snel op "Geef een beker" | Precies +2 munten (10), 3 bekers |
| 6 | Open dezelfde URL in een tweede tabblad, bedien daar een klant | Beide tabbladen tonen na verversen hetzelfde saldo (12); geen dubbele betaling |
| 7 | Bedien de overige klanten | 16 munten; "Ronde klaar!" met Verkocht 8, Materialen 4, Over 4 |
| 8 | Ververs, tik "Volgende ronde" | Overzicht blijft na verversen staan; daarna weer "Koop citroenen en suiker" |
| 9 | Tik herhaald op "+1 citroen" | Op een gegeven moment een rustige melding (bijv. dat je dan vastloopt); saldo verandert niet bij de weigering |
| 10 | Instellingen → Grote tekst en Minder beweging aan, speel stap 2–4 | Alles leesbaar en bereikbaar; wereld beweegt alleen bij verandering |
| 11 | Draai je telefoon (of maak het venster 844×390) | Wereld en "Geef een beker" tegelijk zichtbaar |

## Feedback koppelen

Noem het stapnummer uit de testlijst (bijv. "stap 5") of de bevindingcode (bijv. "V5"), en zeg of het een bug, een visuele wens, onduidelijkheid of nieuwe scope is. Teksten aanpassen kan direct in `apps/web/app/locales/nl/games/lemonade.ts`.
