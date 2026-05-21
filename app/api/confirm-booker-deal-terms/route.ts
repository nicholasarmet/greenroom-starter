import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dealTermConfirmations, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/currentUser";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload.showId !== "string") {
      return NextResponse.json({ error: "showId is required." }, { status: 400 });
    }

    const terms = payload.terms as ExtractedDealTerms | undefined;
    if (!terms || typeof terms !== "object") {
      return NextResponse.json(
        { error: "Extracted terms are required to confirm deal terms." },
        { status: 400 },
      );
    }

    const showId = payload.showId;
    const dealRows = await db
      .select()
      .from(deals)
      .where(eq(deals.showId, showId))
      .limit(1);

    if (dealRows.length === 0) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const userId = await getCurrentUserId();
    const now = new Date();
    const termsJson = JSON.stringify(terms);
    const termsHash = `booker-${Date.now()}`;

    await db.insert(dealTermConfirmations).values({
      id: crypto.randomUUID(),
      showId,
      userId,
      role: "booker",
      confirmedAt: now,
      termsHash,
      createdAt: now,
    });

    await db
      .update(deals)
      .set({ dealTerms: termsJson })
      .where(eq(deals.showId, showId));

    revalidatePath(`/shows/${showId}/settle`);
    revalidatePath(`/shows/${showId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("confirm-booker-deal-terms error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isReadonly =
      message.includes("READONLY") || message.toLowerCase().includes("readonly");
    return NextResponse.json(
      {
        error: isReadonly
          ? "Database is read-only. Run: sudo chown $(whoami) data/greenroom.db"
          : `Unable to confirm deal terms: ${message}`,
      },
      { status: isReadonly ? 503 : 500 },
    );
  }
}
