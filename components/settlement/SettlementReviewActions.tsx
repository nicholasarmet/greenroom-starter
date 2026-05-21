"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShowDateFull } from "@/lib/format";

export function SettlementReviewActions({
  showId,
  token,
  readOnlyReview,
}: {
  showId: string;
  token: string;
  readOnlyReview?: {
    wasFlagged: boolean;
    actionAt: Date | string;
  } | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (action: "confirm" | "flag") => {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/review-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showId, action, token }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? "Unable to save review action.");
      }

      const payload = await response.json();
      if (action === "flag") {
        setMessage(
          "The settlement has been marked disputed and Mariana has been notified.",
        );
      } else {
        setMessage(
          "Tour manager review confirmed and settlement moved to in_review.",
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (readOnlyReview != null) {
    const actionAt =
      readOnlyReview.actionAt instanceof Date
        ? readOnlyReview.actionAt
        : new Date(readOnlyReview.actionAt);
    const actionDate = formatShowDateFull(actionAt.toISOString());
    const statusMessage = readOnlyReview.wasFlagged
      ? `You flagged this settlement on ${actionDate}.`
      : `You confirmed this settlement on ${actionDate}.`;

    return (
      <Card className="border-ink-200/80">
        <CardHeader>
          <div>
            <CardTitle>Tour manager review</CardTitle>
            <CardDescription>This review is complete and read-only.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-[13px] text-brand-900">
            {statusMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-ink-200/80">
      <CardHeader>
        <div>
          <CardTitle>Tour manager actions</CardTitle>
          <CardDescription>
            Confirm the review or flag the settlement for dispute.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="brand"
            onClick={() => handleAction("confirm")}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Confirm review"}
          </Button>
          <Button
            variant="danger"
            onClick={() => handleAction("flag")}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Flag as disputed"}
          </Button>
        </div>
        {message ? (
          <div className="rounded-2xl border border-ink-200 bg-slate-50 p-4 text-[13px] text-ink-700">
            {message}
          </div>
        ) : null}
        <div className="text-[12px] text-ink-500">
          // TODO: replace with real notification delivery.
        </div>
      </CardContent>
    </Card>
  );
}
