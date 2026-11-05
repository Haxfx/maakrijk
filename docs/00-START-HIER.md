# Maakrijk — bouwinstructie voor het agentteam

## Opdracht
Bouw Maakrijk: een Nederlandstalige educatieve ondernemersgame waarin kinderen kleine bedrijven laten groeien. Gebruik de documenten in dit pakket als gezamenlijk uitvoeringscontract.

Dit pakket specificeert het beoogde product. Het bewijst niet welke onderdelen al in de repository bestaan. Inspecteer eerst de repository en maak een verschillenoverzicht. De repository heet volgens de eerdere projectverslagen `~/mym`; controleer dit. Wijzig de aparte app `~/kiddos` niet.

## Leesvolgorde
1. `01-PRODUCT-EN-ARCHITECTUUR.md`
2. `02-WINKELS-EN-BUILDER.md`
3. `03-BALANS-EN-ECONOMIE.md`
4. `04-PROGRESSIE.md`

Bij conflicten gelden achtereenvolgens: gegevensveiligheid, financiële invarianten, expliciete acceptatiecriteria, productscope en visuele voorkeuren. Leg conflicten en beslissingen vast; los ze niet stilzwijgend op.

## Eerste handelingen
- Inspecteer git-status, branches, migraties, dependencies, startcommando’s en tests.
- Identificeer bestaande spelers, spelmodi, hoofdstukken, ledgers en wereldversies.
- Maak `docs/implementation-gap.md`: bestaand / aanpassen / nieuw / onzeker.
- Maak een taakbord met module-eigenaars en afhankelijkheden.
- Stel alleen blokkerende vragen. Leg overige aannames vast en bouw verder.

## Rollen
- Orchestrator: scope, contracten, integratie en oplevering.
- Rust/backend: autoritatieve spelregels, transacties, API en opslag.
- Nuxt/frontend: bediening, spelweergave en toegankelijkheid.
- Game designer: economie, progressie en leerhandelingen.
- Art/motion: flat assets, layout, animaties en audio.
- Builder: plaatsing, routes, validatie en testmodus.
- Onafhankelijke QA: visuele review, gameplay, regressie en gegevensveiligheid.

Gebruik echte sub-agents indien beschikbaar. Doe niet alsof parallelle of onafhankelijke review heeft plaatsgevonden als dat niet zo is. Spreek bestandseigenaars en API-contracten af voordat agents parallel werken.

## Bouwvolgorde
### M0 — bestaande basis beschermen
Reproduceer start en tests; scheid dev/preview-buildoutput; leg database- en API-versies vast; maak migratieproef op een kopie.

### M1 — volledige limonade-vertical-slice
Speler kiezen, voorraad kopen, kan maken, klanten bedienen, ledger, rondeoverzicht, opslaan/hervatten en één functionele upgrade. Bestaande functies aanpassen in plaats van dubbel bouwen.

### M2 — gezamenlijke bedrijfssystemen
Winkelcatalogus, aankoopvalidatie, uitbreidingsslots, spelersbrede sterren en hoofdstukvoorwaarden. Lever één geïntegreerde sessie met koop- en vrijspeelervaring.

### M3 — boerderij uitbreiden
Extra akker en tweede tractor met echte werking; behoud wortels, soep en melk waar aanwezig. Ondersteun meerdere bronnen en voertuigen expliciet in de validator.

### M4 — fabriek en builder
Consistente speelgoedfabriek, werkende uitbreidingen, sandbox met extra akker, tractor en route. Geen campagnebeloningen in sandbox.

### M5 — nieuwe bedrijfjes
Plantenkraam eerst, daarna armbandjesatelier. Begin elk met één product en één complete keten. Fietswasplek, tweedehandswinkel, cadeauatelier en spellenmakerij zijn backlog, geen verplichte eerste release.

## Werkwijze per mijlpaal
Ontwerp → contract → implementatie → tests → echte browserreview → correcties → hercontrole → lokale commit.

Rapporteer: wijzigingen, uitgevoerde tests, preview-URL/database, screenshots, beperkingen en volgende stap. Claim geen perfectie, kindertest, audiokwaliteit of apparaatprestaties zonder controle.

## Bevoegdheden
Lokale codewijzigingen, tests en commits zijn toegestaan. Geen push, deployment, betaalde assets, database-reset of destructieve actie zonder toestemming. Geen migraties op de echte dev-database `vgk` zonder afzonderlijke toestemming. Gebruik eerst een aparte preview/testdatabase. Backups en bestaande persoonsgegevens nooit committen.

## Oplevering
Werkende code, migraties, seeddata, gegenereerde API-types, tests, README, assetlicenties, bekende beperkingen en blijvende reviewbeelden. Een plan of frontend met mockgeld is geen voltooide oplevering.
