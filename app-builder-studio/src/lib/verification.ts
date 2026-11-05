export * from "./verification-types";

import type {
  BusinessInput,
  Verification,
  CheckResult,
  Status,
  OutcomeCategory,
} from "./verification-types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

interface BackendMatch {
  place_id?: string;
  business_name?: string;
  address?: string;
  phone?: string | null;
  name_score?: number;
  address_score?: number;
  phone_score?: number | null;
}

interface BackendResult {
  id: string | number;
  business_name: string;
  business_category?: string;
  status: string;
  confidence: number;
  best_match: BackendMatch | null;
  match_count?: number;
  reason: string;
  reasons?: string[];
  provider_status: string;
  provider_error?: string | null;
  gstin_verification: string;
  gstin_message?: string;
  phone_verification: string;
  email_verification?: string;
  source: string;
}

interface BackendRecord {
  id: number;
  business_name: string;
  business_category?: string | null;
  gstin?: string | null;
  address: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  result_json: string | null;
}

function makeCheck(
  label: string,
  status: CheckResult["status"],
  detail: string
): CheckResult {
  return { label, status, detail };
}

function mapStatus(value: string): Status {
  if (value === "VERIFIED") return "verified";
  if (value === "UNVERIFIED" || value === "REJECTED") return "rejected";
  return "pending";
}

function mapCategory(
  status: string,
  providerStatus: string
): OutcomeCategory {
  if (providerStatus === "UNAVAILABLE") return "provider_failure";
  if (status === "VERIFIED") return "checks_passed";
  if (status === "UNVERIFIED" || status === "REJECTED") {
    return "verification_failed";
  }
  return "inconclusive";
}

function buildVerification(
  input: BusinessInput,
  id: string,
  submittedAt: string,
  result: BackendResult
): Verification {
  const bestMatch = result.best_match;
  const providerAvailable = result.provider_status === "SUCCESS";
  const nameScore = bestMatch?.name_score ?? 0;
  const addressScore = bestMatch?.address_score ?? 0;
  const phoneScore = bestMatch?.phone_score ?? null;

  const googleCheck = !providerAvailable
    ? makeCheck(
        "Google Places",
        "unavailable",
        `Google Places could not complete the search (${result.provider_error ?? "unknown error"}).`
      )
    : bestMatch
      ? makeCheck(
          "Google Places",
          "passed",
          `Retrieved ${result.match_count ?? 1} public listing(s). A listing supports business existence but does not prove applicant association.`
        )
      : makeCheck(
          "Google Places",
          "failed",
          "The search completed but returned no matching business listing. This alone does not prove the business does not exist."
        );

  let gstStatus: CheckResult["status"] = "neutral";
  if (result.gstin_verification === "INVALID_FORMAT" || result.gstin_verification === "INVALID_CHECKSUM") {
    gstStatus = "invalid";
  } else if (result.gstin_verification === "FORMAT_VALID_NOT_REGISTRY_VERIFIED") {
    gstStatus = "warning";
  }
  const gstCheck = makeCheck(
    "GSTIN",
    gstStatus,
    result.gstin_message ?? "GST registry lookup is not integrated. GST registration has not been verified."
  );

  let phoneStatus: CheckResult["status"] = "neutral";
  let phoneDetail = "No phone number was supplied or no public listing phone was available for comparison.";
  if (result.phone_verification === "MATCH") {
    phoneStatus = "passed";
    phoneDetail = "The submitted number matches the public Google Places phone number. This does not prove who controls the number.";
  } else if (result.phone_verification === "MISMATCH") {
    phoneStatus = "warning";
    phoneDetail = "The submitted number differs from the public listing phone number. Confirm whether the listing is current.";
  } else if (result.phone_verification === "NOT_CHECKED") {
    phoneStatus = "unavailable";
    phoneDetail = "A phone comparison could not be completed because the provider was unavailable.";
  }
  const phoneCheck = makeCheck("Business phone comparison", phoneStatus, phoneDetail);

  const emailCheck = makeCheck(
    "Email OTP",
    "neutral",
    "Email is not collected by this prototype. Email ownership is not checked."
  );
  const emailDomainCheck = makeCheck(
    "Email domain match",
    "neutral",
    "No business email was collected."
  );

  const nameCheck = makeCheck(
    "Business name match",
    bestMatch ? (nameScore >= 80 ? "passed" : nameScore >= 50 ? "warning" : "failed") : "neutral",
    bestMatch
      ? `${nameScore}% similarity with the Google Places listing name.`
      : "No Google Places listing was available for comparison."
  );
  const addressCheck = makeCheck(
    "Business address match",
    bestMatch ? (addressScore >= 70 ? "passed" : addressScore >= 40 ? "warning" : "failed") : "neutral",
    bestMatch
      ? `${addressScore}% similarity with the Google Places listing address.`
      : "No Google Places listing was available for comparison."
  );

  const applicant: Verification["applicant"] = {
    name: "Not provided",
    role: "Not verified",
    gstSignatory: makeCheck(
      "GST authorised signatory",
      "unavailable",
      "Official GST registration/signatory data is not integrated."
    ),
    phoneOwnership: makeCheck(
      "Phone control",
      "unavailable",
      "OTP verification is not integrated. A public listing phone match does not prove control."
    ),
    emailOwnership: makeCheck(
      "Email control",
      "unavailable",
      "Email is not collected and email OTP is not integrated."
    ),
  };

  const reasons = result.reasons?.length
    ? result.reasons
    : [result.reason, gstCheck.detail, "Applicant association has not been independently established."];

  return {
    ...input,
    id,
    submittedAt,
    source: "live",
    isSampleData: false,
    decision: mapStatus(result.status),
    category: mapCategory(result.status, result.provider_status),
    confidence: result.confidence ?? 0,
    gstLegalName: bestMatch?.business_name ?? "",
    gstRegisteredAddress: bestMatch?.address ?? "",
    nameScore,
    addressScore,
    matchCount: result.match_count ?? (bestMatch ? 1 : 0),
    checks: {
      googlePlaces: googleCheck,
      gstin: gstCheck,
      phoneOtp: phoneCheck,
      emailOtp: emailCheck,
      emailDomain: emailDomainCheck,
      nameMatch: nameCheck,
      addressMatch: addressCheck,
    },
    applicant,
    reasons,
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Backend error (${response.status}): ${message}`);
  }
  return response.json() as Promise<T>;
}

export async function submitVerification(input: BusinessInput): Promise<Verification> {
  const payload = {
    businessName: input.businessName,
    businessCategory: input.businessCategory,
    address: input.address,
    gstin: input.gstin || "",
    phone: input.phone || "",
  };
  const result = await apiRequest<BackendResult>("/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return buildVerification(
    { ...input, email: "" },
    String(result.id),
    new Date().toISOString(),
    result
  );
}

function recordToInput(record: BackendRecord): BusinessInput {
  return {
    businessName: record.business_name,
    businessCategory: record.business_category ?? "",
    gstin: record.gstin ?? "",
    address: record.address,
    phone: record.phone ?? "",
    email: record.email ?? "",
  };
}

export async function listVerifications(): Promise<Verification[]> {
  const records = await apiRequest<BackendRecord[]>("/verifications");
  const verifications: Verification[] = [];

  for (const record of records) {
    try {
      if (!record.result_json) continue;
      const result = JSON.parse(record.result_json) as BackendResult;
      if (!result || typeof result !== "object") continue;
      verifications.push(
        buildVerification(recordToInput(record), String(record.id), record.created_at, result)
      );
    } catch (error) {
      console.error("Could not process verification:", record.id, error);
    }
  }
  return verifications;
}

export async function getVerification(id: string): Promise<Verification | undefined> {
  try {
    const record = await apiRequest<BackendRecord>(
      `/verifications/${encodeURIComponent(id)}`
    );
    if (!record.result_json) return undefined;
    const result = JSON.parse(record.result_json) as BackendResult;
    if (!result || typeof result !== "object") return undefined;
    return buildVerification(
      recordToInput(record),
      String(record.id),
      record.created_at,
      result
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("(404)")) return undefined;
    throw error;
  }
}
