# Halo

**The AI-powered operating system for automobile dealerships.**

Halo runs a dealership's day-to-day operations — service, parts,
inventory, finance — as explicit, auditable **workflows**. Its defining design
choice: **business logic is AI-free.** Every operational step can be executed
manually by a human today. AI is a *separate, pluggable layer* whose only job is
to decide **when** to trigger a workflow.

> Think Stripe-grade engineering discipline applied to dealership operations:
> deterministic core, observable state machine, swappable AI and integrations.

---

## Why "business logic before AI"?

Most "AI products" bury non-deterministic model calls inside critical business
paths. That makes them impossible to audit, hard to certify, and brittle.

Halo inverts this:

| Layer | Responsibility | Deterministic? |
|-------|----------------|----------------|
| **Workflow Engine** | Executes business steps as a persisted state machine | ✅ Yes |
| **Step Handlers** | Pure business operations (inventory, PO, invoicing…) | ✅ Yes |
| **Integration Adapters** | Talk to SAP / DMS / telematics / messaging | ✅ Yes (mocked behind interfaces) |
| **AI Decision Layer** | *Only* decides **whether/when** to start a workflow | 🔌 Pluggable |

The AI layer never mutates business state. It proposes; the engine disposes.
You can run the entire product with AI turned off.

---

## Monorepo layout

```
McKinsey-casecomp/
├── apps/
│   ├── web/                 # Next.js 15 frontend (pre-existing — untouched)
│   └── api/                 # FastAPI backend  ← this document's focus
│       ├── app/
│       │   ├── core/        # config + security (JWT, RBAC, hashing)
│       │   ├── db/          # SQLAlchemy 2.0 models, session, seed
│       │   ├── workflows/   # Workflow Engine (state machine) + definitions + steps
│       │   ├── ai/          # Pluggable AI: interfaces, decision engine, agents, tools
│       │   ├── events/      # In-process EventBus (Redis-ready)
│       │   ├── integrations/# Mock adapters: SAP, DMS, AIS-140, WhatsApp, SMS, Email
│       │   ├── schemas/     # Pydantic v2 request/response models
│       │   ├── services/    # Thin service functions (routers stay declarative)
│       │   └── api/         # Routers wired under /api/v1
│       └── alembic/         # Migrations (wired to Settings + Base.metadata)
├── packages/                # Shared TS packages used by the web app (untouched)
├── docker-compose.yml       # Postgres + Redis + API + Web
└── docs/ARCHITECTURE.md     # Backend architecture deep-dive
```

---

## Tech stack

- **Backend:** FastAPI, SQLAlchemy 2.0 (typed `Mapped[]`), Pydantic v2,
  Alembic, Redis/Celery (workers optional).
- **Database:** PostgreSQL in production; **SQLite by default** for zero-config
  local dev.
- **Auth:** JWT access + refresh tokens (python-jose), bcrypt password hashing
  (passlib), role-based access control.
- **Frontend:** Next.js 15 / React 19 (in `apps/web`).

---

## Quickstart

### Option A — Docker (everything)

```bash
docker compose up --build
# API   → http://localhost:8000/docs
# Web   → http://localhost:3000
# Postgres + Redis come up automatically; the API seeds dev data on boot.
```

### Option B — Run locally

**API**

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.db.seed                 # creates SQLite db + demo data
uvicorn app.main:app --reload         # http://localhost:8000/docs
```

**Web**

```bash
npm install
npm run dev                           # http://localhost:3000
```

### Default login

```
email:    owner@apexmotors.in
password: password
```

---

## The flagship workflow: `proactive_service`

Triggered when a vehicle's telematics indicate imminent brake wear. The engine
runs these ordered steps, **pausing for human approval** at the estimate stage:

| # | Step | Notes |
|---|------|-------|
| 1 | `detect_brake_wear` | Confirm condition from latest telematics |
| 2 | `check_inventory` | Are the parts in stock? |
| 3 | `check_workshop_availability` | Find bay + technician slot |
| 4 | `generate_estimate` | Build customer estimate (₹, integer minor units) |
| 5 | `customer_approval` | ⏸ **Requires human approval** → `WAITING_APPROVAL` |
| 6 | `create_purchase_order` | Raise PO + sync to ERP (if parts needed) |
| 7 | `reserve_parts` | Soft-reserve stock |
| 8 | `book_appointment` | Schedule the service |
| 9 | `service_completed` | Close work order, sync to DMS |
| 10 | `invoice_generated` | Generate the invoice |
| 11 | `erp_sync` | Post invoice to the ERP ledger |

Drive it via the API:

```bash
POST   /api/v1/workflows/executions                      # start
GET    /api/v1/workflows/executions/{id}                 # inspect state machine
POST   /api/v1/workflows/executions/{id}/approve         # release the gate
POST   /api/v1/workflows/executions/{id}/retry           # retry a failed step
POST   /api/v1/workflows/executions/{id}/resume          # resume
```

---

## How AI plugs in

Three domain agents — **Aria** (service), **Vault** (inventory), **Cipher**
(finance) — each wrap an injected `DecisionEngine`. The shipped
`MockDecisionEngine` is a transparent rule engine (e.g. *brake life < 25% →
trigger `proactive_service`*). Swap in an `LLMDecisionEngine` by implementing the
same `decide(context) -> Decision` interface — **nothing else changes.**

```bash
GET    /api/v1/agents                  # list agents + active decision engine
POST   /api/v1/agents/evaluate         # agent decides; optionally executes
GET    /api/v1/agents/decisions        # audit trail of every AI decision
```

Agents **decide**; the Workflow Engine **executes**. Every decision is persisted
as an `AgentExecution` row for full traceability.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`apps/api/README.md`](apps/api/README.md) for details.
