"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { Deal } from "@/db/schema";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

const comparableFields = [
  {
    key: "dealType" as const,
    label: "Deal type",
  },
  {
    key: "guaranteeAmount" as const,
    label: "Guarantee",
  },
  {
    key: "percentage" as const,
    label: "Percentage",
  },
  {
    key: "percentageBasis" as const,
    label: "Percentage basis",
  },
  {
    key: "expenseCap" as const,
    label: "Expense cap",
  },
  {
    key: "hospitalityCap" as const,
    label: "Hospitality cap",
  },
];

type FieldKey = (typeof comparableFields)[number]["key"];

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

function base64Encode(value: string) {
  return window.btoa(unescape(encodeURIComponent(value)));
}

async function issueDealTermLink(showId: string, kind: "confirmation" | "review") {
  const res = await fetch("/api/issue-deal-term-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showId, kind }),
  });
  if (!res.ok) {
    throw new Error("Unable to issue link.");
  }
  const json = (await res.json()) as { linkToken?: string };
  if (!json.linkToken) {
    throw new Error("Link token was not returned.");
  }
  return json.linkToken;
}

function buildConfirmationLink(
  showId: string,
  terms: ExtractedDealTerms,
  linkToken: string,
) {
  const encoded = base64Encode(JSON.stringify(terms));
  return `${window.location.origin}/shows/${showId}/settle/confirm?terms=${encodeURIComponent(
    encoded,
  )}&linkToken=${encodeURIComponent(linkToken)}`;
}

function buildReviewLink(showId: string, linkToken: string) {
  return `${window.location.origin}/shows/${showId}/settle/review?linkToken=${encodeURIComponent(
    linkToken,
  )}`;
}

export function DealTermExtractor({
  showId,
  deal,
}: {
  showId: string;
  deal: Deal;
}) {
  const [input, setInput] = useState(deal.dealNotesFreetext ?? "");
  const [result, setResult] = useState<ExtractedDealTerms | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationLinkCopied, setConfirmationLinkCopied] = useState(false);
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  // TODO: in production, structured fields are populated from confirmed dealTerms, not used for comparison.

  const canGenerateLink = !!result;

  useEffect(() => {
    if (!confirmationLinkCopied) return;
    const timeout = setTimeout(() => setConfirmationLinkCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [confirmationLinkCopied]);

  useEffect(() => {
    if (!reviewLinkCopied) return;
    const timeout = setTimeout(() => setReviewLinkCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [reviewLinkCopied]);

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setConfirmationLinkCopied(false);
    setReviewLinkCopied(false);

    try {
      const res = await fetch("/api/extract-deal-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) {
        throw new Error("Extraction failed.");
      }
      const json = await res.json();
      setResult(json as ExtractedDealTerms);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to extract deal terms.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyConfirmationLink = async () => {
    if (!result) return;
    try {
      const linkToken = await issueDealTermLink(showId, "confirmation");
      const link = buildConfirmationLink(showId, result, linkToken);
      await navigator.clipboard.writeText(link);
      setConfirmationLinkCopied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate confirmation link.");
    }
  };

  const handleCopyReviewLink = async () => {
    try {
      const linkToken = await issueDealTermLink(showId, "review");
      const link = buildReviewLink(showId, linkToken);
      await navigator.clipboard.writeText(link);
      setReviewLinkCopied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate review link.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Extract deal terms</CardTitle>
          <CardDescription>
            Paste the deal language and confirm the extracted values before
            generating a tour manager confirmation link.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink-700">
            Deal notes
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-ink-200/80 bg-canvas px-4 py-3 text-[13px] text-ink-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="brand" onClick={handleExtract} disabled={loading}>
            {loading ? "Extracting…" : "Extract terms"}
          </Button>
          <Button
            variant="outline"
            disabled={!canGenerateLink || loading}
            onClick={handleCopyConfirmationLink}
          >
            Generate confirmation link
          </Button>
          {confirmationLinkCopied ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-800">
              <Check className="h-3.5 w-3.5" />
              Link copied
            </span>
          ) : null}
          <Button
            variant="outline"
            disabled={loading}
            onClick={handleCopyReviewLink}
          >
            Copy manager review link
          </Button>
          {reviewLinkCopied ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-800">
              <Check className="h-3.5 w-3.5" />
              Link copied
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <Card className="border-ink-200/80">
              <CardHeader>
                <CardTitle>Extracted terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {comparableFields.map((field) => {
                    const key = field.key;
                    const extractedValue = result[key];
                    return (
                      <div key={key} className="rounded-2xl border border-ink-200/80 bg-white p-4">
                        <div className="text-[12px] text-ink-500">
                          {field.label}
                        </div>
                        <div className="text-[14px] font-medium text-ink-900 mt-1">
                          {formatFieldValue(key, extractedValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {result.rawText ? (
                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-ink-700">
                      Extracted raw text
                    </div>
                    <div className="rounded-2xl border border-ink-200/80 bg-canvas p-4 text-[13px] text-ink-900 whitespace-pre-wrap">
                      {result.rawText}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border-l-4 border-amber-300 bg-amber-50/80 p-4 text-[13px] text-ink-700">
                  Note: this prototype uses fixed sample terms for demonstration. In production, terms are extracted from the actual deal email.
                </div>

                {result.bonuses?.length ? (
                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-ink-700">
                      Bonus terms
                    </div>
                    <div className="space-y-2">
                      {result.bonuses.map((bonus, index) => (
                        <div key={index} className="rounded-2xl border border-ink-200/80 bg-canvas p-4">
                          <div className="text-[13px] font-medium text-ink-900">
                            {bonus.label}
                          </div>
                          <div className="text-[12px] text-ink-500 mt-1">
                            {formatMoney(bonus.amount)} after gross ≥ {formatMoney(bonus.threshold)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.recoups?.length ? (
                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-ink-700">
                      Recoups extracted
                    </div>
                    <div className="space-y-2">
                      {result.recoups.map((recoup, index) => (
                        <div key={index} className="rounded-2xl border border-ink-200/80 bg-canvas p-4">
                          <div className="text-[13px] font-medium text-ink-900">
                            {recoup.label} · {formatMoney(recoup.amount)}
                          </div>
                          <div className="text-[12px] text-ink-500 mt-1">
                            {recoup.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
