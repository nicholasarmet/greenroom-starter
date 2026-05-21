import { getShowById, getTourManagerDealConfirmation } from "@/lib/queries";
import { ConfirmDealTermsClient } from "@/components/settlement/ConfirmDealTerms";
import type { ExtractedDealTerms } from "@/lib/dealTerms";

export default async function ConfirmDealTermsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  // Prefer the path param, but allow older/alternate links to supply showId as a
  // query parameter (e.g. ?showId=show_coastal_spell_dispute).
  const showId =
    id ||
    (typeof resolvedSearchParams.showId === "string"
      ? resolvedSearchParams.showId
      : undefined);

  let showData = null;
  if (showId) {
    showData = await getShowById(showId);
  }

  const tourManagerConfirmation = showId
    ? await getTourManagerDealConfirmation(showId)
    : null;

  let confirmedTerms: ExtractedDealTerms | null = null;
  if (showData?.deal?.dealTerms) {
    try {
      confirmedTerms = JSON.parse(showData.deal.dealTerms) as ExtractedDealTerms;
    } catch {
      confirmedTerms = null;
    }
  }

  const existingConfirmation = tourManagerConfirmation
    ? {
        confirmedAt: tourManagerConfirmation.confirmedAt,
        terms: confirmedTerms,
      }
    : null;

  console.log("[confirm page]", {
    showId,
    tourManagerConfirmation: tourManagerConfirmation?.id ?? null,
    existingConfirmation: existingConfirmation != null,
  });

  // If no show data is available, render the client component without a
  // `deal` so the page still displays the extracted terms and allows
  // confirmation (previous behavior was client-only and did not require a
  // resolved show record).
  return (
    <ConfirmDealTermsClient
      showId={showId ?? ""}
      deal={showData?.deal ?? null}
      existingConfirmation={existingConfirmation}
    />
  );
}
