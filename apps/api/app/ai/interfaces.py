"""AI layer interfaces — the PLUGGABLE decision boundary.

The AI layer's ONLY job is to decide *when* to trigger a workflow. It contains
no business logic and never mutates business state directly; it returns
``ProposedAction``s that the surrounding orchestration may execute via the
(AI-free) WorkflowEngine.

Swap ``MockDecisionEngine`` for an ``LLMDecisionEngine`` by implementing
``DecisionEngine`` — nothing else changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Decision:
    """The output of a DecisionEngine for a single context."""

    should_execute: bool
    workflow_key: str | None = None
    confidence: int = 0  # 0-100
    rationale: str = ""


@dataclass(slots=True)
class ProposedAction:
    """What an agent proposes (it does NOT execute it itself)."""

    workflow_key: str
    context: dict[str, Any] = field(default_factory=dict)
    confidence: int = 0
    rationale: str = ""


class AIService(ABC):
    """Marker base for any AI-backed capability (decision, ranking, NLG...)."""

    name: str = "ai-service"


class DecisionEngine(AIService):
    """Decides whether a given context warrants triggering a workflow."""

    @abstractmethod
    def decide(self, context: dict[str, Any]) -> Decision: ...


class Agent(ABC):
    """Base class for domain agents.

    An agent owns a domain, uses an injected ``DecisionEngine`` plus a
    ``ToolRegistry`` to gather signals, and ``evaluate()``s a context into zero
    or more ``ProposedAction``s. It must not contain business logic.
    """

    key: str = "agent"
    domain: str = "generic"

    def __init__(self, decision_engine: DecisionEngine, tools: "Any | None" = None) -> None:
        self.decision_engine = decision_engine
        self.tools = tools

    @abstractmethod
    def evaluate(self, context: dict[str, Any]) -> list[ProposedAction]: ...
