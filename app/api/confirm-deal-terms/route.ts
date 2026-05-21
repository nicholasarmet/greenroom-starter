import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, dealTermConfirmations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.showId !== "string" ||
    !payload.confirmedTerms ||
    typeof payload.confirmedTerms !== "object"
  ) {
    return NextResponse.json(
      { error: "showId and confirmedTerms are required." },
      { status: 400 },
    );
  }

  const showId = payload.showId;
  const confirmedTerms = payload.confirmedTerms as ExtractedDealTerms;
  const role = typeof payload.role === "string" ? payload.role : "tour_manager";

  try {
    const deal = await db
      .select()
      .from(deals)
      .where(eq(deals.showId, showId))
      .limit(1);

    if (deal.length === 0) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const termsJson = JSON.stringify(confirmedTerms);
    const termsHash = `${termsJson}-${Date.now()}`;

    await db.update(deals).set({ dealTerms: termsJson }).where(eq(deals.showId, showId));
    await db.insert(dealTermConfirmations).values({
      id: crypto.randomUUID(),
      showId,
      userId: null,
      role,
      confirmedAt: new Date(),
      termsHash,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("confirm-deal-terms error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Unable to confirm deal terms: ${message}` },
      { status: 500 },
    );
  }
}
