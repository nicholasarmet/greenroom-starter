import { getShowById, getTourManagerConfirmationByLinkToken, isTourManagerLinkReadOnly } from "@/lib/queries";
import { ConfirmDealTermsClient } from "@/components/settlement/ConfirmDealTerms";
import { formatShowDateHeader } from "@/lib/format";
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
  const showId =
    id ||
    (typeof resolvedSearchParams.showId === "string"
      ? resolvedSearchParams.showId
      : undefined);
  const linkToken =
    typeof resolvedSearchParams.linkToken === "string"
      ? resolvedSearchParams.linkToken
      : undefined;

  let showData = null;
  if (showId) {
    showData = await getShowById(showId);
  }

  const matchedConfirmation =
    showId && linkToken
      ? await getTourManagerConfirmationByLinkToken(showId, linkToken)
      : null;

  let confirmedTerms: ExtractedDealTerms | null = null;
  if (showData?.deal?.dealTerms) {
    try {
      confirmedTerms = JSON.parse(showData.deal.dealTerms) as ExtractedDealTerms;
    } catch {
      confirmedTerms = null;
    }
  }

  const existingConfirmation =
    matchedConfirmation && isTourManagerLinkReadOnly(matchedConfirmation)
      ? {
          confirmedAt: matchedConfirmation.confirmedAt,
          terms: confirmedTerms,
        }
      : null;

  const showContext = showData
    ? {
        artistName: showData.artist?.name ?? "Unknown artist",
        showDate: formatShowDateHeader(showData.show.date),
        venueName: showData.venue?.name ?? "Unknown venue",
      }
    : null;

  return (
    <ConfirmDealTermsClient
      showId={showId ?? ""}
      linkToken={linkToken ?? ""}
      deal={showData?.deal ?? null}
      existingConfirmation={existingConfirmation}
      linkValid={!!matchedConfirmation}
      showContext={showContext}
    />
  );
}
