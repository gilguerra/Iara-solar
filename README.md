# Iara Solar

Automated solar panel installation estimation platform that works over **WhatsApp**.

A client sends a message, the system collects their energy consumption data, calculates the ideal solar system size, generates a price estimate, and suggests compatible equipment kits — all without human intervention.

Built to be sold as a white-label solution to other solar installation companies (**multi-tenant**).

---

## How it works

```
Client (WhatsApp)
      │
      ▼
   n8n workflow  ──► LLM (ChatGPT)   ← collects consumption data via conversation
      │
      ▼
   REST API  ──► PostgreSQL          ← creates lead + budget request + quote + kits
      │
      ▼
   Response sent back to client via WhatsApp
```

The main API call from n8n is a single endpoint:

```
POST /intake/generate-with-kits
```

It creates the lead, the budget request, generates the quote, and returns matching equipment kits — all in one atomic transaction.

---

## Stack

| Layer | Technology |
|---|---|
| API | Node.js 22, Fastify 5 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Workflow automation | n8n |
| Reverse proxy / SSL | Traefik v2 + Let's Encrypt |
| Containerization | Docker + Docker Compose |

---

## Project structure

```
iara-solar/
├── apps/
│   └── api/               Node.js API (Fastify)
│       └── src/
│           ├── config/    Environment config
│           ├── lib/       DB and Redis clients
│           ├── middleware/ Auth (API key validation)
│           ├── repositories/ Data access layer
│           ├── routes/    HTTP route handlers
│           └── services/  Business logic (quote generation, Solar API)
├── infra/
│   ├── data/              Docker volume mounts (gitignored)
│   ├── db/
│   │   ├── migrations/    SQL migrations (run in order)
│   │   └── seeds/         Sample data for development
│   ├── traefik/           SSL certificate storage
│   ├── docker-compose.yml
│   ├── .env               Local secrets (gitignored)
│   └── .env.example       Template — copy this to .env
├── scripts/
│   └── generate-api-key.js  Generates API keys for tenants
└── workflows/
    └── n8n/               Export your n8n workflows here (JSON)
```

---

## Running locally

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (only needed to run the API outside Docker)

### 1. Set up environment variables

```bash
cp infra/.env.example infra/.env
# Edit infra/.env with your values
```

### 2. Start all services

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL, Redis, n8n, the API, and Traefik.

### 3. Apply database migrations

```bash
# Connect to the database container
docker exec -it iara-solar-postgres psql -U iara -d iara_solar

# Inside psql, run each migration in order:
\i /path/to/infra/db/migrations/001_init.sql
\i /path/to/infra/db/migrations/002_crawler_schema.sql
\i /path/to/infra/db/migrations/003_tenants.sql
```

See [infra/db/README.md](infra/db/README.md) for the full migration guide.

### 4. Check the API is running

```bash
curl http://localhost:3000/health
```

---

## Multi-tenant setup

Each company using the platform is a **tenant**. Tenants are isolated — they see only their own leads, quotes, and supplier catalogs.

### Creating a new tenant

```sql
INSERT INTO tenants (name, slug, plan, status)
VALUES ('Solar Prime', 'solarprime', 'starter', 'active')
RETURNING id;
```

### Generating an API key for a tenant

```bash
node scripts/generate-api-key.js
```

This outputs a `KEY` and a `HASH`. Store only the hash in the database:

```sql
INSERT INTO api_keys (tenant_id, key_hash, name)
VALUES ('<tenant-uuid>', '<HASH>', 'n8n-production');
```

The `KEY` goes into n8n (or any API client) as the `X-API-Key` request header. **Never store the raw key in the database.**

---

## API authentication

All endpoints (except `/health` and `/version`) require the `X-API-Key` header:

```
X-API-Key: <raw-key>
```

The API validates the key, resolves the tenant, and scopes all queries to that tenant automatically.

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Quick health check |
| `GET` | `/health/full` | Health check with DB + Redis status |
| `GET` | `/version` | API version |
| `POST` | `/intake/generate-with-kits` | **Main endpoint** — full flow in one call |
| `POST` | `/intake/generate` | Lead + budget request + quote (no kit matching) |
| `POST` | `/intake` | Lead + budget request only |
| `GET` | `/leads` | List all leads for the tenant |
| `POST` | `/leads` | Create a lead |
| `GET` | `/budget-requests` | List all budget requests |
| `POST` | `/budget-requests` | Create a budget request |
| `GET` | `/quotes` | List all quote versions |
| `POST` | `/quotes/generate` | Generate a new quote version from a budget request |
| `GET` | `/supplier-kits` | List all active kits for the tenant |
| `GET` | `/supplier-kits/match?target_kwp=5.0` | Find kits closest to a target power (kWp) |

### Main endpoint — request body

```json
POST /intake/generate-with-kits
X-API-Key: <key>

{
  "lead": {
    "full_name": "João Silva",
    "phone": "5511999999999",
    "email": "joao@example.com",
    "city": "São Paulo",
    "state": "SP",
    "address_text": "Rua das Flores, 123"
  },
  "budget_request": {
    "monthly_consumption_kwh": 450,
    "bill_amount_brl": 380.00,
    "utility_company": "Enel SP",
    "connection_type": "monofasico",
    "installation_type": "residencial",
    "roof_type": "ceramica"
  },
  "kits_limit": 3
}
```

---

## Quote generation

The pre-quote uses the following model (`pre_quote_v1`):

| Parameter | Value | Source |
|---|---|---|
| Generation factor | 4.5 peak sun hours/day (≈ 135 kWh/kWp/month) | Brazil average / Google Solar API |
| System cost | R$ 4,500 / kWp | Fixed estimate |
| Bill savings | 90% of current bill | Conservative factor |

**Google Solar API integration** is stubbed and ready. When you have an API key:
1. Add `GOOGLE_SOLAR_API_KEY` to `infra/.env`
2. Pass `latitude` and `longitude` in the budget request
3. Uncomment the fetch call in [apps/api/src/services/solarIrradiationService.js](apps/api/src/services/solarIrradiationService.js)

The system will then use real irradiation data for the specific installation address instead of the national average.

---

## Environment variables

See [infra/.env.example](infra/.env.example) for the full list with descriptions.

Key variables:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password |
| `N8N_ENCRYPTION_KEY` | n8n internal encryption key (generate with `openssl rand -hex 32`) |
| `N8N_BASIC_AUTH_PASSWORD` | n8n admin panel password |
| `GOOGLE_SOLAR_API_KEY` | Optional — enables real irradiation data per address |

---

## n8n workflows

Workflows are built in the n8n visual editor at `https://n8n.yourdomain.com`.

After building or modifying a workflow, export it as JSON and save it to `workflows/n8n/` so it's version-controlled. To export: **n8n → Settings → Download**.

---

## License

Private — all rights reserved.
