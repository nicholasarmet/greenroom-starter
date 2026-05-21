"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { Deal } from "@/db/schema";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

type FieldKey =
  | "dealType"
  | "guaranteeAmount"
  | "percentage"
  | "percentageBasis"
  | "expenseCap"
  | "hospitalityCap";

const comparableFields: { key: FieldKey; label: string }[] = [
  { key: "dealType", label: "Deal type" },
  { key: "guaranteeAmount", label: "Guarantee" },
  { key: "percentage", label: "Percentage" },
  { key: "percentageBasis", label: "Percentage basis" },
  { key: "expenseCap", label: "Expense cap" },
  { key: "hospitalityCap", label: "Hospitality cap" },
];

function formatFieldValue(key: FieldKey, value: unknown) {
  if (value == null) return "—";
  if (key === "guaranteeAmount" || key === "expenseCap" || key === "hospitalityCap") {
    return formatMoney(Number(value));
  }
  if (key === "percentage") {
    return `${Number(value) * 100}%`;
  }
  return String(value);
}

function formatTermLabel(key: keyof ExtractedDealTerms) {
  switch (key) {
    case "dealType":
      return "Deal type";
    case "guaranteeAmount":
      return "Guarantee";
    case "percentage":
      return "Percentage";
    case "percentageBasis":
      return "Percentage basis";
    case "expenseCap":
      return "Expense cap";
    case "hospitalityCap":
      return "Hospitality cap";
    case "bonuses":
      return "Bonuses";
    case "recoups":
      return "Recoups";
    case "rawText":
      return "Extracted raw text";
    default:
      return String(key);
  }
}

function base64Decode(value: string) {
  try {
    return decodeURIComponent(escape(window.atob(value)));
  } catch {
    return null;
  }
}

function renderBonusRows(bonuses: ExtractedDealTerms["bonuses"]) {
  if (!bonuses || bonuses.length === 0) {
    return <div className="text-[13px] text-ink-500">No bonuses extracted.</div>;
  }

  return (
    <div className="space-y-2">
      {bonuses.map((bonus, index) => (
        <div key={index} className="rounded-2xl border border-ink-200/80 bg-canvas p-4">
          <div className="text-[14px] font-medium text-ink-900">{bonus.label}</div>
        </div>
      ))}
    </div>
  );
}

function renderRecoupRows(recoups: ExtractedDealTerms["recoups"]) {
  if (!recoups || recoups.length === 0) {
    return <div className="text-[13px] text-ink-500">No recoups extracted.</div>;
  }

  return (
    <div className="space-y-3">
      {recoups.map((recoup, index) => (
        <div key={index} className="rounded-2xl border border-ink-200/80 bg-canvas p-4">
          <div className="text-[14px] font-medium text-ink-900">
            {recoup.label} · {formatMoney(recoup.amount)}
          </div>
          <div className="text-[12px] text-ink-500 mt-1">{recoup.note}</div>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "number") return value.toString();
  return String(value);
}

function formatTermValue(key: keyof ExtractedDealTerms, value: unknown) {
  if (value == null) return "—";
  if (
    key === "guaranteeAmount" ||
    key === "expenseCap" ||
    key === "hospitalityCap"
  ) {
    return formatMoney(Number(value));
  }
  if (key === "percentage") {
    return `${Number(value) * 100}%`;
  }
  return formatValue(value);
}

export function ConfirmDealTermsClient({
  showId,
  deal,
}: {
  showId: string;
  deal?: Deal | null;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const termsParam = searchParams.get("terms");
  const decodedText = useMemo(() => {
    if (!termsParam) return null;
    return base64Decode(termsParam);
  }, [termsParam]);

  const extractedTerms = useMemo(() => {
    if (!decodedText) return null;
    try {
      return JSON.parse(decodedText) as ExtractedDealTerms;
    } catch {
      return null;
    }
  }, [decodedText]);
  // TODO: in production, structured fields are populated from confirmed dealTerms, not used for comparison.

  const handleConfirm = async () => {
    if (!params?.id || !extractedTerms) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/confirm-deal-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: params.id,
          confirmedTerms: extractedTerms,
          role: "tour_manager",
        }),
      });
      if (!response.ok) {
        let errorMessage = "Unable to confirm deal terms.";
        try {
          const data = await response.json();
          if (data?.error) errorMessage = String(data.error);
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      setMessage("Deal terms confirmed and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSomethingLooksWrong = async () => {
    if (!params?.id || !extractedTerms) return;
    const note = window.prompt(
      "Please briefly explain what looks wrong with these extracted deal terms.",
    );
    if (!note || note.trim().length === 0) {
      setMessage("A brief note is required to report an issue.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/review-settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: params.id,
          action: "flag",
          note: note.trim(),
        }),
      });
      if (!response.ok) {
        let errorText = "Unable to report an issue.";
        try {
          const data = await response.json();
          if (data?.error) errorText = String(data.error);
        } catch {
          const text = await response.text();
          if (text) errorText = text;
        }
        throw new Error(errorText);
      }
      setMessage("Issue reported. This settlement has been marked disputed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error while reporting issue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!termsParam) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <Card>
          <CardContent>
            <div className="text-[13px] text-ink-700">
              Confirmation link is missing required terms.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!extractedTerms) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <Card>
          <CardContent>
            <div className="text-[13px] text-rose-700">
              Confirmation link is invalid or malformed.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-12 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-[36px] font-medium text-ink-900 tracking-tight">
          Confirm extracted deal terms
        </h1>
        <p className="text-[14px] text-ink-500 mt-3 max-w-2xl">
          Review the extracted deal terms and confirm them for this show. This
          page is the prototype replacement for tour manager email confirmation.
        </p>
      </div>

      {/* Existing structured values intentionally hidden — user can flag extracted terms below. */}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Extracted deal terms</CardTitle>
            <CardDescription>
              These values were shared by the venue. Confirming them saves a
              recorded agreement and persists the deal terms snapshot.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(extractedTerms) as (keyof ExtractedDealTerms)[]).map((key) => (
              <div key={key} className="rounded-2xl border border-ink-200/80 bg-canvas p-4">
                <div className="text-[12px] text-ink-500">{formatTermLabel(key)}</div>
                <div className="mt-2 text-[14px] text-ink-900">
                  {key === "bonuses" ? (
                    renderBonusRows(extractedTerms.bonuses)
                  ) : key === "recoups" ? (
                    renderRecoupRows(extractedTerms.recoups)
                  ) : (
                    <div className="whitespace-pre-wrap">{formatTermValue(key, extractedTerms[key])}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {message ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-4 text-[13px] text-ink-700">
              {message}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Confirming…" : "Confirm deal terms"}
              </Button>
              <Button variant="secondary" onClick={handleSomethingLooksWrong} disabled={submitting}>
                {submitting ? "Reporting…" : "Something looks wrong"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
