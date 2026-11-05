# Limonade-art

Illustraties voor de limonadekraam, in de stijl van `docs/design/` (vooraanzicht, warme kleuren, bruine contouren).

- Bron: `scripts/art/lemonade.mjs` genereert alle SVG's (100 px = 1 wereldeenheid). Pas kleuren of vormen daar aan en draai `node scripts/art/lemonade.mjs`.
- Gebruik in de game: de lijst `LEMONADE_ART` in `apps/web/app/game/lemonade/world.ts` (naam → bestand + grootte in wereldeenheden).
- Eigen (geschilderde) plaatjes gebruiken: zet een PNG met transparante achtergrond hier neer, met dezelfde verhouding als de SVG, en verander de `url` in `LEMONADE_ART`. Verder is geen code nodig.
- Elk sprite staat met de onderkant-midden op zijn plek; laat dus geen lege ruimte onder een object.
- Licentie: zelf gemaakt voor Maakrijk, geen externe bronnen.
