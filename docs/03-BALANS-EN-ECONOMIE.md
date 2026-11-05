# Maakrijk — balans en economie

## 1. Status van de cijfers
Alle bedragen in dit document zijn voorgestelde startwaarden voor een nieuwe balansversie, geen beschrijving van de huidige database. Inventariseer bestaande waarden eerst. Pas bestaande saldi, prijzen van geaccepteerde orders of historische transacties niet retroactief aan.

Gebruik een benoemde balansversie per sessie/order. Nieuwe balansparameters worden expliciet geactiveerd met migratiebeleid. Een configwijziging mag lopende productie niet stilzwijgend veranderen.

## 2. Twee gescheiden waardesystemen
### Bedrijfsmunten
Per kind en modus, besteedbaar aan voorraad en bedrijfsgroei. Geen geldtransfer tussen modi in de eerste release.
### Sterren
Eén cumulatief spelersbreed prestatietotaal. Niet besteedbaar, daalt niet bij een aankoop en is niet de optelsom van muntsaldi. Geen derde valuta.

## 3. Financiële rekenregels
Saldo_eind = saldo_begin + verkoop + expliciete_toekenningen - voorraadinkoop - bedrijfskosten - investeringen.

Ronderesultaat = omzet - verbruikskosten - bedrijfskosten.

Aankoop en verbruik zijn verschillend: ongebruikte voorraad is geen verbruikskosten van de huidige ronde. Begin MVP zonder verkoop van grondstoffen; registreer verbruik per productie/order om restvoorraad correct toe te rekenen.

Investering is een aparte regel: toon ‘winst uit verkopen’ en ‘uitgegeven aan verbeteringen’. Introduceer geen boekhoudkundige afschrijving in de kindinterface.

Geen floating point voor geld. Gebruik gehele munten en integerhoeveelheden. Indien halve hoeveelheden nodig zijn: schaal basiseenheden expliciet op, geen impliciete afronding.

## 4. Ledger
Elke mutatie: transactionId, gameId/profileId, kind, signedAmount, reference, commandId, balanceVersion, createdAt, balanceVersionId.

`reference` uniek binnen het betreffende grootboek. Betaling verwijst naar order/klant-id; aankoop naar aankoop-id; startkapitaal naar spel-id. Saldo en ledger worden atomair bijgewerkt.

Correctie van een fout via expliciete tegenboeking met auditreden, niet door historische regels te wijzigen. Saldo mag nooit negatief zijn. De som van alle ledgerregels moet het saldo reconstrueren.

## 5. Voorstel baseline nieuwe sessies
| Modus | Start | Eén ronde/recept | Omzet | Kosten | Bijdrage vóór investeringen |
|---|---:|---|---:|---:|---:|
| Limonade | 12 | 3 citroenen + 1 suiker → 4 bekers | 8 | 4 | 4 |
| Roze limonade | bestaand saldo | basis + 2 aardbeien → 4 bekers | 12 | 6 | 6 |
| Wortels | 10 | 8 wortels → 2 dozen | 12 | 5 | 7 |
| Melk | bestaand saldo | verzorging → 4 flessen | 12 | 6 | 6 |
| Speelgoed | 20 | 1 auto + 4 wielen + 1 doos | 10 | 8 incl. vervoer | 2 |
| Planten | 10 | 3 plantjes | 12 | 6 | 6 |
| Armbandjes | 12 | 2 eenvoudige armbandjes | 12 | 6 | 6 |

Specificatie voorbeelden:
- Limonade: citroen 1, suikerportie 1, aardbei 1; bekers inbegrepen in abstracte receptkosten. Voeg geen ongemelde verpakkingskosten toe.
- Wortels: zaad 2 per batch, dozen samen 2, rit 1.
- Melk: voer 2, vier flessen samen 2, verwerking 1, koelrit 1; water zit in deze vereenvoudiging zonder aparte muntkosten.
- Speelgoed: auto zonder wielen 2, vier wielen 4, doos 1, rit 1.
- Planten en armbandjes: werk kostenregels uit in seeddata vóór implementatie; totalen moeten aansluiten.

Deze waarden dienen om een klein speelbaar scenario te testen. Test niet alleen eindsaldo maar ook saldo en voorraad na iedere actie.

### 5a. Limonade als idle clicker (balans `2026-11-c`, besluiten D13/D14)
Vanaf 0.2 RC 5 verkoopt de kraam **vanzelf**: 0,25 beker per seconde vanaf het eerste command (15 bekers = netto 15 munten per minuut). Tikken op de pers verkoopt extra bekers. De receptcijfers hierboven blijven gelden, maar de ingrediënten worden **automatisch per kan** ingekocht.
- Eén tik = `bekers per tik` bekers à 2 munten. Begint een nieuwe kan, dan wordt de kan (3 citroenen + 1 suiker = 4 munten) op dat moment afgeboekt als `materials`. Bijdrage per kan blijft 8 − 4 = 4.
- Eerste tik: 12 → 10 (+2, −4). Na 4 tikken: 16.
- Tikken worden door de client gebundeld; de server accepteert maximaal 12 tikken per seconde (buffer 24). Overtollige tikken worden genegeerd, niet geweigerd.

## 6. Upgrades: startvoorstel

**Limonade (idle clicker, balans `2026-11-c`).** Prijzen per niveau zijn met de hand gekozen en stijgen; geen formule. De hint wijst alleen naar upgrades die het vanzelf sneller of goedkoper maken.

| Upgrade | Object in de wereld | Prijzen per niveau | Effect per niveau |
|---|---|---|---|
| Betere pers | pijltje op de pers | 10, 30, 80, 200, 500 | +1 beker per tik |
| Hulpje | bordje "hulp gezocht" | 15, 40, 100, 250, 600 | +0,5 beker per seconde (30 per minuut) vanzelf |
| Reclame | groot bord boven de kraam | 40, 120, 350 | +50% op alles wat vanzelf gaat |
| Citroenboom | plantje naast de kist | 60 (één niveau) | citroenen gratis: een kan kost 1 munt in plaats van 4 |

Eerste hint: het hulpje (15). Zonder tikken haalbaar na ongeveer 28 seconden (18 munten, één beker in de kan); daarna 45 bekers per minuut. De oude tabel hieronder geldt voor de andere modi en als richting.

| Modus | Upgrade | Prijs | Werkelijk effect |
|---|---|---:|---|
| Limonade | Grotere kan | 12 | 4 → 8 bekers capaciteit; geen gratis ingrediënten |
| Limonade | Voorraadrek | 16 | 2 → 4 batches voorraadruimte |
| Limonade | Extra bereidingsplek | 24 | Tweede productietaak mogelijk |
| Boerderij | Extra akker | 21 | Tweede bron met eigen oogst |
| Boerderij | Tweede tractor | 28 | Tweede parallelle transporttaak |
| Fabriek | Tweede werkbank | 8 | Parallelle assemblage; voldoende logistiek vereist |
| Planten | Kleine kas | 18 | Extra kweekplekken |
| Atelier | Extra werktafel | 18 | Tweede orderplek |

Geen automatische ordervraagverhoging zonder expliciet effect. Capaciteit is niet hetzelfde als winst. Verkoopprijs stijgt niet automatisch door een grotere machine.

Doel voor eerste bruikbare upgrade: grofweg 2–4 betekenisvolle succesvolle rondes. Dit is een ontwerptarget, geen gemeten resultaat. Pas prijs of introductieopdracht aan als een upgrade onredelijk lang duurt. Niet alle prijzen via één exponentiële formule genereren.

## 7. Vastlooppreventie
Bereken bij aankoop welke middelen nog nodig zijn voor de actieve order, gegeven voorraad, reeds geboekte kosten en toegestane tussentijdse verkopen. Een simpele vaste geldreserve is niet altijd voldoende.

MVP-houding:
- Geen verkoopverplichting accepteren die bij geldige start al onuitvoerbaar is.
- Discretionaire upgrades mogen benodigde werkkapitaalruimte niet opslokken.
- Inkopen voor de huidige order worden niet geblokkeerd door een onjuist berekende reserve.
- Incrementeel produceren/verkopen alleen wanneer modus dit ondersteunt.
- Geen gratis materiaal uit retries of annuleringen.

Limonade-clicker: een upgrade wordt geweigerd (`would_get_stuck`) als daarna `munten + bekers in de kan × bekerprijs < kosten van een kan`. Zo kan de volgende beker altijd gemaakt worden. Een tik kan daardoor nooit vastlopen (getest met 40 willekeurige spelverlopen).

Als geen geldige vervolgstap bestaat: hersteloptie voor de concrete blokkade, expliciet gelogd en zonder farmbare sterren. Verberg structurele engineproblemen niet met steeds nieuw gratis geld.

## 8. Tijd en automatisering
Voorstel actieve productietijden 2–6 seconden; lange groei mag visueel worden samengevat. Geen wachten van minuten als verplichte kernhandeling in de eerste release.

Automatisering alleen als bestaande scope dit bevat: vaste servertijdlijn, monotone settledTo, budgetlimiet, expliciete stopreden en hoogstens één verwerking per moment. Persoonlijke leeropdrachten worden niet automatisch voltooid. Geen afwezigheidsstraf of onbeperkte achtergrondwinst.

Limonade (D13/D14): de server rekent de verkoop vanzelf (basis + hulpjes, maal reclame) bij elk command de tijd sinds `settledTo` af, met een **plafond van 2 uur** per afwezigheid (`awayCapMs`). Breuken van een beker blijven bewaard (`carryMilli`). Ledgerreferenties `sale:auto:<settledTo-ms>` en `materials:auto:<settledTo-ms>` maken elke afrekening uniek. Lezen (`GET`) rekent alleen in het geheugen af; het eerstvolgende command boekt precies één keer. Kijkt het kind lang naar het scherm, dan stuurt de client elke minuut `collect`, zodat het plafond alleen geldt voor echte afwezigheid. Bij terugkomst na meer dan een minuut toont de client "Welkom terug" met de verdiensten.

## 9. Balanscontrole
Maak een deterministische simulatieharness met dezelfde Rust-domainregels, geen aparte vereenvoudigde spreadsheet-engine.

Scenario’s: normaal spelen, minimale voorraad, verkeerd inkopen binnen toegestane grenzen, vroeg upgraden, maximale opslag, twee voertuigen, restvoorraad, twee tabbladen, hervatten en wisselende recepten.

Lever CSV’s met per stap: tijd, actie, saldo, voorraad, omzet, kosten, investeringen, orderstatus en vrijgespeelde opties. Meet rondes tot eerste upgrade en nieuwe keten. Vergelijk baseline en gewijzigde balans.

## 10. Acceptatie
- Ledger = saldo, ook na retries, refresh en concurrentie.
- Geen negatieve of gedupliceerde voorraad.
- Restvoorraad wordt niet dubbel als kosten geboekt.
- Orderbetaling eenmaal.
- Elke upgrade heeft aantoonbaar effect.
- Eerste upgrade haalbaar volgens vastgelegde route zonder verborgen toekenningen.
- Tests voor tussenstanden, niet alleen eindtotalen.
