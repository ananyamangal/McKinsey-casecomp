"""Agent routes — agents list, decisions, actions, autonomy toggle."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.ai import Agent, AgentAction
from app.db.models.workflow import AgentExecution
from app.services import serialize

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def list_agents(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(select(Agent).order_by(Agent.created_at)).all()
    return [serialize.serialize_agent(a) for a in rows]


@router.get("/decisions")
def list_decisions(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(AgentExecution).order_by(AgentExecution.created_at.desc()).limit(50)
    ).all()
    return [serialize.serialize_decision(e) for e in rows]


@router.get("/actions")
def list_actions(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(AgentAction).order_by(AgentAction.created_at.desc()).limit(50)
    ).all()
    return [serialize.serialize_action(a) for a in rows]


@router.post("/{key}/toggle")
def toggle_agent(
    db: DbSession,
    current_user: CurrentUser,
    key: str,
    autonomous: Annotated[bool | None, Body(embed=True)] = None,
) -> dict:
    agent = db.scalar(select(Agent).where(Agent.key == key))
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.autonomous = (not agent.autonomous) if autonomous is None else bool(autonomous)
    db.commit()
    db.refresh(agent)
    return serialize.serialize_agent(agent)
