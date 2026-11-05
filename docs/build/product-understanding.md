# Maakrijk — productbegrip

Status: inspectie 2026-11-05. Dit document beschrijft wat we bouwen, niet wat al werkt. Wat al werkt staat in `implementation-gap.md`.

## 1. Productdoel

Maakrijk is een Nederlandstalig, uitbreidbaar educatief gameplatform. Kinderen zetten kleine bedrijfjes op, laten ze groeien en verbeteren ze. Elk bedrijfje is een scenario op hetzelfde platform. Een scenario is geen losse app.

Geld verdienen is een middel. Maken, plannen, verzorgen, kwaliteit en durven proberen zijn even belangrijk (`01` §1).

## 2. Doelervaring voor het kind

- Eén duidelijk doel tegelijk, in een doelkaart met echte voortgang ("Oogst 8 wortels · 4/8").
- De wereld staat centraal. Weinig tekst, veel zichtbare handelingen: een schenkstraal, rijdende tractor, sluitende doos.
- Groei is zichtbaar. Een upgrade verandert de wereld en de capaciteit, niet alleen een getal.
- Geen straf: geen boze klanten, geen bederf of lijdende dieren bij afwezigheid, geen geldverlies door een fout rekenantwoord.
- Geen advertenties, echte aankopen, publieke chat of dagelijkse verplichtingen.
- Een kind kan nooit vastlopen: een upgrade mag het werkkapitaal voor de lopende order niet opeten (`03` §7).

## 3. Schermen en spelmodi

### Schermen (`01` §4, designs)
| Scherm | Inhoud |
|---|---|
| Spelerselectie | Bijnaam en avatar, geen gevoelige gegevens |
| Start ("Mijn bedrijfjes" / "Wat ga jij maken?") | Bedrijfkaarten met voortgang, één sterrentotaal |
| Spel | Wereld centraal, compact muntsaldo, één doelkaart, contextacties onderaan |
| Bouwen / winkel | Verbeteren, uitbreiden, versieren; preview met voor/na en saldo |
| Groeipad | Afgerond, huidig en volgend hoofdstuk op een pad |
| Bestelling klaar | Verkocht / materialen / over, plus samengevoegde beloning |
| Builder | Catalogus, plaatsing met raster, routes, valideren, opslaan, testspelen |
| Instellingen | Muziek, geluidjes, minder beweging, grote tekst, hulp |
| Ouderpagina | Voortgang, audio, gegevens verwijderen, "Probeer het samen"-kaarten |

### Spelmodi (`01` §3)
| Modus | Kern | Status |
|---|---|---|
| Limonadekraam | Recept, voorraad, kan maken, klanten bedienen | Kern |
| Boerderij | Akkers, tractoren, verwerking, soep, melkketen | Kern |
| Speelgoedfabriek | Auto + 4 wielen + doos, werkbanken, lift | Kern |
| Plantenkraam | Zaad → pot → groei → order | Architectuurproef |
| Armbandjesatelier | Patroon volgens klantwens | Proef scenario-eigen regel |
| Fietswasplek, speelgoedwinkel, cadeauatelier, spellenmakerij | — | Backlog, niet tonen |

## 4. Gedeelde platformsystemen (`05`)

Vier lagen in één Rust-service (modulaire monoliet):

1. **Platform core**: identiteit, autorisatie, commandpipeline, idempotentie, servertijd, transacties, statusversies, definitieversies, observability. Kent geen limonade of koeien.
2. **Gedeelde domeinsystemen**: inventory, economy (munten-ledger per instantie), objects + capabilities (Source, Processor, Storage, Vehicle, ServicePoint, ConstructionSlot, CareState), logistics, orders, upgrades (data-effecten), progression (hoofdstukken, taken met scope/baseline), rewards, stars (één spelersbrede ledger), placement.
3. **Scenario-modules**: versiegebonden manifest plus begrensde Rust-regels via een compile-time registry. Geen SQL of eigen transacties.
4. **Presentatie**: één Nuxt-shell, registry `scenarioId → presentatiemodule/assetpack`, Three.js-wereld, DOM voor alles wat je leest of indrukt.

Commandpipeline: HTTP → autorisatie → idempotentie + lock → tijd afwikkelen → validatie → platform- of scenariocommando → events → progressie/beloningen → opslag → antwoord. Rust beslist geld, voorraad, orders, aankopen en beloningen. De client stuurt alleen intenties.

## 5. Visuele uitgangspunten

### Wat de designs laten zien (bekeken in `docs/design/`, 3 bestanden)
- **Stijl**: warme, geschilderde flat illustratie, lichte 3/4- of isometrische blik van boven. Afgeronde vormen, herkenbare silhouetten, groene omgeving, zachte schaduw.
- **Kleuren**: donker petrol/teal kopbalk, crème panelen, turquoise pilknoppen, goud voor munten en sterren. Komt overeen met de tokens in `01` §5 (`#FFF7E8`, `#FFFCF5`, `#243C40`, `#167D8D`, `#5B963F`, `#F2BB45`).
- **Kopbalk**: terugpijl of avatar, titel ("Luca's Boerderij"), rechts munten of sterren, tandwiel.
- **Doelkaart**: linksboven over de wereld, met icoon, doeltekst en teller of balk.
- **Primaire actie**: grote turquoise knop onderaan ("Geef een beker", "Bouwen", "Verbeteren", "Plaatsen"). Secundair: omlijnde knop ("Annuleren", "Bewaren voor later").
- **Onderste navigatie**: drie tabs met icoon (huis/spel, hamer, ster).
- **Bouwen**: onderste lade met objectkaarten (icoon, naam, prijs), groene footprint met vinkje op een raster in de wereld, "Annuleren" / "Plaatsen".
- **Upgradepreview**: voor → na met getallen ("4 bekers → 8 bekers"), één zin effect, prijs en huidig saldo naast elkaar.
- **Groeipad**: ronde medaillons op een kronkelpad, vinkjes voor afgerond, huidig doel onderaan met balk.
- **Uitbreidingsplek**: gestippelde rechthoek met "+" in de wereld.
- **Fabriek**: doorsnede van een gebouw met twee verdiepingen en een lift.
- **Ouder/samen**: "Probeer het samen"-kaart met materialen en twee knoppen.

### Afgesproken render-richting
Three.js voor de spelwerelden (besluit gebruiker, zie `decision-log.md` D3). Stijl: orthografische camera, flat/zacht belichte low-poly modellen die de geschilderde designs benaderen. DOM-overlay voor tellers, doelkaart, knoppen en panelen. Touchdoelen ≥ 48 CSS-px, tikalternatief voor slepen, geen hover-acties, "Alles bekijken" en handmatige zoom/pan, camera beweegt niet vanzelf.

### Wat ik niet kon vaststellen
- Responsive gedrag: de designs zijn losse mobiel-achtige panelen plus één desktop-startscherm. Er is geen tablet- of landscape-ontwerp.
- Animaties: alleen af te leiden uit statische beelden.

## 6. Belangrijkste beperkingen

- **Stack**: Rust (Axum, SQLx, Tokio), Nuxt/Vue 3 strict TS, Pinia, Tailwind, PostgreSQL, Three.js. Geen Redis, microservices of broker.
- **Geld**: gehele munten, append-only ledger, unieke referenties, saldo nooit negatief, ledger reconstrueert saldo.
- **Sterren**: één ledger per profiel, uniek op `profileId + achievementKey`, niet besteedbaar.
- **Idempotentie**: zelfde command-ID + payload → zelfde antwoord; andere payload → conflict.
- **Geen** voorraad of betaling op basis van animation-end; geen tweede simulatie in TypeScript.
- **iOS App Store later** (besluit gebruiker, D4): de web-app moet als native shell (bijv. Capacitor/WKWebView) te verpakken zijn. Gevolgen: statische SPA-build, API op een andere origin dan de app, geen afhankelijkheid van same-origin cookies, Kids-categorie-regels (geen tracking, ouderpoort voor externe links), WebGL-prestaties in WKWebView.
- **Privacy**: alleen bijnaam en avatar; geen namen, e-mail, foto's, locatie. Publieke release vereist aparte privacy-/juridische review.
- **Gegevensveiligheid**: aparte dev- en previewdatabase; nooit iets in `~/mym`, `~/kiddos` of de database `vgk` wijzigen.

## 7. Gelezen en bekeken

### Maakrijk (`~/maakrijk`)
| Bestand | Rol |
|---|---|
| `docs/00-START-HIER.md` | Index, prioriteit bij conflicten, mijlpalen M0–M5 |
| `docs/01-PRODUCT-EN-ARCHITECTUUR.md` | Visie, schermen, stijl, stack, commandverwerking |
| `docs/02-WINKELS-EN-BUILDER.md` | Twee winkels, catalogus, aankoopflow, orders, builder |
| `docs/03-BALANS-EN-ECONOMIE.md` | Munten vs sterren, ledger, startwaarden, upgrades |
| `docs/04-PROGRESSIE.md` | Hoofdstukken, taken, sterrenregels, reset |
| `docs/05-GAMEPLATFORM-ARCHITECTUUR.md` | Platformlagen, manifest, capabilities, conformance (voorrang bij architectuur) |
| `docs/06-AGENT-PLATFORMOPDRACHT.md` | Eerste deliverables platform |
| `docs/design/239d7839-….png` | Bouwen, Grotere kan, Groeipad, Bestelling klaar, Mijn bedrijfjes, Probeer het samen |
| `docs/design/9fba7864-….png` | Startscherm "Wat ga jij maken?", Plantenkraam, Atelier |
| `docs/design/f4b89fd1-….png` | Boerderij, Limonade, Speelgoedfabriek, Mijn Maakrijk, Instellingen, Samen groeien |

Alle drie de afbeeldingen zijn met de beeldtool bekeken.

### Referentie (`~/mym`, alleen gelezen)
`README.md`, `docs/decisions.md` (D1–D14), `docs/backlog.md`, `docs/dev-preview.md`, `docs/round3.md`, bestandslijst, migratienamen, `Cargo.toml`, `package.json`, git-status en log. Dit zijn historische verslagen. Ze bewijzen niet dat de code werkt; ik heb die code niet gedraaid.
