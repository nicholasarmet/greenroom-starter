import { NextResponse } from "next/server";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawText = typeof body.text === "string" ? body.text : "";

  // Mocked extraction response for prototype purposes.
  // TODO: replace with live Anthropic API call to /api/extract-deal-terms.
  const extracted: ExtractedDealTerms = {
    dealType: "vs",
    guaranteeAmount: 5000,
    percentage: 0.8,
    percentageBasis: "net",
    expenseCap: 2500,
    hospitalityCap: 500,
    bonuses: [
      {
        type: "gross_threshold",
        label: "+$1,000 if gross > $25,000",
        threshold: 25000,
        amount: 1000,
        stacks: false,
      },
    ],
    recoups: [
      {
        category: "marketing",
        label: "Marketing recoup",
        amount: 900,
        basis: "gross",
        note: "Marketing recoup of $900 against gross.",
      },
    ],
    rawText,
  };

  return NextResponse.json(extracted);
}
