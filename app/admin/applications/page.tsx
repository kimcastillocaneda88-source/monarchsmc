import type { Metadata } from "next";
import Link from "next/link";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import {
  ApplicationReviewForm,
  CreateAccountButton,
} from "@/components/admin/ApplicationControls";
import { listApplications } from "@/lib/data/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";
import { formatDateTime, formatMillis } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

const STATUS_TONES: Record<ApplicationStatus, "gold" | "warning" | "success" | "danger" | "muted"> = {
  new: "gold",
  reviewing: "warning",
  invited: "warning",
  accepted: "success",
  declined: "danger",
  archived: "muted",
};

function parseStatus(value: string | undefined): ApplicationStatus | undefined {
  return value && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : undefined;
}

/**
 * Membership applications.
 *
 * Admin-only at every layer: this page, the actions behind it, and the
 * Firestore rules — which deny reads of the applications collection to
 * everyone, including the applicant.
 */
export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; open?: string }>;
}) {
  await requireClubManagerPage("/admin/applications");
  const { status, q, open } = await searchParams;

  const parsedStatus = parseStatus(status);
  const applications = await listApplications({ status: parsedStatus, limit: 40 });

  const needle = (q ?? "").trim().toLowerCase();
  const filtered = needle
    ? applications.filter(
        (application) =>
          application.fullName.toLowerCase().includes(needle) ||
          application.email.toLowerCase().includes(needle) ||
          application.location.toLowerCase().includes(needle),
      )
    : applications;

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Applications"
        description="Every application submitted through the public join form. Applicants are never told their internal status."
      />

      <Panel className="mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <nav aria-label="Filter by status" className="flex flex-wrap gap-px bg-ash">
            <Link
              href="/admin/applications"
              className={cn(
                "min-h-10 bg-ink px-4 py-2.5 font-display text-[0.625rem] tracking-[0.18em] uppercase",
                !parsedStatus ? "bg-gold text-ink" : "text-mist hover:text-gold",
              )}
            >
              All
            </Link>
            {APPLICATION_STATUSES.map((value) => (
              <Link
                key={value}
                href={`/admin/applications?status=${value}`}
                className={cn(
                  "min-h-10 bg-ink px-4 py-2.5 font-display text-[0.625rem] tracking-[0.18em] uppercase",
                  parsedStatus === value ? "bg-gold text-ink" : "text-mist hover:text-gold",
                )}
              >
                {value}
              </Link>
            ))}
          </nav>

          <form method="get" className="flex flex-wrap items-end gap-3">
            {parsedStatus ? <input type="hidden" name="status" value={parsedStatus} /> : null}
            <div className="space-y-2">
              <label
                htmlFor="q"
                className="block font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Name, email or location"
                className="min-h-12 w-full min-w-56 border border-ash bg-charcoal px-4 py-3 text-sm text-bone placeholder:text-smoke/70 focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="min-h-9 border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-bone uppercase transition hover:border-gold hover:text-gold"
            >
              Search
            </button>
          </form>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          title="No applications"
          description={
            applications.length === 0
              ? "Applications submitted through the public join form appear here."
              : "Try a different search or clear the filter."
          }
        />
      ) : (
        <ul className="space-y-px bg-ash">
          {filtered.map((application) => {
            const isOpen = open === application.id;
            return (
              <li key={application.id} className="bg-ink">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                        {application.fullName}
                      </h2>
                      <Badge tone={STATUS_TONES[application.status]}>{application.status}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-smoke">
                      {application.motorcycle} · {application.location} ·{" "}
                      {application.yearsRiding} yr riding
                    </p>
                    <p className="mt-1 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                      Submitted {formatDateTime(application.submittedAt)}
                    </p>
                  </div>

                  <Link
                    href={
                      isOpen
                        ? `/admin/applications${parsedStatus ? `?status=${parsedStatus}` : ""}`
                        : `/admin/applications?${parsedStatus ? `status=${parsedStatus}&` : ""}open=${application.id}`
                    }
                    className="inline-flex min-h-9 shrink-0 items-center self-start border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-mist uppercase transition hover:border-gold hover:text-gold"
                  >
                    {isOpen ? "Close" : "Review"}
                  </Link>
                </div>

                {isOpen ? (
                  <div className="grid gap-8 border-t border-ash bg-charcoal/40 p-5 lg:grid-cols-2">
                    <div>
                      <h3 className="u-eyebrow mb-5">Application</h3>
                      <dl className="space-y-3 text-sm">
                        <Row label="Preferred name" value={application.preferredName ?? "—"} />
                        <Row label="Email" value={application.email} />
                        <Row label="Phone" value={application.phone} />
                        <Row label="Location" value={application.location} />
                        <Row label="Motorcycle" value={application.motorcycle} />
                        <Row label="Experience" value={application.ridingExperience} />
                        <Row label="Years riding" value={String(application.yearsRiding)} />
                        <Row label="Heard via" value={application.howHeard ?? "—"} />
                        {application.reviewedAt ? (
                          <Row label="Last reviewed" value={formatMillis(application.reviewedAt)} />
                        ) : null}
                      </dl>

                      <h3 className="u-eyebrow mt-8 mb-4">Why they want to ride with us</h3>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-mist">
                        {application.whyJoin}
                      </p>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h3 className="u-eyebrow mb-5">Review</h3>
                        <ApplicationReviewForm application={application} />
                      </div>
                      <div className="border-t border-ash pt-6">
                        <h3 className="u-eyebrow mb-5">Account</h3>
                        <CreateAccountButton application={application} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-ash/60 pb-2">
      <dt className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">{label}</dt>
      <dd className="text-right break-all text-mist">{value}</dd>
    </div>
  );
}
