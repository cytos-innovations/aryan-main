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
  Refresh01Icon,
  MultiplicationSignIcon,
} from "@hugeicons/core-free-icons";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { useSettledBills, useBillForReprint } from "../hooks/use-billing-queries";
import { fmtAmount } from "../utils/billing-calc";
import { fmtDate, fmtDatetime } from "@/lib/date-format";

// ─── Date helpers ─────────────────────────────────────────────

function todayStr()  { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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

function BillListItem({ bill, onView, active, itemRef, optionId }) {
  return (
    <div
      ref={itemRef}
      id={optionId}
      role="option"
      aria-selected={active}
      onClick={() => onView(bill.id)}
      className={`flex items-center gap-3 px-4 py-3 border-b transition-colors cursor-pointer ${
        active ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : "hover:bg-muted/20"
      }`}
    >
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
        onClick={(e) => { e.stopPropagation(); onView(bill.id); }}
        title="View bill"
      >
        <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} />
      </Button>
    </div>
  );
}

// ─── Bill detail view ─────────────────────────────────────────

const STATUS_CLS = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DUE:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function BillDetailView({ billId, onClose }) {
  const { data: bill, isLoading } = useBillForReprint(billId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
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

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20">
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
          Back
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={13} strokeWidth={2} className="text-primary" />
        <span className="text-sm font-bold">{bill.bill_no ?? `Bill #${bill.id}`}</span>
        {bill.order_no && (
          <span className="text-[11px] text-muted-foreground font-mono">{bill.order_no}</span>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ml-1 ${STATUS_CLS[bill.bill_status] ?? STATUS_CLS.DUE}`}>
          {bill.bill_status}
        </span>
        <div className="flex-1" />
        <Button type="button" size="sm" className="h-7 gap-1.5 text-xs">
          <HugeiconsIcon icon={PrinterIcon} size={12} strokeWidth={2} />
          Print
        </Button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto divide-y">

        {/* ── Bill Info ── */}
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <InfoRow label="Bill No"  value={bill.bill_no ?? `#${bill.id}`} bold />
          <InfoRow label="Order No" value={bill.order_no ?? "—"} />
          {bill.table_name  && <InfoRow label="Table"    value={bill.table_name} />}
          {bill.order_type  && <InfoRow label="Type"     value={bill.order_type.replace(/_/g, " ")} />}
          <InfoRow label="Status"   value={bill.bill_status} />
          <InfoRow label="Settled"  value={fmtDatetime(bill.settled_at ?? bill.created_at)} />
        </div>

        {/* ── Customer Info ── */}
        {(bill.customer_name || bill.customer_mobile) && (
          <div className="px-4 py-3 space-y-1.5 text-xs">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {bill.customer_name   && <InfoRow label="Name"   value={bill.customer_name} />}
              {bill.customer_mobile && <InfoRow label="Mobile" value={bill.customer_mobile} />}
            </div>
          </div>
        )}

        {/* ── Items ── */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Items</p>
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-16 text-right">Rate</span>
              <span className="w-16 text-right">Amount</span>
            </div>
            {(bill.items ?? []).map((item, i) => (
              <div key={item.id ?? i} className="flex items-center gap-2 px-3 py-1.5 border-t text-xs">
                <span className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="truncate font-medium">{item.item_name}</span>
                  {item.is_complimentary && (
                    <span className="shrink-0 rounded-sm bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide leading-none">
                      Comp
                    </span>
                  )}
                </span>
                <span className="w-8 text-center tabular-nums text-muted-foreground">{item.quantity}</span>
                <span className="w-16 text-right tabular-nums text-muted-foreground">
                  {item.is_complimentary ? "Free" : `₹${fmtAmount(item.rate)}`}
                </span>
                <span className="w-16 text-right tabular-nums font-semibold">₹{fmtAmount(item.final_amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bill Totals ── */}
        <div className="px-4 py-3 space-y-1.5 text-xs">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bill Summary</p>
          <TotalsRow label="Gross Amount" value={bill.gross_amount} />
          {bill.discount_amount > 0 && (
            <TotalsRow label="Discount" value={-bill.discount_amount} accent="text-emerald-600 dark:text-emerald-400" />
          )}
          {(bill.tax_details ?? []).length > 0
            ? (bill.tax_details.map((t) => (
                <TotalsRow key={t.tax_name} label={`${t.tax_name} (${t.tax_percentage}%)`} value={t.tax_amount} />
              )))
            : bill.tax_amount > 0 && <TotalsRow label="Tax" value={bill.tax_amount} />
          }
          {roundOff !== 0 && <TotalsRow label="Round Off" value={roundOff} small />}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-bold text-sm">Net Total</span>
            <span className="tabular-nums font-bold text-base">₹{fmtAmount(bill.net_amount)}</span>
          </div>
        </div>

        {/* ── Payments ── */}
        {(bill.payments ?? []).length > 0 && (
          <div className="px-4 py-3 text-xs">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment</p>
            <div className="border rounded-md overflow-hidden">
              {bill.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={CashIcon} size={11} strokeWidth={2} />
                    <span className="font-medium text-foreground">{p.payment_type}</span>
                    {p.reference_no && (
                      <span className="font-mono text-[10px] text-muted-foreground">· {p.reference_no}</span>
                    )}
                  </div>
                  <span className="tabular-nums font-semibold">₹{fmtAmount(p.payment_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div className="flex gap-1">
      <span className="text-muted-foreground shrink-0 w-16">{label}</span>
      <span className={`truncate ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
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
  const searchRef   = useRef(null);
  const resultsRef  = useRef(null);
  const activeRef   = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [committed,   setCommitted]   = useState("");
  const [preset,      setPreset]      = useState("TODAY");
  const [customFrom,  setCustomFrom]  = useState(daysAgoStr(6));
  const [customTo,    setCustomTo]    = useState(todayStr());
  const [viewBillId,  setViewBillId]  = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounce the typed input into `committed` so results update live as the
  // user types (no Enter required). 250 ms feels instant without hammering
  // the backend on every keystroke.
  useEffect(() => {
    const term = searchInput.trim();
    if (term === committed) return;
    const id = setTimeout(() => setCommitted(term), 250);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Derive date range from preset or custom inputs
  const range = preset === "CUSTOM"
    ? { dateFrom: customFrom, dateTo: customTo }
    : (presetRange(preset) ?? { dateFrom: todayStr(), dateTo: todayStr() });

  // When a search term is committed, query ALL settled bills regardless of date.
  // Date filter only applies when browsing (no active search).
  const queryParams = committed
    ? { search: committed, dateFrom: null, dateTo: null }
    : { search: null, ...range };
  const { data: bills, isLoading, isFetching, isError, error, refetch } = useSettledBills(queryParams);

  // Auto-focus search on open; reset to list view; force fresh fetch
  useEffect(() => {
    if (open) {
      setViewBillId(null);
      setCommitted("");
      setSearchInput("");
      setActiveIndex(-1);
      setTimeout(() => searchRef.current?.focus(), 80);
      // Refetch on every open so newly settled bills always appear
      setTimeout(() => refetch(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const billList = bills ?? [];

  // Keep the highlighted row valid as the result set changes (new search,
  // refetch, filter switch). Reset to "nothing highlighted" on every change.
  useEffect(() => {
    setActiveIndex(-1);
  }, [committed, preset, customFrom, customTo]);

  // Scroll the highlighted row into view whenever it moves.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleSearchKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (billList.length === 0) return;
      setActiveIndex((i) => (i + 1) % billList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (billList.length === 0) return;
      setActiveIndex((i) => (i <= 0 ? billList.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? billList[activeIndex] : billList[0];
      if (target) setViewBillId(target.id);
      else setCommitted(searchInput.trim());
    } else if (e.key === "Escape") {
      if (searchInput) {
        e.preventDefault();
        setSearchInput("");
        setActiveIndex(-1);
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0"
      >
        {/* ── Sheet header ── */}
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={PrinterIcon} size={15} strokeWidth={2} className="text-primary shrink-0" />
            <SheetTitle className="text-sm font-semibold leading-none">Bill Reprint</SheetTitle>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                size={14}
                strokeWidth={2}
                className={isFetching ? "animate-spin" : ""}
              />
            </button>
            <SheetClose asChild>
              <button
                type="button"
                title="Close"
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <HugeiconsIcon icon={MultiplicationSignIcon} size={13} strokeWidth={2.5} />
              </button>
            </SheetClose>
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
                  placeholder="Bill no / mobile / customer name… (↑↓ to navigate)"
                  className="h-8 pl-7 pr-7 text-xs"
                  role="combobox"
                  aria-expanded={billList.length > 0}
                  aria-controls="bill-reprint-results"
                  aria-activedescendant={activeIndex >= 0 ? `bill-opt-${activeIndex}` : undefined}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setCommitted(""); setActiveIndex(-1); searchRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Date filter tabs */}
            <div className="shrink-0 border-b">
              <div className="flex items-center gap-1 px-4 py-2">
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
              </div>
              {preset === "CUSTOM" && (
                <div className="flex items-center gap-2 px-4 pb-2">
                  <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={2} className="text-muted-foreground shrink-0" />
                  <DateInput
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <span className="text-muted-foreground text-xs shrink-0">–</span>
                  <DateInput
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                </div>
              )}
            </div>

            {/* Results */}
            <div
              ref={resultsRef}
              id="bill-reprint-results"
              role="listbox"
              className="flex-1 overflow-y-auto"
            >
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
              ) : billList.length === 0 ? (
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
                    {billList.length} bill{billList.length !== 1 ? "s" : ""} found
                    {committed && ` for "${committed}"`}
                    {!committed && (
                      <>&nbsp;· {range.dateFrom === range.dateTo
                        ? fmtDate(range.dateFrom)
                        : `${fmtDate(range.dateFrom)} – ${fmtDate(range.dateTo)}`}</>
                    )}
                  </div>
                  {billList.map((bill, i) => (
                    <BillListItem
                      key={bill.id}
                      bill={bill}
                      onView={setViewBillId}
                      active={i === activeIndex}
                      itemRef={i === activeIndex ? activeRef : undefined}
                      optionId={`bill-opt-${i}`}
                    />
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
