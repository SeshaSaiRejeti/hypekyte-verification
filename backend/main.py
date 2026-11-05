from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from database import (
    create_table,
    save_verification,
    get_all_verifications,
    get_verification_by_id,
)
from google_places import search_business
from gstin import verify_gstin
from matching import compare_business
from scoring import evaluate_business

app = FastAPI(
    title="HypeKyte Business Verification API",
    description="Business listing corroboration and GSTIN registry verification API",
    version="1.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_table()


class BusinessRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_name: str = Field(alias="businessName", min_length=2, max_length=120)
    business_category: str = Field(alias="businessCategory", min_length=1, max_length=60)
    address: str = Field(min_length=5, max_length=300)
    gstin: str = Field(default="", max_length=15)
    phone: str = Field(default="", max_length=15)
    email: str | None = None


@app.get("/")
def home():
    return {"message": "HypeKyte Business Verification API", "version": app.version}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/verify")
def verify_business(request: BusinessRequest):
    # Run both providers independently: a GST provider outage must not suppress
    # Google Places evidence, and an optional GSTIN must not block registration.
    gstin_result = verify_gstin(request.gstin)
    places_result = search_business(
        request.business_name,
        request.address,
        request.business_category,
    )

    input_data = {
        "business_name": request.business_name,
        "business_category": request.business_category,
        "address": request.address,
        "phone": request.phone,
    }

    if places_result.get("success"):
        matches = compare_business(input_data, places_result.get("businesses", []))
        evaluation = evaluate_business(
            matches,
            gstin_result=gstin_result,
            submitted_name=request.business_name,
            submitted_address=request.address,
        )
        provider_status = "SUCCESS"
        provider_error = None
    else:
        matches = []
        evaluation = evaluate_business(
            [],
            gstin_result=gstin_result,
            submitted_name=request.business_name,
            submitted_address=request.address,
        )
        provider_status = "UNAVAILABLE"
        provider_error = places_result.get("error_type", "UNKNOWN_ERROR")
        # No Places result means existence cannot be corroborated, regardless
        # of GST data; do not claim that GST alone verifies the business.
        evaluation["status"] = "NEEDS_REVIEW"
        evaluation["confidence"] = 0
        evaluation["best_match"] = None
        evaluation["match_count"] = 0
        evaluation["reason"] = "Google Places search could not be completed. Retry or review manually."
        evaluation["reasons"].insert(0, "Google Places provider was unavailable.")

    gst_data = gstin_result.get("data") or {}
    result = {
        "business_name": request.business_name,
        "business_category": request.business_category,
        "status": evaluation["status"],
        "confidence": evaluation["confidence"],
        "best_match": evaluation.get("best_match"),
        "match_count": evaluation.get("match_count", len(matches)),
        "reason": evaluation["reason"],
        "reasons": evaluation["reasons"],
        "provider_status": provider_status,
        "provider_error": provider_error,
        "gstin_verification": gstin_result.get("status", "UNKNOWN"),
        "gstin_message": gstin_result.get("message", "No GSTIN result returned."),
        "gstin_registry_checked": gstin_result.get("registry_checked", False),
        "gstin_test_data": gstin_result.get("test", False),
        "gstin_details": gst_data or None,
        "gstin_name_similarity": evaluation.get("gstin_name_similarity"),
        "gstin_address_similarity": evaluation.get("gstin_address_similarity"),
        "phone_verification": evaluation.get("phone_match_status", "NOT_CHECKED"),
        "email_verification": "NOT_COLLECTED",
        "source": "Google Places API and GSTIN API",
    }

    verification_id = save_verification(
        request.business_name,
        request.address,
        request.phone,
        result,
        business_category=request.business_category,
        gstin=request.gstin,
        email=request.email or "",
    )
    result["id"] = str(verification_id)
    return result


@app.get("/verifications")
def get_verifications():
    return get_all_verifications()


@app.get("/verifications/{verification_id}")
def get_verification(verification_id: int):
    record = get_verification_by_id(verification_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Verification record not found")
    return record
