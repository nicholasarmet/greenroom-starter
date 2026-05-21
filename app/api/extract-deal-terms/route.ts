import { NextResponse } from "next/server";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawText = typeof body.text === "string" ? body.text : "";

  // Mocked extraction response for prototype purposes.
  // TODO: replace with live Anthropic API call to /api/extract-deal-terms.
  const extracted: ExtractedDealTerms = {
    dealType: "vs",
    guaranteeAmount: 2500,
    percentage: 0.85,
    percentageBasis: "net",
    expenseCap: 1500,
    hospitalityCap: 400,
    bonuses: [],
    recoups: [],
    rawText,
  };

  return NextResponse.json(extracted);
}
