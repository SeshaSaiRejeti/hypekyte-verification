
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import {
  GSTIN_REGEX,
  submitVerification,
  type BusinessInput,
} from "@/lib/verification";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Business — HypeKyte" },
      {
        name: "description",
        content: "Submit business details for verification.",
      },
    ],
  }),
  component: Register,
});

const categories = [
  "Restaurant",
  "Cafe",
  "Retail Store",
  "Event Organizer",
  "Hotel",
  "Grocery Store",
  "Other",
];

const schema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name").max(120),
  businessCategory: z.string().min(1, "Select a business category"),
  gstin: z.string().trim().toUpperCase().refine(
    (value) => value === "" || GSTIN_REGEX.test(value),
    "Enter a valid 15-character GSTIN"
  ),
  address: z.string().trim().min(5, "Enter the business address").max(300),
  phone: z.string().trim().refine(
    (value) => value === "" || /^[6-9]\d{9}$/.test(value),
    "Enter a valid 10-digit mobile number"
  ),
  email: z.string().default(""),
});

function Register() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [values, setValues] = useState<BusinessInput>({
    businessName: "",
    businessCategory: "",
    gstin: "",
    address: "",
    phone: "",
    email: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof BusinessInput, string>>
  >({});

  const [loading, setLoading] = useState(false);

  function updateField(name: keyof BusinessInput, value: string) {
    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      const errs: typeof errors = {};

      parsed.error.issues.forEach((issue) => {
        errs[issue.path[0] as keyof BusinessInput] ??= issue.message;
      });

      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await submitVerification({
        ...parsed.data,
        email: "",
      });

      await qc.invalidateQueries({
        queryKey: ["verifications"],
      });

      navigate({
        to: "/results/$id",
        params: { id: result.id },
      });
    } catch (error) {
      console.error("Verification submission failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not submit verification."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/15";

  return (
    <AppShell>
      <PageHeader
        title="Register a business"
        subtitle="Submit business information for Google Places and matching checks."
      />

      <Card className="max-w-2xl p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-5">

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Business Name *
            </label>
            <input
              className={inputClass}
              placeholder="Sharma Textiles Pvt Ltd"
              value={values.businessName}
              disabled={loading}
              onChange={(e) =>
                updateField("businessName", e.target.value)
              }
            />
            {errors.businessName && (
              <p className="mt-1 text-xs text-destructive">
                {errors.businessName}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Business Category *
            </label>
            <select
              className={inputClass}
              value={values.businessCategory}
              disabled={loading}
              onChange={(e) =>
                updateField("businessCategory", e.target.value)
              }
            >
              <option value="">Select business category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.businessCategory && (
              <p className="mt-1 text-xs text-destructive">
                {errors.businessCategory}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Business Address *
            </label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="14 Linking Road, Bandra West, Mumbai"
              value={values.address}
              disabled={loading}
              onChange={(e) =>
                updateField("address", e.target.value)
              }
            />
            {errors.address && (
              <p className="mt-1 text-xs text-destructive">
                {errors.address}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              GSTIN (Optional)
            </label>
            <input
              className={`${inputClass} font-mono uppercase`}
              placeholder="27AABCS1429B1ZB"
              value={values.gstin}
              disabled={loading}
              onChange={(e) =>
                updateField("gstin", e.target.value.toUpperCase())
              }
            />
            {errors.gstin && (
              <p className="mt-1 text-xs text-destructive">
                {errors.gstin}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Business Phone Number (Optional)
            </label>
            <input
              type="tel"
              className={inputClass}
              placeholder="9876543210"
              value={values.phone}
              disabled={loading}
              onChange={(e) =>
                updateField("phone", e.target.value)
              }
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-destructive">
                {errors.phone}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {loading
              ? "Running verification checks…"
              : "Submit for Verification"}
          </button>
        </form>
      </Card>
    </AppShell>
  );
}
