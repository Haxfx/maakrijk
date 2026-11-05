# Release 0.2 limonadekraam — RC 4 (clicker)

| | |
|---|---|
| Release | 0.2 limonadekraam (bijgesteld: clicker-kern, D13) |
| RC | 4 |
| Releasebranch | `release/0.2-limonade-ronde` |
| Geteste code-commit | `2d81759` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `2d81759`, contract 1 |
| Backend | `maakrijk-api` commit `2d81759`, contract 1, migratie `20261105000002` (pakketversie meldt nog 0.1.0) |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 → `maakrijk_preview` → commit `2d81759`. Controleer op http://127.0.0.1:8802/diagnose.

## Wat is er veranderd sinds RC 3

Aanleiding: "Snap je het concept van de cookie clicker? Dat is in feite ook hoe ik de game wil bouwen hiermee" en "pas ook de documenten aan waar nodig en ga door met bouwen". Besluit: D13 in `docs/build/decision-log.md`. Branch: `feature/0.2-clicker-kern`.

**Het spel is nu een clicker:**
- **Pers = de grote tikknop.** Elke tik verkoopt bekers (eerst 1 beker = 2 munten). Het saldo telt direct mee; een zwevende "+2" laat zien wat je verdient.
- **Ingrediënten gaan automatisch per kan.** Begint een tik een nieuwe kan, dan kost dat 4 munten (3 citroenen + 1 suiker). Een rood label "−4 citroenen en suiker" laat zien waarom het saldo dan even zakt. De kan op de toonbank loopt leeg.
- **Upgrades zitten op de objecten**, met een pijltje en de prijs (goud als je het kunt betalen):
  - pijltje op de **pers**: *Betere pers*, +1 beker per tik (10, 30, 80, 200, 500)
  - bordje **"hulp gezocht"** voor de toonbank: *Hulpje*, 30 bekers per minuut extra (20, 50, 120, 300, 700). Het hulpje staat daarna achter de toonbank.
  - **plantje** naast de kist: *Citroenboom*, citroenen gratis, een kan kost dan 1 munt (60). Het plantje wordt een citroenboom.
  
  Tikken opent een kaart zoals in het design "Grotere kan": nu → straks, prijs, jouw saldo, "Verbeteren". Kun je het nog niet betalen, dan staat er hoeveel munten je mist.
- **Hulpjes werken door**, ook als je weg bent, maximaal 2 uur. Bij terugkomst: "Welkom terug! Je hulpjes verkochten … bekers". In de kopbalk staat "+30 per minuut".
- **Kassa** (tik op de kassa): verkocht / materialen / over, hoeveel de hulpjes verkochten, wat een kan kost en wat je aan verbeteringen hebt uitgegeven.
- **Klanten** lopen per verkochte beker naar de kassa en weer weg (maximaal 3 tegelijk). Ze zijn beeld; het geld komt alleen van de server.
- **Vastlopen kan niet**: een upgrade die je volgende kan onbetaalbaar maakt, wordt geweigerd ("Dan heb je geen munten meer voor je volgende kan limonade").

Vervallen: kist en suikerpot als winkel, kan maken met wachttijd, bordje open/dicht, klanten bedienen, rondeoverzicht.

**Server:** manifest v2 (balans `2026-11-b`), commands `tap`, `buyUpgrade` en `collect`. De server telt maximaal 12 tikken per seconde. Lezen (`GET`) rekent hulpjes alleen in het geheugen af; het volgende command boekt ze precies één keer. Spellen uit RC 1–3 worden bij het eerste gebruik omgezet: ongebruikte citroenen en suiker gaan terug in munten, bekers in de kan blijven. De 52 oude spellen in `maakrijk_preview` gaan zo over. Er is geen databasemigratie.

**Documenten bijgewerkt:** `03` §5a, §6, §7 en §8 (clickerbalans, upgrades, vastlopen, afwezigheid), contract `0.2-game-core.md` §4–§6, releaseplan (0.2 en 0.3 bijgesteld), D12 en D13. Alle teksten staan in `locales/nl/games/lemonade.ts`.

## Gekozen standaarden (graag bevestigen of aanpassen)

| # | Keuze | Alternatief |
|---|---|---|
| S1 | Materialen blijven, automatisch per kan | Geen kosten, alleen verdienen |
| S2 | Klanten als zichtbare kopers | Geen klanten, alleen munten |
| S3 | Doorverdienen bij afwezigheid: max 2 uur | Korter, langer of helemaal niet |
| S4 | 0.2 omgebouwd naar clicker; rondespel vervalt | Rondes houden als aparte modus |
| S5 | Prijzen en effecten zoals in de tabel hierboven | Andere getallen |

## Uitgevoerde tests

| Test | Commando | Resultaat |
|---|---|---|
| Rust unit + API + conformance (`maakrijk_test`) | `cargo test` | 61 geslaagd (op `93fcb31`; daarna is alleen de frontend gewijzigd). Nieuw: eerste tik koopt de kan, een tik over meerdere kannen, tikbuffer, betere pers, vastloopweigering, maximum en onbekende upgrade, hulpjes bij afwezigheid met plafond, breuken, `collect`, omzetting v1 → v2, 40 willekeurige spelverlopen zonder negatief saldo, dubbele referentie of vastlopen; via HTTP: tikken, upgrades, `GET` zonder schrijven, v1-spel omgezet |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen |
| Frontend unit | `npx vitest run` | 28 geslaagd (nieuw: saldo-voorspelling gelijk aan de serverregel) |
| Typecheck | `npx nuxt typecheck` | ok |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright Chromium | `npm run e2e` | 28 geslaagd (op `2d81759`). Nieuw: tikken + direct tellen + refresh, betere pers via het pijltje, te duur → "Je hebt nog 8 munten nodig", geweigerde upgrade verandert niets, kassa 10/8/2, toetsenbord, tekenen alleen bij verandering, alle objecten ≥ 48 px en zichtbaar op 390×844 en 844×390 |
| Playwright WebKit | — | **Niet uitgevoerd**: systeembibliotheken ontbreken |
| Scenario door de echte UI | Playwright-script tegen 8802, 6 viewports | elke run: 4 tikken → 16, betere pers → 6, 12 tikken → 30, hulpje → 10. Na 7 s hadden de hulpjes 2 tot 5 bekers verkocht; de kassa klopte (bijv. 60 / 32 / 28 bij 30 bekers) |

## Visuele review

**Niet onafhankelijk**: de review-agent is nog steeds geblokkeerd (de context-mode-hook wijzigt de aanroep). De bouwende agent heeft de review zelf gedaan, met screenshots in `screenshots-rc4/`.

| # | Bevinding | Ernst | Screenshot |
|---|---|---|---|
| W1 | Geen knoppenpaneel; tikken, upgrades en kassa zitten allemaal op objecten | ok | `telefoon-4-hulpje.png` |
| W2 | De upgradekaart volgt het design (nu → straks, prijs, saldo); ook leesbaar met grote tekst | ok | `telefoon-grote-tekst-3-upgradekaart.png` |
| W3 | Telefoon portrait: bovenste ~40% is lucht (al sinds RC 3) | minor | `telefoon-1-start.png` |
| W4 | Liggend: het label "−4 citroenen en suiker" valt deels achter het pijltje van de pers | minor | `telefoon-liggend-2-tikken.png` |
| W5 | Het schort van het hulpje valt achter de bekers; je ziet vooral het hoofd | minor | `telefoon-4-hulpje.png` |
| W6 | Als een hulpje een nieuwe kan begint, zakt het saldo even met 2 zonder label (dat label staat er alleen bij tikken) | minor | — |

Beperkingen: alleen Chromium met software-WebGL; geen echte telefoon of tablet; geen audio.

## Bekende beperkingen

- WebKit-tests niet gedraaid: het acceptatiecriterium "Playwright groen in WebKit" is nog **open**.
- De omzetting van oude spellen is getest via de API-test, niet in de UI: oude spelers horen bij andere browsersessies.
- `/api/version` meldt pakketversie `0.1.0`.
- `maakrijk_dev` is niet bijgewerkt (pas na goedkeuring en aparte toestemming). Er is geen migratie nodig; bij de eerste start van een nieuwe API wordt definitie v2 toegevoegd en worden spellen omgezet.
- Sterren, hoofdstukken en meer upgrades volgen in 0.3.

## Migraties

Geen nieuwe sinds RC 1. Bij het starten schrijft de API scenario-definitie v2 (`lemonade`, versie 2) in `scenario_definitions`. Versie 1 blijft staan.

## Handmatige testlijst

Op http://127.0.0.1:8802 met een **nieuwe** speler "Limo-test-4". Elke stap verandert alleen de gegevens van die speler in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| 1 | Limo-test-4 → Limonade → Spelen | Kraam in beeld, de pers pulseert met een pijl; "Tik op de pers om limonade te verkopen"; 12 munten |
| 2 | Tik 1× op de pers | "+2" zweeft omhoog, rood label "−4 citroenen en suiker"; 10 munten; kan-badge 3 |
| 3 | Tik nog 3× | 16 munten; een paar kinderen lopen naar de kassa en weg met een beker |
| 4 | Ververs de pagina | Nog steeds 16 munten |
| 5 | Pijltje op de pers is goud met "10"; tik erop | Kaart "Betere pers": 1 → 2 bekers per tik, prijs 10, jij hebt 16 |
| 6 | "Verbeteren" | 6 munten; daarna levert een tik 2 bekers op (+4) |
| 7 | Tik op het bordje "hulp gezocht" (20) zolang je minder dan 20 hebt | De kaart zegt hoeveel munten je mist; "Verbeteren" is uit |
| 8 | Tik tot je 20+ hebt, koop het hulpje | Een kind met schort achter de toonbank; kopbalk "+30 per minuut"; het saldo loopt vanzelf op (elke ~3 s) |
| 9 | Tik op de kassa | Verkocht / materialen / over, aantal bekers van hulpjes, uitgegeven aan verbeteringen |
| 10 | Sluit de tab, wacht ruim een minuut, open het spel opnieuw | "Welkom terug!" met wat de hulpjes verkochten |
| 11 | Spaar 60 en tik op het plantje naast de kist | Kaart "Citroenboom"; na kopen staat er een citroenboom en "Eén kan kost 1 munt" in de kassa |
| 12 | Tik heel snel (meer dan 12× per seconde) | Geen foutmelding; de server telt maximaal 12 per seconde |
| 13 | Speel met Tab + Enter | Gele focusrand; Enter op de pers verkoopt |

## Feedback koppelen

Noem het stapnummer, de bevindingcode (bijv. "W4") of de standaard (bijv. "S3"), plus: bug, visueel, onduidelijk of nieuwe scope.
