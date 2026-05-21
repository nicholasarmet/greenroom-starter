/**
 * Deal calculation logic for the in-app settlement tool.
 *
 * IMPORTANT — DELIBERATELY INCOMPLETE.
 *
 * This is the existing Greenroom settlement engine. It was built early in
 * the company's life, when most deals were flat guarantees. It currently
 * handles two deal types end-to-end:
 *
 *   1. flat                 — $X guaranteed, optional sellout bonus
 *   2. percentage_of_gross  — X% of gross, no expense deductions, optional sellout bonus
 *
 * For both, it reads `bonusesJson` and applies bonuses where it can — but
 * only the structured ones. Bonuses that exist only in `dealNotesFreetext`
 * are invisible to this engine.
 *
 * It does NOT handle:
 *
 *   - vs deals (guarantee vs % of net, whichever greater)
 *   - percentage_of_net deals (with expense deductions)
 *   - door deals
 *   - recoups (those flow separately through the settlement record)
 *   - tier ratchets (would need vs-deal support first)
 *   - comps that count toward gross
 *
 * For unsupported deals, the tool returns { supported: false } and the UI
 * shows the "this deal type isn't yet supported" empty state. About 82% of
 * Greenroom's customers default to spreadsheets because of this.
 */

import type { Deal, Expense, TicketSale, Bonus } from "@/db/schema";

export type SettlementCalculation =
  | {
      supported: true;
      grossBoxOffice: number;
      netBoxOffice: number;
      totalExpenses: number;
      totalToArtist: number;
      steps: { label: string; value: number; note?: string; meta?: Record<string, unknown> }[];
      finalFormula: string;
      warnings: string[];
      // Bonuses that were applied. Empty array if no bonuses on the deal,
      // or if no bonuses triggered.
      bonusesApplied: { label: string; amount: number; reason: string }[];
      // Bonuses that exist on the deal but didn't trigger (helpful context).
      bonusesNotTriggered: { label: string; amount: number; reason: string }[];
    }
  | {
      supported: false;
      reason: string;
      dealType: Deal["dealType"];
    };

interface CalcInput {
  deal: Deal;
  ticketSales: TicketSale[];
  expenses: Expense[];
  // Capacity is needed to evaluate sellout bonuses. Optional — if omitted,
  // sellout bonuses are reported as "can't determine".
  venueCapacity?: number;
  ticketsSold?: number;
}

export function parseBonuses(deal: Deal): Bonus[] {
  if (!deal.bonusesJson) return [];
  try {
    const parsed = JSON.parse(deal.bonusesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDealTermWarnings(deal: Deal) {
  if (!deal.dealNotesFreetext) return [] as string[];
  const unsupportedTerms = ["walkout", "pot", "renegotiated", "phone", "call"];
  const lower = deal.dealNotesFreetext.toLowerCase();
  const found = unsupportedTerms.filter((term) => lower.includes(term));
  if (found.length === 0) return [];

  return [
    "Deal freetext contains terms that may affect this calculation - confirm with extracted deal terms before finalizing.",
  ];
}

function calculateCappedExpenses(deal: Deal, expenses: Expense[]) {
  const passedThrough = expenses.filter((e) => !e.absorbedByVenue);
  const hospitality = passedThrough
    .filter((e) => e.category === "hospitality")
    .reduce((sum, e) => sum + e.amount, 0);
  const other = passedThrough
    .filter((e) => e.category !== "hospitality")
    .reduce((sum, e) => sum + e.amount, 0);

  const cappedHospitality =
    deal.hospitalityCap != null ? Math.min(hospitality, deal.hospitalityCap) : hospitality;
  const subtotal = other + cappedHospitality;

  return deal.expenseCap != null ? Math.min(subtotal, deal.expenseCap) : subtotal;
}

export function calculateSettlement(input: CalcInput): SettlementCalculation {
  const { deal, ticketSales, expenses, venueCapacity, ticketsSold } = input;

  const grossBoxOffice = ticketSales.reduce((sum, t) => sum + t.gross, 0);
  const totalFees = ticketSales.reduce((sum, t) => sum + t.fees, 0);
  const netBoxOffice = grossBoxOffice - totalFees;
  const totalExpenses = expenses
    .filter((e) => !e.absorbedByVenue)
    .reduce((sum, e) => sum + e.amount, 0);

  const tickets =
    ticketsSold ?? ticketSales.reduce((sum, t) => sum + (t.qty ?? 0), 0);
  const warnings = getDealTermWarnings(deal);

  // ---------- flat guarantee ----------
  if (deal.dealType === "flat") {
    if (deal.guaranteeAmount == null) {
      return {
        supported: false,
        reason: "Flat deal is missing a guarantee amount.",
        dealType: deal.dealType,
      };
    }
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: deal.guaranteeAmount + bonusResult.totalApplied,
      warnings,
      steps: [
        {
          label: "Flat guarantee",
          value: deal.guaranteeAmount,
          note: "No expense deductions. The guarantee is the floor.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `flat ${deal.guaranteeAmount} + bonuses ${bonusResult.totalApplied} = ${(deal.guaranteeAmount + bonusResult.totalApplied).toFixed(2)}`
        : `flat guarantee = ${deal.guaranteeAmount}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
    };
  }

  // ---------- percentage of gross ----------
  if (deal.dealType === "percentage_of_gross") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-gross deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }
    const payout = grossBoxOffice * deal.percentage;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: payout + bonusResult.totalApplied,
      warnings,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}%`,
          value: payout,
          note: "Percentage of gross — no expense deductions.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `gross × ${deal.percentage} + bonuses = ${(payout + bonusResult.totalApplied).toFixed(2)}`
        : `gross × ${deal.percentage} = ${payout.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
    };
  }

  // ---------- percentage of net ----------
  if (deal.dealType === "percentage_of_net") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-net deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }

    const cappedExpenses = calculateCappedExpenses(deal, expenses);
    const netAfterExpenses = netBoxOffice - cappedExpenses;
    const payout = netAfterExpenses * deal.percentage;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: payout + bonusResult.totalApplied,
      warnings,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: "Ticketing fees",
          value: -totalFees,
          note: "Fees deducted from gross to calculate net.",
        },
        {
          label: "Capped expenses",
          value: -cappedExpenses,
          note: `Expenses capped by deal terms${deal.expenseCap != null ? ` (expense cap ${deal.expenseCap})` : ""}${deal.hospitalityCap != null ? `, hospitality capped at ${deal.hospitalityCap}` : ""}`,
        },
        {
          label: "Net after capped expenses",
          value: netAfterExpenses,
          note: "Net box office minus capped expenses.",
          meta: { anchor: "net" },
        },
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}%`,
          value: payout,
          note: "Percentage of net after capped expenses.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `net_after_expenses × ${deal.percentage} + bonuses = ${(payout + bonusResult.totalApplied).toFixed(2)}`
        : `net_after_expenses × ${deal.percentage} = ${payout.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
    };
  }

  // ---------- vs ----------
  if (deal.dealType === "vs") {
    // NOTE: recoups are intentionally excluded from this calculator.
    // The Coastal Spell mismatch is a product finding: the $12,285 final
    // amount reflects the post-concession disputed recoup resolution,
    // not the clean net-vs guarantee calculation.
    if (deal.guaranteeAmount == null) {
      return {
        supported: false,
        reason: "Vs deal is missing a guarantee amount.",
        dealType: deal.dealType,
      };
    }
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Vs deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }

    const cappedExpenses = calculateCappedExpenses(deal, expenses);
    const netAfterExpenses = netBoxOffice - cappedExpenses;
    const netPayout = netAfterExpenses * deal.percentage;
    const guarantee = deal.guaranteeAmount;
    const winnerIsGuarantee = guarantee >= netPayout;
    const winnerLabel = winnerIsGuarantee ? "Guarantee" : `${(deal.percentage * 100).toFixed(0)}% of net`;
    const winnerValue = winnerIsGuarantee ? guarantee : netPayout;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses,
      totalToArtist: winnerValue + bonusResult.totalApplied,
      warnings,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: "Ticketing fees",
          value: -totalFees,
          note: "Fees deducted from gross to calculate net.",
        },
        {
          label: "Capped expenses",
          value: -cappedExpenses,
          note: `Expenses capped by deal terms${deal.expenseCap != null ? ` (expense cap ${deal.expenseCap})` : ""}${deal.hospitalityCap != null ? `, hospitality capped at ${deal.hospitalityCap}` : ""}`,
        },
        {
          label: "Net after capped expenses",
          value: netAfterExpenses,
          note: "Net box office minus capped expenses.",
          meta: { anchor: "net" },
        },
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}%`,
          value: netPayout,
          note: "Percentage of net after capped expenses.",
          meta: { winner: !winnerIsGuarantee },
        },
        {
          label: "Guarantee",
          value: guarantee,
          note: "Deal floor if net share is lower.",
          meta: { winner: winnerIsGuarantee },
        },
        {
          label: "Choose greater of guarantee and % of net",
          value: 0,
          note: `${winnerLabel} wins`,
          meta: { type: "vs-choice", winnerIndex: winnerIsGuarantee ? 1 : 0 },
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `${winnerLabel} + bonuses = ${(winnerValue + bonusResult.totalApplied).toFixed(2)}`
        : `${winnerLabel} = ${winnerValue.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
    };
  }

  // ---------- everything else: not supported ----------
  const friendlyName: Record<Deal["dealType"], string> = {
    flat: "Flat guarantee",
    percentage_of_gross: "Percentage of gross",
    percentage_of_net: "Percentage of net",
    vs: "Vs deal (guarantee vs %)",
    door: "Door deal",
  };

  return {
    supported: false,
    dealType: deal.dealType,
    reason:
      `${friendlyName[deal.dealType]} deals aren't supported in the in-app tool yet. ` +
      `Power users at venues like The Crescent default to spreadsheets for these.`,
  };
}

/** Evaluate a list of bonuses against the show's actual numbers. */
function applyBonuses(
  bonuses: Bonus[],
  ctx: { gross: number; tickets: number; capacity?: number },
) {
  const applied: { label: string; amount: number; reason: string }[] = [];
  const notTriggered: { label: string; amount: number; reason: string }[] = [];

  for (const b of bonuses) {
    if (b.type === "gross_threshold") {
      if (ctx.gross >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross ${ctx.gross.toLocaleString()} ≥ ${b.threshold.toLocaleString()}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross ${ctx.gross.toLocaleString()} < ${b.threshold.toLocaleString()}`,
        });
      }
    } else if (b.type === "sellout") {
      if (ctx.capacity != null && ctx.tickets >= ctx.capacity * 0.95) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} of ${ctx.capacity} sold`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason:
            ctx.capacity != null
              ? `${ctx.tickets} of ${ctx.capacity} sold (sellout = ≥95%)`
              : `Capacity unknown — can't evaluate`,
        });
      }
    } else if (b.type === "attendance_threshold") {
      if (ctx.tickets >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} ≥ ${b.threshold}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} < ${b.threshold}`,
        });
      }
    } else if (b.type === "tier_ratchet") {
      // Tier ratchets fundamentally change the percentage structure. The
      // current engine only supports flat % of gross — we can't apply a
      // ratcheting structure on top of it without knowing which deal type
      // it's modifying. Report as not-applicable.
      notTriggered.push({
        label: b.label,
        amount: 0,
        reason: "Tier ratchets need vs-deal or % of net support — not yet handled",
      });
    }
  }

  return {
    applied,
    notTriggered,
    totalApplied: applied.reduce((s, b) => s + b.amount, 0),
  };
}
