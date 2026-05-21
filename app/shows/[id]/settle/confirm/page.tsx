import { notFound } from "next/navigation";
import { getShowById } from "@/lib/queries";
import { ConfirmDealTermsClient } from "@/components/settlement/ConfirmDealTerms";

export default async function ConfirmDealTermsPage({
  params,
  searchParams,
}: {
  params: { id?: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Prefer the path param, but allow older/alternate links to supply showId as a
  // query parameter (e.g. ?showId=show_coastal_spell_dispute).
  const showId = params?.id || (typeof searchParams?.showId === "string" ? searchParams.showId : undefined);

  let showData = null;
  if (showId) {
    showData = await getShowById(showId);
  }

  // If no show data is available, render the client component without a
  // `deal` so the page still displays the extracted terms and allows
  // confirmation (previous behavior was client-only and did not require a
  // resolved show record).
  return <ConfirmDealTermsClient showId={showId ?? ""} deal={showData?.deal ?? null} />;
}
