"""Domain agents — they DECIDE, they do not DO.

Each agent owns a domain, optionally enriches the context via the ToolRegistry,
asks its injected ``DecisionEngine`` whether to act, and returns
``ProposedAction``s. Executing those actions (via the WorkflowEngine) is the
caller's responsibility, keeping the AI layer cleanly decoupled.

  * AriaAgent   — service / maintenance (proactive_service)
  * VaultAgent — inventory / procurement
  * CipherAgent  — finance / invoicing
"""

from __future__ import annotations

from typing import Any

from app.ai.interfaces import Agent, DecisionEngine, ProposedAction
from app.ai.tools import ToolRegistry, default_registry


class AriaAgent(Agent):
    """Service-domain agent. Decides when to run the proactive_service workflow."""

    key = "aria"
    domain = "service"

    def __init__(
        self, decision_engine: DecisionEngine, tools: ToolRegistry | None = None
    ) -> None:
        super().__init__(decision_engine, tools or default_registry)

    def evaluate(self, context: dict[str, Any]) -> list[ProposedAction]:
        ctx = dict(context)
        # Optionally enrich with telematics if only a vehicle id was provided.
        if "brake_life_pct" not in ctx and ctx.get("vehicle_id") and self.tools:
            reading = self.tools.get("fetch_telematics")(ctx["vehicle_id"])
            ctx.update(reading)

        decision = self.decision_engine.decide(ctx)
        if decision.should_execute and decision.workflow_key:
            return [
                ProposedAction(
                    workflow_key=decision.workflow_key,
                    context=ctx,
                    confidence=decision.confidence,
                    rationale=decision.rationale,
                )
            ]
        return []


class VaultAgent(Agent):
    """Inventory / procurement agent. Decides when stock needs replenishment."""

    key = "vault"
    domain = "inventory"

    def __init__(
        self, decision_engine: DecisionEngine, tools: ToolRegistry | None = None
    ) -> None:
        super().__init__(decision_engine, tools or default_registry)

    def evaluate(self, context: dict[str, Any]) -> list[ProposedAction]:
        qty = context.get("quantity_available")
        reorder = context.get("reorder_point")
        if qty is not None and reorder is not None and qty <= reorder:
            return [
                ProposedAction(
                    workflow_key="proactive_service",  # reuse PO steps within flow
                    context={**context, "needs_purchase": True},
                    confidence=80,
                    rationale=f"Available {qty} <= reorder point {reorder}; replenish.",
                )
            ]
        return []


class CipherAgent(Agent):
    """Finance agent. Decides when financial follow-up is warranted."""

    key = "cipher"
    domain = "finance"

    def __init__(
        self, decision_engine: DecisionEngine, tools: ToolRegistry | None = None
    ) -> None:
        super().__init__(decision_engine, tools or default_registry)

    def evaluate(self, context: dict[str, Any]) -> list[ProposedAction]:
        overdue_days = context.get("invoice_overdue_days", 0)
        if overdue_days and overdue_days > 7:
            return [
                ProposedAction(
                    workflow_key="proactive_service",
                    context=context,
                    confidence=70,
                    rationale=f"Invoice overdue by {overdue_days} days; follow up.",
                )
            ]
        return []


AGENT_CLASSES: dict[str, type[Agent]] = {
    AriaAgent.key: AriaAgent,
    VaultAgent.key: VaultAgent,
    CipherAgent.key: CipherAgent,
}


def build_agents(decision_engine: DecisionEngine) -> dict[str, Agent]:
    """Instantiate all agents wired to a shared decision engine."""
    return {key: cls(decision_engine) for key, cls in AGENT_CLASSES.items()}
