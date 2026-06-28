"""Decision engines.

``MockDecisionEngine`` is a transparent, rule-based stand-in for a future LLM.
Because it implements ``DecisionEngine``, an ``LLMDecisionEngine`` (calling a
hosted model) can be dropped in with zero changes to agents or workflows.
"""

from __future__ import annotations

from typing import Any

from app.ai.interfaces import Decision, DecisionEngine


class MockDecisionEngine(DecisionEngine):
    """Simple, explainable rule engine over the supplied context.

    Rules are intentionally readable so the decision boundary is obvious. A real
    deployment would replace this class with one that calls an LLM / ML model.
    """

    name = "mock-decision-engine"

    # Threshold below which brake wear is considered actionable.
    BRAKE_LIFE_THRESHOLD = 25

    def decide(self, context: dict[str, Any]) -> Decision:
        brake_life = context.get("brake_life_pct")
        if brake_life is not None and brake_life < self.BRAKE_LIFE_THRESHOLD:
            # Lower brake life -> higher confidence (clamped to 100).
            confidence = min(100, int((self.BRAKE_LIFE_THRESHOLD - brake_life) * 4 + 60))
            return Decision(
                should_execute=True,
                workflow_key="proactive_service",
                confidence=confidence,
                rationale=(
                    f"Brake life {brake_life}% is below the "
                    f"{self.BRAKE_LIFE_THRESHOLD}% threshold; proactive service "
                    "recommended."
                ),
            )

        return Decision(
            should_execute=False,
            workflow_key=None,
            confidence=20,
            rationale="No actionable maintenance condition detected.",
        )


class LLMDecisionEngine(DecisionEngine):
    """Placeholder for a real LLM-backed engine (not wired to any provider).

    Kept here to document the seam: implement ``decide`` by prompting a model
    and parsing a structured Decision. The rest of the system is unaffected.
    """

    name = "llm-decision-engine"

    def __init__(self, model: str = "unconfigured") -> None:
        self.model = model

    def decide(self, context: dict[str, Any]) -> Decision:  # pragma: no cover
        raise NotImplementedError(
            "LLMDecisionEngine is a placeholder. Implement model calls here to "
            "swap in real AI without touching the workflow engine."
        )
