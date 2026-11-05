"""Focused unit tests for the five assignment scenarios; no live API calls."""
import unittest

from gstin import validate_gstin
from matching import compare_business
from scoring import evaluate_business


class VerificationScenarioTests(unittest.TestCase):
    def setUp(self):
        self.input_data = {
            "business_name": "Haldiram's",
            "business_category": "Restaurant",
            "address": "Ground Floor GT Karnal Road Murthal Sonipat Haryana 131039",
            "phone": "8071890217",
        }
        self.matching_place = {
            "place_id": "place-1",
            "name": "Haldiram's",
            "address": "Ground Floor GT Karnal Road Murthal Sonipat Haryana 131039 India",
            "phone": "+91 80718 90217",
            "business_status": "OPERATIONAL",
        }

    def test_valid_gstin_and_matching_business(self):
        gst = validate_gstin("29AAJCK4821M1Z1")
        matches = compare_business(self.input_data, [self.matching_place])
        result = evaluate_business(matches, gst["status"])
        self.assertEqual(gst["status"], "FORMAT_VALID_NOT_REGISTRY_VERIFIED")
        self.assertEqual(result["status"], "VERIFIED")

    def test_invalid_gstin_requires_review(self):
        gst = validate_gstin("29AAJCK4821M1Z2")
        matches = compare_business(self.input_data, [self.matching_place])
        result = evaluate_business(matches, gst["status"])
        self.assertIn(gst["status"], {"INVALID_FORMAT", "INVALID_CHECKSUM"})
        self.assertEqual(result["status"], "NEEDS_REVIEW")

    def test_maps_listing_without_gstin(self):
        matches = compare_business(self.input_data, [self.matching_place])
        result = evaluate_business(matches, "NOT_PROVIDED")
        self.assertEqual(result["status"], "VERIFIED")

    def test_valid_gstin_but_different_business_details(self):
        gst = validate_gstin("29AAJCK4821M1Z1")
        different_place = {
            **self.matching_place,
            "name": "Different Electronics Store",
            "address": "Sector 15 Market Faridabad Haryana",
            "phone": "9999999999",
        }
        matches = compare_business(self.input_data, [different_place])
        result = evaluate_business(matches, gst["status"])
        self.assertEqual(result["status"], "UNVERIFIED")

    def test_multiple_similar_maps_matches_need_review(self):
        second_place = {
            **self.matching_place,
            "place_id": "place-2",
            "address": "Ground Floor GT Karnal Road Murthal Sonipat Haryana 131039",
            "phone": "9999999999",
        }
        matches = compare_business(self.input_data, [self.matching_place, second_place])
        result = evaluate_business(matches, "NOT_PROVIDED")
        self.assertEqual(result["status"], "NEEDS_REVIEW")
        self.assertEqual(result["match_count"], 2)


if __name__ == "__main__":
    unittest.main()
