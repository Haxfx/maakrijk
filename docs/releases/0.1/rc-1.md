# Release 0.1 platform-basis — RC 1

| | |
|---|---|
| Release | 0.1 platform-basis |
| RC | 1 |
| Releasebranch | `release/0.1-platform-basis` |
| Geteste code-commit | `c365585` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `c365585`, contract 1 |
| Backend | `maakrijk-api` 0.1.0, commit `c365585`, contract 1, migratie `20261105000001` |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 (`scripts/preview-api.sh`) → `maakrijk_preview` → commit `c365585`. Controleer dit zelf op http://127.0.0.1:8802/diagnose.

## Wat zit erin

| Feature | Branch | Wat je merkt |
|---|---|---|
| Repo-basis | `feature/0.1-repo-basis` | Rust-API, Nuxt-app, eigen Postgres op 5450 met `_dev`, `_preview`, `_test` |
| Dev/preview | `feature/0.1-dev-preview` | Aparte database, poort en buildmap per omgeving; `/diagnose`; rode banner bij een verschil in contractversie |
| Huishouden en profielen | `feature/0.1-huishouden-profielen` | Anoniem huishouden via een HttpOnly-cookie (web) of bearer-token (latere iOS-shell); maximaal 8 spelers, unieke bijnaam, andere huishoudens zien niets |
| App-shell | `feature/0.1-shell-ui` | "Wie speelt er?", spelers maken, aanpassen en verwijderen, startscherm "Hoi …!", instellingen voor grote tekst en minder beweging |
| Contract | `feature/0.1-openapi` | OpenAPI in `contracts/openapi.json`, gegenereerde TS-types, gestructureerde fout bij ongeldige JSON |
| Fix | `fix/0.1-dialog-actions` | Dialoog "Nieuwe speler" in twee kolommen als de telefoon gedraaid is; de knop "Maken" blijft zichtbaar |
| Fix | `fix/0.1-review-rc1` | Bevindingen F1–F10 uit de interne review (zie onder) |

## Uitgevoerde tests (op `c365585`)

| Test | Commando | Resultaat |
|---|---|---|
| Rust-format | `cargo fmt --check` | ok |
| Rust unit + API tegen PostgreSQL (`maakrijk_test`) | `cargo test` | 22 geslaagd, 0 mislukt |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen |
| Contract actueel | `cargo run --bin export-openapi -- --check`, `npm run check:api` | ok |
| Frontend unit | `npm test` | 6 geslaagd |
| Typecheck | `npm run typecheck` | ok |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright (Chromium) | `npm run e2e` | 19 geslaagd: handmatig scenario, isolatie tussen huishoudens, foutmeldingen, hernoemen, tandwiel per muis en toetsenbord, "Klaar" blijft in de app, lijst ververst na geweigerde 9e speler, diagnose, contractbanner, layout op 4 viewports × gewone/grote tekst (geen horizontale scroll, touchdoelen ≥ 48 px, geen afgekapte knoptekst, "Maken" en alle 8 plaatjes zichtbaar) |

Overgeslagen:
- **WebKit (Safari-benadering):** de systeembibliotheken ontbreken. Je kunt ze zelf installeren met `! sudo npx --prefix apps/web playwright install-deps webkit`; daarna draai je `E2E_WEBKIT=1 npm run e2e`.
- Geen echte telefoon of tablet, geen schermlezer.
- Audio is niet van toepassing in 0.1.

Belangrijke API-garanties met een eigen test: 9e speler geweigerd, ook bij 4 gelijktijdige verzoeken; ander huishouden krijgt 404; cookie-schrijfactie zonder `X-Maakrijk`-header geweigerd (CSRF); bearer-token werkt; ongeldige JSON geeft `invalid_body`; `/api/onbekend` geeft 404, ook als de webbuild wordt geserveerd.

## Onafhankelijke visuele review

Een aparte sub-agent heeft de app beoordeeld. Die agent schreef de code niet, las geen broncode en testte alleen de draaiende preview in headless Chromium, vergeleken met `docs/design/`.

**Ronde 1 (build `3e93d87`): afgekeurd.** Dit was nog vóór de oplevering aan jou.

| ID | Ernst | Bevinding | Status op `c365585` |
|---|---|---|---|
| F1 | blocker | Tandwiel deed niets (inert `<nuxtlink>`-element), instellingen onbereikbaar | Opgelost, met test |
| F2 | major | Direct geopende instellingen: "Klaar" ging naar `about:blank` | Opgelost, met test |
| F3 | major | Telefoon + grote tekst: "Aanpassen" en "Verwijderen" afgekapt | Opgelost, met test |
| F4 | minor | Telefoon: "Verwijderen" afgekapt | Opgelost, met test |
| F5 | minor | Telefoon gedraaid: tweede rij plaatjes onder de rand | Opgelost, met test |
| F6 | minor | Lange bijnamen afgekapt met "…" | Opgelost (namen lopen door) |
| F7 | minor | Invoerveld nam 40 tekens; woord "tekens" te moeilijk | Opgelost: stopt bij 20, tekst zegt "letters" |
| F8 | minor | Na geweigerde 9e speler bleef de lijst verouderd | Opgelost, met test |
| F9 | minor | Uit-stand van schakelaars had weinig contrast | Opgelost (donkerder spoor) |
| F10 | suggestie | Wisselknop alleen een icoon | Opgelost: knop toont "Wissel". Enter schakelt een schakelaar niet om (Spatie wel); dat is normaal gedrag |
| F11 | suggestie | `/diagnose` breekt lange waarden midden in een woord | Niet aangepast (pagina voor volwassenen) |

**Ronde 2 (build `c365585`): goedgekeurd voor handmatig testen.** F1–F9 zijn opgelost en F10 deels, op acceptabele wijze. Eén nieuw klein punt: N1, zie de bekende beperkingen.

Niet getest door de reviewer: echte apparaten en touch, WebKit/Safari, schermlezers, contrast gemeten met een tool.

## Screenshots (echte app, Chromium headless)

Map: `docs/releases/0.1/screenshots/`. Per viewport (`phone` 390×844, `landscape` 844×390, `tablet` 768×1024, `desktop` 1366×768) en met `-bigtext`:
`players-*`, `new-player-*` (open dialoog), `remove-*` (bevestiging), `start-*`, `settings-*`.

## Migraties

- Nieuw: `20261105000001_households_profiles.sql` (`households`, `auth_sessions`, `profiles`).
- Toegepast op `maakrijk_test` en `maakrijk_preview`. Nog **niet** op `maakrijk_dev`.
- `~/mym`, `vgk` en andere projecten zijn niet aangeraakt.

## Bekende beperkingen

- Nog geen spel, munten, sterren of onderste navigatie. Die komen in 0.2 en 0.3; een knop zonder werking tonen we niet.
- Geen ouderpoort: verwijderen vraagt alleen bevestiging. De ouderpoort komt in 0.11.
- Geen rate limiting. Er is wel een bodylimiet (64 KB) en een maximum van 8 profielen.
- Wie de cookie wist, verliest de toegang tot het huishouden. Er is geen herstelcode.
- Instellingen gelden per apparaat, niet per speler.
- De avatars zijn eenvoudige figuren in code, niet de geschilderde stijl van de designs (D9).
- N1: telefoon met grote tekst. Een lange bijnaam zonder spaties (bijv. "AlexandraMariaJan") breekt in de kopbalk midden in het woord en kan de balk hoog maken (tot ±186 px bij 20 brede letters). Met gewone tekst of normale namen is dat niet zo.
- Telefoon gedraaid: de dialoog "Nieuwe speler" scrollt nog 12–15 px. Alle plaatjes en "Maken" zijn zichtbaar.

## Handmatige testlijst

Gebruik een **privévenster**: elk venster is een nieuw, leeg huishouden in `maakrijk_preview`. Je dev-database en `~/mym` worden niet geraakt. Elke stap die een speler maakt of verwijdert, wijzigt gegevens in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| T1 | Open http://127.0.0.1:8802 | "Wie speelt er?", tekst "Maak eerst een speler aan." en een kaart "Nieuwe speler" |
| T2 | "Nieuwe speler" → bijnaam "Testkind A", kies een plaatje → "Maken" *(wijzigt data)* | Kaart "Testkind A" verschijnt |
| T3 | Maak "Testkind B" *(wijzigt data)* | Twee kaarten |
| T4 | Tik op Testkind A | Startscherm "Hoi Testkind A!", "Wat ga jij maken?", "Je hebt nog geen bedrijfjes." Geen "binnenkort" |
| T5 | Ververs de pagina | Nog steeds "Hoi Testkind A!" |
| T6 | Open een tweede privévenster op dezelfde URL | Geen spelers zichtbaar |
| T7 | Terug in venster 1: "Wissel" → "Nieuwe speler" → typ een bijnaam van 25 letters | Het veld stopt bij 20 letters. Maak het veld leeg → "Maken" → melding "Een bijnaam heeft 1 tot 20 letters." |
| T8 | Maak "testkind b" (kleine letters) | Melding "Deze bijnaam bestaat al." |
| T9 | "Spelers beheren" → "Aanpassen" bij A → bijnaam "Noor" → "Opslaan" *(wijzigt data)* | Kaart heet nu "Noor" |
| T10 | "Verwijderen" bij Testkind B → "Annuleren" | B blijft staan |
| T11 | "Verwijderen" bij Testkind B → "Ja, verwijderen" *(wijzigt data)* | B is weg, ook na verversen |
| T12 | Tandwiel → "Grote tekst" aan → "Klaar" | Alle tekst groter, niets overlapt; blijft na verversen |
| T13 | "Minder beweging" aan | Geen draaiende of schuivende animaties meer (in 0.1 alleen de laadcirkel en de schakelaars) |
| T14 | Telefoon of smal venster, ook gedraaid: herhaal T2 | Alles leesbaar, knop "Maken" zichtbaar zonder zoeken |
| T15 | Open http://127.0.0.1:8802/diagnose | "Pagina en server passen bij elkaar.", database `maakrijk_preview`, beide commits `c365585` |

Op een telefoon in hetzelfde netwerk werkt 127.0.0.1 niet. Wil je op een echt apparaat testen, vraag dan om de preview op een LAN-adres te starten.

## Feedback geven

Noem per punt het **testnummer** (bijv. "T9") of de **screenshotnaam** (bijv. `remove-phone.png`), wat je zag en wat je verwachtte. Ik deel elk punt in als bug, visuele verbetering, begrijpelijkheid/bediening of nieuwe scope. Daarna los ik het op in een fixbranch en lever ik RC 2 met een nieuwe commit-hash.
