"""WorkflowEngine — the AI-free orchestrator.

Drives a ``WorkflowDefinition`` as a persisted state machine over
``WorkflowExecution`` + ``WorkflowStep`` rows. Responsibilities:

  * ``start``       -> create execution + step rows, then run to completion/pause
  * ``advance``     -> execute the current step, persist its output
  * approval gates  -> pause at ``WAITING_APPROVAL`` until a human ``approve``s
  * ``resume``      -> continue after approval
  * ``retry``       -> re-run a failed step
  * events          -> publish lifecycle events to the EventBus

The engine knows nothing about AI. It is invoked by API routes (manual) or by
an agent that has *decided* to trigger a workflow.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.enums import StepStatus, WorkflowStatus
from app.db.models.workflow import WorkflowExecution, WorkflowStep
from app.events.bus import EventBus, event_bus
from app.workflows.definitions import StepDefinition, WorkflowDefinition, get_definition

logger = logging.getLogger("halo.workflows.engine")


class WorkflowError(RuntimeError):
    pass


class WorkflowEngine:
    def __init__(self, db: Session, bus: EventBus | None = None) -> None:
        self.db = db
        self.bus = bus or event_bus

    # ------------------------------------------------------------------ start
    def start(
        self,
        definition_key: str,
        context: dict[str, Any] | None = None,
        *,
        dealership_id: str | None = None,
        triggered_by_agent_execution_id: str | None = None,
        auto_advance: bool = True,
    ) -> WorkflowExecution:
        definition = get_definition(definition_key)
        execution = WorkflowExecution(
            definition_key=definition_key,
            dealership_id=dealership_id,
            status=WorkflowStatus.pending,
            current_step_index=0,
            context=dict(context or {}),
            triggered_by_agent_execution_id=triggered_by_agent_execution_id,
        )
        self.db.add(execution)
        self.db.flush()  # assign execution.id

        for index, step_def in enumerate(definition.steps):
            self.db.add(
                WorkflowStep(
                    execution_id=execution.id,
                    index=index,
                    key=step_def.key,
                    name=step_def.name,
                    status=StepStatus.pending,
                    requires_approval=step_def.requires_approval,
                )
            )
        self.db.flush()
        self.bus.publish(
            "workflow.started",
            {"execution_id": execution.id, "definition_key": definition_key},
        )

        if auto_advance:
            self.run(execution)
        else:
            self.db.commit()
        return execution

    # -------------------------------------------------------------------- run
    def run(self, execution: WorkflowExecution) -> WorkflowExecution:
        """Advance repeatedly until the workflow finishes, pauses, or fails."""
        definition = get_definition(execution.definition_key)
        execution.status = WorkflowStatus.running
        from app.db.base import utcnow

        if execution.started_at is None:
            execution.started_at = utcnow()

        while execution.current_step_index < len(definition.steps):
            step_def = definition.steps[execution.current_step_index]
            step = self._get_step(execution, execution.current_step_index)

            # Pause at an approval gate until a human has approved it. Approval
            # is recorded as `step.output["_approved"] = True` by `approve()`.
            approved = bool((step.output or {}).get("_approved"))
            if (
                step_def.requires_approval
                and step.status != StepStatus.completed
                and not approved
            ):
                if step.status != StepStatus.waiting_approval:
                    step.status = StepStatus.waiting_approval
                    self.bus.publish(
                        "workflow.waiting_approval",
                        {"execution_id": execution.id, "step_key": step.key},
                    )
                execution.status = WorkflowStatus.waiting_approval
                self.db.commit()
                return execution

            ok = self._execute_step(execution, step, step_def)
            if not ok:
                execution.status = WorkflowStatus.failed
                self.db.commit()
                return execution

            execution.current_step_index += 1

        # All steps done.
        execution.status = WorkflowStatus.completed
        execution.completed_at = utcnow()
        self.db.commit()
        self.bus.publish("workflow.completed", {"execution_id": execution.id})
        return execution

    # --------------------------------------------------------------- approval
    def approve(
        self, execution_id: str, *, approved_by: str = "system"
    ) -> WorkflowExecution:
        execution = self.get(execution_id)
        if execution.status != WorkflowStatus.waiting_approval:
            raise WorkflowError(
                f"Execution {execution_id} is not awaiting approval "
                f"(status={execution.status.value})"
            )
        step = self._get_step(execution, execution.current_step_index)
        execution.context = {**execution.context, "approved_by": approved_by}
        # Record approval; the handler still runs in run() (gate now satisfied).
        step.output = {**(step.output or {}), "_approved": True, "approved_by": approved_by}
        step.status = StepStatus.pending
        self.bus.publish(
            "workflow.approved",
            {"execution_id": execution.id, "step_key": step.key, "approved_by": approved_by},
        )
        return self.run(execution)

    def resume(self, execution_id: str) -> WorkflowExecution:
        """Continue a paused or running execution from where it left off."""
        execution = self.get(execution_id)
        if execution.status in (WorkflowStatus.completed, WorkflowStatus.cancelled):
            return execution
        return self.run(execution)

    # ------------------------------------------------------------------ retry
    def retry(self, execution_id: str) -> WorkflowExecution:
        execution = self.get(execution_id)
        if execution.status != WorkflowStatus.failed:
            raise WorkflowError(
                f"Execution {execution_id} is not in a failed state "
                f"(status={execution.status.value})"
            )
        step = self._get_step(execution, execution.current_step_index)
        step.status = StepStatus.pending
        step.error = None
        execution.error = None
        self.bus.publish(
            "workflow.retried", {"execution_id": execution.id, "step_key": step.key}
        )
        return self.run(execution)

    def cancel(self, execution_id: str) -> WorkflowExecution:
        execution = self.get(execution_id)
        execution.status = WorkflowStatus.cancelled
        self.db.commit()
        self.bus.publish("workflow.cancelled", {"execution_id": execution.id})
        return execution

    # ---------------------------------------------------------------- helpers
    def get(self, execution_id: str) -> WorkflowExecution:
        execution = self.db.get(WorkflowExecution, execution_id)
        if execution is None:
            raise WorkflowError(f"Unknown execution: {execution_id}")
        return execution

    def _get_step(self, execution: WorkflowExecution, index: int) -> WorkflowStep:
        stmt = select(WorkflowStep).where(
            WorkflowStep.execution_id == execution.id, WorkflowStep.index == index
        )
        step = self.db.scalar(stmt)
        if step is None:
            raise WorkflowError(f"Missing step index {index} for execution {execution.id}")
        return step

    def _execute_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStep,
        step_def: StepDefinition,
    ) -> bool:
        from app.db.base import utcnow

        step.status = StepStatus.running
        step.attempts += 1
        step.started_at = step.started_at or utcnow()
        self.db.flush()
        self.bus.publish(
            "workflow.step.started",
            {"execution_id": execution.id, "step_key": step.key},
        )
        try:
            output = step_def.handler(execution.context) or {}
            # Merge step output back into the shared context.
            execution.context = {**execution.context, **output}
            step.output = output
            step.status = StepStatus.completed
            step.completed_at = utcnow()
            step.error = None
            self.db.flush()
            self.bus.publish(
                "workflow.step.completed",
                {"execution_id": execution.id, "step_key": step.key, "output": output},
            )
            return True
        except Exception as exc:  # business step failed
            logger.exception("step %s failed", step.key)
            step.status = StepStatus.failed
            step.error = str(exc)
            execution.error = f"{step.key}: {exc}"
            self.db.flush()
            self.bus.publish(
                "workflow.step.failed",
                {"execution_id": execution.id, "step_key": step.key, "error": str(exc)},
            )
            return False
