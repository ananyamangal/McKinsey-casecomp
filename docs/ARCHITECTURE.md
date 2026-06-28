# Halo — Backend Architecture

This document explains how the Halo API is structured and, specifically,
**how the AI layer plugs into business workflows without contaminating them.**

## Guiding principle: business logic before AI

```
                ┌──────────────────────────────────────────────┐
                │                AI DECISION LAYER              │
                │   Agents (Aria / Vault / Cipher)           │
                │     └─ DecisionEngine (Mock today, LLM later) │
                │     └─ ToolRegistry (read-oriented tools)     │
                │   Output: ProposedAction (decide, don't do)   │
                └───────────────────────┬──────────────────────┘
                                        │ "trigger workflow X with context"
                                        ▼
   agent_service ── records AgentExecution (audit) ── calls ──┐
                                                              ▼
                ┌──────────────────────────────────────────────┐
                │              WORKFLOW ENGINE (AI-free)        │
                │   WorkflowExecution + WorkflowStep (DB rows)  │
                │   state machine: start → run → (pause) →      │
                │     approve / retry / resume → complete       │
                │   emits events → EventBus                     │
                └───────────────────────┬──────────────────────┘
                                        │ each step calls…
                                        ▼
                ┌──────────────────────────────────────────────┐
                │   STEP HANDLERS  (pure business logic)        │
                │   detect_brake_wear, check_inventory, …       │
                │   use INTEGRATION ADAPTERS (mocked):          │
                │     SAP · DMS · AIS-140 · WhatsApp · SMS · Email │
                └──────────────────────────────────────────────┘
```

**Every box below the dashed line runs without any AI** and can be invoked
manually by a human operator. The AI box only chooses *when* to start a flow.

## Layers

### 1. Core (`app/core`)
- `config.py` — `pydantic-settings` `Settings` with zero-config defaults
  (SQLite, in-process bus). Reads `DATABASE_URL`, `REDIS_URL`, JWT settings,
  CORS origins, `ENV`.
- `security.py` — bcrypt password hashing, JWT **access + refresh** tokens,
  `oauth2_scheme` bearer dependency, and a `require_roles(*roles)` RBAC factory.

### 2. Persistence (`app/db`)
- SQLAlchemy 2.0 declarative models with typed `Mapped[]` columns, String UUID
  PKs, timestamp mixin, Python enums, and money as **integer minor units**.
- `JSONType` resolves to JSONB on PostgreSQL and JSON on SQLite, so the same
  models run in dev and prod.
- 24 tables spanning organization, CRM, operations, inventory/procurement,
  finance, telematics/notifications, and the workflow/AI/audit backbone.

### 3. Workflow Engine (`app/workflows`)
The deterministic heart of the system.

- **`definitions.py`** — `WorkflowDefinition` (ordered `StepDefinition`s) +
  `REGISTRY`. Ships the flagship `proactive_service` definition.
- **`steps.py`** — the step handlers: pure functions over the execution context
  that perform real business operations via adapters and return output dicts.
- **`engine.py`** — `WorkflowEngine` persists every run as a
  `WorkflowExecution` with one `WorkflowStep` row per step. It:
  - `start()`s a run and advances step-by-step;
  - **pauses at human-approval gates** (`WAITING_APPROVAL`) and resumes on
    `approve()`;
  - supports `retry()` of a failed step, `resume()`, and `cancel()`;
  - merges each step's output back into the shared context;
  - publishes lifecycle events (`workflow.started`, `…step.completed`,
    `…waiting_approval`, `…completed`, `…failed`, …) to the `EventBus`.

### 4. AI layer (`app/ai`) — pluggable
- **`interfaces.py`** — `AIService`, `DecisionEngine` (`decide(context) ->
  Decision`), and `Agent` ABCs; `Decision` and `ProposedAction` dataclasses.
- **`decision_engine.py`** — `MockDecisionEngine` (transparent rules, e.g.
  *brake life < 25 → trigger*) and an `LLMDecisionEngine` placeholder documenting
  the swap seam.
- **`agents.py`** — `AriaAgent` (service), `VaultAgent` (inventory),
  `CipherAgent` (finance). Each injects a `DecisionEngine` and uses the
  `ToolRegistry`. **They contain no business logic** — they only `evaluate()` a
  context into `ProposedAction`s.
- **`tools.py`** — `ToolRegistry` of named, read-oriented callables (e.g.
  `fetch_telematics`, `lookup_vehicle`) that agents use to gather signals.

### 5. The bridge (`app/services/agent_service.py`)
The **only** place the AI and engine layers touch. It:
1. runs an agent over a context,
2. persists the decision as an `AgentExecution` audit row, and
3. **optionally** starts the proposed workflow via `WorkflowEngine`,
   back-linking the resulting `WorkflowExecution` to the decision.

This keeps decisioning and execution independently testable and replaceable.

### 6. Events (`app/events/bus.py`)
A tiny synchronous, topic-based pub/sub `EventBus` with `*` wildcard support.
Its interface is intentionally Redis-pubsub-shaped so a `RedisEventBus` can drop
in later without changing publishers.

### 7. Integrations (`app/integrations`)
Abstract adapter interfaces (`ERPAdapter`, `DMSAdapter`, `TelematicsAdapter`,
`MessagingAdapter`) with `Mock*` implementations returning realistic fake
responses behind a uniform `AdapterResponse` envelope, plus a `registry.py`
factory. Swapping in a real SAP/Twilio adapter means implementing the interface
and registering it — callers are unaffected.

### 8. API (`app/api`)
Routers wired under `/api/v1`: `auth` (login/refresh/me), `health`, `customers`,
`vehicles`, `inventory`, `work-orders`, `workflows` (definitions, executions,
start, approve, retry, resume), `agents` (list, evaluate, decisions). Routers
stay declarative; logic lives in `services/`. List endpoints support pagination.

## Request lifecycle example (`proactive_service`)

1. Telematics ingestion lowers a vehicle's `brake_life_pct` to 18.
2. `AriaAgent.evaluate({vehicle_id, brake_life_pct: 18})` asks the
   `DecisionEngine`, which returns `Decision(should_execute=True,
   workflow_key="proactive_service", confidence=…)`.
3. `agent_service` records an `AgentExecution` and (if `execute=True`) calls
   `WorkflowEngine.start("proactive_service", context)`.
4. The engine runs steps 1–4, then **pauses** at `customer_approval`
   (`WAITING_APPROVAL`) after sending the estimate via the WhatsApp adapter.
5. A human hits `POST /workflows/executions/{id}/approve`.
6. The engine resumes: PO → reserve parts → book appointment → complete service
   → invoice → ERP sync → `COMPLETED`.

At no point did AI execute business logic — it only made step 2's decision.

## Extensibility checklist

- **Real AI:** implement `DecisionEngine.decide` in an `LLMDecisionEngine`,
  inject it into the agents. Done.
- **New workflow:** add a `WorkflowDefinition` to the `REGISTRY` and its handlers
  to `steps.py`.
- **New integration:** implement the relevant adapter ABC and register it.
- **Distributed events:** replace `EventBus` with a Redis-backed implementation.
- **Background execution:** Celery/Redis are configured; long-running steps can
  be offloaded to workers.
