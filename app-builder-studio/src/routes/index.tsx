import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock, XCircle, Plus } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listVerifications } from "@/lib/verification";

export const verificationsQuery = queryOptions({ queryKey: ["verifications"], queryFn: listVerifications });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HypeKyte Business Verification" },
      { name: "description", content: "Overview of submitted, verified, pending and rejected business verifications." },
      { property: "og:title", content: "Dashboard — HypeKyte Business Verification" },
      { property: "og:description", content: "Overview of business verification submissions and outcomes." },
    ],
  }),
  ssr: false, // submissions are stored in the browser for now
  loader: ({ context }) => context.queryClient.ensureQueryData(verificationsQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(verificationsQuery);
  const count = (s: string) => data.filter((v) => v.decision === s).length;
  const stats = [
    { label: "Total submitted", value: data.length, icon: Building2, tone: "bg-primary/10 text-primary" },
    { label: "Verified", value: count("verified"), icon: CheckCircle2, tone: "bg-success/12 text-success" },
    { label: "Pending review", value: count("pending"), icon: Clock, tone: "bg-warning/15 text-warning-foreground" },
    { label: "Rejected", value: count("rejected"), icon: XCircle, tone: "bg-destructive/10 text-destructive" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Track every business verification at a glance."
        action={
          <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New verification
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className={`mb-4 grid h-10 w-10 place-items-center rounded-lg ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold tabular-nums">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Recent submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Business name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">GSTIN</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id} className="border-t hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium">
                    <Link to="/results/$id" params={{ id: v.id }} className="hover:text-primary">{v.businessName}</Link>
                  </td>
                  <td className="px-5 py-3.5">{v.businessCategory || "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{v.gstin || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                    {new Date(v.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={v.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
