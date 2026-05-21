import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, dealTermConfirmations, settlements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isPendingDealTermLink } from "@/lib/dealTermLinks";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.showId !== "string" ||
    typeof payload.linkToken !== "string"
  ) {
    return NextResponse.json(
      { error: "showId and linkToken are required." },
      { status: 400 },
    );
  }

  const showId = payload.showId;
  const linkToken = payload.linkToken;
  const action = payload.action === "flag" ? "flag" : "confirm";
  const confirmedTerms = payload.confirmedTerms as ExtractedDealTerms | undefined;
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

    const pendingRow = await db
      .select()
      .from(dealTermConfirmations)
      .where(
        and(
          eq(dealTermConfirmations.showId, showId),
          eq(dealTermConfirmations.role, "tour_manager"),
          eq(dealTermConfirmations.linkToken, linkToken),
        ),
      )
      .limit(1);

    if (pendingRow.length === 0) {
      return NextResponse.json(
        { error: "Confirmation link is invalid or has expired." },
        { status: 404 },
      );
    }

    if (!isPendingDealTermLink(pendingRow[0].termsHash)) {
      return NextResponse.json(
        { error: "These deal terms were already confirmed for this link." },
        { status: 409 },
      );
    }

    if (action === "flag") {
      const note = typeof payload.note === "string" ? payload.note.trim() : "";
      if (note.length === 0) {
        return NextResponse.json(
          { error: "A brief note is required when reporting an issue." },
          { status: 400 },
        );
      }

      await db
        .update(settlements)
        .set({ status: "disputed" })
        .where(eq(settlements.showId, showId));
      await db
        .update(dealTermConfirmations)
        .set({
          confirmedAt: new Date(),
          termsHash: `flag-${Date.now()}`,
          flagNote: note,
        })
        .where(eq(dealTermConfirmations.id, pendingRow[0].id));

      return NextResponse.json({ success: true });
    }

    if (!confirmedTerms || typeof confirmedTerms !== "object") {
      return NextResponse.json(
        { error: "confirmedTerms are required to confirm deal terms." },
        { status: 400 },
      );
    }

    const termsJson = JSON.stringify(confirmedTerms);
    const termsHash = `${termsJson}-${Date.now()}`;

    await db.update(deals).set({ dealTerms: termsJson }).where(eq(deals.showId, showId));
    await db
      .update(dealTermConfirmations)
      .set({
        confirmedAt: new Date(),
        termsHash,
      })
      .where(eq(dealTermConfirmations.id, pendingRow[0].id));

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
