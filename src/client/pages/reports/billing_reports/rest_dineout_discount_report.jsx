import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Default the range to the current month.
function defaultRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(first), to: iso(now) };
}

export default function DineoutDiscountReport() {
  const init = defaultRange();
  const [fromDate, setFromDate] = useState(init.from);
  const [toDate, setToDate]     = useState(init.to);
  // Applied range — only changes on "Apply" so typing doesn't refetch each keystroke.
  const [range, setRange] = useState(init);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["report", "get_dineout_discount_report", range.from, range.to],
    queryFn: () => invoke("get_dineout_discount_report", {
      fromDate: range.from || null,
      toDate:   range.to   || null,
    }),
  });

  const summary = data?.summary ?? [];
  const rows    = data?.rows ?? [];

  const grand = summary.reduce(
    (acc, s) => ({
      bills:    acc.bills    + Number(s.bill_count || 0),
      original: acc.original + Number(s.original_amount || 0),
      discount: acc.discount + Number(s.discount_amount || 0),
      final:    acc.final    + Number(s.final_amount || 0),
    }),
    { bills: 0, original: 0, discount: 0, final: 0 },
  );

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={2} className="text-orange-500" />
            Dineout Discount Report
          </CardTitle>
          <CardDescription>
            Sales per dineout app — original amount, discount given, and net collected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date range filter */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <Button size="sm" onClick={() => setRange({ from: fromDate, to: toDate })} disabled={isFetching}>
              {isFetching ? "Loading…" : "Apply"}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive">Failed to load report: {String(error)}</p>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
            </div>
          ) : (
            <>
              {/* Per-app summary */}
              <div className="rounded-lg border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Dineout App</th>
                      <th className="px-3 py-2 font-semibold text-right">Bills</th>
                      <th className="px-3 py-2 font-semibold text-right">Original Amt</th>
                      <th className="px-3 py-2 font-semibold text-right">Discount</th>
                      <th className="px-3 py-2 font-semibold text-right">Net Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          No dineout discounts in this period.
                        </td>
                      </tr>
                    ) : (
                      summary.map((s) => (
                        <tr key={`${s.market_segment_id ?? "x"}-${s.app_name}`} className="border-t">
                          <td className="px-3 py-2 font-medium">{s.app_name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{s.bill_count}</td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{fmt(s.original_amount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">₹{fmt(s.discount_amount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{fmt(s.final_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {summary.length > 0 && (
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right tabular-nums">{grand.bills}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₹{fmt(grand.original)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">₹{fmt(grand.discount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₹{fmt(grand.final)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Detail rows */}
              <h3 className="text-sm font-semibold mb-2">Bill Details</h3>
              <div className="rounded-lg border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Bill No</th>
                      <th className="px-3 py-2 font-semibold">App</th>
                      <th className="px-3 py-2 font-semibold">Table</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold text-right">Original</th>
                      <th className="px-3 py-2 font-semibold text-right">Discount</th>
                      <th className="px-3 py-2 font-semibold text-right">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No records.</td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{r.settled_at ?? "—"}</td>
                          <td className="px-3 py-2 font-mono">{r.bill_no ?? "—"}</td>
                          <td className="px-3 py-2 font-medium">{r.app_name}</td>
                          <td className="px-3 py-2">{r.table_name ?? "—"}</td>
                          <td className="px-3 py-2">
                            {r.customer_name ?? "—"}
                            {r.customer_mobile ? <span className="text-muted-foreground"> · {r.customer_mobile}</span> : ""}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{fmt(r.original_amount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            −₹{fmt(r.discount_amount)}
                            {r.discount_mode === "PCT" && Number(r.discount_value) > 0 ? (
                              <span className="text-[10px] text-muted-foreground ml-1">({fmt(r.discount_value)}%)</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">₹{fmt(r.final_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
