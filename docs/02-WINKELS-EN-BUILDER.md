# Maakrijk — winkels, klanten, upgrades en builder

## 1. Twee verschillende winkels
### Klantenwinkel
Hier verkoopt het kind eigen producten/diensten. Alleen geaccepteerde levering of daadwerkelijk bediende klant levert omzet op. Verzenden alleen is geen verkoop.
### Bouw- en verbeterwinkel
Hier koopt het kind grondstoffen, upgrades, uitbreidingen en decoratie met bedrijfsmunten. Geen echte betalingen, lootboxes of betaalde valuta.

## 2. Catalogusmodel
Elk item heeft: id, mode, category, localizedName, icon/asset, cost, currency, maxQuantity, requirements, effects, placementRule, definitionVersion en sellBackPolicy.

Categorieën:
- Voorraad: verbruikbare ingrediënten/materialen.
- Verbeteren: bestaande capaciteit of werkwijze verandert.
- Uitbreiden: extra functioneel object of gebied.
- Versieren: uitsluitend uiterlijk.

MVP: geen terugverkoop van functionele upgrades. Meld dit vóór aankoop. Decoratie kan gratis worden verplaatst; verplaatsen verkoopt niets.

## 3. Aankoopflow
Selecteer → bekijk prijs/gevolg → kies geldige plek indien nodig → bevestig → server valideert → transactieresultaat → zichtbaar bouwen.

Geen geld afboeken bij openen van preview. Plaatsingskeuze en aankoop zijn één atomair commando. Bij bezette plek, onvoldoende geld, gewijzigde prijs/versie of vervallen voorwaarde verandert niets.

Toon vóór kopen: saldo, prijs, concreet voordeel, benodigdheden en eventuele maximale hoeveelheid. Bij niet beschikbaar een begrijpelijke reden, geen alleen grijze knop.

Een bouwanimatie blokkeert geen opgeslagen eigendom. Na refresh verschijnt het reeds gekochte object zonder nieuwe kosten.

## 4. Bestellingen
Statussen: available → accepted → producing → ready → delivering → accepted_delivery → paid. Niet elke modus gebruikt iedere tussenstatus; documenteer toegestane overgangen.

Order bevat recipe/product, quantity, unitPrice, total, deliveredQuantity en definitieversie. Prijs en recept bevriezen bij acceptatie. Geen negatieve voorraad of overschrijding van een bestelling. Deellevering alleen als expliciet ondersteund; anders duidelijke melding en nul afboeking.

MVP-klanten wachten rustig en kennen geen strafdeadline. Animatie mag drukte suggereren, maar creëert geen fictieve voorraad of uitbetaling.

## 5. Limonadekraam
Flow: voorraad kopen → kan maken → kraam openen → klanten bedienen.
- Receptkaart vult een voorstel in; kind kan hoeveelheden aanpassen binnen geldige grenzen.
- Maak-een-kan omvat persen, mengen en klaarmaken met zichtbare korte animatie.
- Kaninhoud, aantal gevulde/geleverde bekers en resterende vraag zijn verschillende waarden.
- Geen extra verplichte beker-vulknop.
- Restproduct heeft een expliciet houdbaarheidsbeleid: MVP geen bederf bij afwezigheid, overdracht naar volgende ronde toegestaan.
- Grotere kan/voorraadrek/extra bereidingsplek veranderen echte capaciteit, niet alleen modelgrootte.

## 6. Boerderij
- Elke akker heeft eigen crop/state/output.
- Elke tractor heeft id, route/taak, lading, positie en busyUntil.
- Dispatch reserveert lading atomair; twee tractoren kunnen niet dezelfde oogst ophalen.
- Extra akker krijgt aansluiting op verwerking en vervoer.
- Extra tractor geeft parallel transport, niet automatisch extra oogst.
- Melk: verzorging → melken → vervoer → verwerking/koeling → flessen → gekoelde levering.
- Dieren lijden niet door afwezigheid. Leg versimpelde tijden uit; controleer educatieve uitleg over echte voedselverwerking vóór release.

## 7. Speelgoedfabriek
Eén auto = één ‘auto zonder wielen’, vier wielen en één doos. Gebruik deze termen consequent in kindteksten; interne identifiers hoeven niet te worden hernoemd.

Werkbanken, lift en inpakplek hebben echte capaciteit. Een tweede verdieping geeft een bruikbare werkplek. Geen productie zonder inputs. Liftlading bestaat in precies één inventaris tegelijk.

## 8. Nieuwe bedrijfjes
### Plantenkraam
Zaad/pot → groei/verzorging → verpotten → order → klant. Eerste scope één plant, geen ziekte door afwezigheid. Kas geeft extra plekken, niet magisch onbeperkte productie.
### Armbandjesatelier
Klantwens → patroon → materiaal → maken → aanbieden. Sommige orders hebben vaste voorwaarden, vrije ontwerpen hebben meerdere geldige oplossingen. Geen straf voor creatieve voorkeur.

## 9. Builder
Sandbox is gescheiden van campagnegeld en sterren. Gebruik dezelfde objectdefinities en regels, maar geen economisch farmingvoordeel.

Eerste functies: template openen, akker toevoegen, tractor toevoegen, route verbinden, verplaatsen, verwijderen van niet-vereiste objecten, undo/redo, valideren, opslaan en testspelen.

Plaatsingspreview, snapping, zichtbare footprints en concrete foutmeldingen. Tikbediening naast slepen. Undo/redo geldt voor nog niet opgeslagen editorbewerkingen; een eerder opgeslagen versie blijft als herstelpunt beschikbaar.

World definition bevat schemaVersion, templateVersion, worldVersion, objects, links, recipes en startingState. Een lopende testsessie houdt een bevroren versie. Editorwijziging verandert geen bestaand campagnestandbeeld of spel.

Validatie: objectlimieten, overlap, routes, bereikbare input/output, ondersteunde grafstructuur, geldige recepten en uitvoerbare eerste order. Ondersteun expliciet meerdere akkers en voertuigen; accepteer geen ongeteste willekeurige cycli.

## 10. Acceptatie
- Eén succesvolle en één geweigerde aankoop per categorie getest.
- Dubbelklik, retry en twee tabbladen leveren maximaal één aankoop per command-ID op.
- Slotconflict geeft nul afboeking.
- Uitbreiding blijft behouden en verandert aantoonbaar capaciteit/gedrag.
- Twee tractoren vervoeren voorraad zonder duplicatie.
- Builder met extra akker/tractor/route valideert en speelt.
- Sandbox kent geen campagnesterren toe.
- Hoofdknop en relevante wereldinformatie blijven mobiel tegelijk zichtbaar.
