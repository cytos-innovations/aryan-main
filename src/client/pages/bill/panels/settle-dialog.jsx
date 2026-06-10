import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  CashIcon,
  Cash01Icon,
  Add01Icon,
  Cancel01Icon,
  MinusPlusIcon,
  UserAccountIcon,
  Location01Icon,
  Clock01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  StickyNote01Icon,
  PercentIcon,
  Discount01Icon,
  CreditCardIcon,
  BankIcon,
  QrCode01Icon,
  Wallet01Icon,
  Payment01Icon,
  BarcodeScanIcon,
  SmartphoneWifiIcon,
  GiftIcon,
} from "@hugeicons/core-free-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { usePaymentMethods } from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE } from "../constants/billing";
import { fmtAmount, calcTaxBreakdown } from "../utils/billing-calc";

// Sentinels for the permanent (hard-coded) options in the method dropdown
const SPLIT_VALUE = "__SPLIT__";
const DUE_VALUE   = "__DUE__";
const NC_VALUE    = "__NC__";    // No Charge / Complimentary

// Returns the best-match icon for a payment method name. Never throws.
function getPaymentIcon(name = "") {
  const n = (name ?? "").toLowerCase();
  if (/upi|gpay|phonepe|paytm|bhim/.test(n))         return QrCode01Icon;
  if (/scan|qr/.test(n))                              return BarcodeScanIcon;
  if (/credit/.test(n))                               return CreditCardIcon;
  if (/debit/.test(n))                                return CreditCardIcon;
  if (/card/.test(n))                                 return CreditCardIcon;
  if (/net.?bank|neft|rtgs|imps|online/.test(n))     return BankIcon;
  if (/bank/.test(n))                                 return BankIcon;
  if (/cheque|check/.test(n))                         return Payment01Icon;
  if (/mobile|phone|smart/.test(n))                  return SmartphoneWifiIcon;
  if (/wallet/.test(n))                               return Wallet01Icon;
  if (/cash/.test(n))                                 return Cash01Icon;
  return Wallet01Icon; // generic fallback for unknown methods
}

function SearchableSelect({ options, value, onSelect, onSelectDone, placeholder = "Select…", inputRef, className = "" }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const containerRef        = useRef(null);
  const listRef             = useRef(null);
  const ownInputRef         = useRef(null);
  const resolvedRef         = inputRef ?? ownInputRef;

  const selected = options.find((o) => o.value === value) ?? null;
  const displayText = open ? query : (selected?.label ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => { setActive(0); }, [filtered.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function focusNext() {
    const input = resolvedRef.current;
    if (!input) return;
    const focusable = Array.from(
      document.querySelectorAll(
        'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.closest("[data-radix-popper-content-wrapper]"));
    const idx = focusable.indexOf(input);
    if (idx !== -1 && focusable[idx + 1]) focusable[idx + 1].focus();
  }

  function pick(opt) {
    onSelect(opt.value);
    setOpen(false);
    setQuery("");
    setTimeout(() => { if (onSelectDone) onSelectDone(); else focusNext(); }, 0);
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); setQuery(""); setOpen(true); setActive(0); }
      return;
    }
    if (e.key === "ArrowDown")    { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter")   { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
    else if (e.key === "Escape")  { setOpen(false); setQuery(""); }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={resolvedRef}
        type="text"
        value={displayText}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {filtered.map((opt, i) => (
              <div
                key={opt.value}
                onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
                onMouseEnter={() => setActive(i)}
                className={[
                  "flex items-center gap-2 cursor-pointer px-3 py-2 text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                ].join(" ")}
              >
                {opt.icon && <HugeiconsIcon icon={opt.icon} size={13} strokeWidth={2} className="shrink-0 text-muted-foreground" />}
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettleDialog({ open, onOpenChange, session, netAmount, billTotals, items, menu, sessionDisc, onSettle, isSettling }) {
  const methodsQuery = usePaymentMethods();
  const methods      = methodsQuery.data ?? [];

  const allMethodOptions = useMemo(() => [
    ...methods.map((m) => ({ value: m.name, label: m.name, icon: getPaymentIcon(m.name) })),
    { value: DUE_VALUE,   label: "Due (Pay Later)",        icon: Clock01Icon      },
    { value: SPLIT_VALUE, label: "Split Payment",          icon: MinusPlusIcon    },
    { value: NC_VALUE,    label: "No Charge (Complimentary)", icon: GiftIcon      },
  ], [methods]);

  const splitMethodOptions = useMemo(() =>
    methods.map((m) => ({ value: m.name, label: m.name, icon: getPaymentIcon(m.name) })),
    [methods],
  );

  // Delivery / takeaway detection — drives customer requirement
  const isDelivery = session?.order_type === ORDER_TYPE.DELIVERY || !!session?.is_home_delivery;
  const isTakeaway = session?.order_type === ORDER_TYPE.PICKUP   || !!session?.is_takeaway_enabled;
  const requiresCustomer = isDelivery || isTakeaway;
  const needsAddress     = isDelivery;

  // ── Form state ────────────────────────────────────────────
  const [customerName,    setCustomerName]    = useState("");
  const [customerMobile,  setCustomerMobile]  = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [method,          setMethod]          = useState("");
  const [amount,          setAmount]          = useState("");
  const [duePaidNow,      setDuePaidNow]      = useState("");  // partial due: paid now
  const [priorDue,        setPriorDue]        = useState(null); // customer's existing dues

  // Bill summary expand state
  const [catExpanded,  setCatExpanded]  = useState(false);
  const [taxExpanded,  setTaxExpanded]  = useState(false);
  const [discExpanded, setDiscExpanded] = useState(false);

  // Category subtotals from items
  const categoryTotals = useMemo(() => {
    const map = new Map();
    for (const item of items ?? []) {
      if (item.item_status !== "ACTIVE") continue;
      const catId   = item.category_id ?? "__none__";
      const catName = item.category_name ?? "Other";
      const amt     = Number(item.final_amount) || 0;
      if (!map.has(catId)) map.set(catId, { name: catName, total: 0 });
      map.get(catId).total += amt;
    }
    return Array.from(map.values()).map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }));
  }, [items]);

  const taxBreakdown = useMemo(() => calcTaxBreakdown(items ?? []), [items]);

  // NC remark state
  const [ncRemark, setNcRemark] = useState("");

  // Split builder state
  const [splitEntries, setSplitEntries] = useState([]);
  const [splitMethod,  setSplitMethod]  = useState("");
  const [splitAmount,  setSplitAmount]  = useState("");

  const nameRef   = useRef(null);
  const methodRef = useRef(null);
  const amountRef = useRef(null);

  const isSplit = method === SPLIT_VALUE;
  const isDue   = method === DUE_VALUE;
  const isNc    = method === NC_VALUE;
  // Name + mobile required for delivery/takeaway and for Due; address too for Due.
  const mustCapture = requiresCustomer || isDue;
  const mustAddress = needsAddress || isDue;

  // Default the method once the list loads
  useEffect(() => {
    if (methods.length > 0 && !method) {
      setMethod(methods[0].name);
      setSplitMethod(methods[0].name);
    }
  }, [methods, method]);

  // Reset + prefill whenever opened
  useEffect(() => {
    if (!open) return;
    setCustomerName(session?.customer_name ?? "");
    setCustomerMobile(session?.customer_mobile ?? "");
    setCustomerAddress(session?.customer_address ?? "");
    setAmount("");
    setDuePaidNow("");
    setNcRemark("");
    setPriorDue(null);
    setSplitEntries([]);
    setSplitAmount("");
    const first = methods[0]?.name ?? "";
    setMethod(first);
    setSplitMethod(first);
    // Focus: delivery/takeaway → customer name, else → payment method
    setTimeout(() => {
      if (requiresCustomer) nameRef.current?.focus();
      else                  methodRef.current?.focus();
    }, 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Auto-fill from an existing customer when a known mobile is typed ──
  // Fills empty name/address only, so it never clobbers what the user typed.
  useEffect(() => {
    if (!open) return;
    const mob = customerMobile.trim();
    if (mob.length < 4) { setPriorDue(null); return; }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const [results, due] = await Promise.all([
          billingService.searchCustomers(mob),
          billingService.getCustomerDueByMobile(mob),
        ]);
        if (!active) return;
        const match = results.find((c) => (c.mobile ?? "").trim() === mob);
        if (match) {
          if (match.name)    setCustomerName((n) => (n.trim() ? n : match.name));
          if (match.address) setCustomerAddress((a) => (a.trim() ? a : match.address));
        }
        setPriorDue(due && due.pending_total > 0 ? due : null);
      } catch { /* lookup is best-effort */ }
    }, 400);
    return () => { active = false; clearTimeout(t); };
  }, [customerMobile, open]);

  // ── Split maths ───────────────────────────────────────────
  const splitTotal = useMemo(
    () => splitEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [splitEntries],
  );
  const splitBalance = Math.round((netAmount - splitTotal) * 100) / 100;
  const splitBalanced = Math.abs(splitBalance) <= 0.01;

  // Single-payment shortfall / change preview
  const enteredAmt   = amount.trim() === "" ? netAmount : (Number(amount) || 0);
  const diff         = Math.round((netAmount - enteredAmt) * 100) / 100; // >0 short, <0 change
  const isDueMethod  = /due/i.test(method);

  // Partial-due maths: amount paid now (blank = nothing) and the balance due.
  const duePaidNum   = duePaidNow.trim() === "" ? 0 : Math.max(0, Math.min(netAmount, Number(duePaidNow) || 0));
  const dueRemaining = Math.round((netAmount - duePaidNum) * 100) / 100;

  function addSplit() {
    const amt = Number(splitAmount);
    if (!amt || amt <= 0 || !splitMethod) return;
    setSplitEntries((prev) => [...prev, { payment_mode: splitMethod, amount: amt, reference_no: null }]);
    setSplitAmount("");
  }

  function removeSplit(i) {
    setSplitEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Settle ────────────────────────────────────────────────
  function handleSettle() {
    if (isSettling) return;

    // Customer validation — required for delivery / takeaway and for Due
    if (mustCapture) {
      if (!customerName.trim())   { toast.error("Customer name is required"); nameRef.current?.focus(); return; }
      if (!customerMobile.trim()) { toast.error("Mobile number is required"); return; }
    }
    if (mustAddress && !customerAddress.trim()) {
      toast.error(isDue ? "Address is required for a due" : "Delivery address is required");
      return;
    }

    let entries;
    let writeOff = 0;
    if (isSplit) {
      if (splitEntries.length < 2) { toast.error("Add at least 2 payment modes to split"); return; }
      if (!splitBalanced) { toast.error("Split amounts must match the bill total"); return; }
      entries = splitEntries;
    } else if (isDue) {
      // Due — customer pays `duePaidNum` now (may be 0) and the rest later.
      entries = [{ payment_mode: "DUE", amount: duePaidNum, reference_no: null }];
    } else if (isNc) {
      // No Charge — amount is 0, entire bill written off, remark stored as reference.
      entries  = [{ payment_mode: "NC", amount: 0, reference_no: ncRemark.trim() || null }];
      writeOff = netAmount;
    } else {
      if (!method) { toast.error("Select a payment method"); return; }
      // Blank amount → settle the full bill amount
      const amt = amount.trim() === "" ? netAmount : Number(amount);
      if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
      entries = [{ payment_mode: method, amount: amt, reference_no: null }];
      // Short amount → the remainder is written off (unless paying via Due → keep it as a due)
      if (amt < netAmount && !/due/i.test(method)) {
        writeOff = Math.round((netAmount - amt) * 100) / 100;
      }
    }

    const customer = {
      name:    customerName.trim()    || null,
      mobile:  customerMobile.trim()  || null,
      address: customerAddress.trim() || null,
    };

    onSettle(entries, customer, writeOff);
    onOpenChange(false);
  }

  // F11 → settle while dialog open (Esc handled natively by Dialog)
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "F11") { e.preventDefault(); handleSettle(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-base">Settle Bill</DialogTitle>
              <DialogDescription className="text-xs">
                {session?.order_no ? `${session.order_no} · ` : ""}
                {session?.table_name ?? "Order"}
              </DialogDescription>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net Total</p>
              <p className="text-xl font-bold tabular-nums">₹{fmtAmount(netAmount)}</p>
            </div>
          </div>
        </DialogHeader>

        <FieldGroup>
          {/* ── Existing dues for this customer (matched by mobile) ── */}
          {priorDue && priorDue.pending_total > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 px-3 py-2.5 flex items-start gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} size={14} strokeWidth={2} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300 leading-snug">
                <span className="font-semibold">{priorDue.customer_name || "This customer"}</span> already has an outstanding due of{" "}
                <span className="font-semibold tabular-nums">₹{fmtAmount(priorDue.pending_total)}</span>
                {priorDue.due_count > 0 && ` across ${priorDue.due_count} bill${priorDue.due_count !== 1 ? "s" : ""}`}.
              </p>
            </div>
          )}

          {/* ── Customer — always shown; required only for delivery / takeaway ── */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>
                Customer Name
                {mustCapture
                  ? <span className="text-destructive"> *</span>
                  : <span className="text-muted-foreground font-normal text-xs"> (optional)</span>}
              </FieldLabel>
              <div className="relative">
                <HugeiconsIcon icon={UserAccountIcon} size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  ref={nameRef}
                  value={customerName}
                  maxLength={100}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Name"
                  className="pl-8"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel>
                Mobile No
                {mustCapture
                  ? <span className="text-destructive"> *</span>
                  : <span className="text-muted-foreground font-normal text-xs"> (optional)</span>}
              </FieldLabel>
              <Input
                value={customerMobile}
                maxLength={15}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="Mobile"
              />
            </Field>
          </div>

          {/* Address — for home delivery and for Due */}
          {mustAddress && (
            <Field>
              <FieldLabel>
                {isDue ? "Customer Address" : "Delivery Address"} <span className="text-destructive">*</span>
              </FieldLabel>
              <div className="relative">
                <HugeiconsIcon icon={Location01Icon} size={13} strokeWidth={2} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <textarea
                  value={customerAddress}
                  maxLength={250}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder={isDue ? "Customer address" : "Full delivery address"}
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </Field>
          )}

          <Separator />

          {/* ── Payment method ── */}
          <Field>
            <FieldLabel>Payment Method</FieldLabel>
            <SearchableSelect
              inputRef={methodRef}
              options={allMethodOptions}
              value={method}
              onSelect={setMethod}
              onSelectDone={() => amountRef.current?.focus()}
              placeholder={methodsQuery.isLoading ? "Loading…" : "Type or select method…"}
            />
          </Field>

          {/* ── Bill summary: category subtotals, tax, discount breakdown ── */}
          {(() => {
            // Discount shape detection
            const catEntries = sessionDisc?.catDiscAmts
              ? Object.entries(sessionDisc.catDiscAmts).filter(([, a]) => Number(a) > 0)
              : [];
            const hasNew = catEntries.length > 0 || (sessionDisc?.billDiscAmt > 0);
            const hasLegacy = !hasNew && (
              (sessionDisc?.discAmt > 0) || (sessionDisc?.foodDiscAmt > 0) ||
              (sessionDisc?.liquorDiscAmt > 0)
            );
            const hasDiscount = hasNew || hasLegacy || (sessionDisc?.sCharge > 0) ||
              (sessionDisc?.misc > 0) || (sessionDisc?.miscMinus > 0);
            const hasTax = taxBreakdown.some((t) => t.tax_amount > 0);
            // Show the block whenever there are multiple categories, tax, or any discount/charge
            if (!hasDiscount && !hasTax && categoryTotals.length <= 1) return null;

            // Build catId → name from menu master first, then from order items
            const catNameMap = {};
            for (const m of menu ?? []) {
              if (m.category_id != null && m.category_name)
                catNameMap[m.category_id] = m.category_name;
            }
            for (const item of items ?? []) {
              if (item.category_id != null && item.category_name)
                catNameMap[item.category_id] = item.category_name;
            }

            return (
              <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-1">

                {/* Category subtotals — expandable when 2+ categories */}
                {categoryTotals.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCatExpanded((p) => !p)}
                      className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={StickyNote01Icon} size={10} strokeWidth={2} />
                        Bill Total
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="tabular-nums font-medium text-foreground">
                          ₹{fmtAmount(billTotals?.finalAmount ?? netAmount)}
                        </span>
                        <HugeiconsIcon icon={catExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
                      </div>
                    </button>
                    {catExpanded && (
                      <div className="pl-2 space-y-0.5">
                        {categoryTotals.map((c) => (
                          <div key={c.name} className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{c.name}</span>
                            <span className="tabular-nums">₹{fmtAmount(c.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Bill Total</span>
                    <span className="tabular-nums font-medium text-foreground">
                      ₹{fmtAmount(billTotals?.finalAmount ?? netAmount)}
                    </span>
                  </div>
                )}

                {/* Tax breakdown — expandable */}
                {taxBreakdown.length > 0 && taxBreakdown.some((t) => t.tax_amount > 0) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTaxExpanded((p) => !p)}
                      className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={PercentIcon} size={10} strokeWidth={2} />
                        Tax
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="tabular-nums font-medium text-foreground">
                          ₹{fmtAmount(taxBreakdown.reduce((s, t) => s + t.tax_amount, 0))}
                        </span>
                        <HugeiconsIcon icon={taxExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
                      </div>
                    </button>
                    {taxExpanded && (
                      <div className="pl-2 space-y-0.5">
                        {taxBreakdown.map((t) => (
                          <div key={t.tax_name} className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{t.tax_name}{t.tax_percentage > 0 ? ` (${t.tax_percentage}%)` : ""}</span>
                            <span className="tabular-nums">₹{fmtAmount(t.tax_amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Discount / charges — collapsible */}
                {hasDiscount && (() => {
                  const totalDiscAmt =
                    catEntries.reduce((s, [, a]) => s + Number(a), 0) +
                    (sessionDisc?.billDiscAmt  || 0) +
                    (hasLegacy ? (sessionDisc?.foodDiscAmt || 0) + (sessionDisc?.liquorDiscAmt || 0) + (sessionDisc?.discAmt || 0) : 0) +
                    (sessionDisc?.miscMinus || 0);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setDiscExpanded((p) => !p)}
                        className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                          Discount
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                            −₹{fmtAmount(totalDiscAmt)}
                          </span>
                          <HugeiconsIcon icon={discExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
                        </div>
                      </button>
                      {discExpanded && (
                        <div className="pl-2 space-y-0.5">
                          {catEntries.map(([catId, amt]) => {
                            const pct  = sessionDisc?.catRows?.[catId]?.value;
                            const name = catNameMap[catId] ?? `Category ${catId}`;
                            return (
                              <div key={catId} className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{name} Disc{pct && Number(pct) > 0 ? ` (${pct}%)` : ""}</span>
                                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(Number(amt))}</span>
                              </div>
                            );
                          })}
                          {sessionDisc?.billDiscAmt > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Bill Disc{sessionDisc.billDiscPct > 0 ? ` (${sessionDisc.billDiscPct}%)` : ""}</span>
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(sessionDisc.billDiscAmt)}</span>
                            </div>
                          )}
                          {hasLegacy && sessionDisc?.foodDiscAmt > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Food Discount ({sessionDisc.foodPct}%)</span>
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(sessionDisc.foodDiscAmt)}</span>
                            </div>
                          )}
                          {hasLegacy && sessionDisc?.liquorDiscAmt > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Liquor Discount ({sessionDisc.liquorPct}%)</span>
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(sessionDisc.liquorDiscAmt)}</span>
                            </div>
                          )}
                          {hasLegacy && sessionDisc?.discAmt > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Discount</span>
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(sessionDisc.discAmt)}</span>
                            </div>
                          )}
                          {sessionDisc?.miscMinus > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Misc Deduct</span>
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(sessionDisc.miscMinus)}</span>
                            </div>
                          )}
                          {sessionDisc?.misc > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Misc Add</span>
                              <span className="tabular-nums">+₹{fmtAmount(sessionDisc.misc)}</span>
                            </div>
                          )}
                          {sessionDisc?.sCharge > 0 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Service Charge</span>
                              <span className="tabular-nums">+₹{fmtAmount(sessionDisc.sCharge)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-0.5">
                  <span>Net Total</span>
                  <span className="tabular-nums">₹{fmtAmount(netAmount)}</span>
                </div>
              </div>
            );
          })()}

          {/* ── Due — optional part-payment now, balance recorded as due ── */}
          {isDue && (
            <Field>
              <FieldLabel>
                Paid Now{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional — blank = full due)</span>
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                <Input
                  type="number"
                  min="0"
                  max={netAmount}
                  step="0.01"
                  value={duePaidNow}
                  onChange={(e) => setDuePaidNow(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSettle(); } }}
                  placeholder="0.00"
                  className="pl-6 font-mono"
                />
              </div>
              <div className="mt-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 flex items-start gap-2">
                <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
                  {duePaidNum > 0
                    ? <>Paid now <span className="font-semibold tabular-nums">₹{fmtAmount(duePaidNum)}</span> · due <span className="font-semibold tabular-nums">₹{fmtAmount(dueRemaining)}</span> recorded against the customer.</>
                    : <>The entire <span className="font-semibold tabular-nums">₹{fmtAmount(netAmount)}</span> will be recorded as a due.</>}
                  {" "}Name, mobile &amp; address are required.
                </p>
              </div>
            </Field>
          )}

          {/* ── No Charge (Complimentary) ── */}
          {isNc && (
            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 px-3 py-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <HugeiconsIcon icon={GiftIcon} size={14} strokeWidth={2} className="text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-700 dark:text-violet-300 leading-snug">
                  This bill of{" "}
                  <span className="font-semibold tabular-nums">₹{fmtAmount(netAmount)}</span>{" "}
                  will be marked as <span className="font-semibold">No Charge</span>. Customer pays ₹0 — the full amount is written off.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Reason / Remark <span className="font-normal opacity-60">(optional)</span></p>
                <Input
                  value={ncRemark}
                  onChange={(e) => setNcRemark(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSettle(); } }}
                  placeholder="e.g. Staff meal, Owner guest, Complaint compensation…"
                  maxLength={200}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* ── Single payment amount ── */}
          {!isSplit && !isDue && !isNc && (
            <Field>
              <FieldLabel>
                Enter Amount{" "}
                <span className="text-muted-foreground font-normal text-xs">(blank = full bill)</span>
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                <Input
                  ref={amountRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSettle(); } }}
                  placeholder={fmtAmount(netAmount)}
                  className="pl-6 font-mono"
                />
              </div>
              {/* Shortfall / change hint */}
              {diff > 0.01 && (
                <p className={`text-[11px] font-medium ${isDueMethod ? "text-amber-600 dark:text-amber-400" : "text-orange-600 dark:text-orange-400"}`}>
                  {isDueMethod
                    ? `₹${fmtAmount(diff)} will be recorded as due`
                    : `₹${fmtAmount(diff)} will be written off`}
                </p>
              )}
              {diff < -0.01 && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  Change to return: ₹{fmtAmount(Math.abs(diff))}
                </p>
              )}
            </Field>
          )}

          {/* ── Split builder ── */}
          {isSplit && (
            <div className="space-y-2.5">
              {/* Add row */}
              <div className="flex gap-2">
                <SearchableSelect
                  options={splitMethodOptions}
                  value={splitMethod}
                  onSelect={setSplitMethod}
                  placeholder="Method…"
                  className="w-36 shrink-0"
                />
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    onFocus={() => !splitAmount && splitBalance > 0 && setSplitAmount(fmtAmount(splitBalance))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSplit(); } }}
                    placeholder={splitBalance > 0 ? fmtAmount(splitBalance) : "0.00"}
                    className="pl-6 font-mono"
                  />
                </div>
                <Button type="button" size="sm" className="h-9 px-3 gap-1" onClick={addSplit} disabled={!splitAmount || Number(splitAmount) <= 0}>
                  <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
                  Add
                </Button>
              </div>

              {/* Entries */}
              {splitEntries.length > 0 ? (
                <>
                  <div className="border rounded-lg divide-y overflow-hidden">
                    {splitEntries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/10">
                        <HugeiconsIcon icon={CashIcon} size={13} strokeWidth={2} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 text-xs font-semibold">{entry.payment_mode}</span>
                        <span className="text-sm font-bold tabular-nums">₹{fmtAmount(entry.amount)}</span>
                        <button type="button" onClick={() => removeSplit(i)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-lg border px-3 py-2 flex justify-between text-sm font-bold ${splitBalanced ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    <span>Balance</span>
                    <span className="tabular-nums">
                      {splitBalance > 0.01 ? `₹${fmtAmount(splitBalance)} left`
                        : splitBalance < -0.01 ? `₹${fmtAmount(Math.abs(splitBalance))} over`
                        : "✓ Balanced"}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg py-3">
                  Add at least 2 payment modes
                </p>
              )}
            </div>
          )}
        </FieldGroup>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close <span className="ml-1 text-[9px] font-mono opacity-60">Esc</span>
          </Button>
          <Button
            type="button"
            className={`flex-1 text-white border-0 ${isNc ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            onClick={handleSettle}
            disabled={isSettling}
          >
            {isSettling ? "Settling…" : isNc ? "Mark No Charge" : isDue ? "Save as Due" : "Settle"}
            <span className="ml-1 text-[9px] font-mono opacity-70">F11</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
