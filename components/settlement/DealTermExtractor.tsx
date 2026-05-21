"use client";

import { useMemo, useState } from "react";
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

type Selection = "existing" | "extracted";

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
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviewLink, setReviewLink] = useState<string | null>(null);
  const [reviewCopied, setReviewCopied] = useState(false);
  // TODO: in production, structured fields are populated from confirmed dealTerms, not used for comparison.

  const canGenerateLink = !!result;

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setLink(null);
    setCopied(false);

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

  const handleGenerateLink = () => {
    const toEncode = result;
    if (!toEncode) return;
    const encoded = base64Encode(JSON.stringify(toEncode));
    const nextLink = `${window.location.origin}/shows/${showId}/settle/confirm?terms=${encodeURIComponent(
      encoded,
    )}`;
    setLink(nextLink);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  const handleGenerateReviewLink = () => {
    const payload = {
      showId,
      createdAt: Date.now(),
    };
    const encoded = base64Encode(JSON.stringify(payload));
    const nextReviewLink = `${window.location.origin}/shows/${showId}/settle/review?token=${encodeURIComponent(
      encoded,
    )}`;
    setReviewLink(nextReviewLink);
    setReviewCopied(false);
  };

  const handleCopyReview = async () => {
    if (!reviewLink) return;
    await navigator.clipboard.writeText(reviewLink);
    setReviewCopied(true);
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

        <div className="flex flex-wrap gap-3">
          <Button variant="brand" onClick={handleExtract} disabled={loading}>
            {loading ? "Extracting…" : "Extract terms"}
          </Button>
          <Button
            variant="outline"
            disabled={!canGenerateLink}
            onClick={handleGenerateLink}
          >
            Generate confirmation link
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={handleGenerateReviewLink}
          >
            Copy manager review link
          </Button>
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

        {link ? (
          <Card className="border-brand-200/80">
            <CardHeader>
              <div>
                <CardTitle>Shareable confirmation link</CardTitle>
                <CardDescription>
                  Copy this link and share it with the tour manager. In a production build,
                  this would be delivered via email.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-ink-200/80 bg-canvas p-4 break-all text-[13px] text-ink-900">
                {link}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="brand" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (link) window.open(link, "_blank");
                  }}
                >
                  Open link
                </Button>
              </div>
              <div className="text-[12px] text-ink-500">
                // TODO: replace with email delivery via SendGrid or similar.
              </div>
            </CardContent>
          </Card>
        ) : null}

        {reviewLink ? (
          <Card className="border-brand-200/80">
            <CardHeader>
              <div>
                <CardTitle>Tour manager review link</CardTitle>
                <CardDescription>
                  Copy this link for the tour manager to review the full settlement math and confirm or flag it.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-ink-200/80 bg-canvas p-4 break-all text-[13px] text-ink-900">
                {reviewLink}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="brand" onClick={handleCopyReview}>
                  {reviewCopied ? "Copied" : "Copy review link"}
                </Button>
              </div>
              <div className="text-[12px] text-ink-500">
                // TODO: replace with email delivery via SendGrid or similar.
              </div>
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}
