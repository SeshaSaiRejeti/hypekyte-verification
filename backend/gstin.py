"""GSTIN format/checksum validation and GSTIN API registry lookup.

A successful provider response confirms the GSTIN record returned by the
provider. It does not prove that the person submitting the application is
associated with or authorized to represent the business.
"""

import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

GSTIN_PATTERN = re.compile(
    r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$"
)
BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GSTIN_API_URL = "https://www.gstinapi.in/v1/gstin/{gstin}"


def calculate_gstin_checksum(gstin: str) -> str:
    """Calculate the expected final GSTIN checksum character."""
    total = 0
    factor = 2

    for character in reversed(gstin[:-1]):
        product = BASE36.index(character) * factor
        total += (product // 36) + (product % 36)
        factor = 1 if factor == 2 else 2

    check_value = (36 - (total % 36)) % 36
    return BASE36[check_value]


def validate_gstin(gstin: str | None) -> dict:
    """Validate GSTIN structure and checksum; this does not query a registry."""
    value = (gstin or "").strip().upper()

    if not value:
        return {
            "status": "NOT_PROVIDED",
            "valid": None,
            "message": "GSTIN was not provided. This field is optional.",
        }

    if not GSTIN_PATTERN.fullmatch(value):
        return {
            "status": "INVALID_FORMAT",
            "valid": False,
            "message": "GSTIN does not match the expected 15-character structure.",
        }

    # Provider's documented sandbox GSTIN is a fixed test fixture. It does
    # not pass the normal checksum calculation, so allow this exact value
    # through solely to test sandbox connectivity.
    if value != "00AAAAA0000A1ZT":
        expected = calculate_gstin_checksum(value)
        if value[-1] != expected:
            return {
                "status": "INVALID_CHECKSUM",
                "valid": False,
                "message": "GSTIN checksum is invalid. Check the entered characters.",
            }

    return {
        "status": "FORMAT_VALID_NOT_REGISTRY_VERIFIED",
        "valid": True,
        "message": (
            "GSTIN structure and checksum are valid. Registry verification "
            "is still required."
        ),
    }


def verify_gstin(gstin: str | None) -> dict:
    """Validate GSTIN, then query GSTIN API when the value is structurally valid."""
    validation = validate_gstin(gstin)
    value = (gstin or "").strip().upper()

    if validation["status"] == "NOT_PROVIDED":
        return {
            **validation,
            "registry_checked": False,
            "test": False,
            "data": None,
        }

    if not validation["valid"]:
        return {
            **validation,
            "registry_checked": False,
            "test": False,
            "data": None,
        }

    api_key = os.getenv("GSTIN_API_KEY", "").strip()
    if not api_key:
        return {
            **validation,
            "status": "API_KEY_MISSING",
            "registry_checked": False,
            "test": False,
            "message": (
                "GSTIN format/checksum is valid, but GSTIN_API_KEY is not "
                "configured. Registry verification was not performed."
            ),
            "data": None,
        }

    try:
        response = requests.get(
            GSTIN_API_URL.format(gstin=value),
            headers={"x-api-key": api_key},
            timeout=20,
        )
    except requests.Timeout:
        return {
            **validation,
            "status": "API_TIMEOUT",
            "registry_checked": False,
            "test": False,
            "message": "GSTIN API request timed out. Registry verification was not completed.",
            "data": None,
        }
    except requests.RequestException as exc:
        return {
            **validation,
            "status": "API_UNAVAILABLE",
            "registry_checked": False,
            "test": False,
            "message": f"GSTIN API could not be reached: {type(exc).__name__}.",
            "data": None,
        }

    if response.status_code in (401, 403):
        return {
            **validation,
            "status": "API_AUTH_ERROR",
            "registry_checked": False,
            "test": False,
            "message": (
                f"GSTIN API rejected the credentials or access (HTTP "
                f"{response.status_code})."
            ),
            "data": None,
        }

    if response.status_code == 404:
        return {
            **validation,
            "status": "REGISTRY_NOT_FOUND",
            "registry_checked": True,
            "test": False,
            "message": "The GSTIN API did not find a record for this GSTIN.",
            "data": None,
        }

    if not response.ok:
        return {
            **validation,
            "status": "API_ERROR",
            "registry_checked": False,
            "test": False,
            "message": f"GSTIN API returned HTTP {response.status_code}.",
            "data": None,
        }

    try:
        payload = response.json()
    except ValueError:
        return {
            **validation,
            "status": "INVALID_API_RESPONSE",
            "registry_checked": False,
            "test": False,
            "message": "GSTIN API returned a response that was not valid JSON.",
            "data": None,
        }

    if not isinstance(payload, dict) or not payload.get("success"):
        return {
            **validation,
            "status": "REGISTRY_NOT_FOUND",
            "registry_checked": True,
            "test": bool(payload.get("test")) if isinstance(payload, dict) else False,
            "message": (
                payload.get("message", "GSTIN API did not return a successful record.")
                if isinstance(payload, dict)
                else "GSTIN API returned an unexpected response."
            ),
            "data": None,
        }

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        data = {}

    registration_status = str(data.get("status") or "Unknown").strip()
    is_test = bool(payload.get("test"))

    if is_test:
        status = "SANDBOX_TEST"
        message = (
            "GSTIN API returned sandbox test data. This confirms API connectivity "
            "only and must not be treated as a real GST registration check."
        )
    elif registration_status.lower() == "active":
        status = "REGISTRY_VERIFIED_ACTIVE"
        message = "GSTIN record was found and its registration status is Active."
    else:
        status = "REGISTRY_VERIFIED_INACTIVE"
        message = (
            f"GSTIN record was found, but its registration status is "
            f"{registration_status}."
        )

    # Return only fields needed by this application; never return credentials.
    safe_data = {
        "gstin": data.get("gstin") or payload.get("gstin") or value,
        "legal_name": data.get("legal_name"),
        "trade_name": data.get("trade_name"),
        "status": registration_status,
        "taxpayer_type": data.get("taxpayer_type"),
        "registration_date": data.get("registration_date"),
        "cancellation_date": data.get("cancellation_date"),
        "address": data.get("address"),
        "city": data.get("city"),
        "pincode": data.get("pincode"),
        "state_code": data.get("state_code"),
    }

    return {
        "status": status,
        "valid": True,
        "registry_checked": not is_test,
        "test": is_test,
        "message": message,
        "data": safe_data,
        "credits_remaining": payload.get("credits_remaining"),
    }
