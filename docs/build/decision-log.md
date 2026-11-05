# Maakrijk — beslissingen

Per beslissing: context, besluit, gevolg, status. Nieuwste onderaan. Status "Voorstel" betekent: wacht op goedkeuring van de gebruiker.

## D1 — Opnieuw bouwen in ~/maakrijk
**Context.** `00` §Opdracht noemt `~/mym` als repository en `01` §2 zegt dat spelers niets verliezen. `~/mym` is een werkende app zonder remote; `~/maakrijk` is nieuw en gekoppeld aan GitHub.
**Besluit.** Gebruiker, 2026-11-05: opnieuw beginnen in `~/maakrijk`. `~/mym` is alleen referentie.
**Gevolg.** Spelers en voortgang uit `vgk` gaan niet mee; `~/mym` blijft apart speelbaar. Broodwerelden en remixes (`01` §3) worden niet overgenomen. "Bestaande functies aanpassen" (`00` M1) geldt voor code in `~/maakrijk`.
**Status.** Besloten.

## D2 — Niet-gecommitte wijzigingen in ~/mym negeren
**Context.** 15 gewijzigde en ~10 nieuwe bestanden van 2026-10-28 in `~/mym`.
**Besluit.** Gebruiker: negeren. Niets in `~/mym` wordt gewijzigd, gecommit of gestart.
**Status.** Besloten.

## D3 — Three.js voor de spelwerelden
**Context.** `01` §5 noemt SVG/Vue als standaard en flat 2D als stijl. De gebruiker wil Three.js voor de games.
**Besluit.** Gebruiker: Three.js. Uitwerking (voorstel): orthografische camera, flat-shaded low-poly modellen in de kleuren van `01` §5, DOM-overlay voor tekst, tellers en knoppen, SVG/DOM voor menu's, kaarten en iconen. De wereld krijgt een toegankelijke DOM-actie per interactief object (`05` §12).
**Gevolg.** De designs zijn geschilderde illustraties; in code getekende primitieven benaderen die stijl maar halen hem niet. Art-pipeline (glTF-modellen, licenties) is een aparte beslissing (D9). WebGL-prestaties op iPhone/iPad moeten op echte apparaten worden gemeten.
**Status.** Besloten (richting); uitwerking voorstel.

## D4 — iOS App Store als latere doelplatform
**Context.** Gebruiker: testen in de browser, later draaien op iOS en in de App Store.
**Besluit (voorstel).**
- Nuxt als statische SPA (`ssr: false`), zodat dezelfde build in een native shell past (Capacitor of eigen WKWebView-app; keuze bij de iOS-release).
- Authenticatie via een sessietoken dat zowel als HttpOnly-cookie (web, same-origin) als via `Authorization`-header (native shell) kan worden aangeboden. Server valideert beide op dezelfde manier. Geen afhankelijkheid van `SameSite=Strict` alleen.
- API-basis-URL configureerbaar; geen relatieve `/api` hard-coded in de client.
- Vanaf de eerste wereld-release ook Playwright met WebKit draaien als benadering van Safari/WKWebView.
- Geen externe trackers, analytics of advertentie-SDK's (Apple Kids-categorie). Externe links en ouderfuncties achter een ouderpoort.
- Assets lokaal bundelen; geen CDN-afhankelijkheid tijdens het spelen.
**Gevolg.** Kleine extra moeite in R0.1 (tokenmodel), voorkomt later een herbouw van auth. Echte App Store-indiening valt buiten de eerste releases.
**Status.** Voorstel.

## D5 — Modulaire monoliet met gedeelde pipeline en ledgers
**Context.** `05` §2–3, en de duplicatie in `~/mym` (drie engines, drie ledgers).
**Besluit (voorstel).** Eén Rust-crate `services/api` met modules `platform` (commands, tijd, opslag, auth), `systems` (inventory, economy, orders, objects, upgrades, progression, stars) en `scenarios/<id>`. Eén `game_commands`, één `economy_transactions` per instantie, één `profile_star_transactions`. Scenario-state als getypeerde, versiegebonden JSONB-snapshot per instantie.
**Status.** Voorstel.

## D6 — Platform groeit mee met verticale slices
**Context.** `05` §1: geen maandenlang frameworkproject. `06`: één verticale slice.
**Besluit (voorstel).** Limonade is de eerste slice en dwingt de core af (commands, ledger, inventory, processor, service point, orders). Boerderij toetst daarna voertuigen en meerdere bronnen. Abstracties worden pas gedeeld als het tweede scenario ze nodig heeft.
**Status.** Voorstel.

## D7 — Poorten en databases
**Context.** In gebruik of gereserveerd: 5433 (aven), 5434 (kiddos), 5440/8790/8791/8792/3010/3011 (mym).
**Besluit (voorstel).** Eigen Compose-project `maakrijk`, Postgres 16 op `127.0.0.1:5450`. Databases: `maakrijk_dev`, `maakrijk_preview`, `maakrijk_test`. API dev `8800`, preview `8802`, e2e `8801`. Nuxt dev `3020`, preview `3022`. Buildoutput per target in een eigen map. Poorten worden voor elke start gecontroleerd.
**Status.** Voorstel.

## D8 — Documentconflicten en keuzes
| # | Conflict | Bronnen | Keuze (voorstel) |
|---|---|---|---|
| C1 | Startscherm toont 6 bedrijfjes met "Beginnen", ook backlog-modi | design `9fba…` vs `04` §3 en §8 ("pas zichtbaar als inhoud werkt", geen "binnenkort") | Alleen werkende modi tonen. Spec wint. |
| C2 | "Samen groeien" rangschikt kinderen op sterren | design `f4b8…` vs `01` §2 (geen druk) | Besloten door gebruiker (2026-11-05): ranglijst alleen met gekoppelde vriendjes/vriendinnetjes, zie D10. Geen globale ranglijst. |
| C3 | Prijzen in designs (tractor 50, opslag 30) | design `239d…` vs `03` §6 (tweede tractor 28) | Spec wint; designbedragen zijn voorbeeld. |
| C4 | Onderste nav-labels verschillen per design (Dorp / Mijn bedrijfjes / Spelen) | alle designs | Voorstel: "Mijn bedrijfjes", "Bouwen", "Mijn sterren". |
| C5 | Limonade "Hoofdstuk 2 · 2/6" en boerderij "4/8" | design `f4b8…` vs `04` §3 (5 resp. 8 hoofdstukken) | Spec wint; telling uit definities. |
| C6 | Gap-document pad `docs/implementation-gap.md` | `00` vs opdracht gebruiker (`docs/build/`) | Opdracht gebruiker. |
| C7 | SVG als standaard | `01` §5 vs gebruiker | Three.js (D3). |
| C8 | Behoud broodwerelden, bestaande spelers | `01` §2–3 vs D1 | D1 geldt; vervalt. |

## D9 — Art-pipeline (open)
**Context.** De designs zijn geschilderd; modellen uit code-primitieven (zoals in `~/mym`) halen dat niveau niet.
**Opties.** (a) Modellen in code, flat-shaded; (b) glTF-modellen uit Blender, zelf gemaakt; (c) CC0-pakketten (bijv. Kenney, Quaternius) als basis. Licenties per asset vastleggen.
**Voorstel.** Start met (a) voor R0.2 om de techniek te bewijzen; beslis vóór R0.3 over (b) of (c).
**Update 2026-11-05 (feedback RC 1, F1).** De gebruiker vindt de low-poly 3D-stijl "totaal niet passend" bij de designs. Uitgevoerd in `fix/0.2-art-stijl`:
- Three.js blijft (D3), maar de limonadewereld is een geïllustreerd vooraanzicht zoals het design: een `front`-projectie in de gedeelde stage en platte sprites (`apps/web/app/game/sprites.ts`).
- Art: zelf getekende SVG-illustraties (`scripts/art/lemonade.mjs` → `apps/web/public/art/lemonade/`), per game in een manifest (`LEMONADE_ART`). Elke afbeelding is later te vervangen door een geschilderde PNG zonder codewijziging.
- De isometrische projectie blijft beschikbaar voor werelden die dat beter past (bijv. boerderij-plattegrond).
**Status.** Besloten voor 0.2 (vooraanzicht + vector-sprites). Open: of de gebruiker later geschilderde PNG's aanlevert.

## D10 — Vriendjes-ranglijst via koppelcode
**Context.** C2. Gebruiker, 2026-11-05: een ranglijst die je kunt inzien met kinderen die dezelfde code gebruiken om te koppelen. Niet met alle gebruikers, alleen vriendjes en vriendinnetjes.
**Besluit.** Ranglijst op spelerssterren, alleen binnen een vriendengroep die via een gedeelde code is gekoppeld. Geen globale of openbare ranglijst, geen zoekfunctie naar andere spelers.
**Uitwerking (voorstel, te bevestigen bij het detailleren van de release).**
- Een groep heeft een korte, willekeurige code (niet raadbaar, verloopbaar, intrekbaar).
- Koppelen en ontkoppelen achter de ouderpoort. Een ouder kan het eigen kind altijd uit een groep halen.
- Zichtbaar voor groepsleden: alleen bijnaam, avatar en sterrentotaal. Geen bedrijfsgegevens, geen chat of berichten.
- Maximale groepsgrootte (voorstel 12). Rate limiting op het invoeren van codes.
- Toon: "Iedereen groeit op zijn eigen manier"; geen negatieve labels voor de laatste plek.
**Gevolg.** Eerste functie die gegevens tussen huishoudens deelt. Nodig: privacybeoordeling (AVG voor minderjarigen) vóór publieke release, en toetsing aan Apple's Kids-categorie-regels. Hangt af van de sterrenledger (0.3).
**Status.** Besloten (scope); uitwerking voorstel. Gepland als release 0.4.

## D11 — Taalbestanden per game
**Besluit (gebruiker, 2026-11-05).** Alle zichtbare teksten staan in taalbestanden, zodat woorden per game later aan te passen zijn zonder code te wijzigen.
- `apps/web/app/locales/nl/common.ts`: app, spelers, instellingen, platformfouten en gedeelde game-core-weigeringen.
- `apps/web/app/locales/nl/games/<game>.ts`: teksten en weigeringscodes van één game.
- `apps/web/app/locales/nl/index.ts` voegt ze samen tot `t`; componenten importeren alleen `~/locales/nl`.
- Test `tests/unit/texts.test.ts` bewaakt: geen lege teksten, elke contract-weigeringscode heeft tekst, een game overschrijft geen gedeelde sleutels.
**Status.** Besloten, gebouwd in 0.2 (`feature/0.2-taalbestanden`).

## D12 — Acties gebeuren in de wereld, niet in een knoppenpaneel
**Besluit (gebruiker, 2026-11-05, feedback RC 2 G2).** "De activiteiten, upgrades en acties vanuit de user moeten op de kraam zelf gebeuren en niet als tekst eronder met een knopje."
- De speler tikt op het object zelf: kist (citroen kopen), suikerpot (suiker kopen), pers (limonade maken), bordje aan de toonbank (kraam open/dicht), klant (beker geven).
- Er is geen actiepaneel onder de wereld. Tellers staan als kleine badges op de objecten; het doelkaartje wijst de volgende stap aan, plus een pulserende ring en een pijl op het object.
- Techniek: de gedeelde component `WorldHotspot` legt echte DOM-knoppen precies over de getekende objecten. De stage meldt elk getekend frame (`onRender`, `toScreen`), dus de knoppen bewegen mee met pan, zoom en lopende klanten. Toetsenbord, schermlezer (label per object) en tikdoelen ≥ 48 px blijven daardoor werken (`05` §12).
- Wijkt af van het design (`f4b89fd1…`), dat een knop "Geef een beker" onder de wereld toont. De gebruiker gaat voor.
- Upgrades volgen hetzelfde principe: je tikt op het object dat je wilt verbeteren (sinds D13 al in 0.2).
**Status.** Besloten, gebouwd in `feature/0.2-acties-in-wereld`.

## D13 — Limonade wordt een clicker
**Context (gebruiker, 2026-11-05, na RC 3).** "Snap je het concept van de cookie clicker? Dat is in feite ook hoe ik de game wil bouwen hiermee." Daarna: "pas ook de documenten aan waar nodig en ga door met bouwen."
**Besluit.** De kern van elk spel is tikken om te verdienen, verdiensten investeren in upgrades en automatisering, passief inkomen en stijgende prijzen. Eerst in limonade (0.2 RC 4). Gekozen standaarden (de gebruiker heeft hier niet expliciet over beslist; aan te passen bij feedback):
- **Materialen blijven, maar automatisch.** Elke nieuwe kan boekt de ingrediënten af. Zo blijft "verkocht / materialen / over" (de leerdoelen uit `03` §3) zichtbaar in de kassa.
- **Klanten blijven als beeld.** Per verkochte beker loopt een kind naar de kassa en weer weg. Ze zijn decoratie; geld komt alleen uit de server.
- **Doorverdienen bij afwezigheid: maximaal 2 uur.** Past bij `03` §8 (geen onbeperkte achtergrondwinst); "Welkom terug" toont wat de hulpjes verdienden.
- **0.2 wordt omgebouwd, niet 0.3.** RC 3 was niet goedgekeurd. De rondemechaniek van RC 1–3 vervalt; bestaande spellen worden bij het eerste gebruik omgezet (voorraad terug in munten, kan blijft).
- **Upgrades op het object (D12).** Pijltje op de pers, bordje "hulp gezocht", plantje dat een citroenboom wordt. Tikken opent een kaart (nu → straks, prijs, saldo, "Verbeteren").
- **Tikken eerlijk op de server.** De client telt direct mee en bundelt tikken; de server beperkt tot 12 per seconde en bepaalt de waarde.
**Gevolg.** Contract 0.2 §4–§6 herschreven (manifest v2, commands `tap`, `buyUpgrade`, `collect`). Platform: `Ruleset::upgrade` voor oudere rulesetversies; `GET` mag afrekening in het geheugen tonen. `03` §5a, §6, §7, §8 bijgewerkt. Releaseplan 0.2/0.3 bijgesteld.
**Status.** Besloten (concept); standaarden ter beoordeling in RC 4.
