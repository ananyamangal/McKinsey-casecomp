"""ToolRegistry — named, callable wrappers around business operations/adapters.

Agents use tools to gather signals (e.g. read telematics, look up inventory)
*before deciding*. Tools are the only way the AI layer touches the rest of the
system, and they are read-oriented / side-effect-light by convention.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from app.integrations.registry import (
    get_dms_adapter,
    get_telematics_adapter,
)

ToolFn = Callable[..., Any]


@dataclass(slots=True)
class Tool:
    name: str
    description: str
    fn: ToolFn

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        return self.fn(*args, **kwargs)


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, name: str, description: str, fn: ToolFn) -> None:
        self._tools[name] = Tool(name=name, description=description, fn=fn)

    def get(self, name: str) -> Tool:
        if name not in self._tools:
            raise KeyError(f"Unknown tool: {name!r}")
        return self._tools[name]

    def list(self) -> list[str]:
        return list(self._tools)


def _fetch_telematics(vehicle_id: str) -> dict[str, Any]:
    return get_telematics_adapter("ais140").fetch_latest(vehicle_id).data


def _lookup_vehicle(vin: str) -> dict[str, Any]:
    return get_dms_adapter("dms").get_vehicle(vin).data


def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(
        "fetch_telematics",
        "Fetch the latest AIS-140 telematics reading for a vehicle.",
        _fetch_telematics,
    )
    registry.register(
        "lookup_vehicle",
        "Look up vehicle master data from the DMS by VIN.",
        _lookup_vehicle,
    )
    return registry


# Process-wide default registry.
default_registry = build_default_registry()
