export type DealTermLinkKind = "confirmation" | "review";

const PENDING_PREFIX = "pending:";

export function pendingLinkTermsHash(kind: DealTermLinkKind) {
  return `${PENDING_PREFIX}${kind}`;
}

export function isPendingDealTermLink(termsHash: string) {
  return termsHash.startsWith(PENDING_PREFIX);
}

export function isCompletedDealTermLink(termsHash: string) {
  return !isPendingDealTermLink(termsHash);
}
