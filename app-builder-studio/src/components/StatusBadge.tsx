import type { CheckStatus, Status } from "@/lib/verification";

const styles: Record<Status | CheckStatus, string> = {
  verified: "bg-success/12 text-success",
  passed: "bg-success/12 text-success",
  pending: "bg-warning/15 text-warning-foreground",
  warning: "bg-warning/15 text-warning-foreground",
  rejected: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
  invalid: "bg-destructive/10 text-destructive",
  unavailable: "bg-warning/15 text-warning-foreground",
  neutral: "bg-muted text-muted-foreground",
};

const labels: Record<Status | CheckStatus, string> = {
  verified: "Verified",
  pending: "Pending Manual Review",
  rejected: "Rejected",
  passed: "Passed",
  warning: "Inconclusive",
  failed: "Failed",
  invalid: "Invalid input",
  unavailable: "Provider unavailable",
  neutral: "Signal only",
};

export function StatusBadge({ status }: { status: Status | CheckStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
