# Maakrijk — uitbreidbaar gameplatform en scenarioarchitectuur

## Status en prioriteit
Dit document vult het bestaande Maakrijk-bouwpakket aan. Bij conflicten over architectuur heeft dit document voorrang op modus-specifieke implementatievoorstellen. Het is een ontwerpcontract, geen constatering over bestaande code.

De opdracht is een platform voor meerdere games met gedeelde werkwijze, niet een verzameling losstaande apps. Bouw de onderlaag aan de hand van concrete verticale slices; geen maandenlang frameworkproject voordat een game werkt.

## 1. Kernmodel
Een game bestaat uit:
1. Een versiegebonden scenariodefinitie.
2. Een actieve spelinstantie met status.
3. Herbruikbare platformsystemen.
4. Optionele scenario-eigen spelregels.
5. Een presentatie in Nuxt.

De platformsystemen beheren economie, inventaris, objecten, productie, transport, orders, upgrades, voortgang, beloningen, tijd en opslag. Scenario’s combineren die systemen en voegen alleen afwijkend gedrag toe.

Voorbeelden: akker en tractor; kraam en kan; werkbank en lift; kraaltafel en ontwerp. Dit zijn verschillende objecten met een gemeenschappelijk levenscyclus- en upgradecontract, niet allemaal dezelfde geforceerde machine.

## 2. Grenzen en non-goals
- Rust, Nuxt en PostgreSQL blijven de stack.
- Start als modulaire monoliet: één Rust-service met duidelijke modulegrenzen.
- Geen backend, database of frontend-app per game.
- Geen aparte gameplaytabellen per nieuw scenario als standaard.
- Geen microservices, runtime-native plugins, publieke scripts of algemene programmeertaal voor scenario’s in de eerste release.
- Geen gigantische switch op game-id door alle platformmodules heen.
- Geen poging om ieder toekomstig spel volledig via JSON uitdrukbaar te maken.
- Builder gebruikt alleen expliciet toegestane objecten, recepten en regels.

## 3. Vier architectuurlagen
### A. Platform core
Identiteiten, autorisatie, commandverwerking, tijd, transacties, statusversies, opslag, definitieversies en observability. Kent geen wortels, koeien of limonade.

### B. Gedeelde domeinsystemen
Inventory, economy, objects, processes, logistics, orders, upgrades, progression, rewards en placement. Werken met getypeerde IDs en capabilities.

### C. Scenario modules
Versiegebonden configuratie en waar nodig Rust-code voor specifieke regels, bijvoorbeeld een kralenpatroon beoordelen, een fietswasvolgorde of dierenverzorging. Kunnen platformservices aanroepen via begrensde context, niet willekeurig geld of databases wijzigen.

### D. Presentation
Gedeelde Nuxt-shell, UI-componenten, wereldinteractie en assetregistry. Scenario-eigen illustraties, lay-outs en bijzondere interacties. Autoritatieve regels blijven in Rust.

## 4. Scenario manifest
Verplichte velden:
- scenarioId, definitionVersion, schemaVersion en balanceVersion.
- rulesetId en rulesetVersion.
- Naam-/beschrijvingssleutels en assetPackId.
- Ondersteunde systemen/capabilities.
- Product- en objectdefinities.
- Recepten/processen en logistieke verbindingstypen.
- Ordertemplates en gecontroleerde generatieparameters.
- Upgradecatalogus en uitbreidingsregels.
- Hoofdstukken, doelen en beloningen.
- Startstatus en featureflags.
- Builderpermissions.

Valideer manifesten bij build/start en vóór publicatie. Onbekende componenttypen, foutieve referenties en ongeldige cycli geven een fout; niet stilzwijgend negeren.

Manifesten zijn onveranderlijk zodra gepubliceerde sessies ervan afhankelijk zijn. Bewaar hash en resolved definition bij een instantie of verwijzing naar immutable opslag. Een assetwijziging mag leesbare historische status niet onbruikbaar maken.

## 5. Objecten en capabilities
### Object definition
Objecttype, basisparameters, footprint, toegestane verbindingen, assetreferentie, capabilities en mogelijke upgrades.

### Object instance
InstanceId, definitionId/version, positie, niveau, componentstatus en gekochte upgrades.

Gedeelde componenttypen kunnen zijn:
- Inventory: hoeveelheden, limieten en eenheden.
- Source: oogst/generatie met kosten en tijd.
- Processor: inputs, outputs, duur en parallelle capaciteit.
- Storage: ruimte en toegestane producten.
- Vehicle: capaciteit, route en taakstatus.
- ServicePoint: klantinteractie.
- ConstructionSlot: toegestane uitbreiding.
- CareState: beperkte verzorgingscyclus zonder afwezigheidsstraf.

Gebruik een eenvoudig getypeerd componentmodel, geen volledige ECS-engine als dat niet nodig is. Gemeenschappelijke componenten zijn Rust-types/enums; scenario-eigen state is apart getypeerd, met expliciete validatie en migratieversie.

Nieuwe objecten gebruiken bestaande capabilities waar mogelijk. Een nieuwe capability wordt pas platformbreed toegevoegd als er concrete herbruikbaarheid is.

## 6. Groeiende chains
Modelleer de wereld als een productie-/dienstengraaf met objecten en getypeerde verbindingen. Een chain mag groeien door objecten toe te voegen, routes te openen, capaciteit te verhogen of nieuwe producten te introduceren.

Ondersteun eerst expliciet:
- Meerdere bronnen naar verwerking.
- Eén bron naar meerdere toegestane bestemmingen.
- Meerdere voertuigen met unieke reserveringen.
- Samengestelde recepten met meerdere inputs.
- Parallelle werkplekken.
- Ontgrendelbare subketens.

Vrije cycli zijn standaard niet toegestaan. Recycling vereist een expliciet ondersteund patroon met begrensde inputs en gevalideerde opbrengst. Visuele nabijheid creëert geen logistieke verbinding.

Voorraad bestaat op één plek: beschikbaar, gereserveerd, in productie of onderweg. Gebruik duidelijke overgangen zodat twee voertuigen dezelfde goederen niet ophalen.

## 7. Upgradecontract
Upgrades zijn data met gecontroleerde effecten, geen willekeurige scripts.

Effecttypen:
- Set/add/multiply op een toegestane parameter.
- Recept of ordertype vrijspelen.
- Component activeren.
- Bouwslot openen.
- Nieuw objecttype toestaan.
- Visuele variant veranderen.

Definieer effectvolgorde: base → vaste addities → multiplicatieve modifiers → limieten. Gebruik integer/fixed-point waar afronding relevant is. Leg afrondingsregels vast. Preview en serverberekening gebruiken dezelfde definitie, maar server valideert opnieuw.

Aankoopvoorwaarden, geldafboeking, objectaanpassing en voortgang gebeuren atomair. Maxima, prerequisites en exclusieve keuzes zijn expliciet. Capaciteitsverlaging mag bestaande inhoud niet vernietigen.

## 8. Scenario rules interface
Maak een kleine Rust-interface voor regels die niet via generieke systemen passen. Conceptueel:
- validate_definition(definition).
- validate_scenario_command(context, command).
- apply_scenario_command(context, command) → mutation plan.
- evaluate_special_condition(context, condition).
- migrate_scenario_state(fromVersion, state).

Preciese signatures worden tijdens implementatie bepaald. De context biedt begrensde toegang tot inventaris, objecten en opdrachten. Scenario-code voert geen losse SQL uit en commit geen eigen transacties.

Compile-time registry koppelt rulesetId/version aan implementatie. Geen dynamische dylibs. Behaviors voor oude actieve versies blijven beschikbaar of krijgen een expliciete, geteste statusmigratie.

Voorbeeld: een patroonopdracht vraagt scenario-eigen beoordeling; productievoorraad, beloning, hoofdstukafronding en opslag blijven platformwerk.

## 9. Commandpipeline en gebeurtenissen
HTTP → autorisatie → idempotentie/transactielock → settle tijd → validatie → platform- of scenariocommando → domeinevents → progressie/beloningen → opslag → antwoord.

Hanteer vaste lockvolgorde, waaronder profielsterledger en spelinstantie, om deadlocks bij meerdere modi te beperken. Retrybeleid is begrensd.

Gedeelde events: ItemProduced, DeliveryAccepted, SaleCompleted, UpgradePurchased, ExpansionPlaced, ObjectUsed en ChapterCompleted. Events hebben eventId, gameInstanceId, profileId, scenarioId, definitionVersion en getypeerde payload. Geen fragiele tekstvergelijkingen op Nederlandse labels.

Interne events worden deterministisch en zonder onbegrensde recursie verwerkt. Een beloning veroorzaakt niet opnieuw dezelfde beloning. UI-events zijn niet autoritatief.

## 10. Gemeenschappelijke progressiemotor
Hoofdstukken verwijzen naar voorwaarden met scope en baseline:
- Aantal geaccepteerde orders.
- Product voor het eerst gemaakt.
- Upgrade gekocht én gebruikt.
- Uitbreiding functioneel ingezet.
- Persoonlijke leertaak voltooid.
- Scenario-eigen gevalideerde conditie.

Scope: deze sessie, sinds hoofdstukstart, deze modus of spelerbreed. Sla beginwaarden expliciet op. Rewards hebben unieke sleutels, los van het bekijken van hun animatie.

Spelersbrede sterren komen uit één platformledger; bedrijfsgeld blijft per instantie/modus volgens productbeleid. Geen modusspecifieke duplicatie van het sterrensysteem.

## 11. Datamodel
Voorgestelde gemeenschappelijke kern:
- scenario_definitions: immutable versies + hash + manifest.
- game_instances: profile, scenario/version, rulesetversion, revision, timestamps.
- game_snapshots: gevalideerde gemeenschappelijke en scenario-state.
- game_commands: idempotentie, payloadhash en antwoord.
- economy_transactions: munten met unieke referentie per instantie.
- profile_star_transactions: spelersbrede prestaties.
- game_progress / progress_tasks / reward_grants.
- custom_world_definitions: builderversies.

Objectstatus kan eerst in snapshots blijven; voorkom een rij-update per animatieframe. Extracteer relationele tabellen alleen voor concrete queries/constraints. Gebruik game_instances als autorisatie- en lockgrens. Geen ongetypeerde JSON-dump zonder schema/versionering.

Bestaande fabriek- en limonadetabellen worden niet zomaar verwijderd. Gebruik adapters en migreer één scenario tegelijk. Er is steeds één autoritatieve opslagbron; geen langdurige dual-write zonder expliciete consistentiecontrole.

## 12. Frontendplatform
Eén shell met spelers, sterren, munten, instellingen, doelen, winkel, bouwmodus en wereldcamera.

Frontendregistry: scenarioId → presentation module/assetpack. Deel UI en inputpatronen; forceer niet dezelfde layout voor assemblage en klanten bedienen.

De renderer ontvangt een viewmodel met objecten, verbindingen en acties. Events voeden animaties; serverstatus bepaalt de uiteindelijke toestand. Voor ieder interactief object bestaat een toegankelijke DOM-actie. Assets worden per scenario geladen en opgeruimd.

## 13. Builder als dezelfde runtime
Builder produceert een scenariodefinitie binnen het scenario-schema. Testspelen gebruikt dezelfde Rust-engine als campagne, met sandboxflags die geld-/sterbeloningen buiten de testsessie blokkeren.

Een creator kan bestaande capabilities combineren, niet nieuwe executable regels uploaden. Publiceren en delen tussen huishoudens is latere scope met moderatie/autorisatie; opslaan is nu privé.

## 14. Schalen van infrastructuur
Maak API-processen stateless buiten PostgreSQL en tijdelijke request-/assetcaches. Gebruik sessiecookies die op meerdere processen valideerbaar zijn. Geen spelstand uitsluitend in RAM.

Lazy settlement op serverklok voorkomt een timer per speler. Werk per request begrensd achterstallige acties af; gebruik waar veilig mathematische aggregatie met dezelfde domeinsemantiek. Grote catch-up mag geen onbeperkte transactie veroorzaken. Een worker wordt pas toegevoegd bij concrete achtergrondvereisten en krijgt dezelfde idempotentiegaranties.

Paginate lijsten, indexeer huishouden/profiel/instantie en unieke referenties; stel poollimieten en statement timeouts in. Meet eerst met een gedocumenteerde workload. Meer API-replica’s verhogen niet automatisch databasecapaciteit. Leg eventuele gedeelde rate limiting vast vóór horizontaal uitrollen.

## 15. Observability en tests
Log correlationId, gameInstanceId, scenario/version en foutcode zonder tokens/persoonlijke namen. Meet commandlatentie, conflicten, settlementduur, lock-wachttijd en ledgerinvarianten.

Elke scenario-implementatie doorloopt dezelfde conformance-suite:
- Start, volledige keten, aankoop, uitbreiding en hervatten.
- Voorraadbehoud en geen dubbele betaling.
- Retry, concurrentie en klokgedrag.
- Eénmalige progressie en sterren.
- Ongeldige definitie afgewezen.
- Oude versie blijft speelbaar.
- Sandbox blijft geïsoleerd.

## 16. Bewijs van uitbreidbaarheid
Bouw een kleine plantenkraam als architectuurproef met bestaande Source/Processor/Inventory/Orders/Upgrade/Progression-capabilities.

Acceptatie:
- Toevoegen via manifest, assets, presentatie en registry.
- Geen wijziging aan gedeelde economie, progressiemotor, commandpipeline of basismigraties nodig.
- Geen eigen munten-/sterrenledger of losse spelserver.
- Bestaande modi blijven groen.

Voeg daarna een kleine patroonopdracht toe als bewijs dat scenario-eigen regels mogelijk zijn zonder platformlogica te kopiëren. Streef niet naar nul code per nieuw concept, maar naar nul duplicatie van gedeelde verantwoordelijkheid.

## 17. Gefaseerde invoering
1. Inventory van duplicatie en verschillen per modus.
2. Contracten en gedeelde financiële/command-invarianten vastleggen.
3. Eén bestaande modus via platformadapter laten lopen.
4. Progressie, objecten en upgrades delen.
5. Tweede bestaande modus integreren en abstracties toetsen.
6. Plantenkraam-proef en scenario-eigen patroonregel.
7. Builder koppelen en belasting-/regressietests.
8. Pas daarna gecontroleerde datamigratie met toestemming.

Per fase: speelbare app, tests, review en lokale commit. Geen big-bangherschrijving.
