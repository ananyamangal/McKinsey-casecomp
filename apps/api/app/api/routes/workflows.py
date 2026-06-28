"""Workflow routes — contract-shaped executions, approvals, retry-queue.

GET /workflows           -> WorkflowExecution[] (newest first, with steps[])
GET /approvals           -> ApprovalRequest[]   (derived from waiting executions)
GET /retry-queue         -> RetryQueueItem[]    (derived from failed steps)
POST /workflows/{id}/approve | /retry -> WorkflowExecution
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.db.models.enums import StepStatus, WorkflowStatus
from app.db.models.workflow import WorkflowExecution, WorkflowStep
from app.services import serialize
from app.workflows.engine import WorkflowEngine, WorkflowError

router = APIRouter(tags=["workflows"])


def _executions(db: DbSession, dealership_id: str | None):
    return db.scalars(
        select(WorkflowExecution)
        .options(selectinload(WorkflowExecution.steps))
        .where(WorkflowExecution.dealership_id == dealership_id)
        .order_by(WorkflowExecution.created_at.desc())
    ).all()


@router.get("/workflows")
def list_workflows(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = _executions(db, current_user.dealership_id)
    return [serialize.serialize_workflow(w) for w in rows]


@router.get("/approvals")
def list_approvals(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(WorkflowExecution)
        .options(selectinload(WorkflowExecution.steps))
        .where(
            WorkflowExecution.dealership_id == current_user.dealership_id,
            WorkflowExecution.status == WorkflowStatus.waiting_approval,
        )
        .order_by(WorkflowExecution.created_at.desc())
    ).all()
    return [serialize.serialize_approval(w) for w in rows]


@router.get("/retry-queue")
def list_retry_queue(db: DbSession, current_user: CurrentUser) -> list[dict]:
    rows = db.scalars(
        select(WorkflowStep)
        .join(WorkflowExecution, WorkflowStep.execution_id == WorkflowExecution.id)
        .options(selectinload(WorkflowStep.execution))
        .where(
            WorkflowExecution.dealership_id == current_user.dealership_id,
            WorkflowStep.status == StepStatus.failed,
        )
        .order_by(WorkflowStep.updated_at.desc())
    ).all()
    return [serialize.serialize_retry_item(s, s.execution) for s in rows]


def _get_execution(db, current_user, execution_id: str) -> WorkflowExecution:
    w = db.get(WorkflowExecution, execution_id)
    if w is None or w.dealership_id != current_user.dealership_id:
        raise HTTPException(status_code=404, detail="Workflow execution not found")
    return w


@router.post("/workflows/{execution_id}/approve")
def approve_workflow(db: DbSession, current_user: CurrentUser, execution_id: str) -> dict:
    _get_execution(db, current_user, execution_id)
    engine = WorkflowEngine(db)
    try:
        execution = engine.approve(execution_id, approved_by=current_user.email)
    except WorkflowError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    db.refresh(execution)
    return serialize.serialize_workflow(execution)


@router.post("/workflows/{execution_id}/retry")
def retry_workflow(db: DbSession, current_user: CurrentUser, execution_id: str) -> dict:
    _get_execution(db, current_user, execution_id)
    engine = WorkflowEngine(db)
    try:
        execution = engine.retry(execution_id)
    except WorkflowError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    db.refresh(execution)
    return serialize.serialize_workflow(execution)
