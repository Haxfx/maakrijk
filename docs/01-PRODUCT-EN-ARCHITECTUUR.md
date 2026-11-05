# Maakrijk — productplan en technische architectuur

## 1. Visie
Maakrijk is een warme, overzichtelijke 2D-speelwereld waarin kinderen maken, verzorgen, plannen en verkopen. Een bedrijf begint klein en krijgt door begrijpelijke keuzes nieuwe mogelijkheden. Geld verdienen is een middel; creativiteit, leren, kwaliteit en durven proberen zijn even belangrijk.

Standaardtaal: Nederlands. Code, identifiers en codecomments: Engels. Exacte doelgroep/leeftijden worden tijdens gebruikerstests vastgesteld; ontwerp op vaardigheden en instelbare ondersteuning.

## 2. Productprincipes
- Minder tekst, meer betekenisvolle handelingen en visuele feedback.
- Geen advertenties, echte aankopen, publieke chat of dagelijkse verplichtingen.
- Geen boze klanten, straf voor afwezigheid of dieren die door niet-spelen lijden.
- Eén primair doel tegelijk; uitleg op verzoek.
- Geen eindeloze kliklus of verplichte minutenlange wachttijden.
- Bestaande spelers verliezen geen geld, bedrijven of hoofdstukken door updates.

## 3. Spelmodi
| Modus | Kernhandeling | Eerste scope |
|---|---|---|
| Limonadekraam | Recepten, voorraad en klanten | Gewone en roze limonade; uitbreidbare kraam |
| Boerderij | Groei, transport en verwerking | Gewassen, soep en melkketen; extra akker/tractor |
| Speelgoedfabriek | Samenstellen en interne logistiek | Speelgoedauto met vier wielen en verpakking |
| Plantenkraam | Verzorgen en order samenstellen | Eén plantsoort, potjes en kasuitbreiding |
| Armbandjesatelier | Patronen en klantwensen | Eenvoudige kralenpatronen en bestellingen |

De eerste drie zijn de kernrelease. Behoud bestaande broodwerelden/remixes, maar breid ze niet automatisch mee uit.

## 4. Hoofdschermen
- Spelerselectie: bijnaam/avatar en geen gevoelige informatie.
- Start: eigen bedrijfkaarten, actuele hoofdstukken en één sterrentotaal.
- Spel: wereld centraal; compact saldo; één doel; contextacties onderaan.
- Winkel/bouwen: verbeteren, uitbreiden en versieren.
- Groeipad: afgerond, huidig en volgend hoofdstuk.
- Builder: catalogus, plaatsing, routes, valideren, opslaan en testspelen.
- Ouderpagina: voortgang, audio, dataverwijdering en begeleide praktijkopdrachten.

## 5. Visueel ontwerp
De laatste gekozen richting is flat 2D/vector, niet een realistische 3D-wereld. Gebruik crème `#FFF7E8`, ivoor `#FFFCF5`, tekst `#243C40`, turquoise `#167D8D`, groen `#5B963F` en goud `#F2BB45` als starttokens; controleer contrast in de implementatie.

Afgeronde vormen, herkenbare silhouetten, weinig schaduw, rustige paden en losse animeerbare onderdelen. Bewegende wielen, zichtbare lading, groeiende planten, een schenkstraal en sluitende dozen vertellen wat gebeurt. Geen decoratieve drukte.

SVG/Vue is de standaard voor deze stijl. Als Three.js al bestaat: behoud eerst werkende functies, gebruik desgewenst orthografische flat rendering en evalueer migratie per wereld. Geen complete renderherschrijving zonder aangetoonde noodzaak. Documenteer de keuze voordat assets worden vervangen.

Primaire touchdoelen minimaal 48 CSS-pixels. Slepen heeft een tikalternatief. Geen hover-afhankelijke acties. Rustige overzichtscamera, handmatige zoom/pan en knop ‘Alles bekijken’. Telefoon krijgt contextpanelen; geen verkleinde desktopinterface.

## 6. Stack
### Frontend
Nuxt, Vue 3, strict TypeScript, Composition API, Pinia, Tailwind CSS en centraal beheerde Nederlandse teksten. SVG/CSS/Web Animations voor de voorkeursweergave. Bestaande Three.js-code alleen behouden waar zinvol. Vitest en Playwright. Installeerbare PWA met app-shell caching; geen belofte van volledig offline spelen.

### Backend
Rust stable, Axum, Tokio, Serde, SQLx, PostgreSQL en tracing. OpenAPI met gegenereerde TypeScript-types. Gebruik stabiele compatibele versies, leg exacte versies en MSRV vast in lockfiles/configuratie.

### Infra
Eén frontend, één Rust-service en PostgreSQL. Docker Compose, SQL-migraties, reproduceerbare seeddata, `.env.example`. Geen Redis, microservices of message broker zonder concrete noodzaak. Dev en preview gebruiken aparte database én buildoutput. Diagnostiek toont frontendbuild, backendbuild en contractversie.

## 7. Domeinscheiding
- Definitie: producten, recepten, catalogus, hoofdstukken, routes en balansversie.
- Status: voorraad, saldi, productie, voertuigen, bestellingen en voortgang.
- Presentatie: camera, selectie, animaties, audio en panels.
- Opslag: transacties, snapshots, commandlog en versies.

Rust beslist geld, voorraad, orders, aankopen en beloningen. De client verstuurt intenties. Animatieafronding mag geen geld toekennen. Geen onafhankelijke tweede volledige simulatie in TypeScript.

## 8. Commandoverwerking
1. Autoriseer huishouden/profiel/spel.
2. Begin transactie en lock spelstatus; hanteer vaste lockvolgorde bij meerdere records.
3. Bepaal servertijd na de lock en verwerk vervallen taken volgens de opgeslagen tijdlijn.
4. Controleer command-ID en payloadhash.
5. Valideer voorwaarden en voer domeinactie uit.
6. Sla status, ledger, voortgang en antwoord atomair op.
7. Commit en retourneer statusversie plus gebeurtenissen.

Zelfde ID + zelfde payload: opgeslagen resultaat. Zelfde ID + andere payload: conflict. Gebruik bestaande UUIDv7/tijdvensterimplementatie indien aanwezig; leg retry- en bewaartermijnen vast. Tijdvensters zijn geen autorisatie. Unieke economische referenties voorkomen dubbele uitbetaling onafhankelijk van commandretentie.

Bij netwerkonzekerheid behoudt de client hetzelfde command-ID. Bij definitieve afwijzing niet stilzwijgend een nieuwe aankoop uitvoeren. Eén actieve sessie ondersteunt meerdere tabbladen met statusversies en conflictsynchronisatie.

## 9. Databaseconcepten
Hergebruik bestaande tabellen. Verwachte entiteiten: households, profiles, game_instances, world_definitions, inventory/state snapshots, orders, economy_transactions, catalog definitions, purchased_upgrades, placed_expansions, commands, game_progress, progress_tasks en player_star_transactions.

JSONB is passend voor versiegebonden werelddefinities en snapshots; uniciteit, eigenaarschap en financiële referenties krijgen relationele constraints. Leg valuta niet in dezelfde ongetypeerde kolom vast. Multi-mode pointstoekenning gebruikt hetzelfde profile_id.

## 10. API-contracten
Definieer routes voor profielen, modusoverzicht, sessie starten/hervatten, commando uitvoeren, winkelcatalogus, puntenspecificatie, hoofdstukken, builder opslaan/valideren/testen en ouderbeheer. Command responses bevatten statusversie, resultaat en events. De catalogus toont serverberekende beschikbaarheid en redenen; checkout valideert opnieuw.

Gebruik gestructureerde foutcodes, invoerlimieten, veilige cookies, huishoudenautorisatie, rate limiting en same-origin/CSRF-bescherming passend bij de sessieopzet. Log geen tokens of gevoelige kindgegevens.

## 11. Audio en offline
Muziek/effecten apart regelbaar; instellingen blijven behouden. Start na gebruikersinteractie; geen dubbele track na navigatie; pauze bij achtergrond. Documenteer licenties. Menselijk beluisteren blijft aparte acceptatie. Cache statische assets; offline geeft duidelijke status. Geen ongecontroleerde offline aankopen of beloningen.

## 12. Gegevensveiligheid en release
Nieuwe migraties eerst op een verse kopie met bestaande voortgang. Backup vóór productieachtige dev-migratie. Vergelijk inhoud vóór functionele controles. Verwijderingen ondersteunen sessie versus modusreset versus profiel verwijderen met expliciete bevestiging. Een rekensom is geen sterke ouderauthenticatie. Publieke release vereist aparte security/privacy/juridische beoordeling.

## 13. Definition of done
Een ronde en aankoop werken via de echte UI en Rust/PostgreSQL; voortgang blijft na refresh; geen dubbele betaling; mobiel bruikbaar; relevante tests groen; onafhankelijke visuele hercontrole na de laatste wijziging; beperkingen gedocumenteerd. Geen claim over echte apparaten op basis van alleen headless software-rendering.
