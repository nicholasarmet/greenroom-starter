import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  UserRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatConfirmationDateTime } from "@/lib/format";
import {
  getConfirmationActionLabel,
  getTourManagerFullLine,
  isCompletedConfirmation,
  isFlaggedConfirmation,
  isSettlementReviewConfirmation,
} from "@/lib/dealTermConfirmationDisplay";
import type { User, dealTermConfirmations } from "@/db/schema";

type ConfirmationWithUser = typeof dealTermConfirmations.$inferSelect & {
  user: User | null;
};

function RoleIcon({ role }: { role: ConfirmationWithUser["role"] }) {
  if (role === "tour_manager") {
    return <Briefcase className="h-4 w-4 text-brand-700" aria-hidden />;
  }
  return <UserRound className="h-4 w-4 text-brand-700" aria-hidden />;
}

function StatusIndicator({ flagged }: { flagged: boolean }) {
  if (flagged) {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-amber-600"
        aria-label="Flagged"
      />
    );
  }
  return (
    <CheckCircle2
      className="h-4 w-4 shrink-0 text-brand-700"
      aria-label="Confirmed"
    />
  );
}

function getDisplayName(confirmation: ConfirmationWithUser): string {
  if (confirmation.user?.name) {
    return confirmation.user.name;
  }
  if (confirmation.role === "tour_manager") {
    return "Tour manager";
  }
  if (confirmation.role === "gm") {
    return "General manager";
  }
  return "Venue booker";
}

function ConfirmationEntry({ confirmation }: { confirmation: ConfirmationWithUser }) {
  const flagged = isFlaggedConfirmation(confirmation);
  const actionLabel = getConfirmationActionLabel(confirmation);
  const name = getDisplayName(confirmation);
  const timestamp = formatConfirmationDateTime(confirmation.confirmedAt);

  const ariaLabel =
    confirmation.role === "tour_manager" &&
    !confirmation.user &&
    isSettlementReviewConfirmation(confirmation)
      ? getTourManagerFullLine(confirmation, timestamp)
      : undefined;

  return (
    <li
      aria-label={ariaLabel}
      className={`rounded-2xl border bg-white px-4 py-3.5 ${
        flagged
          ? "border-amber-200/90 ring-1 ring-inset ring-amber-100/80"
          : "border-ink-200/80 ring-1 ring-inset ring-brand-50/50"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            flagged ? "bg-amber-50" : "bg-brand-50"
          }`}
        >
          <RoleIcon role={confirmation.role} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink-900 leading-snug">
                {name}
              </div>
              <div className="text-[12px] text-ink-500 mt-0.5">{actionLabel}</div>
            </div>
            <StatusIndicator flagged={flagged} />
          </div>
          <div className="text-[11px] text-ink-400 mt-2 font-mono tabular">
            {timestamp}
          </div>
          {confirmation.flagNote ? (
            <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[12px] text-ink-700 leading-relaxed">
              {confirmation.flagNote}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function PendingPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200/90 bg-ink-50/40 px-4 py-8 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-ink-200/80">
        <Clock className="h-4 w-4 text-ink-300" aria-hidden />
      </div>
      <div className="text-[12px] font-medium text-ink-500">Pending</div>
      <p className="mt-1 text-[11px] text-ink-400 leading-relaxed">{label}</p>
    </div>
  );
}

function ConfirmationSection({
  title,
  description,
  rows,
  pendingLabel,
}: {
  title: string;
  description: string;
  rows: ConfirmationWithUser[];
  pendingLabel: string;
}) {
  return (
    <section>
      <div className="mb-3 pb-3 border-b border-ink-200/60">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          {title}
        </h3>
        <p className="text-[12px] text-ink-400 mt-1">{description}</p>
      </div>
      {rows.length > 0 ? (
        <ul className="space-y-2.5">
          {rows.map((confirmation) => (
            <ConfirmationEntry
              key={confirmation.id}
              confirmation={confirmation}
            />
          ))}
        </ul>
      ) : (
        <PendingPlaceholder label={pendingLabel} />
      )}
    </section>
  );
}

export function DealTermConfirmationsCard({
  confirmations,
}: {
  confirmations: ConfirmationWithUser[];
}) {
  const completed = confirmations.filter(isCompletedConfirmation);

  const venue = completed.filter(
    (c) => c.role === "booker" || c.role === "gm",
  );
  const artistTeam = completed.filter((c) => c.role === "tour_manager");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="eyebrow text-[10px] text-ink-400 mb-1.5">
          Confirmation history
        </div>
        <CardTitle className="text-[15px] font-semibold text-ink-900 leading-snug">
          Deal term confirmations — both parties must confirm before settlement
          is finalized.
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-5 space-y-8">
        <ConfirmationSection
          title="Venue"
          description="Booker and GM deal term sign-offs"
          rows={venue}
          pendingLabel="Waiting for venue confirmation of extracted deal terms."
        />
        <ConfirmationSection
          title="Artist team"
          description="Tour manager deal terms and settlement review"
          rows={artistTeam}
          pendingLabel="Waiting for tour manager deal term or settlement review confirmation."
        />
      </CardContent>
    </Card>
  );
}
