import { NextResponse } from "next/server";
import { db } from "@/db";
import { dealTermConfirmations } from "@/db/schema";
import {
  pendingLinkTermsHash,
  type DealTermLinkKind,
} from "@/lib/dealTermLinks";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const showId = typeof payload.showId === "string" ? payload.showId : "";
  const kind =
    payload.kind === "confirmation" || payload.kind === "review"
      ? (payload.kind as DealTermLinkKind)
      : null;

  if (!showId || !kind) {
    return NextResponse.json(
      { error: "showId and kind (confirmation or review) are required." },
      { status: 400 },
    );
  }

  const linkToken = crypto.randomUUID();
  const now = new Date();

  await db.insert(dealTermConfirmations).values({
    id: crypto.randomUUID(),
    showId,
    userId: null,
    role: "tour_manager",
    confirmedAt: now,
    termsHash: pendingLinkTermsHash(kind),
    linkToken,
    createdAt: now,
  });

  return NextResponse.json({ linkToken });
}
