"""Conservative business verification scoring using Google Places and GSTIN evidence.

A Google Places listing supports public business presence, not applicant authority.
A GSTIN record supports registration status, not applicant authority.
Sandbox GSTIN responses are never treated as real registration evidence.
"""

from difflib import SequenceMatcher
import re


def _clean(value):
    return " ".join(re.sub(r"[^a-z0-9\s]", " ", str(value or "").lower()).split())


def _similarity(a, b):
    a_clean, b_clean = _clean(a), _clean(b)
    if not a_clean or not b_clean:
        return None
    return round(SequenceMatcher(None, a_clean, b_clean).ratio() * 100, 2)


def _address_similarity(submitted, registered):
    a, b = _clean(submitted), _clean(registered)
    if not a or not b:
        return None
    aw, bw = set(a.split()), set(b.split())
    coverage = len(aw & bw) / max(len(aw), 1)
    sequence = SequenceMatcher(None, a, b).ratio()
    return round((coverage * 0.7 + sequence * 0.3) * 100, 2)


def calculate_score(match):
    name = match.get("name_score") or 0
    address = match.get("address_score") or 0
    phone = match.get("phone_score")
    if phone is None:
        return round(name * 0.45 + address * 0.55, 2)
    return round(name * 0.35 + address * 0.45 + phone * 0.20, 2)


def evaluate_business(matches, gstin_result=None, submitted_name="", submitted_address=""):
    """Return a decision and transparent evidence from both providers."""
    gstin_result = gstin_result or {
        "status": "NOT_PROVIDED", "test": False, "data": None,
        "message": "GSTIN was not provided."
    }
    gst_data = gstin_result.get("data") or {}
    gst_status = gstin_result.get("status", "NOT_PROVIDED")
    gst_is_test = bool(gstin_result.get("test"))

    legal_name = gst_data.get("legal_name")
    trade_name = gst_data.get("trade_name")
    registered_address = gst_data.get("address")

    gst_name_score = max(
        [score for score in (
            _similarity(submitted_name, legal_name),
            _similarity(submitted_name, trade_name),
        ) if score is not None],
        default=None,
    )
    gst_address_score = _address_similarity(submitted_address, registered_address)

    ranked = sorted(matches or [], key=calculate_score, reverse=True)
    best = ranked[0] if ranked else None
    score = calculate_score(best) if best else 0
    phone_score = best.get("phone_score") if best else None
    name_score = (best.get("name_score") or 0) if best else 0
    address_score = (best.get("address_score") or 0) if best else 0

    ambiguous = False
    if len(ranked) > 1:
        second = ranked[1]
        best_identity = name_score * 0.45 + address_score * 0.55
        second_identity = (second.get("name_score") or 0) * 0.45 + (second.get("address_score") or 0) * 0.55
        ambiguous = (
            (second.get("name_score") or 0) >= 70
            and (second.get("address_score") or 0) >= 60
            and abs(best_identity - second_identity) <= 8
        )

    reasons = []
    if not ranked:
        status = "UNVERIFIED"
        reason = (
            "Google Places returned no matching listing. This source could not "
            "corroborate the submitted business; this does not prove it does not exist."
        )
    elif ambiguous:
        status = "NEEDS_REVIEW"
        reason = "Multiple Google Places listings have similar matching scores. Manual confirmation is required."
    elif gst_status in {"INVALID_FORMAT", "INVALID_CHECKSUM"}:
        status = "NEEDS_REVIEW"
        reason = "The submitted GSTIN failed local format/checksum validation. Confirm it manually."
    elif name_score < 35 and address_score < 35 and score < 40:
        status = "UNVERIFIED"
        reason = "Google Places results have very low name and address similarity."
    elif phone_score == 0 and name_score >= 60 and address_score >= 50:
        status = "NEEDS_REVIEW"
        reason = "The submitted phone number differs from the public Google Places phone number."
    elif name_score >= 80 and address_score >= 70 and score >= 78:
        status = "VERIFIED"
        reason = "A strong, unique Google Places listing match was found."
    else:
        status = "NEEDS_REVIEW"
        reason = "Some Google Places similarity exists, but evidence is not strong or unique enough for automatic verification."

    # GST registry evidence can downgrade a decision, but never independently
    # upgrades a weak Places match or proves applicant association.
    if not gst_is_test:
        if gst_status == "REGISTRY_VERIFIED_INACTIVE":
            if status == "VERIFIED":
                status = "NEEDS_REVIEW"
            reasons.append("GST registry record was found but is not Active.")
        elif gst_status == "REGISTRY_VERIFIED_ACTIVE":
            reasons.append("GSTIN API returned an Active registration record.")
            if gst_name_score is not None and gst_name_score < 50:
                if status == "VERIFIED":
                    status = "NEEDS_REVIEW"
                reasons.append("Submitted name differs substantially from GST legal/trade name.")
            if gst_address_score is not None and gst_address_score < 50:
                if status == "VERIFIED":
                    status = "NEEDS_REVIEW"
                reasons.append("Submitted address differs substantially from GST registered address.")
        elif gst_status in {"REGISTRY_NOT_FOUND", "API_AUTH_ERROR", "API_TIMEOUT", "API_UNAVAILABLE", "API_ERROR", "API_KEY_MISSING", "INVALID_API_RESPONSE"}:
            reasons.append("GSTIN registry verification could not be completed; review the provider response.")
    else:
        reasons.append("GSTIN API returned sandbox test data; it was excluded from the real verification decision.")

    if gst_status in {"INVALID_FORMAT", "INVALID_CHECKSUM"}:
        reasons.append(gstin_result.get("message", "GSTIN input is invalid."))
    elif gst_status == "NOT_PROVIDED":
        reasons.append("GSTIN was not provided; this field is optional.")
    elif gst_status == "REGISTRY_VERIFIED_ACTIVE":
        if gst_name_score is not None:
            reasons.append(f"GSTIN name similarity: {gst_name_score}%.")
        if gst_address_score is not None:
            reasons.append(f"GSTIN registered-address similarity: {gst_address_score}%.")

    if not reasons:
        reasons.append(gstin_result.get("message", "No additional GSTIN evidence."))

    phone_status = (
        "NOT_PROVIDED_OR_NOT_LISTED" if phone_score is None
        else "MATCH" if phone_score == 100
        else "MISMATCH"
    )

    return {
        "status": status,
        "confidence": score,
        "best_match": best,
        "match_count": len(ranked),
        "phone_match_status": phone_status,
        "reason": reason,
        "reasons": [reason] + reasons + [
            "Google Places and GST registration records do not establish applicant ownership or authority."
        ],
        "gstin_name_similarity": gst_name_score,
        "gstin_address_similarity": gst_address_score,
    }
