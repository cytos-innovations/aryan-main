import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
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
  Coins01Icon,
  UserGroupIcon,
  DeliveryTruck01Icon,
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
import { Switch }    from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { usePaymentMethods } from "../hooks/use-billing-queries";
import { WaiterPicker } from "./party-pickers";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE } from "../constants/billing";
import { fmtAmount, calcTaxBreakdown, calcDiscountedTotals } from "../utils/billing-calc";

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

function SearchableSelect({ options, value, onSelect, onSelectDone, onArrowNav, markDropdown = false, placeholder = "Select…", inputRef, id, className = "" }) {
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
    setTimeout(() => { if (onSelectDone) onSelectDone(opt.value); else focusNext(); }, 0);
  }

  function onKeyDown(e) {
    // Horizontal arrows never drive the dropdown — hand them to the parent for
    // cross-cell navigation (works whether the list is open or closed).
    if (onArrowNav && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      onArrowNav(e);
      if (e.defaultPrevented) { setOpen(false); return; }
    }
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
        id={id}
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
        <div data-split-dropdown-open={markDropdown ? "true" : undefined} className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
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

export default function SettleDialog({ open, onOpenChange, session, netAmount, billTotals, items, menu, sessionDisc, onSettle, isSettling, onAssignWaiter, isAssigningWaiter }) {
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
  const [tip,             setTip]             = useState("");  // tip for the waiter (on top of net)
  const [duePaidNow,      setDuePaidNow]      = useState("");  // partial due: paid now
  const [priorDue,        setPriorDue]        = useState(null); // customer's existing dues

  // ── Dineout-app discount (Swiggy / Zomato / District / …) ──
  const [dineoutOn,    setDineoutOn]    = useState(false);
  const [dineoutAppId, setDineoutAppId] = useState("");   // market_segment id (string)
  const [dineoutMode,  setDineoutMode]  = useState("PCT"); // "PCT" | "AMT"
  const [dineoutValue, setDineoutValue] = useState("");    // raw % or ₹ entered

  // Restaurant dineout apps come from the market_segment master (RESTAURANT flag).
  const dineoutAppsQuery = useQuery({
    queryKey: ["rest-market-segments-all"],
    queryFn: () => invoke("get_all_market_segments", { segmentType: "RESTAURANT" }),
    enabled: open,
  });
  const dineoutApps = dineoutAppsQuery.data ?? [];

  // Inline waiter picker — opened when the user chooses to attribute a tip to a
  // waiter. Optional: a tip can be recorded without one.
  const [waiterPickerOpen, setWaiterPickerOpen] = useState(false);

  const waiterId   = session?.waiter_id ?? null;
  const waiterName = session?.waiter_name ?? null;
  const hasWaiter  = waiterId != null;

  // Bill summary expand state
  const [catExpanded,  setCatExpanded]  = useState(false);
  const [taxExpanded,  setTaxExpanded]  = useState(false);
  const [discExpanded, setDiscExpanded] = useState(false);

  // Discount-before-tax engine — drives the post-discount tax breakdown so the
  // settle summary matches the printed bill (GST charged on the net value).
  const discTotals = useMemo(
    () => calcDiscountedTotals(items ?? [], sessionDisc),
    [items, sessionDisc],
  );

  // Category subtotals from items (pre-tax — tax is shown as its own row).
  const categoryTotals = useMemo(() => {
    const map = new Map();
    for (const item of items ?? []) {
      if (item.item_status !== "ACTIVE") continue;
      const catId   = item.category_id ?? "__none__";
      const catName = item.category_name ?? "Other";
      const amt     = Number(item.taxable_amount) || 0;
      if (!map.has(catId)) map.set(catId, { name: catName, total: 0 });
      map.get(catId).total += amt;
    }
    return Array.from(map.values()).map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }));
  }, [items]);

  const taxBreakdown = useMemo(
    () => calcTaxBreakdown(items ?? [], discTotals.perItem),
    [items, discTotals],
  );

  // NC remark state
  const [ncRemark, setNcRemark] = useState("");

  // Split builder state
  const [splitEntries, setSplitEntries] = useState([]);
  const [splitMethod,  setSplitMethod]  = useState("");
  const [splitAmount,  setSplitAmount]  = useState("");

  const nameRef        = useRef(null);
  const methodRef      = useRef(null);
  const amountRef      = useRef(null);
  const tipRef         = useRef(null);
  const splitMethodRef = useRef(null);
  const duePaidRef     = useRef(null);
  const ncRemarkRef    = useRef(null);
  const dineoutValueRef = useRef(null);

  const isSplit = method === SPLIT_VALUE;
  const isDue   = method === DUE_VALUE;
  const isNc    = method === NC_VALUE;
  // Dineout discount is only offered on plain single payment.
  const dineoutActive = !isSplit && !isDue && !isNc && dineoutOn;
  // Name + mobile required for delivery/takeaway, for Due, and for a dineout
  // discount (the app needs the customer on record); address too for Due.
  const mustCapture = requiresCustomer || isDue || dineoutActive;
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
    setTip("");
    setWaiterPickerOpen(false);
    setDuePaidNow("");
    setNcRemark("");
    setPriorDue(null);
    setSplitEntries([]);
    setSplitAmount("");
    setDineoutOn(false);
    setDineoutAppId("");
    setDineoutMode("PCT");
    setDineoutValue("");
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
  // A confirmed full-mobile match overwrites name/address so the entered
  // number always pulls in that customer's saved details.
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
          if (match.name)    setCustomerName(match.name);
          if (match.address) setCustomerAddress(match.address);
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

  // ── Dineout discount maths ─────────────────────────────────
  // The dineout app funds part of the bill: the customer pays the reduced
  // amount and the discounted portion is written off at settlement. The %/₹
  // value is applied to the bill's net total.
  const dineoutValNum = dineoutValue.trim() === "" ? 0 : Math.max(0, Number(dineoutValue) || 0);
  const dineoutDiscAmt = !dineoutOn ? 0
    : dineoutMode === "PCT"
      ? Math.round((netAmount * Math.min(dineoutValNum, 100) / 100) * 100) / 100
      : Math.round(Math.min(dineoutValNum, netAmount) * 100) / 100;
  // Net the customer actually pays after the dineout discount.
  const effectiveNet = Math.round((netAmount - dineoutDiscAmt) * 100) / 100;
  const dineoutApp   = dineoutApps.find((a) => String(a.id) === dineoutAppId) ?? null;

  // Tip rides on top of the (post-dineout) net total → amount payable = net + tip.
  const tipNum         = tip.trim() === "" ? 0 : Math.max(0, Number(tip) || 0);
  const amountPayable  = Math.round((effectiveNet + tipNum) * 100) / 100;

  // Single-payment shortfall / change preview (measured against amount payable)
  const enteredAmt   = amount.trim() === "" ? amountPayable : (Number(amount) || 0);
  const diff         = Math.round((amountPayable - enteredAmt) * 100) / 100; // >0 short, <0 change
  const isDueMethod  = /due/i.test(method);

  // Partial-due maths: amount paid now (blank = nothing) and the balance due.
  const duePaidNum   = duePaidNow.trim() === "" ? 0 : Math.max(0, Math.min(netAmount, Number(duePaidNow) || 0));
  const dueRemaining = Math.round((netAmount - duePaidNum) * 100) / 100;

  function addSplit() {
    const amt = Number(splitAmount);
    if (!amt || amt <= 0 || !splitMethod) return;
    const nextEntries = [...splitEntries, { payment_mode: splitMethod, amount: amt, reference_no: null }];
    setSplitEntries(nextEntries);
    setSplitAmount("");

    // Decide where focus should land after this entry is added.
    // Once we have ≥2 modes and the split is balanced, the bill is ready to
    // settle → jump to the Settle button. Otherwise loop back to the method
    // picker to add the next mode.
    const newTotal   = nextEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const newBalance = Math.round((netAmount - newTotal) * 100) / 100;
    const readyToSettle = nextEntries.length >= 2 && Math.abs(newBalance) <= 0.01;
    setTimeout(() => {
      if (readyToSettle) document.getElementById("settle-dialog-settle-btn")?.focus();
      else               document.getElementById("split-method-input")?.focus();
    }, 0);
  }

  function removeSplit(i) {
    setSplitEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Split-flow arrow-key grid navigation ──────────────────
  // A single capture-phase handler (see effect below) owns all arrow keys
  // while the dialog is in Split mode, so it runs *before* Radix Dialog's own
  // focus management and before the inputs' default arrow behaviour.
  //
  // The focus grid (top → bottom):
  //   row 0 : [ Payment Method ]                       (single cell)
  //   row 1 : [ split method | amount | Add ]          (the add-row)
  //   row k : [ split-entry-(k-2) ]                    (one per added entry)
  //   last  : [ Close | Settle ]
  //
  // Left/Right move within a row; Up/Down move between rows keeping the column.
  const byId = (id) => document.getElementById(id);

  function buildSplitGrid() {
    const rows = [["settle-method-input"]];
    rows.push(["split-method-input", "split-amount-input", "split-add-btn"]);
    for (let i = 0; i < splitEntries.length; i++) rows.push([`split-entry-${i}`]);
    rows.push(["settle-dialog-close-btn", "settle-dialog-settle-btn"]);
    return rows;
  }

  // Locate the currently-focused id within the grid → { r, c }, or null.
  function locate(grid, id) {
    for (let r = 0; r < grid.length; r++) {
      const c = grid[r].indexOf(id);
      if (c !== -1) return { r, c };
    }
    return null;
  }

  function focusId(id) { byId(id)?.focus(); }

  // Returns true if it handled the key (caller should preventDefault).
  function handleSplitArrow(key, activeId, caretAtStart, caretAtEnd) {
    const grid = buildSplitGrid();
    const pos = locate(grid, activeId);
    if (!pos) return false;
    const { r, c } = pos;
    const row = grid[r];

    if (key === "ArrowRight") {
      // In the amount field, only leave when the caret is at the very end.
      if (activeId === "split-amount-input" && !caretAtEnd) return false;
      if (c < row.length - 1) { focusId(row[c + 1]); return true; }
      return false;
    }
    if (key === "ArrowLeft") {
      if (activeId === "split-amount-input" && !caretAtStart) return false;
      if (c > 0) { focusId(row[c - 1]); return true; }
      // Leftmost cell of the add-row → jump to Close (per spec).
      if (r === 1) { focusId("settle-dialog-close-btn"); return true; }
      return false;
    }
    if (key === "ArrowDown") {
      const next = grid[r + 1];
      if (next) { focusId(next[Math.min(c, next.length - 1)]); return true; }
      return false;
    }
    if (key === "ArrowUp") {
      const prev = grid[r - 1];
      if (prev) { focusId(prev[Math.min(c, prev.length - 1)]); return true; }
      return false;
    }
    return false;
  }

  // Capture-phase arrow navigation for the split flow. Runs before Radix
  // Dialog and before the inputs, so arrow keys reliably move focus.
  useEffect(() => {
    if (!open || !isSplit) return;
    function onKeyDownCapture(e) {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const active = document.activeElement;
      const id = active?.id;
      if (!id) return;

      // If a SearchableSelect dropdown is open, let it own Up/Down (option
      // navigation) and Left/Right is handled by its own onArrowNav.
      const dropdownOpen = !!document.querySelector("[data-split-dropdown-open='true']");
      if (dropdownOpen && (e.key === "ArrowUp" || e.key === "ArrowDown")) return;
      if (id === "split-method-input" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        // SearchableSelect.onArrowNav handles horizontal movement for the method cell.
        return;
      }

      // Caret edge detection for the amount field.
      let caretAtStart = true, caretAtEnd = true;
      if (id === "split-amount-input") {
        const sel = active.selectionStart;
        caretAtStart = sel == null || (sel === 0 && active.selectionEnd === 0);
        caretAtEnd   = sel == null || (sel === active.value.length && active.selectionEnd === active.value.length);
      }

      if (handleSplitArrow(e.key, id, caretAtStart, caretAtEnd)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("keydown", onKeyDownCapture, true);
    return () => document.removeEventListener("keydown", onKeyDownCapture, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSplit, splitEntries.length]);

  // Enter / Delete on a focused split-entry row removes it.
  function onEntryRowKey(e, i) {
    if (e.key === "Enter" || e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeSplit(i);
      setTimeout(() => {
        const fallback = byId(`split-entry-${Math.max(0, i - 1)}`);
        (fallback ?? byId("split-method-input"))?.focus();
      }, 0);
    }
  }

  // ── Tip ────────────────────────────────────────────────────
  // A tip can be entered with or without a waiter assigned. When no waiter is
  // set, the tip is still recorded on the bill — assigning a waiter is optional
  // and only attributes the tip to that person.
  function handleTipChange(v) {
    setTip(v);
  }

  // Inline picker selection → assign on the live session; the parent refetches
  // the session + floor view so the new waiter shows everywhere. Once the
  // session reports a waiter, the tip input unlocks.
  function handleAssignWaiter(w) {
    if (!w?.id || !onAssignWaiter) return;
    setWaiterPickerOpen(false);
    onAssignWaiter(w, {
      onDone: () => { setTimeout(() => tipRef.current?.focus(), 120); },
    });
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

    // Dineout discount validation (only available on plain single payment).
    if (dineoutActive) {
      if (!dineoutAppId)      { toast.error("Select the dineout app"); return; }
      if (dineoutDiscAmt <= 0) { toast.error("Enter a dineout discount value"); return; }
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
      // Blank amount → settle the full amount payable (post-dineout net + tip).
      // The field holds what the customer hands over (incl. tip), so peel the
      // tip back off to get the portion applied against the bill.
      const paid = amount.trim() === "" ? amountPayable : Number(amount);
      if (Number.isNaN(paid) || paid < 0) { toast.error("Enter a valid amount"); return; }
      const amt = Math.round((paid - tipNum) * 100) / 100; // bill portion only
      // A fully-discounted (₹0) bill settles with a zero-amount payment; otherwise require a positive amount.
      if (amt < 0 || (effectiveNet > 0 && amt <= 0)) { toast.error("Enter a valid amount"); return; }
      entries = [{ payment_mode: method, amount: amt, reference_no: null }];
      // The dineout discount + any short amount are written off so the bill
      // (which still carries the full netAmount) settles in full.
      if (amt < netAmount && !/due/i.test(method)) {
        writeOff = Math.round((netAmount - amt) * 100) / 100;
      }
    }

    const customer = {
      name:    customerName.trim()    || null,
      mobile:  customerMobile.trim()  || null,
      address: customerAddress.trim() || null,
    };

    const dineout = dineoutActive ? {
      marketSegmentId: dineoutApp ? Number(dineoutApp.id) : null,
      appName:         dineoutApp?.name ?? "",
      originalAmount:  netAmount,
      discountMode:    dineoutMode,
      discountValue:   dineoutValNum,
      discountAmount:  dineoutDiscAmt,
      finalAmount:     effectiveNet,
    } : null;

    onSettle(entries, customer, writeOff, tipNum, dineout);
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
              id="settle-method-input"
              inputRef={methodRef}
              options={allMethodOptions}
              value={method}
              onSelect={setMethod}
              onSelectDone={(picked) => {
                // Route focus to the field the chosen method reveals next.
                setTimeout(() => {
                  if (picked === SPLIT_VALUE)      splitMethodRef.current?.focus();
                  else if (picked === DUE_VALUE)   duePaidRef.current?.focus();
                  else if (picked === NC_VALUE)    ncRemarkRef.current?.focus();
                  // Plain method → land on Tip first (Enter there moves to Amount).
                  else                             tipRef.current?.focus();
                }, 0);
              }}
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
                        Bill Amount
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="tabular-nums font-medium text-foreground">
                          ₹{fmtAmount(billTotals?.taxableAmount ?? netAmount)}
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
                    <span>Bill Amount</span>
                    <span className="tabular-nums font-medium text-foreground">
                      ₹{fmtAmount(billTotals?.taxableAmount ?? netAmount)}
                    </span>
                  </div>
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

                {/* Tax breakdown — expandable (after discount, per GST: tax on net) */}
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

                <div className={`flex justify-between text-sm font-semibold border-t pt-1.5 mt-0.5 ${tipNum > 0 ? "" : ""}`}>
                  <span>Net Total</span>
                  <span className="tabular-nums">₹{fmtAmount(netAmount)}</span>
                </div>
                {dineoutDiscAmt > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={DeliveryTruck01Icon} size={10} strokeWidth={2} />
                        Dineout Disc{dineoutApp ? ` (${dineoutApp.name})` : ""}
                      </span>
                      <span className="tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(dineoutDiscAmt)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-0.5">
                      <span>Payable After Discount</span>
                      <span className="tabular-nums">₹{fmtAmount(effectiveNet)}</span>
                    </div>
                  </>
                )}
                {tipNum > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={Coins01Icon} size={10} strokeWidth={2} />
                        Tip{waiterName ? ` (${waiterName})` : ""}
                      </span>
                      <span className="tabular-nums text-foreground">+₹{fmtAmount(tipNum)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-0.5">
                      <span>Amount Payable</span>
                      <span className="tabular-nums">₹{fmtAmount(amountPayable)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── Dineout-app discount (plain single payment only) ── */}
          {!isSplit && !isDue && !isNc && (
            <div className="rounded-lg border bg-muted/10 px-3 py-2.5 space-y-2.5">
              <div className="flex w-full items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={DeliveryTruck01Icon} size={14} strokeWidth={2} className="text-orange-500" />
                  Dineout Discount
                  <span className="text-muted-foreground font-normal">(Swiggy, Zomato, District…)</span>
                </span>
                <Switch
                  size="sm"
                  checked={dineoutOn}
                  onCheckedChange={(v) => setDineoutOn(v)}
                />
              </div>

              {dineoutOn && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-[1fr_auto_7rem] gap-2 items-end">
                    {/* App picker */}
                    <Field>
                      <FieldLabel className="text-[11px]">Dineout App <span className="text-destructive">*</span></FieldLabel>
                      <SearchableSelect
                        options={dineoutApps.map((a) => ({ value: String(a.id), label: a.name }))}
                        value={dineoutAppId}
                        onSelect={setDineoutAppId}
                        onSelectDone={() => setTimeout(() => { dineoutValueRef.current?.focus(); dineoutValueRef.current?.select(); }, 0)}
                        placeholder={dineoutAppsQuery.isLoading ? "Loading…" : (dineoutApps.length ? "Select app…" : "No apps — add in master")}
                      />
                    </Field>
                    {/* %/₹ mode toggle */}
                    <Field>
                      <FieldLabel className="text-[11px]">Type</FieldLabel>
                      <div className="flex rounded-md border overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setDineoutMode("PCT")}
                          className={`px-3 text-sm font-medium transition-colors ${dineoutMode === "PCT" ? "bg-orange-500 text-white" : "bg-background hover:bg-muted"}`}
                        >%</button>
                        <button
                          type="button"
                          onClick={() => setDineoutMode("AMT")}
                          className={`px-3 text-sm font-medium border-l transition-colors ${dineoutMode === "AMT" ? "bg-orange-500 text-white" : "bg-background hover:bg-muted"}`}
                        >₹</button>
                      </div>
                    </Field>
                    {/* Value */}
                    <Field>
                      <FieldLabel className="text-[11px]">{dineoutMode === "PCT" ? "Discount %" : "Discount ₹"}</FieldLabel>
                      <Input
                        ref={dineoutValueRef}
                        type="number"
                        min="0"
                        step="0.01"
                        value={dineoutValue}
                        onChange={(e) => setDineoutValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tipRef.current?.focus(); } }}
                        placeholder={dineoutMode === "PCT" ? "10" : "0.00"}
                        className="font-mono"
                      />
                    </Field>
                  </div>
                  {dineoutDiscAmt > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground">
                        Discount {dineoutMode === "PCT" ? `(${dineoutValNum}%)` : ""} → customer pays
                      </span>
                      <span className="font-semibold tabular-nums">
                        −₹{fmtAmount(dineoutDiscAmt)} · ₹{fmtAmount(effectiveNet)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tip + Amount in one row (plain single payment) ── */}
          {!isSplit && !isDue && !isNc && (
            <div className="grid grid-cols-2 gap-3 items-end">
              {/* Tip */}
              <Field>
                <FieldLabel className="flex items-center justify-between min-h-5">
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Coins01Icon} size={13} strokeWidth={2} />
                    Tip for Waiter{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </span>
                  {hasWaiter ? (
                    <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                      <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                      {waiterName}
                    </span>
                  ) : (
                    <WaiterPicker
                      waiterName={null}
                      autoOpen={waiterPickerOpen}
                      disabled={isAssigningWaiter}
                      onSelect={handleAssignWaiter}
                    />
                  )}
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                  <Input
                    ref={tipRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={tip}
                    onChange={(e) => handleTipChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); amountRef.current?.focus(); } }}
                    placeholder="0.00"
                    className="pl-6 font-mono"
                  />
                </div>
              </Field>
              {/* Amount */}
              <Field>
                <FieldLabel className="flex items-center min-h-5">
                  Enter Amount{" "}
                  <span className="text-muted-foreground font-normal text-xs ml-1">
                    (blank = {tipNum > 0 ? "bill + tip" : "full bill"})
                  </span>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.getElementById("settle-dialog-settle-btn")?.focus();
                      }
                    }}
                    placeholder={fmtAmount(amountPayable)}
                    className="pl-6 font-mono"
                  />
                </div>
              </Field>
            </div>
          )}

          {/* Shortfall / change hint + tip-attribution note (plain payment) */}
          {!isSplit && !isDue && !isNc && (
            <>
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
              {!hasWaiter && tipNum > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Optionally assign a waiter to attribute this tip.
                </p>
              )}
            </>
          )}

          {/* ── Tip for the waiter (Due / Split paths keep a standalone field) ── */}
          {(isDue || isSplit) && (
            <Field>
              <FieldLabel className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Coins01Icon} size={13} strokeWidth={2} />
                  Tip for Waiter{" "}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </span>
                {hasWaiter ? (
                  <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                    {waiterName}
                  </span>
                ) : (
                  <WaiterPicker
                    waiterName={null}
                    autoOpen={waiterPickerOpen}
                    disabled={isAssigningWaiter}
                    onSelect={handleAssignWaiter}
                  />
                )}
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                <Input
                  ref={tipRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={tip}
                  onChange={(e) => handleTipChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (isDue)        duePaidRef.current?.focus();
                      else if (isSplit) document.getElementById("split-method-input")?.focus();
                    }
                  }}
                  placeholder="0.00"
                  className="pl-6 font-mono"
                />
              </div>
              {!hasWaiter && tipNum > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Optionally assign a waiter to attribute this tip.
                </p>
              )}
            </Field>
          )}

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
                  ref={duePaidRef}
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
                  ref={ncRemarkRef}
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

          {/* ── Split builder ── */}
          {isSplit && (
            <div className="space-y-2.5">
              {/* Add row */}
              <div className="flex gap-2">
                <SearchableSelect
                  id="split-method-input"
                  inputRef={splitMethodRef}
                  options={splitMethodOptions}
                  value={splitMethod}
                  onSelect={setSplitMethod}
                  onSelectDone={() => document.getElementById("split-amount-input")?.focus()}
                  markDropdown
                  onArrowNav={(e) => {
                    if (e.key === "ArrowRight") { e.preventDefault(); document.getElementById("split-amount-input")?.focus(); }
                    else if (e.key === "ArrowLeft") { e.preventDefault(); document.getElementById("settle-dialog-close-btn")?.focus(); }
                  }}
                  placeholder="Method…"
                  className="w-36 shrink-0"
                />
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">₹</span>
                  <Input
                    id="split-amount-input"
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
                <Button
                  id="split-add-btn"
                  type="button"
                  size="sm"
                  className="h-9 px-3 gap-1"
                  onClick={addSplit}
                  disabled={!splitAmount || Number(splitAmount) <= 0}
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
                  Add
                </Button>
              </div>

              {/* Entries */}
              {splitEntries.length > 0 ? (
                <>
                  <div className="border rounded-lg divide-y overflow-hidden">
                    {splitEntries.map((entry, i) => (
                      <div
                        key={i}
                        id={`split-entry-${i}`}
                        tabIndex={0}
                        onKeyDown={(e) => onEntryRowKey(e, i)}
                        className="flex items-center gap-3 px-3 py-2 bg-muted/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <HugeiconsIcon icon={CashIcon} size={13} strokeWidth={2} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 text-xs font-semibold">{entry.payment_mode}</span>
                        <span className="text-sm font-bold tabular-nums">₹{fmtAmount(entry.amount)}</span>
                        <button type="button" onClick={() => removeSplit(i)} className="text-muted-foreground/40 hover:text-destructive transition-colors" tabIndex={-1}>
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
          <Button id="settle-dialog-close-btn" type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close <span className="ml-1 text-[9px] font-mono opacity-60">Esc</span>
          </Button>
          <Button
            id="settle-dialog-settle-btn"
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
