import re
from difflib import SequenceMatcher


def clean_text(value):
    if not value:
        return ""
    value = str(value).lower()
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    return " ".join(value.split())


def name_match(input_name, registered_name):
    a = clean_text(input_name)
    b = clean_text(registered_name)
    if not a or not b:
        return 0.0
    return round(SequenceMatcher(None, a, b).ratio() * 100, 2)


def address_match(input_address, registered_address):
    a = clean_text(input_address)
    b = clean_text(registered_address)
    if not a or not b:
        return 0.0

    input_words = set(a.split())
    registered_words = set(b.split())
    coverage = len(input_words & registered_words) / len(input_words)
    similarity = SequenceMatcher(None, a, b).ratio()
    return round((coverage * 0.7 + similarity * 0.3) * 100, 2)


def phone_match(input_phone, registered_phone):
    if not input_phone or not registered_phone:
        return None
    a = re.sub(r"\D", "", str(input_phone))[-10:]
    b = re.sub(r"\D", "", str(registered_phone))[-10:]
    if len(a) != 10 or len(b) != 10:
        return None
    return 100.0 if a == b else 0.0


def compare_business(input_data, places_data):
    results = []
    for place in places_data:
        results.append({
            "place_id": place.get("place_id"),
            "business_name": place.get("name"),
            "address": place.get("address"),
            "phone": place.get("phone"),
            "business_status": place.get("business_status"),
            "name_score": name_match(input_data.get("business_name"), place.get("name")),
            "address_score": address_match(input_data.get("address"), place.get("address")),
            "phone_score": phone_match(input_data.get("phone"), place.get("phone")),
        })
    return results
