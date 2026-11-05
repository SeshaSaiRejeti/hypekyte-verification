import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Building2, UserRound, Info } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getVerification, type CheckResult, type CheckStatus, type OutcomeCategory } from "@/lib/verification";

const q = (id: string) =>
  queryOptions({
    queryKey: ["verification", id],
    queryFn: async () => {
      const v = await getVerification(id);
      if (!v) throw notFound();
      return v;
    },
  });

export const Route = createFileRoute("/results/$id")({
  head: () => ({
    meta: [
      { title: "Verification Result — HypeKyte" },
      { name: "description", content: "Decision, confidence score and check-by-check results for a business verification." },
      { property: "og:title", content: "Verification Result — HypeKyte" },
      { property: "og:description", content: "Business verification decision and detailed checks." },
    ],
  }),
  ssr: false, // submissions are stored in the browser for now
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(params.id)),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-muted-foreground">Verification not found. <Link to="/" className="text-primary">Back to dashboard</Link></p>
    </AppShell>
  ),
  component: Results,
});

const icon: Record<CheckStatus, React.ReactNode> = {
  passed: <CheckCircle2 className="h-5 w-5 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  failed: <XCircle className="h-5 w-5 text-destructive" />,
  invalid: <XCircle className="h-5 w-5 text-destructive" />,
  unavailable: <AlertTriangle className="h-5 w-5 text-warning" />,
  neutral: <Info className="h-5 w-5 text-muted-foreground" />,
};

const categoryLabel: Record<OutcomeCategory, string> = {
  checks_passed: "Business listing corroborated",
  verification_failed: "Business details not corroborated",
  invalid_input: "Invalid input",
  provider_failure: "Provider failure",
  inconclusive: "Inconclusive result",
};

const barColor: Record<CheckStatus, string> = {
  passed: "bg-success",
  warning: "bg-warning",
  failed: "bg-destructive",
  invalid: "bg-destructive",
  unavailable: "bg-warning",
  neutral: "bg-primary/60",
};

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

function CheckList({ items }: { items: CheckResult[] }) {
  return (
    <ul className="divide-y">
      {items.map((c) => (
        <li key={c.label} className="flex items-start gap-3 py-3">
          {icon[c.status]}
          <div className="min-w-0 flex-1">
            <div className="font-medium">{c.label}</div>
            <div className="text-sm text-muted-foreground">{c.detail}</div>
          </div>
          <StatusBadge status={c.status} />
        </li>
      ))}
    </ul>
  );
}

function InfoField({ label, value, mono = false, full = false }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-words font-medium ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}

function MatchCard({
  title,
  submittedLabel,
  submittedValue,
  registryLabel,
  registryValue,
  score,
  status,
  detail,
}: {
  title: string;
  submittedLabel: string;
  submittedValue: string;
  registryLabel: string;
  registryValue: string;
  score: number;
  status: CheckStatus;
  detail: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{submittedLabel}</div>
          <div className="mt-0.5 font-medium">{submittedValue}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{registryLabel}</div>
          <div className="mt-0.5 font-medium">{registryValue}</div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Similarity</div>
            <div className="text-sm font-semibold tabular-nums">{score}%</div>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${barColor[status]}`} style={{ width: `${score}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{detail}</div>
        </div>
      </div>
    </Card>
  );
}

function Results() {
  const { id } = Route.useParams();
  const { data: v } = useSuspenseQuery(q(id));
  const ring = v.decision === "verified" ? "var(--success)" : v.decision === "pending" ? "var(--warning)" : "var(--destructive)";
  const applicantChecks = [v.applicant.gstSignatory, v.applicant.phoneOwnership, v.applicant.emailOwnership];

  return (
    <AppShell>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <PageHeader title={v.businessName} subtitle={`${v.id} · ${v.businessCategory || "Business category not recorded"}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(${ring} ${v.confidence * 3.6}deg, var(--muted) 0)` }}>
            <div className="grid h-28 w-28 place-items-center rounded-full bg-card">
              <div>
                <div className="text-3xl font-bold tabular-nums">{v.confidence}%</div>
                <div className="text-xs text-muted-foreground">Matching confidence</div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Overall decision</div>
            <StatusBadge status={v.decision} />
            <div className="mt-2 text-xs text-muted-foreground">{categoryLabel[v.category]}</div>
            <div className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {v.source === "simulated" ? "Simulated result · not a real API check" : "Live API result"}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Verification checks</h2>
          <GroupLabel>Business existence</GroupLabel>
          <CheckList items={[v.checks.googlePlaces, v.checks.gstin]} />
          <div className="mt-4" />
          <GroupLabel>Contact verification</GroupLabel>
          <CheckList items={[v.checks.phoneOtp, v.checks.emailOtp, v.checks.emailDomain]} />
          <div className="mt-4" />
          <GroupLabel>Association with business</GroupLabel>
          <CheckList items={[v.checks.nameMatch, v.checks.addressMatch]} />
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Business Information</h2>
        </div>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <InfoField label="Business name" value={v.businessName} />
          <InfoField label="Business category" value={v.businessCategory || "Not recorded"} />
          <InfoField label="GSTIN" value={v.gstin || "Not provided"} mono />
          <InfoField label="Phone number" value={v.phone || "Not provided"} />
          <InfoField label="Email" value="Not collected" />
          <InfoField label="Business address" value={v.address} full />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MatchCard
          title="Business Name Match"
          submittedLabel="Submitted business name"
          submittedValue={v.businessName}
          registryLabel="Google Places listing name"
          registryValue={v.gstLegalName}
          score={v.nameScore}
          status={v.checks.nameMatch.status}
          detail={v.checks.nameMatch.detail}
        />
        <MatchCard
          title="Business Address Match"
          submittedLabel="Submitted business address"
          submittedValue={v.address}
          registryLabel="Google Places listing address"
          registryValue={v.gstRegisteredAddress}
          score={v.addressScore}
          status={v.checks.addressMatch.status}
          detail={v.checks.addressMatch.detail}
        />
      </div>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Applicant Association Assessment</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Business existence assessment
          </span>{" "}
          uses public business listing information from Google Places.
          <span className="font-medium text-foreground">
            {" "}Applicant association assessment
          </span>{" "}
          checks whether the person submitting can be independently linked
          to the business through authorised signatory records and verified
          communication channels.
        </p>
        <div className="mt-4 grid gap-4 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <InfoField label="Applicant name" value={v.applicant.name} />
          <InfoField label="Association with business" value={v.applicant.role} />
          <InfoField label="Contact phone" value={v.phone || "Not provided"} />
          <InfoField label="Contact email" value="Not collected" />
        </div>
        <div className="mt-3">
          <GroupLabel>Applicant association checks</GroupLabel>
          <CheckList items={applicantChecks} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Applicant association is assessed separately from business existence and does not change the overall decision. OTP checks prove control of a phone or email, not association with the business.</p>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Reasons behind the decision</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {v.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        {v.isSampleData
          ? "This record uses sample test data and is not evidence of actual business existence or registration. "
          : "Google Places listing information was retrieved through a live API request. "}
        GSTIN registry verification and phone/email OTP verification
        have not been integrated. A valid GSTIN checksum is not proof of
        registration. Applicant association has not been independently
        established. Similarity scores are indicative signals and do not
        establish ownership or authorisation.
      </p>
    </AppShell>
  );
}
