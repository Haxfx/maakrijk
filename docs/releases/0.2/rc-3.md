# Release 0.2 limonade-ronde — RC 3

| | |
|---|---|
| Release | 0.2 limonadekraam: eerste ronde |
| RC | 3 |
| Releasebranch | `release/0.2-limonade-ronde` |
| Geteste code-commit | `6b4c278` (deze notitie en de screenshots staan in de commit erna; geen codewijziging) |
| Preview-URL | http://127.0.0.1:8802 |
| Database | `maakrijk_preview` (Postgres 16, container `maakrijk-db-1`, poort 5450) |
| Frontend | preview-build `apps/web/.output-preview/public`, commit `6b4c278`, contract 1 |
| Backend | `maakrijk-api` commit `6b4c278`, contract 1, migratie `20261105000002` (pakketversie meldt nog 0.1.0) |
| Datum | 2026-11-05 |

Mapping: `http://127.0.0.1:8802` → API op 8802 → `maakrijk_preview` → commit `6b4c278`. Controleer op http://127.0.0.1:8802/diagnose.

## Wat is er veranderd sinds RC 2

Feedback: `feedback-rc-2.md`. Besluit: D12 in `docs/build/decision-log.md`.

| Feedback | Wat er gedaan is | Branch |
|---|---|---|
| G1 Art style beter | Behouden | — |
| G2 Acties op de kraam zelf, niet als tekst met knopjes eronder | Het knoppenpaneel onder de wereld is weg. Je speelt door op de kraam te tikken: **kist** = citroen kopen, **suikerpot** (op de toonbank) = suikerklontje kopen, **pers** = limonade maken, **bordje aan de toonbank** = kraam open of dicht (rood = dicht, groen = open), **klant** = beker geven. Het volgende object pulseert en krijgt een pijl. Een geweigerde tik laat het object "nee" schudden en geeft een rustige uitleg. Tellers staan als badges op de objecten en verdwijnen als ze leeg zijn. Een voortgangsbalk staat boven de pers. Wachtende klanten hebben een tekstballon met een beker. | `feature/0.2-acties-in-wereld` |

Ook nieuw:
- Compactere opstelling rond de kraam, zodat de kraam op een telefoon ongeveer 50% groter is.
- Taalbestand bijgewerkt: tiklabels en doelen in `locales/nl/games/lemonade.ts`; oude knopteksten verwijderd.

Techniek: de gedeelde component `WorldHotspot` legt echte knoppen precies over de getekende objecten. Ze bewegen mee met slepen, zoomen en lopende klanten (`Stage.onRender`, `toScreen`). Toetsenbord en schermlezer werken, en tikdoelen zijn minimaal 48 px. Andere games kunnen dit hergebruiken. Er zijn geen wijzigingen aan spelregels, server of database.

## Uitgevoerde tests (op `6b4c278`)

| Test | Commando | Resultaat |
|---|---|---|
| Rust unit + API + conformance (`maakrijk_test`) | `cargo test` | 57 geslaagd (backend ongewijzigd sinds RC 2; gedraaid op `b085e49`) |
| Clippy | `cargo clippy --all-targets -- -D warnings` | 0 waarschuwingen (idem) |
| Frontend unit | `npx vitest run` | 25 geslaagd |
| Typecheck | `npx nuxt typecheck` | ok |
| Productiebuild | `scripts/build-web.sh e2e` en `preview` | ok |
| Playwright Chromium | `npm run e2e` | 27 geslaagd. Nieuw: hele ronde door te tikken, vroeg sluiten via het bordje, refresh tijdens maken en geweigerde tweede pers-tik, geweigerde tik schudt, bediening met toetsenbord, tikdoelen volgen zoom, alle objecten ≥ 48 px en zichtbaar op 390×844 en 844×390. Eén keer faalde `layout desktop` (spelersscherm, niet gewijzigd) onder volle belasting; die slaagde los en in twee volgende volledige runs |
| Playwright WebKit | — | **Niet uitgevoerd**: systeembibliotheken ontbreken |
| Scenario door de echte UI | Playwright-script tegen 8802, 6 runs | elke run: 3 tikken op de kist + 1 op de pot (12 → 8, citroen 3, suiker 1), refresh tijdens maken, dubbel tikken op een klant = één betaling, eind 16, overzicht 8 / 4 / 4 |

## Visuele review

**Niet onafhankelijk**: de review-agent is nog steeds geblokkeerd (de context-mode-hook wijzigt de aanroep). De review is gedaan door de bouwende agent.

| # | Bevinding | Ernst | Screenshot |
|---|---|---|---|
| W1 | Alle acties zitten op de kraam; er is geen knoppenpaneel | ok | `telefoon-1b-kopen.png`, `telefoon-3-klant.png` |
| W2 | De volgende stap is duidelijk (ring + pijl + doelkaartje) | ok | `telefoon-liggend-2b-klaar.png` |
| W3 | Telefoon portrait: bovenste ~40% is lucht | minor | `telefoon-3-klant.png` |
| W4 | Liggend tijdens het maken: de pijl naar het bordje overlapt de voortgangsbalk boven de pers | minor | `telefoon-liggend-2-maken.png` |
| W5 | Het doelkaartje gebruikt nog tekst ("Tik op de pers"); dat is bewust kort gehouden en staat in het taalbestand | info | alle |
| W6 | Een klant die nog binnenloopt is al tikbaar terwijl hij net buiten beeld is | nit | — |

Beperkingen: alleen Chromium met software-WebGL; geen echte telefoon of tablet; geen audio.

## Bekende beperkingen

- WebKit-tests niet gedraaid: acceptatiecriterium "Playwright groen in WebKit" is nog **open**.
- `/api/version` meldt pakketversie `0.1.0`.
- `maakrijk_dev` niet gemigreerd (pas na goedkeuring en aparte toestemming).
- Upgrades zitten in 0.3 en werken daar volgens hetzelfde principe: je tikt op het object.

## Migraties

Geen nieuwe sinds RC 1.

## Handmatige testlijst

Op http://127.0.0.1:8802 met een **nieuwe** speler "Limo-test-3". Elke stap verandert alleen de gegevens van die speler in `maakrijk_preview`.

| # | Stap | Verwacht |
|---|---|---|
| 1 | Limo-test-3 → Limonade → Spelen | Kraam in beeld, geen knoppen onderin; de kist pulseert met een pijl en een prijsje (1 munt) |
| 2 | Tik 3× op de kist | 9 munten; citroenen verschijnen in de kist, badge 3; daarna pulseert de suikerpot |
| 3 | Tik 1× op de suikerpot | 8 munten; klontje in de pot; de pers pulseert |
| 4 | Tik op de pers, ververs meteen | Voortgangsbalk boven de pers, pers wiebelt; na ~3 s is de kan vol (badge 4); geen tweede kan |
| 5 | Tik nog eens op de pers | Pers schudt, melding "Er zit nog limonade in de kan…"; niets verandert |
| 6 | Tik op het rode bordje aan de toonbank | Bordje wordt groen; klanten lopen naar de kassa, met een tekstballon met een beker |
| 7 | Tik twee keer snel op de voorste klant | +2 munten (10); klant loopt weg met een beker, munt springt naar de kassa |
| 8 | Tik op de overige klanten | 16 munten; "Ronde klaar!" 8 / 4 / 4 |
| 9 | "Volgende ronde"; tik 5× op de suikerpot | Na 4 klontjes schudt de pot: "Zoveel past er niet in je voorraad"; saldo verandert niet bij de weigering |
| 10 | Speel met Tab + Enter (toetsenbord) | Gele focusrand op het object; Enter voert de actie uit |
| 11 | Zoom en sleep in de wereld | De tikplekken blijven op de objecten |

## Feedback koppelen

Noem het stapnummer of de bevindingcode (bijv. "W4") plus: bug, visueel, onduidelijk of nieuwe scope. Over een object: noem het (kist, pot, pers, bordje, klant).
