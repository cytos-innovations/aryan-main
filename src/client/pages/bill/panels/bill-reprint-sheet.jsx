import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  PrinterIcon,
  ReceiptIndianRupeeIcon,
  Cancel01Icon,
  EyeIcon,
  ArrowLeft01Icon,
  Calendar01Icon,
  UserAccountIcon,
  Clock01Icon,
  CashIcon,
  PercentIcon,
} from "@hugeicons/core-free-icons";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { useSettledBills, useBillForReprint } from "../hooks/use-billing-queries";
import { fmtAmount } from "../utils/billing-calc";

// ─── Date helpers ─────────────────────────────────────────────

function todayStr()  { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmtDatetime(s) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  return d.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Filter presets ───────────────────────────────────────────

const FILTER_PRESETS = [
  { key: "TODAY",   label: "Today" },
  { key: "7D",      label: "7 Days" },
  { key: "1M",      label: "1 Month" },
  { key: "CUSTOM",  label: "Custom" },
];

function presetRange(key) {
  if (key === "TODAY") return { dateFrom: todayStr(),     dateTo: todayStr() };
  if (key === "7D")    return { dateFrom: daysAgoStr(6),  dateTo: todayStr() };
  if (key === "1M")    return { dateFrom: daysAgoStr(29), dateTo: todayStr() };
  return null; // custom — caller provides range
}

// ─── Bill list item ───────────────────────────────────────────

function BillListItem({ bill, onView }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold font-mono">
            {bill.bill_no ?? `#${bill.id}`}
          </span>
          {bill.order_no && (
            <span className="text-[10px] text-muted-foreground font-mono">{bill.order_no}</span>
          )}
          {bill.table_name && (
            <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
              {bill.table_name}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            bill.bill_status === "PAID"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
            {bill.bill_status}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
          {bill.customer_name && (
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={UserAccountIcon} size={9} strokeWidth={2} />
              {bill.customer_name}
              {bill.customer_mobile && ` · ${bill.customer_mobile}`}
            </span>
          )}
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} size={9} strokeWidth={2} />
            {fmtDatetime(bill.settled_at ?? bill.created_at)}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums">₹{fmtAmount(bill.net_amount)}</p>
        {bill.discount_amount > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            disc -₹{fmtAmount(bill.discount_amount)}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onView(bill.id)}
        title="View bill"
      >
        <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} />
      </Button>
    </div>
  );
}

// ─── Bill detail view ─────────────────────────────────────────

function BillDetailView({ billId, onClose }) {
  const { data: bill, isLoading } = useBillForReprint(billId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={36} strokeWidth={1.5} className="opacity-25" />
        <p className="text-sm">Bill not found</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} className="mr-1" />
          Back
        </Button>
      </div>
    );
  }

  const roundOff = bill.round_off ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Detail header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20">
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
          Back
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={13} strokeWidth={2} className="text-muted-foreground" />
        <span className="text-sm font-semibold">{bill.bill_no ?? `Bill #${bill.id}`}</span>
        {bill.order_no && (
          <span className="text-xs text-muted-foreground font-mono">{bill.order_no}</span>
        )}
        <div className="flex-1" />
        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
          bill.bill_status === "PAID"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}>
          {bill.bill_status}
        </span>
        <Button type="button" size="sm" className="h-7 gap-1.5 text-xs">
          <HugeiconsIcon icon={PrinterIcon} size={12} strokeWidth={2} />
          Print
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Info block */}
        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-b">
          {bill.table_name && <InfoRow label="Table"    value={bill.table_name} />}
          {bill.order_type && <InfoRow label="Type"     value={bill.order_type.replace("_", " ")} />}
          {bill.customer_name && <InfoRow label="Customer" value={bill.customer_name} />}
          {bill.customer_mobile && <InfoRow label="Mobile"   value={bill.customer_mobile} />}
          <InfoRow label="Settled" value={fmtDatetime(bill.settled_at ?? bill.created_at)} />
        </div>

        {/* Items */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Items</p>
          <div className="border rounded-md overflow-hidden">
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-16 text-right">Rate</span>
              <span className="w-16 text-right">Amount</span>
            </div>
            {(bill.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 border-t text-xs">
                <span className="flex-1 min-w-0 truncate font-medium">{item.item_name}</span>
                <span className="w-10 text-center tabular-nums text-muted-foreground">{item.quantity}</span>
                <span className="w-16 text-right tabular-nums text-muted-foreground">₹{fmtAmount(item.rate)}</span>
                <span className="w-16 text-right tabular-nums font-semibold">₹{fmtAmount(item.final_amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-4 py-3 space-y-1.5 text-xs border-t mt-2">
          {bill.discount_amount > 0 && (
            <TotalsRow label="Discount" value={-bill.discount_amount} accent="text-emerald-600 dark:text-emerald-400" />
          )}
          {(bill.tax_details ?? []).map((t) => (
            <TotalsRow
              key={t.tax_name}
              label={`${t.tax_name} (${t.tax_percentage}%)`}
              value={t.tax_amount}
            />
          ))}
          {bill.tax_amount > 0 && (bill.tax_details ?? []).length === 0 && (
            <TotalsRow label="Tax" value={bill.tax_amount} />
          )}
          {roundOff !== 0 && (
            <TotalsRow label="Round Off" value={roundOff} small />
          )}
          <div className="flex items-center justify-between pt-1 border-t font-bold">
            <span>Net Total</span>
            <span className="tabular-nums text-base">₹{fmtAmount(bill.net_amount)}</span>
          </div>
        </div>

        {/* Payments */}
        {(bill.payments ?? []).length > 0 && (
          <div className="px-4 pb-4 border-t pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Payment
            </p>
            <div className="space-y-1">
              {bill.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={CashIcon} size={11} strokeWidth={2} />
                    <span>{p.payment_type}</span>
                    {p.reference_no && (
                      <span className="font-mono text-[10px]">· {p.reference_no}</span>
                    )}
                  </div>
                  <span className="tabular-nums font-medium">₹{fmtAmount(p.payment_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-1">
      <span className="text-muted-foreground shrink-0 w-16">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function TotalsRow({ label, value, accent, small }) {
  return (
    <div className={`flex justify-between ${small ? "text-[10px]" : "text-xs"} text-muted-foreground`}>
      <span>{label}</span>
      <span className={`tabular-nums font-medium ${accent ?? "text-foreground"}`}>
        {value < 0 ? "-" : ""}₹{fmtAmount(Math.abs(value))}
      </span>
    </div>
  );
}

// ─── Main sheet component ─────────────────────────────────────

export default function BillReprintSheet({ open, onOpenChange }) {
  const searchRef = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [committed,   setCommitted]   = useState("");
  const [preset,      setPreset]      = useState("TODAY");
  const [customFrom,  setCustomFrom]  = useState(daysAgoStr(6));
  const [customTo,    setCustomTo]    = useState(todayStr());
  const [viewBillId,  setViewBillId]  = useState(null);

  // Derive date range from preset or custom inputs
  const range = preset === "CUSTOM"
    ? { dateFrom: customFrom, dateTo: customTo }
    : (presetRange(preset) ?? { dateFrom: todayStr(), dateTo: todayStr() });

  // When a search term is committed, query ALL settled bills regardless of date.
  // Date filter only applies when browsing (no active search).
  const queryParams = committed
    ? { search: committed, dateFrom: null, dateTo: null }
    : { search: null, ...range };
  const { data: bills, isLoading, isFetching, isError, error } = useSettledBills(queryParams);

  // Auto-focus search on open; reset to list view
  useEffect(() => {
    if (open) {
      setViewBillId(null);
      setCommitted("");
      setSearchInput("");
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  function handleSearchKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      setCommitted(searchInput.trim());
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0"
      >
        {/* ── Sheet header ── */}
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={PrinterIcon} size={15} strokeWidth={2} className="text-primary" />
            <SheetTitle className="text-sm font-semibold leading-none">Bill Reprint</SheetTitle>
            {isFetching && !isLoading && (
              <span className="text-[10px] text-muted-foreground">refreshing…</span>
            )}
          </div>
        </SheetHeader>

        {viewBillId ? (
          /* ── Detail view ── */
          <BillDetailView billId={viewBillId} onClose={() => setViewBillId(null)} />
        ) : (
          /* ── List view ── */
          <>
            {/* Search bar */}
            <div className="shrink-0 px-4 py-2 border-b">
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={12}
                  strokeWidth={2}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  ref={searchRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKey}
                  placeholder="Exact bill no / mobile, or partial customer name… (Enter)"
                  className="h-8 pl-7 pr-7 text-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setCommitted(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Date filter tabs */}
            <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-b">
              {FILTER_PRESETS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={[
                    "text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors",
                    preset === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
              {preset === "CUSTOM" && (
                <div className="flex items-center gap-1.5 ml-2">
                  <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={2} className="text-muted-foreground" />
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-7 text-xs w-32"
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-7 text-xs w-32"
                  />
                </div>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-md" />
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 p-6 text-center">
                  <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={36} strokeWidth={1.5} className="opacity-20 text-destructive" />
                  <p className="text-xs font-medium text-destructive">Failed to load bills</p>
                  <p className="text-[10px] text-muted-foreground break-all">{String(error ?? "Unknown error")}</p>
                </div>
              ) : (bills ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={36} strokeWidth={1.5} className="opacity-20" />
                  <p className="text-xs text-center">
                    {committed
                      ? "No settled bills match your search."
                      : "No settled bills found for this period."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-1.5 text-[10px] text-muted-foreground bg-muted/30 border-b">
                    {bills.length} bill{bills.length !== 1 ? "s" : ""} found
                    {committed && ` for "${committed}"`}
                    &nbsp;· {range.dateFrom === range.dateTo
                      ? fmtDate(range.dateFrom)
                      : `${fmtDate(range.dateFrom)} – ${fmtDate(range.dateTo)}`}
                  </div>
                  {bills.map((bill) => (
                    <BillListItem key={bill.id} bill={bill} onView={setViewBillId} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
