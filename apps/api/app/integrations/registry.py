"""Adapter registry / factory.

Resolves an adapter implementation by provider key. In production you would
swap the registered classes (or read them from config) without changing callers.
"""

from __future__ import annotations

from app.integrations.ais140_adapter import MockAIS140Adapter
from app.integrations.base import (
    DMSAdapter,
    ERPAdapter,
    MessagingAdapter,
    TelematicsAdapter,
)
from app.integrations.dms_adapter import MockDMSAdapter
from app.integrations.email_adapter import MockEmailAdapter
from app.integrations.sap_adapter import MockSAPAdapter
from app.integrations.sms_adapter import MockSMSAdapter
from app.integrations.whatsapp_adapter import MockWhatsAppAdapter

# Default wiring -> mock implementations.
_ERP: dict[str, type[ERPAdapter]] = {"sap": MockSAPAdapter}
_DMS: dict[str, type[DMSAdapter]] = {"dms": MockDMSAdapter}
_TELEMATICS: dict[str, type[TelematicsAdapter]] = {"ais140": MockAIS140Adapter}
_MESSAGING: dict[str, type[MessagingAdapter]] = {
    "whatsapp": MockWhatsAppAdapter,
    "sms": MockSMSAdapter,
    "email": MockEmailAdapter,
}


def get_erp_adapter(provider: str = "sap") -> ERPAdapter:
    return _ERP[provider]()


def get_dms_adapter(provider: str = "dms") -> DMSAdapter:
    return _DMS[provider]()


def get_telematics_adapter(provider: str = "ais140") -> TelematicsAdapter:
    return _TELEMATICS[provider]()


def get_messaging_adapter(channel: str = "whatsapp") -> MessagingAdapter:
    return _MESSAGING[channel]()


def list_adapters() -> dict[str, list[str]]:
    return {
        "erp": list(_ERP),
        "dms": list(_DMS),
        "telematics": list(_TELEMATICS),
        "messaging": list(_MESSAGING),
    }
