"""In-process pub/sub event bus.

Deliberately tiny and synchronous. The workflow engine publishes lifecycle
events here; subscribers (notifications, audit, metrics) react. The interface is
intentionally Redis-pubsub-shaped so a `RedisEventBus` can drop in later without
touching publishers.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

logger = logging.getLogger("halo.events")

EventHandler = Callable[["Event"], None]


@dataclass(slots=True)
class Event:
    name: str
    payload: dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class EventBus:
    """Synchronous topic-based pub/sub. Supports `*` wildcard subscriptions."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        self._subscribers[event_name].append(handler)

    def unsubscribe(self, event_name: str, handler: EventHandler) -> None:
        if handler in self._subscribers.get(event_name, []):
            self._subscribers[event_name].remove(handler)

    def publish(self, name: str, payload: dict[str, Any] | None = None) -> Event:
        event = Event(name=name, payload=payload or {})
        logger.info("event.publish name=%s payload=%s", name, event.payload)
        for handler in [*self._subscribers.get(name, []), *self._subscribers.get("*", [])]:
            try:
                handler(event)
            except Exception:  # subscribers must never break publishers
                logger.exception("event handler failed for %s", name)
        return event


# A process-wide default bus. Inject a custom one in tests if needed.
event_bus = EventBus()
