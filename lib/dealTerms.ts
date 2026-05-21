export type ExtractedRecoupCategory =
  | "marketing"
  | "hospitality_overage"
  | "production_overage"
  | "prior_advance"
  | "damages"
  | "other";

export interface ExtractedRecoup {
  category: ExtractedRecoupCategory;
  label: string;
  amount: number;
  basis: "gross" | "net" | "other";
  note: string;
}

export interface ExtractedBonus {
  type: "gross_threshold";
  label: string;
  threshold: number;
  amount: number;
  stacks?: boolean;
}

export interface ExtractedDealTerms {
  dealType: "flat" | "percentage_of_gross" | "percentage_of_net" | "vs" | "door";
  guaranteeAmount?: number;
  percentage?: number;
  percentageBasis?: "gross" | "net";
  expenseCap?: number;
  hospitalityCap?: number;
  bonuses?: ExtractedBonus[];
  recoups?: ExtractedRecoup[];
  rawText?: string;
}
