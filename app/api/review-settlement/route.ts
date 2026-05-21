import { NextResponse } from "next/server";
import { db } from "@/db";
import { dealTermConfirmations, settlements } from "@/db/schema";
import { eq } from "drizzle-orm";

type ReviewAction = "confirm" | "flag";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.showId !== "string" ||
    typeof payload.action !== "string"
  ) {
    return NextResponse.json(
      { error: "showId and action are required." },
      { status: 400 },
    );
  }

  const showId = payload.showId;
  const action = payload.action === "flag" ? "flag" : "confirm";
  const settlementRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.showId, showId))
    .limit(1);

  if (settlementRows.length === 0) {
    return NextResponse.json({ error: "Settlement not found." }, { status: 404 });
  }

  const status = action === "flag" ? "disputed" : "in_review";
  await db
    .update(settlements)
    .set({ status })
    .where(eq(settlements.showId, showId));

  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (action === "flag" && note.length === 0) {
    return NextResponse.json(
      { error: "A brief note is required when reporting an issue." },
      { status: 400 },
    );
  }

  await db.insert(dealTermConfirmations).values({
    id: crypto.randomUUID(),
    showId,
    userId: null,
    role: "tour_manager",
    confirmedAt: new Date(),
    termsHash: `${action}-${Date.now()}`,
    conflictsJson: null,
    flagNote: note || null,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true, status });
}
