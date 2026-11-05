# Maakrijk

Een Nederlandstalig educatief gameplatform waarin kinderen kleine bedrijfjes opzetten, laten groeien en verbeteren. Code, identifiers en comments zijn Engels.

- Product- en architectuurcontract: `docs/00-START-HIER.md` t/m `docs/06-…`
- Begrip, verschillen, releaseplan en beslissingen: `docs/build/`
- Release candidates: `docs/releases/`

## Stack

| Deel | Techniek |
|---|---|
| `services/api` | Rust 1.88, Axum 0.8, SQLx 0.8, Tokio, PostgreSQL 16 |
| `apps/web` | Nuxt 4 (statische SPA), Vue 3, strict TypeScript, Pinia, Tailwind 4 |
| Spelwerelden | Three.js (vanaf release 0.2) |

## Vereisten

- Docker met Compose
- Rust 1.88 of nieuwer
- Node.js 22 en npm

## Installeren

```bash
cp .env.example .env               # lokale standaardwaarden, geen geheimen
docker compose up -d db            # PostgreSQL op 127.0.0.1:5450 met maakrijk_dev, _preview en _test
cd apps/web && npm install && cd ../..
```

## Starten (development)

Twee terminals:

```bash
# 1. API op http://127.0.0.1:8800 (database maakrijk_dev)
cd services/api && cargo run --bin maakrijk-api

# 2. Web op http://127.0.0.1:3020 (proxy /api naar 8800)
cd apps/web && npm run dev
```

## Dev en preview naast elkaar

Dev en preview gebruiken een eigen database, eigen API-poort en eigen buildmap. Elk script weigert te starten als de poort al bezet is, en stopt nooit andere processen.

| | Dev | Preview |
|---|---|---|
| Database | `maakrijk_dev` | `maakrijk_preview` |
| API | `scripts/dev-api.sh` → 8800 | `scripts/preview-api.sh` → 8802 (eigen `target-preview/`) |
| Web | `npm run dev` → 3020, of `scripts/build-web.sh dev` | `scripts/preview-web.sh` → 3022, of `scripts/build-web.sh preview` |
| Buildmap | `apps/web/.output-dev/` | `apps/web/.output-preview/` |

Welke versie draait: open `/diagnose`, of `GET /api/version` (versie, commit, contract, databasenaam, laatste migratie). Wijkt het contract af, dan toont elke pagina een rode banner. Het contractnummer staat in `services/api/src/http/version.rs` en `apps/web/nuxt.config.ts`; verhoog beide bij een niet-compatibele API-wijziging.

Migraties draaien automatisch bij het starten van de API op de database van dat script.

## Tests

```bash
cd services/api && cargo test && cargo clippy --all-targets -- -D warnings
cd apps/web && npm test && npm run typecheck
```

Integratietests gebruiken `TEST_DATABASE_URL` en weigeren elke database waarvan de naam niet op `_test` eindigt.

## Poorten

| Doel | Poort |
|---|---|
| PostgreSQL | 5450 |
| API dev / e2e / preview | 8800 / 8801 / 8802 |
| Nuxt dev / preview | 3020 / 3022 |

Andere lokale projecten gebruiken 5433, 5434, 5440, 8790–8792 en 3010–3011; die worden niet aangeraakt.
