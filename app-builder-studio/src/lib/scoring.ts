// Decision policy. Kept separate so it can be replaced by the Python backend's
// scoring service without touching pages or the mock checks.
//
// No numeric confidence thresholds or check weights are defined here on purpose:
// those must come from the backend / business owners. Until then, the decision is
// derived only from the *kind* of each critical check outcome.

import type { CheckResult, CheckStatus, OutcomeCategory, Status } from "./verification-types";

export interface ScoringPolicy {
  decide(critical: CheckResult[], inputValid: boolean): { decision: Status; category: OutcomeCategory };
  /** Optional summary number for display. Not used for the decision. */
  summary(checks: CheckResult[]): number;
}

export const ruleBasedPolicy: ScoringPolicy = {
  decide(critical, inputValid) {
    const has = (s: CheckStatus) => critical.some((c) => c.status === s);
    if (!inputValid || has("invalid")) return { decision: "rejected", category: "invalid_input" };
    if (has("failed")) return { decision: "rejected", category: "verification_failed" };
    // Provider unavailable is never grounds for rejection — route to a reviewer.
    if (has("unavailable")) return { decision: "pending", category: "provider_failure" };
    if (has("warning")) return { decision: "pending", category: "inconclusive" };
    return { decision: "verified", category: "checks_passed" };
  },
  // Unweighted share of completed checks that passed (excludes unavailable / neutral signals).
  summary(checks) {
    const done = checks.filter((c) => c.status !== "unavailable" && c.status !== "neutral");
    if (!done.length) return 0;
    return Math.round((done.filter((c) => c.status === "passed").length / done.length) * 100);
  },
};

// Swap this export to plug in a different policy (e.g. backend-provided decisions).
export const scoringPolicy: ScoringPolicy = ruleBasedPolicy;
