# Database — Migrations & Seeds

This directory contains all SQL files for the `iara_solar` database.

There is no automated migration runner — migrations are applied manually via `psql`. This keeps the setup simple and gives you full control over when schema changes are applied.

---

## Directory structure

```
infra/db/
├── migrations/
│   ├── 001_init.sql           Core schema: leads, budget_requests, quote_versions, audit_logs
│   ├── 002_crawler_schema.sql Supplier catalog: supplier_sources, crawl_runs, supplier_kits, prices
│   └── 003_tenants.sql        Multi-tenancy: tenants, api_keys, tenant_id columns, lat/lon on budgets
└── seeds/
    └── 001_seed_bluesun_kits.sql  Sample BlueSun supplier + 4 solar kits (development only)
```

---

## Applying migrations

### Via Docker (recommended)

Copy the migration files into the running container and execute them:

```bash
# Copy files into the container
docker cp infra/db/migrations/. iara-solar-postgres:/tmp/migrations/

# Connect and run in order
docker exec -it iara-solar-postgres psql -U iara -d iara_solar \
  -f /tmp/migrations/001_init.sql \
  -f /tmp/migrations/002_crawler_schema.sql \
  -f /tmp/migrations/003_tenants.sql
```

### Via psql directly (if PostgreSQL is installed locally)

```bash
psql -h localhost -U iara -d iara_solar \
  -f infra/db/migrations/001_init.sql \
  -f infra/db/migrations/002_crawler_schema.sql \
  -f infra/db/migrations/003_tenants.sql
```

### One-liner (all migrations)

```bash
for f in infra/db/migrations/*.sql; do
  docker exec -i iara-solar-postgres psql -U iara -d iara_solar < "$f"
done
```

> **Always run migrations in numerical order.** Each file may depend on objects created by the previous one.

---

## Applying seeds

Seeds insert sample data for development and testing. **Do not run seeds in production.**

Migration 003 must be applied first (seeds depend on the `tenants` table).

```bash
docker exec -i iara-solar-postgres psql -U iara -d iara_solar \
  < infra/db/seeds/001_seed_bluesun_kits.sql
```

The seed creates:
- A `BlueSun Energia Solar` supplier source (linked to the `default` tenant)
- 4 solar kits (5 kWp, 6.72 kWp, 7.28 kWp, 10.08 kWp)
- Pricing snapshots for each kit

It is safe to run multiple times — all inserts use `ON CONFLICT DO NOTHING`.

---

## Setting up a fresh database

Full sequence for a clean install:

```bash
# 1. Start the database container
docker compose -f infra/docker-compose.yml up -d postgres

# 2. Create the application database (if it doesn't exist yet)
docker exec -it iara-solar-postgres psql -U iara -c "CREATE DATABASE iara_solar;"

# 3. Apply all migrations in order
for f in infra/db/migrations/*.sql; do
  docker exec -i iara-solar-postgres psql -U iara -d iara_solar < "$f"
done

# 4. (Optional) Load sample data
docker exec -i iara-solar-postgres psql -U iara -d iara_solar \
  < infra/db/seeds/001_seed_bluesun_kits.sql

# 5. Create your first tenant
docker exec -it iara-solar-postgres psql -U iara -d iara_solar -c "
  INSERT INTO tenants (name, slug, plan, status)
  VALUES ('Iara Solar', 'iarasolar', 'starter', 'active')
  RETURNING id;
"

# 6. Generate and store an API key
node scripts/generate-api-key.js
# Then insert the HASH into api_keys (see root README for instructions)
```

---

## Migration naming convention

New migration files must follow the pattern:

```
NNN_short_description.sql
```

Where `NNN` is the next sequential number (`004`, `005`, ...). Always increment — never reuse or reorder numbers.

---

## Schema overview

### Core tables (001)

| Table | Description |
|---|---|
| `leads` | Customer contacts captured from WhatsApp |
| `budget_requests` | Energy consumption data submitted by the client |
| `quote_versions` | Generated solar system estimates (versioned per budget request) |
| `audit_logs` | System activity trail |

### Supplier catalog (002)

| Table | Description |
|---|---|
| `supplier_sources` | Equipment suppliers (one per company/crawler) |
| `crawl_runs` | Batch import history |
| `supplier_kits` | Available solar kits with technical specs |
| `supplier_kit_prices` | Price snapshots per kit (historical) |

### Multi-tenancy (003)

| Table | Description |
|---|---|
| `tenants` | Companies using the platform |
| `api_keys` | Per-tenant API keys (stored as SHA-256 hashes) |

All business tables (`leads`, `budget_requests`, `quote_versions`, `supplier_sources`) have a `tenant_id` column that scopes data to the owning company.
