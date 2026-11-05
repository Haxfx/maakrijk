# Maakrijk — releaseplan (voorstel)

Status: goedgekeurd door gebruiker 2026-11-05 (0.1–0.3 in detail; latere releases worden vóór start opnieuw voorgelegd). Releases 0.1–0.3 zijn volledig uitgewerkt. Latere releases zijn een richting; ze worden uitgewerkt en opnieuw ter goedkeuring voorgelegd voordat ze starten.

## Werkwijze per release

- Branch `release/<nr>-<naam>` vanaf `main`, features op `feature/<nr>-<naam>`.
- Per release candidate: `docs/releases/<release>/rc-<n>.md` met commit-hash, tests, screenshots, testlijst.
- Stop na elke RC tot expliciete goedkeuring. Geen push, tag of merge naar `main` zonder toestemming.
- Testen per RC: `cargo test`, `cargo clippy --all-targets -- -D warnings`, API-tests tegen `maakrijk_test`, Vitest, `nuxi typecheck`, productiebuild, Playwright (Chromium; WebKit vanaf 0.2).
- Viewports bij visuele review: 390×844, 844×390, 768×1024, 1366×768; plus grote tekst en reduced motion.
- Poorten en databases: zie `decision-log.md` D7. Niets in `~/mym`, `~/kiddos` of `vgk`.

---

## Release 0.1 — platform-basis

**Doel.** Een draaiende, testbare basis: repo-structuur, Rust-API, Nuxt-shell, eigen database, spelers aanmaken en kiezen.

**Gebruikerswaarde.** Een ouder kan het spel openen, een kind toevoegen met bijnaam en avatar, het kind kiezen en het (lege) startscherm zien. Na refresh is alles er nog.

**Features (één featurebranch per regel).**
1. `feature/0.1-repo-basis` — Monorepo: `services/api` (Rust 1.88, Axum, SQLx, Tokio, tracing), `apps/web` (Nuxt 4 SPA, Vue 3, strict TS, Pinia, Tailwind), `docker-compose.yml` (Postgres 16 op 5450), `.env.example`, `.gitignore` (geen `.env`, buildoutput, dumps), README met start- en testcommando's.
2. `feature/0.1-dev-preview` — Scripts voor dev en preview met eigen DB en buildmap; poortcontrole vóór start; `GET /api/version` (api-versie, commit, contractversie, migraties, DB-naam) en `/diagnose`-pagina; rode banner bij contractverschil.
3. `feature/0.1-huishouden-profielen` — Migratie `households`, `profiles`, `auth_sessions`. Anoniem huishouden; token als HttpOnly-cookie én via `Authorization`-header (D4); alleen hash opgeslagen. API: profielen lijst/aanmaken/wijzigen/verwijderen; invoerlimieten (bijnaam 1–20 tekens, max 8 profielen), gestructureerde foutcodes, CSRF-bescherming voor cookie-requests.
4. `feature/0.1-shell-ui` — Designtokens (`01` §5), kopbalk, onderste navigatie (C4), spelerselectie, startscherm "Mijn bedrijfjes" (zonder sterrentotaal: dat komt pas met de echte ledger in 0.3), instellingen (minder beweging, grote tekst; lokaal per apparaat), centrale Nederlandse teksten.
5. `feature/0.1-openapi` — `utoipa`-contract, export naar `contracts/openapi.json`, gegenereerde TS-types, check dat ze actueel zijn.

**Afhankelijkheden.** Geen. Docker en Rust/Node zijn aanwezig.

**Acceptatiecriteria.**
- `docker compose up -d db`, API en web starten met de README-commando's op een schone machine-checkout.
- Profiel aanmaken, kiezen, hernoemen en verwijderen werkt via de echte UI en API; verwijderen vraagt bevestiging.
- Na refresh en na herstart van de API blijft de keuze en lijst bestaan.
- Een tweede browser (ander huishouden) ziet de profielen niet; API geeft 401/404 op een vreemd profiel-ID.
- Te lange bijnaam of 9e profiel geeft een begrijpelijke melding en verandert niets.
- `/diagnose` toont frontendbuild, backendbuild en contractversie; een opzettelijk verschil toont de banner.
- Werkt bij 390×844 t/m 1366×768 zonder overlap; touchdoelen ≥ 48 px; grote tekst breekt de layout niet.
- Alle tests groen; clippy zonder waarschuwingen.

**Migraties.** Eerste migratie (`households`, `profiles`, `auth_sessions`). Alleen op `maakrijk_*`-databases.

**Handmatig testscenario.**
1. Open de dev-URL. Verwacht: spelerselectie met "Nieuwe speler".
2. Maak "Testkind A" met een avatar. Verwacht: profiel verschijnt. *Wijzigt gegevens in `maakrijk_dev`.*
3. Maak "Testkind B". Kies A. Verwacht: startscherm met "Hoi Testkind A!", lege bedrijfjeslijst zonder "binnenkort"-tekst.
4. Refresh. Verwacht: nog steeds A geselecteerd.
5. Open een privévenster. Verwacht: geen profielen zichtbaar.
6. Probeer een bijnaam van 25 tekens. Verwacht: melding, niets opgeslagen.
7. Verwijder B met bevestiging. Verwacht: B weg, A blijft.
8. Zet "Grote tekst" aan. Verwacht: grotere tekst, geen overlap.
9. Open `/diagnose`. Verwacht: drie versies zichtbaar en gelijk.

**Buiten scope.** Spelwereld, munten, sterren, hoofdstukken, ouderpoort, audio, PWA, iOS-shell.

---

## Release 0.2 — limonadekraam: eerste ronde

**Doel.** Eén complete limonaderonde op de gedeelde platformkern, in een Three.js-wereld.

**Gebruikerswaarde.** Het kind koopt citroenen en suiker, maakt een kan, opent de kraam, geeft klanten een beker en ziet verkocht / materialen / over. Na refresh gaat het spel verder waar het was.

**Features.**
1. `feature/0.2-command-pipeline` — `game_instances`, `game_snapshots` (getypeerde, versiegebonden JSONB), `game_commands` (command-ID, payloadhash, antwoord, bewaartermijn vastgelegd). Lock per instantie, servertijd na lock, lazy settlement, statusversie + events in antwoord. Zelfde ID + andere payload = conflict.
2. `feature/0.2-economy-ledger` — `economy_transactions` per instantie: signed integer, `kind`, unieke `reference`, `command_id`, `balance_version`. Saldo-cache die bij elke commit tegen de ledger wordt gecontroleerd; saldo ≥ 0 via constraint.
3. `feature/0.2-scenario-manifest` — `scenario_definitions` (onveranderlijk, hash). Manifest-schema (`05` §4) en validator; limonade-manifest v1 met balans uit `03` §5 (start 12, citroen 1, suiker 1, 3 citroen + 1 suiker → kan van 4 bekers, beker 2 munten).
4. `feature/0.2-inventory-processor` — Gedeelde inventory (beschikbaar/gereserveerd/in productie), Processor (kan maken, 2–6 s), ServicePoint (klanten). Geen negatieve voorraad.
5. `feature/0.2-limonade-regels` — Commando's `buyStock`, `makeJug`, `openStand`, `serveCustomer`, `closeRound`. Klanten wachten rustig; betaling alleen bij bediende klant, één keer per klant-ID. Restvoorraad blijft voor de volgende ronde. Vastlooppreventie: start altijd haalbaar.
6. `feature/0.2-three-stage` — Gedeelde stage: orthografische camera, "Alles bekijken", pan/zoom (begrensd), één render-loop die pauzeert bij verborgen tab, dispose bij navigeren, reduced motion = alleen tekenen bij verandering, WebGL-fallback met duidelijke melding.
7. `feature/0.2-limonade-wereld` — Kraam, kratten, suikerpot, pers/kan, klanten, kassa in flat-shaded low-poly; DOM-overlay voor tellers, doelkaart en "Geef een beker". Animaties volgen server-events; tellers volgen serverstatus.
8. `feature/0.2-rondeoverzicht` — "Bestelling klaar"-scherm met verkocht / materialen / over (`03` §3, design `239d…`).
9. `feature/0.2-conformance-v1` — Gedeelde testsuite: start, volledige keten, hervatten, retry, dubbelklik, twee gelijktijdige requests, ledger = saldo na elke stap, geen negatieve voorraad.

**Afhankelijkheden.** 0.1.

**Acceptatiecriteria.**
- Volledige ronde via de echte UI tegen Rust/Postgres; saldo en voorraad kloppen na elke actie (getest per tussenstand, niet alleen eindsaldo).
- Dubbelklik, netwerk-retry en twee tabbladen: maximaal één betaling per klant en één aankoop per command-ID.
- Refresh tijdens het maken van een kan: kan is daarna klaar of nog bezig volgens servertijd; geen dubbele kan.
- Geen geld of voorraad via een animatie-event.
- Wereld en "Geef een beker" tegelijk zichtbaar op 390×844 en 844×390.
- Playwright groen in Chromium én WebKit.

**Migraties.** `game_instances`, `game_snapshots`, `game_commands`, `economy_transactions`, `scenario_definitions`. Eerst op `maakrijk_test` en `maakrijk_preview`; op `maakrijk_dev` na het testen.

**Handmatig testscenario.** Met een nieuw testprofiel "Limo-test": kraam starten (saldo 12) → 3 citroenen + 1 suiker kopen (saldo 8) → kan maken (wacht ~3 s, kan = 4) → kraam openen → 4 klanten een beker geven (saldo 16) → overzicht: verkocht 8, materialen 4, over 4. Tussendoor: refresh tijdens het maken; dubbel tikken op "Geef een beker"; tweede tabblad openen en daar bedienen.

**Buiten scope.** Upgrades, winkelcatalogus, hoofdstukken, sterren, roze limonade, audio.

---

## Release 0.3 — limonadekraam groeit

**Doel.** Gedeelde winkel en upgrades, sterren-ledger en progressiemotor, eerst toegepast op limonade.

**Gebruikerswaarde.** Het kind spaart voor een grotere kan, ziet vooraf wat hij doet, koopt hem en ziet de kraam veranderen. Een hoofdstuk wordt afgerond met sterren; daarna komt roze limonade vrij.

**Features.**
1. `feature/0.3-catalogus` — Catalogus per scenario (`02` §2): categorie, prijs, maximum, voorwaarden, effecten. Server berekent beschikbaarheid met reden.
2. `feature/0.3-upgrade-aankoop` — Atomaire aankoop (+ plaatsing waar nodig), effectvolgorde base → add → multiply → limiet (`05` §7). Grotere kan (12), voorraadrek (16), extra bereidingsplek (24). Geen terugverkoop; vooraf gemeld. Reserve voor lopende ronde.
3. `feature/0.3-upgrade-preview` — Voor → na met getallen, saldo en prijs (design "Grotere kan"), concrete reden als iets niet kan.
4. `feature/0.3-sterren-ledger` — `profile_star_transactions`, uniek op profiel + achievementKey; totaal = som. Sterren in kopbalk en startscherm.
5. `feature/0.3-progressie` — `game_progress`, `progress_tasks`, `reward_grants` (grantedAt/seenAt). Taken met scope en baseline. Limonade hoofdstuk 1 en 2 (`04` §3); daarna "Je bedrijf groeit verder".
6. `feature/0.3-groeipad` — Groeipad-scherm en doelkaart met echte voortgang; samengevoegde beloningssamenvatting.
7. `feature/0.3-roze-limonade` — Recept vrijgespeeld via beloning.
8. `feature/0.3-balans-harness` — Deterministische simulatie met dezelfde Rust-regels, CSV per stap (`03` §9); meet rondes tot eerste upgrade.

**Acceptatiecriteria.** Eén geslaagde en één geweigerde aankoop per categorie; dubbele aankoop onmogelijk; upgrade verandert aantoonbaar capaciteit; hoofdstuk precies één keer afgerond, ook bij gelijktijdige requests; ongeziene beloning verschijnt na refresh zonder opnieuw toegekend te worden; aankoop verlaagt munten, nooit sterren.

**Migraties.** Catalogus/aankopen, sterren-ledger, progressietabellen.

**Handmatig testscenario.** Uitgewerkt in de RC; kern: twee rondes spelen, grotere kan kopen, kan van 8 zien, hoofdstuk 1 afronden met +10 en +5 sterren in één overzicht, refresh vóór sluiten van de dialoog.

**Buiten scope.** Andere modi, builder, decoratie, ouderpagina.

---

## Latere releases (richting, nog niet ter goedkeuring)

| Release | Doel | Toetst platform op |
|---|---|---|
| 0.4 vriendjes-ranglijst | Groep koppelen met code (ouderpoort), ranglijst op sterren alleen binnen de groep (D10) | Sterrenledger, autorisatie tussen huishoudens |
| 0.5 boerderij-wortels | Akker, tractor, wassen/verpakken, orders; extra akker en tweede tractor; hoofdstukken 1–3 | Source, Vehicle, unieke reserveringen, meerdere bronnen |
| 0.6 boerderij-melk | Koe verzorgen, melkketen, hoofdstukken 4–8 | CareState zonder afwezigheidsstraf, samengestelde ketens |
| 0.7 speelgoedfabriek | Auto + 4 wielen + doos, werkbanken, lift, tweede verdieping | Samengestelde recepten, parallelle werkplekken, één inventaris per lading |
| 0.8 builder-sandbox | Template openen, akker/tractor/route toevoegen, valideren, testspelen | Zelfde runtime, sandbox zonder campagnebeloning |
| 0.9 plantenkraam | Eén plant, kas | Nieuw scenario zonder wijziging aan gedeelde systemen (`05` §16) |
| 0.10 armbandjesatelier | Patroon volgens klantwens | Scenario-eigen regel via rules-interface |
| 0.11 ouders en afronding | Ouderpagina, resetbeleid, audio, PWA | — |
| 0.12 iOS-shell | Capacitor/WKWebView-build, test op echt apparaat, Kids-categorie-checklist | Auth via header, WebGL op iOS |

Een vroege iOS-spike (één scherm in een shell op een echt apparaat) kan na 0.2 worden ingevoegd als je dat risico eerder wilt afdekken.
