# Release 0.2 limonade-ronde — RC 2

| | |
|---|---|
| Release | 0.2 limonadekraam: eerste ronde |
| RC | 2 |
| Releasebranch | `release/0.2-limonade-ronde` |
| Geteste code-commit | `b085e49` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `b085e49`, contract 1 |
| Backend | `maakrijk-api` commit `b085e49`, contract 1, migratie `20261105000002` (pakketversie meldt nog 0.1.0) |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 (`scripts/preview-api.sh`) → `maakrijk_preview` → commit `b085e49`. Controleer op http://127.0.0.1:8802/diagnose.

## Wat is er veranderd sinds RC 1

Feedback: `feedback-rc-1.md`.

| Feedback | Wat er gedaan is | Branch |
|---|---|---|
| F1 Art style past niet bij de designs | De limonadewereld is nu een geïllustreerd vooraanzicht zoals het design "Luca's Limonade": hemel met wolken en vlaggetjes, heuvels met bomen, kraam met gestreepte luifel en citroenbord, kan, bekers, kassa, kist, suikerpot, krijtbord en getekende kinderen als klanten. Bruine contouren en de kleuren uit `01` §5. Een bediend kind loopt weg met een beker in de hand, een munt springt naar de kassa. Het paneel toont citroen-, suiker- en bekericoon uit dezelfde art. | `fix/0.2-art-stijl` |
| F2 Speler aanpassen | Akkoord, niets gewijzigd | — |
| F3 Instellingen | Akkoord, niets gewijzigd | — |
| Taalbestanden (verzoek) | Al in RC 1-commit `228d0b6`: `locales/nl/common.ts` + `locales/nl/games/lemonade.ts` | `feature/0.2-taalbestanden` |

Techniek (besluit D9-update): Three.js blijft. De gedeelde stage kreeg een `front`-projectie (vooraanzicht). Op hoge schermen staat de kraam op de onderrand en vult de lucht de rest. Art staat als SVG in `apps/web/public/art/lemonade/` en wordt gegenereerd door `scripts/art/lemonade.mjs`. Elke afbeelding is te vervangen door een geschilderde PNG via `LEMONADE_ART` in `world.ts`, zonder verdere code (zie de README in die map). Er zijn geen wijzigingen aan spelregels, server of database.

## Uitgevoerde tests (op `b085e49`)

| Test | Commando | Resultaat |
|---|---|---|
| Rust unit + API + conformance (`maakrijk_test`) | `cargo test` | 57 geslaagd, 0 mislukt |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen |
| Frontend unit | `npx vitest run` | 25 geslaagd (nieuw: vooraanzicht passend maken, op onderrand zetten, slepen, iso ongewijzigd) |
| Typecheck | `npx nuxt typecheck` | ok |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright Chromium | `npm run e2e` | 26 geslaagd |
| Playwright WebKit | — | **Niet uitgevoerd**: systeembibliotheken ontbreken (`sudo npx playwright install-deps webkit` nodig) |
| Scenario door de echte UI | Playwright-script tegen 8802, 6 runs (telefoon, liggend, tablet, desktop, grote tekst, minder beweging) | elke run 12 → 8 munten, Citroenen 3 · Suiker 1; refresh tijdens maken zonder tweede kan; dubbel tikken = één betaling; eind 16; overzicht 8 / 4 / 4 |

## Visuele review

**Niet onafhankelijk**: de review-agent kon niet starten, omdat de context-mode-hook de aanroep wijzigt en auto mode die dan niet kan controleren. De review is gedaan door de bouwende agent.

| # | Bevinding | Ernst | Screenshot |
|---|---|---|---|
| V1 | Stijl volgt het limonadedesign: vooraanzicht, luifel, bord, vlaggetjes, kinderen | ok | `desktop-3-klant.png`, `desktop-5-bedienen.png` |
| V2 | Wereld en "Geef een beker" samen zichtbaar op telefoon portrait en liggend | ok | `telefoon-3-klant.png`, `telefoon-liggend-3-klant.png` |
| V3 | Tablet en telefoon portrait: bovenste helft is lucht; de kraam is kleiner dan in het design | minor | `tablet-1-start.png` |
| V4 | Vector-art is strakker en vlakker dan de geschilderde designs (geen penseeltextuur) | info | alle |
| V5 | Grote tekst: "Suiker 0" en "In de kan:" breken af naar een tweede regel | minor | `telefoon-grote-tekst-3-klant.png` |
| V6 | Het krijtbord toont een vage citroen- en bekertekening | nit | `desktop-3-klant.png` |
| V7 | De oude RC 1-bevindingen V4–V6 (stapelende knoppen, leeg gras, suikerpot) zijn opgelost of vervallen door de nieuwe wereld, behalve het stapelen bij grote tekst | — | — |

Beperkingen: alleen Chromium met software-WebGL in WSL; geen echte telefoon of tablet; geen audio.

## Screenshots

`docs/releases/0.2/screenshots/`: `<viewport>-<stap>.png` voor `telefoon`, `telefoon-liggend`, `tablet`, `desktop`, `telefoon-grote-tekst` en `telefoon-minder-beweging`, met de stappen `1-start`, `2-maken`, `3-klant` en `4-overzicht`. Daarnaast `desktop-5-bedienen.png` (beker in de hand, munt naar de kassa). De RC 1-screenshots staan in commit `43df9f2`.

## Bekende beperkingen

- WebKit-tests niet gedraaid: acceptatiecriterium "Playwright groen in WebKit" is nog **open**.
- `/api/version` meldt pakketversie `0.1.0`.
- `maakrijk_dev` is nog **niet** gemigreerd; dat gebeurt pas na goedkeuring en jouw aparte toestemming.

## Migraties

Geen nieuwe sinds RC 1 (`20261105000002`, alleen op `maakrijk_test` en `maakrijk_preview`).

## Handmatige testlijst

Op http://127.0.0.1:8802 met een **nieuwe** speler "Limo-test-2". Elke stap verandert alleen de gegevens van die speler in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| 1 | Limo-test-2 → Limonade → Spelen | Kraam in vooraanzicht zoals het design; 12 munten; kist en suikerpot leeg |
| 2 | "Koop voor 1 kan · 4 munten" | 8 munten; 3 citroenen in de kist, 1 suikerklontje in de pot |
| 3 | "Maak limonade", ververs meteen | Pers wiebelt (niet bij Minder beweging); na ~3 s is de kan gevuld en staat er "4 bekers"; geen tweede kan |
| 4 | "Open de kraam" | Kinderen lopen van rechts naar de kraam en gaan in de rij staan |
| 5 | Twee keer snel op "Geef een beker" | +2 munten (10); het kind loopt met een beker weg; een munt springt naar de kassa; de kan zakt |
| 6 | Tweede tabblad, daar een klant bedienen | Na verversen hetzelfde saldo in beide (12) |
| 7 | Rest bedienen | 16 munten; "Ronde klaar!" 8 / 4 / 4 |
| 8 | Draai telefoon / venster 844×390 | Wereld en "Geef een beker" tegelijk zichtbaar |
| 9 | Slepen en knijpen/scrollen in de wereld, daarna "Alles bekijken" | Beeld schuift en zoomt binnen de grenzen; "Alles bekijken" zet het terug |
| 10 | Vergelijk met `docs/design/f4b89fd1….png` (middenboven) | Zelfde opbouw en sfeer; noem wat nog anders moet |

## Feedback koppelen

Noem het stapnummer of de bevindingcode (bijv. "V3"), plus: bug, visueel, onduidelijk of nieuwe scope. Over de art: noem het object (bijv. "kinderen", "luifel", "lucht"). Elk object is los aan te passen of te vervangen door een eigen plaatje.
