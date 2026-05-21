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

/** Action label for audit history entries. */
export function getConfirmationActionLabel(
  confirmation: ConfirmationLike,
): string {
  const isReview = isSettlementReviewConfirmation(confirmation);
  const flagged = isFlaggedConfirmation(confirmation);

  if (flagged) {
    return isReview ? "Flagged settlement review" : "Flagged deal terms";
  }

  if (isReview) {
    return "Confirmed settlement review";
  }

  return "Confirmed deal terms";
}

/** Full sentence for tour manager entries without a linked user. */
export function getTourManagerFullLine(
  confirmation: ConfirmationLike,
  at: string,
): string {
  const action = getConfirmationActionLabel(confirmation);
  return `Tour manager ${action.charAt(0).toLowerCase()}${action.slice(1)} on ${at}`;
}
