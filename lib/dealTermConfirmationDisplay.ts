import { isPendingDealTermLink } from "@/lib/dealTermLinks";

type ConfirmationLike = {
  role: string;
  termsHash: string;
  flagNote: string | null;
};

export function isSettlementReviewConfirmation(
  confirmation: ConfirmationLike,
): boolean {
  return (
    confirmation.role === "tour_manager" &&
    confirmation.termsHash.startsWith("review:")
  );
}

export function isFlaggedConfirmation(confirmation: ConfirmationLike): boolean {
  return (
    !!confirmation.flagNote ||
    confirmation.termsHash.startsWith("flag-") ||
    confirmation.termsHash.startsWith("review:flag-")
  );
}

export function isCompletedConfirmation(confirmation: ConfirmationLike): boolean {
  return !isPendingDealTermLink(confirmation.termsHash);
}

/** Short action line shown under the person name (name is shown separately). */
export function getConfirmationActionLabel(
  confirmation: ConfirmationLike,
): string {
  const flagged = isFlaggedConfirmation(confirmation);

  if (isSettlementReviewConfirmation(confirmation)) {
    return flagged ? "Flagged settlement review" : "Confirmed settlement review";
  }

  if (confirmation.role === "tour_manager") {
    return flagged ? "Flagged deal terms" : "Confirmed deal terms";
  }

  if (confirmation.role === "gm") {
    return flagged ? "Flagged deal terms" : "Confirmed deal terms";
  }

  return flagged ? "Flagged deal terms" : "Confirmed deal terms";
}

/** Full sentence for tour manager entries without a linked user. */
export function getTourManagerFullLine(
  confirmation: ConfirmationLike,
  at: string,
): string {
  const action = getConfirmationActionLabel(confirmation);
  return `Tour manager ${action.charAt(0).toLowerCase()}${action.slice(1)} on ${at}`;
}
