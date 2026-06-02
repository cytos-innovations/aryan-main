import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  CashIcon,
  Add01Icon,
  Cancel01Icon,
  MinusPlusIcon,
  UserAccountIcon,
  Location01Icon,
  Clock01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { usePaymentMethods } from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE } from "../constants/billing";
import { fmtAmount } from "../utils/billing-calc";

// Sentinels for the permanent (hard-coded) options in the method dropdown
const SPLIT_VALUE = "__SPLIT__";
const DUE_VALUE   = "__DUE__";

export default function SettleDialog({ open, onOpenChange, session, netAmount, onSettle, isSettling }) {
  const methodsQuery = usePaymentMethods();
  const methods      = methodsQuery.data ?? [];

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

  // Split builder state
  const [splitEntries, setSplitEntries] = useState([]);
  const [splitMethod,  setSplitMethod]  = useState("");
  const [splitAmount,  setSplitAmount]  = useState("");

  const nameRef   = useRef(null);
  const methodRef = useRef(null);

  const isSplit = method === SPLIT_VALUE;
  const isDue   = method === DUE_VALUE;
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
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger ref={methodRef} className="w-full">
                <SelectValue placeholder={methodsQuery.isLoading ? "Loading…" : "Select method"} />
              </SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
                {/* Permanent hard-coded Due option — customer pays later */}
                <SelectItem value={DUE_VALUE}>
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={2} />
                    Due (Pay Later)
                  </span>
                </SelectItem>
                {/* Permanent hard-coded Split option */}
                <SelectItem value={SPLIT_VALUE}>
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={MinusPlusIcon} size={13} strokeWidth={2} />
                    Split Payment
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

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

          {/* ── Single payment amount ── */}
          {!isSplit && !isDue && (
            <Field>
              <FieldLabel>
                Enter Amount{" "}
                <span className="text-muted-foreground font-normal text-xs">(blank = full bill)</span>
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                <Input
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
                <Select value={splitMethod} onValueChange={setSplitMethod}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            onClick={handleSettle}
            disabled={isSettling}
          >
            {isSettling ? "Settling…" : (isDue ? "Save as Due" : "Settle")}
            <span className="ml-1 text-[9px] font-mono opacity-70">F11</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
