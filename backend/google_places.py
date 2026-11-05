import os
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"


def search_business(business_name, address, business_category=""):
    if not GOOGLE_API_KEY:
        return {
            "success": False,
            "source": "google_places",
            "businesses": [],
            "error": "Google API key is missing",
            "error_type": "CONFIGURATION_ERROR",
        }

    query_parts = [business_name, business_category, address]
    query = ", ".join(part.strip() for part in query_parts if part and part.strip())
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.nationalPhoneNumber,places.businessStatus,places.location"
        ),
    }
    body = {"textQuery": query, "pageSize": 5}

    try:
        response = requests.post(
            PLACES_URL, headers=headers, json=body, timeout=15
        )
        if response.status_code == 400:
            error_type = "INVALID_REQUEST"
        elif response.status_code in (401, 403):
            error_type = "AUTH_ERROR"
        elif response.status_code == 429:
            error_type = "QUOTA_ERROR"
        elif response.status_code >= 500:
            error_type = "PROVIDER_ERROR"
        else:
            error_type = None

        if error_type:
            return {
                "success": False,
                "source": "google_places",
                "businesses": [],
                "error": response.text[:500],
                "error_type": error_type,
            }

        response.raise_for_status()
        data = response.json()
        businesses = []
        for place in data.get("places", []):
            businesses.append({
                "place_id": place.get("id"),
                "name": place.get("displayName", {}).get("text"),
                "address": place.get("formattedAddress"),
                "phone": place.get("nationalPhoneNumber"),
                "business_status": place.get("businessStatus"),
                "location": place.get("location"),
            })

        return {
            "success": True,
            "source": "google_places",
            "businesses": businesses,
            "error": None,
            "error_type": None,
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "source": "google_places",
            "businesses": [],
            "error": "Google Places request timed out",
            "error_type": "TIMEOUT",
        }
    except requests.exceptions.RequestException as error:
        return {
            "success": False,
            "source": "google_places",
            "businesses": [],
            "error": str(error),
            "error_type": "NETWORK_ERROR",
        }
    except ValueError:
        return {
            "success": False,
            "source": "google_places",
            "businesses": [],
            "error": "Google Places returned an invalid JSON response",
            "error_type": "INVALID_RESPONSE",
        }
