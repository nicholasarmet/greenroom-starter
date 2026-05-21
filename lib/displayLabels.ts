import { formatMoney } from "@/lib/format";

export const DEAL_TYPE_LABELS: Record<string, string> = {
  flat: "Flat guarantee",
  percentage_of_gross: "Percentage of gross",
  percentage_of_net: "Percentage of net",
  vs: "Versus deal",
  door: "Door deal",
};

export function formatPercentageRate(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

export function formatPercentageBasis(basis: string | null | undefined): string {
  if (!basis) return "—";
  const labels: Record<string, string> = {
    gross: "Gross box office",
    net: "Net after expenses",
  };
  return labels[basis] ?? basis.replace(/_/g, " ");
}

export function formatPercentageOfBasis(
  rate: number | null | undefined,
  basis: string | null | undefined,
): string {
  if (rate == null) return "—";
  const pct = formatPercentageRate(rate);
  if (!basis) return pct;
  return `${pct} of ${formatPercentageBasis(basis).toLowerCase()}`;
}

export function formatDealType(type: string | null | undefined): string {
  if (!type) return "—";
  return DEAL_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function formatDealRole(role: string | null | undefined): string {
  const labels: Record<string, string> = {
    booker: "Booker",
    tour_manager: "Tour Manager",
    gm: "General Manager",
    production: "Production",
    box_office: "Box office",
  };
  if (!role) return "—";
  return labels[role] ?? role.replace(/_/g, " ");
}

export function formatExpenseCategory(category: string): string {
  const labels: Record<string, string> = {
    sound: "Sound",
    lights: "Lights",
    production: "Production",
    hospitality: "Hospitality",
    backline: "Backline",
    marketing: "Marketing",
    staffing: "Staffing",
    other: "Other",
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

export function formatRecoupCategory(category: string): string {
  const labels: Record<string, string> = {
    marketing: "Marketing",
    hospitality_overage: "Hospitality overage",
    production_overage: "Production overage",
    prior_advance: "Prior advance",
    damages: "Damages",
    other: "Other",
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

export function formatRecoupStatus(status: string): string {
  const labels: Record<string, string> = {
    disputed: "Disputed",
    agreed: "Agreed",
    withdrawn: "Withdrawn",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function formatSettlementLifecycleStage(stage: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    in_review: "In review",
    signed: "Signed",
    disputed: "Disputed",
    revised: "Revised",
    finalized: "Finalized",
    paid: "Paid",
    voided: "Voided",
  };
  return labels[stage] ?? stage.replace(/_/g, " ");
}

export function formatCompCategory(category: string): string {
  const labels: Record<string, string> = {
    artist_gl: "Artist guest list",
    label: "Label / management",
    press: "Press",
    venue_staff: "Venue staff",
    sponsor: "Sponsor",
    promo: "Promo / radio",
    other: "Other",
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

const USER_LABELS: Record<string, string> = {
  user_mariana: "Mariana Reyes",
  user_marcus: "Marcus Chen",
};

export function formatEnteredBy(userId: string | null | undefined): string {
  if (!userId) return "System";
  return USER_LABELS[userId] ?? "Venue team";
}

export function formatCappedExpensesNote(deal: {
  expenseCap?: number | null;
  hospitalityCap?: number | null;
}): string {
  let note = "Expenses capped by deal terms";
  if (deal.expenseCap != null) {
    note += ` (expense cap ${formatMoney(deal.expenseCap)})`;
  }
  if (deal.hospitalityCap != null) {
    note += `, hospitality capped at ${formatMoney(deal.hospitalityCap)}`;
  }
  return note;
}
