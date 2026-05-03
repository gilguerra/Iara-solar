# Iara Solar — Project Backlog

> Última atualização: 29 Abril 2026

---

## O que é o projeto

**Iara Solutions** é uma plataforma B2B SaaS que automatiza o atendimento de empresas instaladoras de energia solar via WhatsApp. A IA coleta os dados do cliente final, calcula o sistema fotovoltaico necessário, seleciona o kit mais adequado do catálogo do distribuidor e retorna um orçamento personalizado — tudo automaticamente.

**Modelo de negócio:**
- Assinatura mensal paga pelas empresas instaladoras (SaaS fee)
- Comissão percentual sobre negócios fechados via plataforma (Stripe Connect)

---

## Infraestrutura

### Servidor
- Hetzner VPS (Linux Ubuntu)
- Docker + Docker Compose
- Traefik v2.11 como reverse proxy com SSL automático (Let's Encrypt)
- Fail2ban instalado e configurado (jail `traefik-auth` ativo)
- Rate limiting via Traefik (API: 30 req/min, n8n: 20 req/min)
- Rede Docker compartilhada (`traefik-public`) para múltiplos projetos

### Domínios ativos
| Domínio | Serviço |
|---|---|
| `api.iarasolar.com` | API Fastify |
| `n8n.iarasolar.com` | n8n automation |
| `iara-solutions.com` | Site institucional Iara Solutions |
| `iarasolar.com` | Landing + Portal do integrador (Iara Solar) |

---

## O que já foi feito

### Backend — `iara-solar` API (Fastify + Node 22)

- [x] Estrutura do projeto com Fastify 5
- [x] Autenticação por `X-API-Key` (SHA-256 hash no banco)
- [x] Multi-tenancy completo (tabela `tenants` + `api_keys`)
- [x] Migrations sequenciais (001 a 006)
- [x] Endpoints de intake de leads e geração de orçamentos
- [x] Seleção automática de kit (janela de sobrecarga 30-60%, menor preço)
- [x] Serviço de irradiação solar (stub com fallback Brasil 4.5 kWh/kWp/dia)
- [x] Webhook Clerk (`POST /webhooks/clerk`) — cria tenant automaticamente no cadastro
- [x] Autenticação JWT via Clerk (`clerkAuthMiddleware`)
- [x] Endpoint `GET /me` — retorna dados do tenant logado
- [x] Endpoint `GET /me/stats` — estatísticas do dashboard
- [x] Endpoint `GET /portal/kits` — lista kits do tenant com filtros
- [x] Endpoint `PUT /portal/kits/:id/toggle` — ativa/desativa kit
- [x] Endpoint `POST /setup/distributor` — salva credenciais do distribuidor
- [x] CORS configurado para `iara-solutions.com`
- [x] Script `generate-api-key.js`

### Banco de dados (PostgreSQL 16)

- [x] Migration 001 — schema base (leads, budget_requests, quote_versions)
- [x] Migration 002 — supplier_kits, supplier_sources, supplier_kit_prices
- [x] Migration 003 — tenants, api_keys, tenant_id em todas as tabelas
- [x] Migration 004 — conversation_sessions, conversation_messages
- [x] Migration 005 — clerk_user_id, email, phone, cnpj em tenants
- [x] Migration 006 — stripe_account_id, waba_id, distributor_code, commission_pct, etc.
- [x] 4 kits solares cadastrados (tenant Default)
- [x] 1 tenant real criado via Clerk webhook (Iara Solar)

### n8n Workflow

- [x] Workflow v4 (`iara-solar-conversation-v4.json`)
- [x] Coleta de dados via WhatsApp (LangChain + GPT-4.1-mini)
- [x] Processamento de conta de luz via imagem (GPT-4o vision)
- [x] Cálculo determinístico de `missing_fields` e `is_ready_for_quote`
- [x] Integração com API (`POST /intake/generate-with-kits`)
- [x] Gestão de sessão de conversa no PostgreSQL
- [x] Suporte a `bill_not_available` (sem conta de luz)

### Portal do Integrador — `iarasolar.com` (React + Vite + TanStack Router)

- [x] Landing page gerada no Lovable (dark navy + âmbar) em produção em `iarasolar.com`
- [x] Autenticação via Clerk (login, cadastro, verificação de email, esqueci a senha)
- [x] Dashboard com dados reais da API (`/me`, `/me/stats`) — tema solar
- [x] Tela WhatsApp Setup — status real (conectado/não conectado)
- [x] Tela Distribuidor Setup — status real + formulário funcional salva no banco
- [x] Tela Kits — lista kits reais do banco com busca e toggle ativo/inativo
- [x] Telas Orçamentos, Negócios (kanban + tabela), Faturamento, Configurações da Conta
- [x] Proteção de rota — redireciona para `/login` se não autenticado
- [x] Navbar com botão "Acessar Portal" → `/register` e link "Entrar" → `/login`
- [x] Build via Docker multi-stage (Node 22 + nginx alpine)
- [x] Deploy via Traefik com SSL automático

### Site Institucional — `iara-solutions.com` (React + Vite)

- [x] Landing page institucional com cards Iara Solar e Iarabot
- [x] Logos com fundo transparente: `iara_solar_sf.png`, `logo_iarabot_sf.png`, `iara_solutions_sf.png`
- [x] Navbar com logo Iara Solutions (sem botão de portal — portal migrado para `iarasolar.com`)
- [x] Botão WhatsApp fixo → `wa.me/5561993019531`
- [x] Cards "Saiba Mais" com links: `iarasolar.com` e `iarabot.com`

### Segurança

- [x] `.gitignore` protegendo `.env`, `acme.json`, dados sensíveis
- [x] API keys armazenadas apenas como hash SHA-256
- [x] Fail2ban configurado (bane IPs com 20+ erros 4xx em 1 minuto por 1 hora)
- [x] Rate limiting Traefik (API: 30 req/min, n8n: 20 req/min)
- [x] HTTP → HTTPS redirect global
- [x] HTTPS com SSL automático em todos os domínios
- [x] Logs de acesso Traefik para auditoria

### DevOps

- [x] Docker Compose multi-serviço (Postgres, Redis, n8n, API, Traefik)
- [x] Rede Docker externa compartilhada (`traefik-public`, `iara-solar-net`)
- [x] SSH configurado com chave pública para GitHub
- [x] Repositório GitHub conectado (`gilguerra/iara-ai-solutions`)
- [x] Workflow de deploy: `git pull` → `npm run build` → nginx serve `dist/`

---

## O que ainda falta fazer

### Segurança do servidor (URGENTE)

- [ ] **Mudar porta SSH de 22 para 2222** — reduz 99% do brute force automatizado
- [ ] **Desabilitar `PasswordAuthentication`** no SSH (apenas chave pública)
- [ ] **Bloquear porta 22 no firewall** após configurar porta 2222
- [ ] **Confirmar Fail2ban para SSH** na nova porta 2222
- [ ] Habilitar firewall Hetzner bloqueando todas as portas exceto 80, 443, 2222

### Portal do Integrador — telas ainda mockadas

- [ ] **Tela Orçamentos** — conectar ao banco (listar `quote_versions` do tenant)
- [ ] **Tela Negócios (Deals)** — criar tabela `deals` no banco + endpoints + tela real
- [ ] **Tela Faturamento (Billing)** — integrar com Stripe Subscriptions
- [ ] **Tela Stripe Setup** — Stripe Connect OAuth para receber comissões
- [ ] **Tela Configurações da Conta** — salvar nome, CNPJ, logo no banco via `PUT /me/settings`

### Backend — endpoints faltando

- [ ] `GET /portal/quotes` — listar orçamentos do tenant
- [ ] `GET /portal/quotes/:id` — detalhe do orçamento
- [ ] `GET /portal/deals` — listar negócios do tenant
- [ ] `POST /portal/deals` — registrar negócio a partir de orçamento
- [ ] `PUT /me/settings` — atualizar perfil do tenant
- [ ] `POST /setup/whatsapp` — salvar `waba_id` e `phone_number_id` após Meta Embedded Signup

### Banco de dados

- [ ] Migration 007 — tabela `deals` (quote_id, status, deal_amount, commission, stripe_payment_intent_id)
- [x] ~~Migrar kits do tenant Default para o tenant Iara Solar~~ — supplier_source BlueSun migrado para tenant Iara Solar

### WhatsApp / Meta

- [ ] Aguardar aprovação Meta Business Account
- [ ] Implementar Meta Embedded Signup no portal (tela WhatsApp Setup)
- [ ] Registro de webhook por tenant após conexão
- [ ] Roteamento multi-tenant no n8n (lookup por `phone_number_id`)

### Pagamentos (Stripe)

- [ ] Criar produto e plano no Stripe (assinatura mensal)
- [ ] Stripe Connect OAuth para solar companies receberem pagamentos
- [ ] Webhook Stripe (`payment_intent.succeeded`) → atualizar status do deal
- [ ] Geração de link de pagamento após orçamento aceito
- [ ] Tela Faturamento mostrando assinatura ativa e histórico de faturas

### Distribuidor de Kits

- [ ] Crawler para Aldo Solar / Solenerg / Renovigi (sync automático de catálogo)
- [ ] Sincronização periódica de preços (cron job)
- [ ] Botão "Sincronizar agora" funcional na tela de Kits

### Produto — funcionalidades futuras

- [ ] Geocodificação de endereço → lat/lon para Google Solar API real
- [ ] Integração Google Solar API (irradiação real por localização)
- [ ] Link de pagamento enviado via WhatsApp após orçamento aceito
- [ ] Notificações por email (novo orçamento, deal fechado)
- [ ] Relatórios e analytics no dashboard
- [ ] Onboarding guiado (wizard de primeiros passos)

### Produção (Clerk)

- [ ] Criar instância Production no Clerk (`pk_live_`)
- [ ] Verificar domínio `iara-solutions.com` no Clerk
- [ ] Atualizar chaves no `.env` para produção

---

## Arquitetura atual resumida

```
iara-solutions.com (React/Vite)
    → Clerk (auth)
    → api.iarasolar.com (Fastify API)
        → PostgreSQL 16
        → Redis

n8n.iarasolar.com
    → WhatsApp webhook (futuro)
    → api.iarasolar.com/intake/generate-with-kits
    → OpenAI GPT-4.1-mini / GPT-4o

Traefik (reverse proxy + SSL)
Fail2ban (proteção brute force)
```
