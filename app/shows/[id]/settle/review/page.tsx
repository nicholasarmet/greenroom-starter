import { notFound } from "next/navigation";
import {
  getShowById,
  getTourManagerConfirmationByLinkToken,
  isTourManagerLinkReadOnly,
} from "@/lib/queries";
import { calculateSettlement } from "@/lib/dealMath";
import { formatConfirmationDateTime, formatShowDateFull } from "@/lib/format";
import { StatusBadge, DealTypeBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettlementReviewActions } from "@/components/settlement/SettlementReviewActions";
import { MathBreakdown } from "@/components/settlement/MathBreakdown";
import { Logomark } from "@/components/brand/logo";

export default async function ReviewSettlementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ linkToken?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const linkToken =
    typeof resolvedSearchParams.linkToken === "string"
      ? resolvedSearchParams.linkToken
      : undefined;

  if (!linkToken) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <Card>
          <CardContent>
            <div className="text-[13px] text-rose-700">
              Review link is missing a valid link token. Ask the venue for a new link.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchedConfirmation = await getTourManagerConfirmationByLinkToken(
    id,
    linkToken,
  );

  if (!matchedConfirmation) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <Card>
          <CardContent>
            <div className="text-[13px] text-rose-700">
              Review link is invalid or has expired. Ask the venue for a new link.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showData = await getShowById(id);
  if (!showData) notFound();

  const { show, artist, deal, ticketSales, expenses, settlement, recoups, venue } =
    showData;
  if (!deal) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <Card>
          <CardContent>
            <div className="text-[13px] text-ink-700">
              This show does not have deal data available yet.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calc = calculateSettlement({
    deal,
    ticketSales,
    expenses,
    venueCapacity: venue?.capacity ?? undefined,
  });

  const readOnlyReview = isTourManagerLinkReadOnly(matchedConfirmation)
    ? {
        wasFlagged: !!matchedConfirmation.flagNote,
        actionAt: matchedConfirmation.confirmedAt,
      }
    : null;

  return (
    <div className="px-12 py-10 max-w-7xl">
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={show.status} />
          <DealTypeBadge type={deal.dealType} />
        </div>
        <h1 className="font-display text-[44px] font-medium text-ink-900 leading-[1.05]">
          Review settlement math · {artist?.name}
        </h1>
        <div className="text-[14px] text-ink-500 mt-3">
          {formatShowDateFull(show.date)} · {venue?.name}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <MathBreakdown
            calc={calc}
            expenses={expenses}
            recoups={recoups}
            dealText={deal.dealNotesFreetext}
          />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Raw deal notes</CardTitle>
                <CardDescription>
                  The original deal language used for review and recoup validation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-[13px] text-ink-700">{deal.dealNotesFreetext || "No deal notes available."}</pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SettlementReviewActions
            showId={id}
            linkToken={linkToken}
            readOnlyReview={readOnlyReview}
          />

          <Card className="border-ink-200/80 bg-slate-50">
            <CardContent>
              <div className="text-[13px] text-ink-700">
                Review link issued at:{" "}
                {formatConfirmationDateTime(matchedConfirmation.createdAt)}.
              </div>
            </CardContent>
          </Card>

          <Card className="border-ink-200/80">
            <CardHeader>
              <div>
                <CardTitle>Review notes</CardTitle>
                <CardDescription>
                  This page is a read-only prototype view of the settlement math for the tour manager.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[13px] text-ink-500">
                When the tour manager confirms, the settlement status will move to <strong>signed</strong>. If they flag the settlement, it will move to <strong>disputed</strong>.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-14 pt-10 border-t border-ink-200/60">
        <div className="flex gap-4 items-start max-w-3xl">
          <Logomark size={40} className="shrink-0" />
          <div>
            <h2 className="font-display text-[20px] font-medium text-ink-900 mb-2" style={{ letterSpacing: "-0.02em" }}>
              This is the full manager review interface.
            </h2>
            <p className="text-[13px] text-ink-500 leading-relaxed">
              The tour manager gets a read-only settlement summary with math detail, expenses, recoups, and raw deal language. No values can be changed here — only confirmed or flagged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
