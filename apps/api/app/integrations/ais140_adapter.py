"""Mock AIS-140 telematics adapter."""

from __future__ import annotations

import random

from app.integrations.base import AdapterResponse, TelematicsAdapter


class MockAIS140Adapter(TelematicsAdapter):
    provider = "ais140"

    def fetch_latest(self, vehicle_id: str) -> AdapterResponse:
        self._log("fetch_latest", vehicle_id=vehicle_id)
        # Deterministic-ish fake signal seeded by vehicle id.
        rng = random.Random(vehicle_id)
        brake = rng.randint(10, 95)
        return AdapterResponse(
            ok=True,
            provider=self.provider,
            operation="fetch_latest",
            data={
                "vehicle_id": vehicle_id,
                "brake_life_pct": brake,
                "battery_health_pct": rng.randint(60, 100),
                "odometer_km": rng.randint(10_000, 90_000),
                "dtc_codes": [] if brake > 25 else ["C0035"],
            },
        )
