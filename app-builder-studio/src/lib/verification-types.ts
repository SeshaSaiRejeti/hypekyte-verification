// Shared frontend data contract for business verification records.
export type Status = "verified" | "pending" | "rejected";
export type CheckStatus =
  | "passed"
  | "failed"
  | "warning"
  | "unavailable"
  | "invalid"
  | "neutral";
export type OutcomeCategory =
  | "checks_passed"
  | "verification_failed"
  | "invalid_input"
  | "provider_failure"
  | "inconclusive";
export type ResultSource = "simulated" | "live";

export interface BusinessInput {
  businessName: string;
  businessCategory: string;
  gstin: string;
  address: string;
  phone: string;
  // Kept internally for compatibility with older saved records. The new
  // registration form does not collect email.
  email: string;
}

export interface CheckResult {
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface ApplicantAssociation {
  name: string;
  role: string;
  gstSignatory: CheckResult;
  phoneOwnership: CheckResult;
  emailOwnership: CheckResult;
}

export interface Verification extends BusinessInput {
  id: string;
  submittedAt: string;
  source: ResultSource;
  isSampleData: boolean;
  decision: Status;
  category: OutcomeCategory;
  confidence: number;
  gstLegalName: string;
  gstRegisteredAddress: string;
  nameScore: number;
  addressScore: number;
  matchCount: number;
  checks: {
    googlePlaces: CheckResult;
    gstin: CheckResult;
    phoneOtp: CheckResult;
    emailOtp: CheckResult;
    emailDomain: CheckResult;
    nameMatch: CheckResult;
    addressMatch: CheckResult;
  };
  applicant: ApplicantAssociation;
  reasons: string[];
}
