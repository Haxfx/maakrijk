# Maakrijk — stand van zaken en volgende stap

Bijgewerkt: 2026-11-05. **Ontwikkeling staat op pauze op verzoek van de gebruiker** ("Dit is een goede eerste versie, we kunnen later gaan verbeteren. Wacht even met de verdere ontwikkeling."). Begin hier als het werk verdergaat.

## Waar we staan

| | |
|---|---|
| Laatste release op `main` | 0.1 platform-basis (`e531290`) |
| Lopende release | 0.2 limonadekraam, branch `release/0.2-limonade-ronde` |
| Laatste RC | **RC 5** (`docs/releases/0.2/rc-5.md`), geteste code-commit `8266a45` |
| Goedkeuring RC 5 | **Nog niet expliciet gegeven.** De gebruiker vond het "een goede eerste versie". Dat geldt niet als goedkeuring om te mergen of te taggen. |
| Branches | Alle branches zijn gepusht. De laatste feature-branches zijn `feature/0.2-clicker-kern` (RC 4) en `feature/0.2-vanzelf` (RC 5), allebei gemerged in de releasebranch. |
| Preview | `scripts/preview-api.sh` → http://127.0.0.1:8802 → `maakrijk_preview` (commit `8266a45`). Draait niet vanzelf door na een herstart. |
| Databases | `maakrijk_test` en `maakrijk_preview` hebben migratie `20261105000002` en scenario-definities v1–v3. **`maakrijk_dev` is niet bijgewerkt.** |

### Wat 0.2 nu is (RC 5)

Limonade is een *idle clicker* (besluiten D11–D14 in `decision-log.md`):
- De kraam verkoopt vanzelf: 1 beker per 4 s vanaf het eerste command. Ingrediënten worden automatisch per kan betaald.
- Upgrades koop je door op objecten in de wereld te tikken: hulpje (bordje "hulp gezocht"), reclame (groot citroenbord), citroenboom (plantje), betere pers (pijltje op de pers).
- Het saldo loopt live op. De kraam verdient maximaal 2 uur door als je weg bent; bij terugkomst zie je "Welkom terug". De kassa toont verkocht / materialen / over.
- Tikken op de pers is een extraatje; de hint wijst er nooit naartoe.
- Alle teksten staan in `apps/web/app/locales/nl/games/lemonade.ts`.
- Regels: `services/api/src/scenarios/lemonade/` (manifest v3, balans `2026-11-c`). Contract: `docs/build/contracts/0.2-game-core.md`. Balans: `docs/03-BALANS-EN-ECONOMIE.md` §5a–§8.

## Open punten

| # | Punt | Wie |
|---|---|---|
| O1 | Expliciete goedkeuring van 0.2 RC 5 (of feedback voor RC 6) | gebruiker |
| O2 | Standaarden S1–S5 (RC 4) bevestigen: materialen per kan, zichtbare klanten, max 2 uur doorverdienen, rondespel vervallen, prijzen | gebruiker |
| O3 | WebKit-tests: vereist eenmalig `sudo npx playwright install-deps webkit`, daarna `npx playwright test --project=webkit` | gebruiker, dan agent |
| O4 | Visuele punten RC 5: W1 doelkaartje over Reclame-bord (liggend), W2 klanten vóór het hulpbordje, W3 veel lucht op telefoon portrait, W4 kostlabel over kan/pers | agent, later |
| O5 | Onafhankelijke visuele review: de review-subagent wordt geblokkeerd door de context-mode-hook | omgeving |
| O6 | `/api/version` meldt pakketversie `0.1.0`; ophogen naar 0.2.0 bij de release | agent |
| O7 | `maakrijk_dev` bijwerken: alleen na goedkeuring én aparte toestemming, met eerst een backup | gebruiker beslist |
| O8 | Oude git-stash `stash@{0}` (concept-screenshots RC 3) kan weg | gebruiker beslist |
| O9 | De backup van `maakrijk_preview` van vóór 0.2 staat alleen in de tijdelijke scratchpad van de sessie en is waarschijnlijk weg na een herstart | info |

## Volgende stap (in deze volgorde)

1. **Beslissing van de gebruiker over RC 5**
   - **Goedgekeurd:** merge `release/0.2-limonade-ronde` naar `main` (no-ff), zet de pakketversie op 0.2.0 (O6), tag `v0.2.0` en push. Vraag daarna **apart** toestemming voor `maakrijk_dev` (O7): eerst een backup, dan de API starten tegen dev. Er is geen migratie nodig: de API schrijft definitie v3 weg en zet oude spellen om.
   - **Feedback:** log die in `docs/releases/0.2/feedback-rc-5.md`, maak een feature- of fixbranch van de releasebranch, en lever RC 6 met dezelfde werkwijze.
2. **Verbeteren van de eerste versie** (de gebruiker wil "later verbeteren"): eerst W1–W4, daarna balans en gevoel van groei. Voorbeelden: meer niveaus en zichtbare veranderingen per upgrade, een tweede kraamplek, betere tikfeedback, geluid.
3. **Release 0.3** volgens `docs/build/release-plan.md` (bijgesteld na D13): sterren-ledger, progressie en hoofdstukken, roze limonade, meer upgrades in de wereld, balans-harness die de tijd tot elke upgrade meet.

## Weer opstarten

```bash
# Database (Postgres-container maakrijk-db-1, poort 5450) moet draaien.
scripts/build-web.sh preview && scripts/preview-api.sh        # preview op 8802
cd services/api && cargo test && cargo clippy --all-targets -- -D warnings
cd apps/web && npx vitest run && npx nuxt typecheck
scripts/build-web.sh e2e && (cd apps/web && npx playwright test --project=chromium)
```

## Afspraken die blijven gelden

- Elke release gaat op een releasebranch met feature-branches. Na elke RC wacht de agent op **expliciete** goedkeuring. Merge naar `main` en taggen gebeuren pas daarna.
- Een releasegoedkeuring is geen toestemming voor een datamigratie op `maakrijk_dev`. Vraag apart, en maak eerst een backup.
- Spelacties gebeuren door op objecten in de wereld te tikken, niet via knoppenpanelen (D12). De stijl is geïllustreerd vooraanzicht zoals `docs/design/` (D9). Teksten staan in taalbestanden (D11).
