"""Bridges the AI layer to the (AI-free) WorkflowEngine.

This is the ONLY place the two layers meet: an agent proposes actions, this
service records the decision (AgentExecution audit row) and, if requested,
asks the WorkflowEngine to start the proposed workflow. Business logic stays in
the engine/steps; decisioning stays in the agents.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.agents import build_agents
from app.ai.decision_engine import MockDecisionEngine
from app.ai.interfaces import Agent
from app.db.models.enums import AgentExecutionStatus
from app.db.models.workflow import AgentExecution
from app.workflows.engine import WorkflowEngine

# A single shared, swappable decision engine for the default agent set.
_decision_engine = MockDecisionEngine()
_agents: dict[str, Agent] = build_agents(_decision_engine)


def list_agents() -> list[Agent]:
    return list(_agents.values())


def get_agent(key: str) -> Agent | None:
    return _agents.get(key)


def decision_engine_name() -> str:
    return _decision_engine.name


def evaluate_agent(
    db: Session,
    agent_key: str,
    context: dict,
    *,
    dealership_id: str | None = None,
    execute: bool = False,
) -> tuple[Agent, list[dict]]:
    """Run one agent over a context, persist the decision, optionally execute.

    Returns (agent, proposed_actions) where each proposed action dict may carry
    a ``triggered_execution_id`` if it was executed.
    """
    agent = _agents[agent_key]
    proposals = agent.evaluate(context)

    results: list[dict] = []
    if not proposals:
        db.add(
            AgentExecution(
                dealership_id=dealership_id,
                agent_key=agent.key,
                domain=agent.domain,
                status=AgentExecutionStatus.skipped,
                decision_should_execute=False,
                confidence=0,
                rationale="No actionable condition.",
                context=context,
            )
        )
        db.commit()
        return agent, results

    engine = WorkflowEngine(db)
    for action in proposals:
        audit = AgentExecution(
            dealership_id=dealership_id,
            agent_key=agent.key,
            domain=agent.domain,
            status=AgentExecutionStatus.triggered if execute else AgentExecutionStatus.evaluated,
            decision_should_execute=True,
            workflow_key=action.workflow_key,
            confidence=action.confidence,
            rationale=action.rationale,
            context=action.context,
        )
        db.add(audit)
        db.flush()

        triggered_id: str | None = None
        if execute:
            execution = engine.start(
                action.workflow_key,
                action.context,
                dealership_id=dealership_id,
                triggered_by_agent_execution_id=audit.id,
            )
            triggered_id = execution.id
            audit.triggered_execution_id = triggered_id

        results.append(
            {
                "workflow_key": action.workflow_key,
                "context": action.context,
                "confidence": action.confidence,
                "rationale": action.rationale,
                "triggered_execution_id": triggered_id,
            }
        )

    db.commit()
    return agent, results
