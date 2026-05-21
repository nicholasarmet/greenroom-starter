import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dealTermConfirmations, settlements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isPendingDealTermLink } from "@/lib/dealTermLinks";

type ReviewAction = "confirm" | "flag";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.showId !== "string" ||
    typeof payload.linkToken !== "string" ||
    typeof payload.action !== "string"
  ) {
    return NextResponse.json(
      { error: "showId, linkToken, and action are required." },
      { status: 400 },
    );
  }

  const showId = payload.showId;
  const linkToken = payload.linkToken;
  const action = payload.action === "flag" ? "flag" : "confirm";
  const settlementRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.showId, showId))
    .limit(1);

  if (settlementRows.length === 0) {
    return NextResponse.json({ error: "Settlement not found." }, { status: 404 });
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
      { error: "Review link is invalid or has expired." },
      { status: 404 },
    );
  }

  if (!isPendingDealTermLink(pendingRow[0].termsHash)) {
    return NextResponse.json(
      { error: "This settlement review was already submitted for this link." },
      { status: 409 },
    );
  }

  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (action === "flag" && note.length === 0) {
    return NextResponse.json(
      { error: "A brief note is required when reporting an issue." },
      { status: 400 },
    );
  }

  const now = new Date();

  if (action === "flag") {
    await db
      .update(settlements)
      .set({
        status: "disputed",
        disputedAt: now,
      })
      .where(eq(settlements.showId, showId));
  } else {
    await db
      .update(settlements)
      .set({
        status: "signed",
        signedAt: now,
      })
      .where(eq(settlements.showId, showId));
  }

  await db
    .update(dealTermConfirmations)
    .set({
      confirmedAt: now,
      termsHash: `review:${action}-${Date.now()}`,
      flagNote: action === "flag" ? note : null,
    })
    .where(eq(dealTermConfirmations.id, pendingRow[0].id));

  revalidatePath(`/shows/${showId}/settle`);
  revalidatePath(`/shows/${showId}`);

  return NextResponse.json({
    success: true,
    status: action === "flag" ? "disputed" : "signed",
  });
}
