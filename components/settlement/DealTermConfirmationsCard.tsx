import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlainBadge } from "@/components/ui/badge";
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

type ConfirmationSide = "venue" | "artist_team";

function sortOldestFirst(rows: ConfirmationWithUser[]) {
  return [...rows].sort(
    (a, b) =>
      new Date(a.confirmedAt).getTime() - new Date(b.confirmedAt).getTime(),
  );
}

function getConfirmationSide(
  confirmation: ConfirmationWithUser,
): ConfirmationSide {
  return confirmation.role === "tour_manager" ? "artist_team" : "venue";
}

function SideBadge({ side }: { side: ConfirmationSide }) {
  if (side === "venue") {
    return <PlainBadge variant="default">Venue</PlainBadge>;
  }
  return <PlainBadge variant="sky">Artist team</PlainBadge>;
}

function ActionBadge({
  label,
  flagged,
}: {
  label: string;
  flagged: boolean;
}) {
  return (
    <PlainBadge variant={flagged ? "rose" : "brand"}>{label}</PlainBadge>
  );
}

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
  const side = getConfirmationSide(confirmation);
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-ink-900 leading-snug">
                  {name}
                </span>
                <SideBadge side={side} />
                <ActionBadge label={actionLabel} flagged={flagged} />
              </div>
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

export function DealTermConfirmationsCard({
  confirmations,
}: {
  confirmations: ConfirmationWithUser[];
}) {
  const entries = sortOldestFirst(confirmations.filter(isCompletedConfirmation));

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
      <CardContent className="pt-0 pb-5">
        {entries.length > 0 ? (
          <ul className="space-y-2.5">
            {entries.map((confirmation) => (
              <ConfirmationEntry
                key={confirmation.id}
                confirmation={confirmation}
              />
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-400">No confirmations yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
