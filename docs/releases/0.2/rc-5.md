# Release 0.2 limonadekraam — RC 5 (verkoopt vanzelf)

| | |
|---|---|
| Release | 0.2 limonadekraam (idle clicker, D13/D14) |
| RC | 5 |
| Releasebranch | `release/0.2-limonade-ronde` |
| Geteste code-commit | `8266a45` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `8266a45`, contract 1 |
| Backend | `maakrijk-api` commit `8266a45`, contract 1, migratie `20261105000002` (pakketversie meldt nog 0.1.0) |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 → `maakrijk_preview` → commit `8266a45`. Controleer op http://127.0.0.1:8802/diagnose.

## Wat is er veranderd sinds RC 4

Feedback: `feedback-rc-4.md` (G1). Besluit: D14. Branch: `feature/0.2-vanzelf`.

| Feedback | Wat er gedaan is |
|---|---|
| G1 "Te veel zelf klikken; het moet langzaam vanzelf gaan met upgrades, en dat is niet duidelijk" | **De kraam verkoopt vanaf de start vanzelf**: 1 beker per 4 seconden, zonder te tikken. **Upgrades maken vooral dat sneller**: hulpje (+30 bekers per minuut per niveau) en het nieuwe **Reclame** (tik op het grote citroenbord boven de kraam: alles wat vanzelf gaat +50%). **Zichtbaar**: het saldo loopt live op, onder de kan vult een balk zich tot de volgende beker, "+2" verschijnt bij de kassa, "−4 citroenen en suiker" bij elke nieuwe kan, en in de kopbalk staat "Vanzelf: +15 per minuut". **Uitleg**: het doelkaartje zegt "Je kraam verkoopt vanzelf! Spaar voor een verbetering." Zodra je een hulpje kunt betalen: "Neem een hulpje aan: dan verkoopt je kraam sneller vanzelf", met een pijl op het bordje. De upgradekaart toont bijvoorbeeld "15 → 45 bekers per minuut vanzelf". **Tikken** op de pers kan nog steeds, maar is een extraatje; de pijl wijst er nooit naartoe. |

Server: manifest v3 (balans `2026-11-c`). De klok start bij het eerste command; even kijken telt nog niet. Spellen van RC 4 lopen gewoon door; hun klok start bij de omzetting, dus niemand krijgt gratis uren. Spellen van RC 1–3 worden net als in RC 4 omgezet. Er is geen databasemigratie.

Documenten: `03` §5a, §6 en §8, contract §4–§6, D14 en `feedback-rc-4.md`.

## Balans in het kort

| Moment | Zonder tikken |
|---|---|
| Start | 12 munten, 15 bekers per minuut vanzelf (netto +15 munten per minuut) |
| ~28 s | hulpje betaalbaar (15) → 45 per minuut |
| daarna | reclame (40) → ×1,5; citroenboom (60) → een kan kost 1 i.p.v. 4 |

## Uitgevoerde tests (op `8266a45`)

| Test | Commando | Resultaat |
|---|---|---|
| Rust unit + API + conformance (`maakrijk_test`) | `cargo test` | 64 geslaagd. Nieuw: verkoopt vanzelf vanaf de start, hint naar het hulpje zodra dat kan zonder vast te lopen, reclame vermenigvuldigt, een v2-spel krijgt geen uren van vóór de omzetting, lezen start de klok niet |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen |
| Frontend unit | `npx vitest run` | 29 geslaagd (nieuw: de live berekening rekent precies zoals de server, inclusief breuken, plafond en kannen) |
| Typecheck | `npx nuxt typecheck` | ok |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright Chromium | `npm run e2e` | 29 geslaagd. Nieuw: zonder tikken na ~4 s 10 munten met "−4 citroenen en suiker", daarna 12; voortgangsbalk "Volgende beker"; hint en kaart van het hulpje (15 → 45 per minuut); de pers krijgt nooit de hint; alle 6 objecten ≥ 48 px op 390×844 en 844×390 |
| Playwright WebKit | — | **Niet uitgevoerd**: systeembibliotheken ontbreken |
| Scenario door de echte UI | Playwright-script tegen 8802, 6 viewports | elke run: 12 munten; na 8 s zonder tikken 2 bekers vanzelf verkocht (12 + 4 − 4 = 12); hint op het hulpje na 6 tikken; met hulpje +45 per minuut, 8 s later ongeveer +8 |

## Visuele review

**Niet onafhankelijk**: de review-agent is nog steeds geblokkeerd. De bouwende agent heeft de review zelf gedaan (`screenshots-rc5/`).

| # | Bevinding | Ernst | Screenshot |
|---|---|---|---|
| W1 | Liggend: het doelkaartje bedekt het grote Reclame-bord voor een deel (het is nog wel tikbaar) | minor | `telefoon-liggend-5-sneller.png` |
| W2 | Telefoon: lopende klanten komen even vóór het bordje "hulp gezocht" langs | minor | `telefoon-3-hint-hulpje.png` |
| W3 | Telefoon portrait: bovenste ~40% is lucht (al sinds RC 3) | minor | `telefoon-1-start.png` |
| W4 | Het label "−4 citroenen en suiker" valt over de kan en de pers | minor | `telefoon-3-hint-hulpje.png` |

Beperkingen: alleen Chromium met software-WebGL; geen echte telefoon of tablet; geen audio.

## Bekende beperkingen

- WebKit-tests niet gedraaid: het acceptatiecriterium "Playwright groen in WebKit" is nog **open**.
- De standaarden S1–S5 uit RC 4 zijn nog niet door jou bevestigd. S3 (max 2 uur doorverdienen) geldt nu voor alles wat vanzelf gaat.
- `/api/version` meldt pakketversie `0.1.0`.
- `maakrijk_dev` is niet bijgewerkt (pas na goedkeuring en aparte toestemming; er is geen migratie nodig).

## Migraties

Geen nieuwe sinds RC 1. Bij het starten schrijft de API scenario-definitie v3 in `scenario_definitions`; v1 en v2 blijven staan.

## Handmatige testlijst

Op http://127.0.0.1:8802 met een **nieuwe** speler "Limo-test-5". Elke stap verandert alleen de gegevens van die speler in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| 1 | Limo-test-5 → Limonade → Spelen, en **niets tikken** | "Je kraam verkoopt vanzelf! Spaar voor een verbetering."; kopbalk "Vanzelf: +15 per minuut"; de balk onder de kan vult zich |
| 2 | Wacht ~4 s | Een klant loopt naar de kassa, "+2" bij de kassa, "−4 citroenen en suiker"; 10 munten. Na nog 4 s: 12 |
| 3 | Blijf ~30 s kijken zonder te tikken | Saldo loopt op; het bordje "hulp gezocht" krijgt een gouden pijltje (15) en het doelkaartje noemt het hulpje |
| 4 | Tik op het bordje | Kaart "Hulpje": 15 → 45 bekers per minuut vanzelf, prijs 15 |
| 5 | "Verbeteren" | Hulpje achter de toonbank; kopbalk "+45 per minuut"; het gaat zichtbaar sneller |
| 6 | Tik op het grote citroenbord boven de kraam | Kaart "Reclame" (40): bijvoorbeeld 45 → 67 bekers per minuut vanzelf |
| 7 | Tik een paar keer op de pers | Extra "+2" per tik; geen pijl op de pers |
| 8 | Sluit de tab, wacht ruim een minuut, open opnieuw | "Welkom terug! Je kraam verkocht … bekers terwijl je weg was." |
| 9 | Tik op de kassa | Verkocht / materialen / over en "Vanzelf verkocht: … bekers" |

## Feedback koppelen

Noem het stapnummer, de bevindingcode (bijv. "W1") of de standaard (S1–S5 uit RC 4), plus: bug, visueel, onduidelijk of nieuwe scope.
