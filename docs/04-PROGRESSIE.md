# Maakrijk — hoofdstukken, sterren en bedrijfsgroei

## 1. Doel
Het kind begrijpt het huidige doel, ziet de volgende beloning en krijgt bij groei nieuwe handelingen of keuzes. Hoofdstukken ondersteunen spelen, niet een eindeloze vragenlijst.

Vier onafhankelijke assen:
1. Economisch: munten en investeringen per bedrijf.
2. Ruimtelijk: meer grond, werkplekken en voertuigen.
3. Inhoudelijk: recepten, producten en taken.
4. Spelersbreed: sterren voor aantoonbare mijlpalen.

## 2. Voortgangsmodel
Progress definitions: mode, chapterId, version, tasks, rewards, nextChapterId.
Task: id, type, target, scope, baselinePolicy, prerequisite en personalActionRequired.
Reward: id, kind, effect en uniqueReference.

Task scopes zijn expliciet: profileLifetime, modeLifetime, linkedSession of chapterSinceActivation. Gebruik nooit een toevallig absoluut aantal betaalde orders als taak die ‘nog één bestelling’ betekent.

States: locked → available → active → completed. Een beloning kent afzonderlijk grantedAt en seenAt. Beloning is effectief zodra server hem toekent; het sluiten van de dialoog verleent geen rechten. Ongeziene beloningen kunnen na refresh alsnog worden getoond, zonder opnieuw te worden toegekend.

Hoofdstukafronding, reward grants en sterren ontstaan atomair met de veroorzakende spelactie. Unieke referenties voorkomen herhaling.

## 3. Voorgestelde hoofdstukken
### Limonade
1. Eerste limonade: één ronde en betekenisvolle geldreflectie; eigen naambord.
2. Eigen kraam: één functionele upgrade, kleur kiezen en vervolgronde; nieuwe smaak vrij.
3. Nieuwe smaak: recept plannen en verkopen; menubord.
4. Meer ruimte: extra werkplek bouwen en daadwerkelijk gebruiken; grotere orderoptie.
5. Eigen aanpak: een voorraad-/capaciteitsprobleem oplossen; vrije vervolgorders.

### Boerderij
1. Eerste oogst: volledige bestelling; eigen bord.
2. Grotere werkplek: functionele keuze en vervolgbestelling; kruidentuin.
3. Soeppakket: juiste combinatie en levering; soep in winkel.
4. Eerste koe: verzorging en melk verzamelen; melkroute.
5. Van melk naar winkel: verwerken, verpakken en leveren; melkwerkplaats.
6. Slimmer verwerken: grotere pan gebruiken en restmelk begrijpen; zichtbare uitbreiding.
7. Meer land: extra akker plaatsen en oogst inzetten; keuze in productie.
8. Samen op weg: tweede tractor gebruiken; parallelle logistiek.

### Speelgoedfabriek
1. Eerste auto: compleet product leveren; bord.
2. Grotere order: onderdelen plannen; tweede werkbank/verdieping.
3. Twee werkplekken: beide functioneel inzetten; eigen fabrieksuitstraling.
4. Slim verdelen: een concreet logistiek knelpunt oplossen; vervolgorders.

### Plantenkraam
Zaadje → eerste plantenorder → kas → verschillende plantwensen.
### Armbandjesatelier
Eerste patroon → persoonlijke bestelling → eigen collectie → extra werktafel.

Voorgestelde nieuwe hoofdstukken worden pas zichtbaar als hun volledige inhoud werkt. Behoud bestaande hoofdstuk-ID’s en afgeronde beloningen; nummering in de interface is geen database-ID.

## 4. Leerhandelingen
Laat tellen, groeperen en plannen zoveel mogelijk binnen echte acties gebeuren. Hoogstens één korte reflectie op een belangrijk moment, geen vraag na iedere verkoop.

Een fout geeft een concrete aanwijzing en mogelijkheid opnieuw te proberen. Geen geldverlies als straf voor een rekenantwoord. Geen uitsluitend tekstuele toets als dezelfde vaardigheid visueel kan worden getoond.

‘Doe het samen’ mag logistieke handelingen begeleiden, maar geen persoonlijke plan- of begripstaak namens het kind afvinken. Orders kunnen wel economische voortgang opleveren als de hulp geldig produceert; taakdefinities bepalen welke persoonlijke handeling aanvullend nodig is.

## 5. Sterrenregels — startconfiguratie
| Prestatie | Sterren | Frequentie |
|---|---:|---|
| Hoofdstuk afgerond | 10 | Eenmaal per uniek hoofdstuk |
| Eerste volledige keten van een modus | 5 | Eenmaal per modus |
| Eerste functionele uitbreiding gebruikt | 5 | Eenmaal per modus |
| Eerste geldige eigen wereld getest | 5 | Eenmaal per speler |

Geen sterren voor gewone omzet, aankoop op zichzelf, login, wachten of herhaalde simpele acties. Geen sterrenhandel of uitgaven in MVP.

Een eerste keten kan tegelijk met hoofdstuk 1 worden afgerond: beide expliciete beloningen mogen samen gelden. Toon één samengevoegde samenvatting, niet meerdere opeenvolgende dialogen.

Voor builderster: controleer een geldige structurele wijziging ten opzichte van de template en een servergevalideerde voltooide testorder. Geen sterren voor alleen opslaan of cosmetische wijziging.

Ledger bevat profileId, amount, achievementKey, sourceMode, sourceEntity, definitionVersion en createdAt. Uniek op profileId + achievementKey. Totaal = som ledger. Een cache mag, maar moet verifieerbaar zijn.

## 6. Bestaande spelers
- Maak een migratieplan per bestaande statusversie.
- Voltooide hoofdstukken blijven voltooid.
- Geen verzonnen historische kennisvragen of persoonlijke acties.
- Retroactieve sterren uitsluitend voor bewijsbare prestaties; gebruik stabiele achievement keys zodat reruns niets verdubbelen.
- Nieuwe hoofdstukken worden toegevoegd, niet via reset van eerdere hoofdstukken.
- Nieuwe balans wordt niet stilzwijgend op lopende orders toegepast.

## 7. Opnieuw beginnen en verwijderen
Definieer drie aparte functies:
1. Sessie verwijderen: verwijdert deze bedrijfsstatus, niet automatisch lifetimeprestaties.
2. Nieuw bedrijf met behouden hoofdstukken: herstelt benodigde reeds verdiende functionele unlocks, maar geen gratis stapelbare investeringen. Valideer startbaarheid expliciet.
3. Modus opnieuw beginnen: reset modusstatus en hoofdstukken na ouderbevestiging; reeds verdiende spelerssterren blijven historische prestaties en kunnen niet opnieuw worden verdiend.

Profiel verwijderen wist alle bijbehorende data en sterren. Geen deels werkende resetknoppen tonen. Lever eerst één volledig ondersteund resetbeleid en documenteer de rest.

## 8. UI
In spel één compacte doelkaart met werkelijke voortgang en beloningspreview. Groeipad toont huidig en volgend hoofdstuk. Sterren staan spelersbreed op start en compacte spelheader; bedrijfsmunten hebben eigen icoon en label.

Na laatste werkende hoofdstuk: ‘Je bedrijf groeit verder’ met geldige vervolgorders en uitbreidingen. Geen ‘binnenkort’ voor ongeplande inhoud. Geen push naar eindeloos groter zonder betekenisvolle keuze.

## 9. Optionele praktijkbrug
Oudergerichte ‘Probeer het samen’-kaarten: plantje verzorgen, kaart maken, armband ontwerpen of een bekende helpen. Geen verplichte verkoop, foto-upload of contact met onbekenden. Echte activiteiten vereisen passende volwassen begeleiding. Praktijkkaarten leveren in MVP geen automatisch verifieerbare spelsterren op.

## 10. Acceptatietests
- Een hoofdstuk wordt precies eenmaal afgerond.
- Reward toegekend maar nog niet bekeken blijft na refresh beschikbaar.
- Twee gelijktijdige requests geven eenmaal sterren.
- Aankoop verlaagt bedrijfsmunten, nooit sterren.
- Alle modi tonen hetzelfde spelerstotaal.
- Task baselines blijven correct bij nieuwe sessie.
- Hulp voltooit geen persoonlijke leertaak.
- Historische backfill is idempotent.
- Sandbox kan geen campagneprestatie farmen.
- Nieuwe hoofdstukken beschadigen bestaande sessies niet.
- Laatste hoofdstuk laat een speelbaar bedrijf achter.
