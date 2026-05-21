import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { Expense, Recoup } from "@/db/schema";
import type { SettlementCalculation } from "@/lib/dealMath";

type SettlementStep = {
  label: string;
  value: number;
  note?: string;
  meta?: Record<string, unknown>;
};

type MathBreakdownAnchors = {
  gross?: number;
  net?: number;
  expenses?: number;
};

function renderSettlementSteps(
  steps: SettlementStep[],
  anchors?: MathBreakdownAnchors,
  options?: { showFinalFormula?: string },
) {
  const visibleSteps =
    anchors?.gross != null
      ? steps.filter((step) => step.label !== "Gross box office")
      : steps;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_140px_140px] gap-3">
        <div className="text-[12px] text-ink-500">Step</div>
        <div className="text-[12px] text-ink-500 text-right">Step value</div>
        <div className="text-[12px] text-ink-500 text-right">Running total</div>
      </div>

      {(() => {
        let running = 0;
        return (
          <div className="space-y-3">
            {visibleSteps.map((step, index) => {
              const meta = step.meta as Record<string, unknown> | undefined;
              const isWinner = meta?.winner === true;
              const isVsChoice = meta?.type === "vs-choice";
              const isVsBranch = meta != null && typeof meta.winner === "boolean";
              const anchorKey = meta?.anchor as keyof MathBreakdownAnchors | undefined;

              if (anchorKey && anchors?.[anchorKey] != null) {
                running = anchors[anchorKey]!;
              } else if (isVsChoice) {
                running = step.value;
              } else if (isVsBranch) {
                if (isWinner) {
                  running = step.value;
                }
              } else {
                running += step.value;
              }

              return (
                <div
                  key={index}
                  className={`rounded-2xl border p-4 ${
                    isWinner
                      ? "border border-ink-200/80 border-l-4 border-l-brand-700 bg-brand-50"
                      : "border-ink-200/80 bg-slate-50"
                  }`}
                >
                  <div className="grid grid-cols-[1fr_140px_140px] items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-semibold text-ink-900">{step.label}</div>
                        {isWinner ? (
                          <div className="text-[11px] font-medium text-brand-900 bg-brand-100/60 rounded-md px-2 py-0.5">
                            Winner
                          </div>
                        ) : null}
                        {isVsChoice ? (
                          <div className="text-[11px] font-medium text-ink-700 bg-ink-100 rounded-md px-2 py-0.5">
                            vs choice
                          </div>
                        ) : null}
                      </div>
                      {step.note ? (
                        <div className="text-[12px] text-ink-500 mt-1">{step.note}</div>
                      ) : null}
                    </div>

                    <div className="text-[14px] font-medium text-ink-900 text-right">
                      {step.value >= 0 ? "+" : ""}
                      {formatMoney(step.value)}
                    </div>

                    <div className="text-[13px] font-medium text-ink-700 text-right">
                      {formatMoney(running)}
                    </div>
                  </div>
                </div>
              );
            })}

            {options?.showFinalFormula ? (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                <div className="text-[13px] font-semibold text-brand-900">Final formula</div>
                <div className="text-[14px] text-ink-900 mt-2">{options.showFinalFormula}</div>
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}

function getRecoupSnippet(recoup: Recoup, dealText?: string | null) {
  if (!dealText) return "Deal language not available.";

  const query = recoup.label || recoup.category || "recoup";
  const lower = dealText.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());

  if (index === -1) {
    const fallback = dealText.trim().slice(0, 250);
    return fallback.length < dealText.length ? `${fallback.trim()}…` : fallback;
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(dealText.length, index + query.length + 120);
  const snippet = dealText.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < dealText.length ? "…" : ""}`;
}

export function MathBreakdown(
  props:
    | {
        steps: SettlementStep[];
        anchors?: MathBreakdownAnchors;
      }
    | {
        calc: SettlementCalculation;
        expenses: Expense[];
        recoups: Recoup[];
        dealText?: string | null;
      },
) {
  if ("steps" in props) {
    return renderSettlementSteps(props.steps, props.anchors);
  }

  const { calc, expenses, recoups, dealText } = props;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Math breakdown</CardTitle>
            <CardDescription>
              Step-by-step settlement math for this show.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {calc.supported ? (
            renderSettlementSteps(
              calc.steps,
              {
                gross: calc.grossBoxOffice,
                net: calc.netBoxOffice,
                expenses: calc.totalExpenses,
              },
              { showFinalFormula: calc.finalFormula },
            )
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-ink-700">{calc.reason}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Itemized expenses</CardTitle>
            <CardDescription>
              Expense line items and source annotations for this settlement.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.length === 0 ? (
            <div className="text-[13px] text-ink-500">No expenses entered for this show.</div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="grid gap-2 rounded-2xl border border-ink-200/80 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-ink-900">
                        {expense.category.replace(/_/g, " ")}
                      </div>
                      <div className="text-[12px] text-ink-500">
                        {expense.description || "No description provided."}
                      </div>
                    </div>
                    <div className="text-[14px] font-medium text-ink-900">
                      {formatMoney(expense.amount)}
                    </div>
                  </div>
                  <div className="text-[12px] text-ink-500">
                    Source: {expense.enteredByUserId ? `entered by ${expense.enteredByUserId}` : "system"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recoups and deal language</CardTitle>
            <CardDescription>
              Recoup items with the originating deal language snippet.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recoups.length === 0 ? (
            <div className="text-[13px] text-ink-500">No recoups recorded for this settlement.</div>
          ) : (
            <div className="space-y-3">
              {recoups.map((recoup) => (
                <div key={recoup.id} className="rounded-2xl border border-ink-200/80 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-ink-900">
                        {recoup.label} ({recoup.category.replace(/_/g, " ")})
                      </div>
                      <div className="text-[12px] text-ink-500 mt-1">
                        Status: {recoup.status}
                      </div>
                    </div>
                    <div className="text-[14px] font-medium text-ink-900">
                      {formatMoney(recoup.amount)}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-ink-700">
                    <div className="font-semibold text-ink-900">Deal language snippet</div>
                    <div className="mt-2 whitespace-pre-wrap">
                      {getRecoupSnippet(recoup, dealText)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
