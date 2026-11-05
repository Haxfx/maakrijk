# Aanvullende agentinstructie — gameplatform eerst

Lees `05-GAMEPLATFORM-ARCHITECTUUR.md` vóór verdere grote uitbreidingen. Dit document vult het eerdere bouwpakket aan en bepaalt de gewenste gedeelde onderlaag.

## Kernopdracht
Maak van Maakrijk een uitbreidbaar scenario-platform. Nieuwe games moeten economie, objecten, upgrades, ketens, hoofdstukken, sterren, tijd, opslag en commandafhandeling hergebruiken. Unieke spelregels blijven mogelijk via begrensde scenario-modules.

Voer eerst inspectie uit. Lever een korte tabel per bestaande game: gedeeld, afwijkend, gedupliceerd, migratierisico. Definieer daarna contracten en bouw één verticale slice, geen complete herschrijving.

## Concrete eerste deliverables
1. Modulekaart en afhankelijkheidsrichting.
2. Scenario manifest-schema en één bestaand scenario als voorbeeld.
3. Upgrade-/componentcontracten.
4. Gedeelde conformance-tests.
5. Migratieplan voor bestaande speldata, zonder uitvoering op vgk.
6. Kleine plantenkraam als bewijs dat configuratie en assets voldoende zijn voor een bekende combinatie van capabilities.
7. Eén scenario-eigen patroonregel als bewijs van uitbreidbaarheid naar afwijkende concepten.

## Niet doen
Geen losse backend, voortgangsmotor, puntenledger of set gametabellen per nieuwe game. Geen algemene scriptingtaal, microservices of grote ECS-herschrijving vooraf. Geen afgedwongen generieke keten voor spelconcepten die dat niet zijn.

## Veiligheid
Behoud bestaande voortgang. Geen reset, push of deployment. Migraties eerst op een databasekopie en op vgk uitsluitend na toestemming. Meld aannames, technische beperkingen en werkelijk uitgevoerde controles.
