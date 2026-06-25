import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAccountIcon,
  UserGroupIcon,
  Search01Icon,
  Tick02Icon,
  Mail01Icon,
  Location01Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input }     from "@/components/ui/input";
import { Button }    from "@/components/ui/button";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import {
  useSearchCustomers,
  useQuickCreateCustomer,
  useEmployeesForBilling,
} from "../hooks/use-billing-queries";

// ─── Trigger pill (shared look) ───────────────────────────────

function PartyPill({ icon, label, value, sub, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "flex items-center gap-1.5 px-2 rounded-md border text-xs transition-colors max-w-36",
        value ? "py-0.5 h-auto" : "h-7",
        value
          ? "border-primary/30 bg-primary/5 text-foreground"
          : "border-dashed border-border text-muted-foreground hover:bg-muted",
        disabled ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
    >
      <HugeiconsIcon icon={icon} size={13} strokeWidth={2} className="shrink-0" />
      {value ? (
        <div className="flex flex-col items-start min-w-0">
          <span className="truncate font-medium leading-tight">{value}</span>
          {sub && <span className="truncate text-[10px] text-muted-foreground leading-tight">{sub}</span>}
        </div>
      ) : (
        <span className="truncate font-medium">{label}</span>
      )}
    </button>
  );
}

// ─── Customer picker ──────────────────────────────────────────

const EMPTY_FORM = { name: "", mobile: "", email: "", address: "" };

export function CustomerPicker({ customerId, customerName, customerMobile, disabled, onSelect }) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [selId,   setSelId]   = useState(null);
  const [cursor,  setCursor]  = useState(-1);
  const searchRef  = useRef(null);
  const itemRefs   = useRef([]);
  const nameRef    = useRef(null);
  const mobileRef  = useRef(null);
  const emailRef   = useRef(null);
  const addressRef = useRef(null);
  const okRef      = useRef(null);

  // Field order for Enter / arrow-key navigation (search → fields → OK)
  const fieldRefs = [nameRef, mobileRef, emailRef, addressRef, okRef];

  function focusFieldAt(idx) {
    const clamped = Math.max(0, Math.min(idx, fieldRefs.length - 1));
    fieldRefs[clamped].current?.focus();
  }

  const searchQuery = useSearchCustomers(query, open && query.trim().length > 0);
  const createMut   = useQuickCreateCustomer();
  const results     = searchQuery.data ?? [];

  // On open: pre-fill with the already-selected customer (or empty for new)
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(-1);
      if (customerName) {
        setForm({ name: customerName ?? "", mobile: customerMobile ?? "", email: "", address: "" });
        setSelId(customerId ?? null);
      } else {
        setForm(EMPTY_FORM);
        setSelId(null);
      }
      setTimeout(() => searchRef.current?.focus(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset cursor when results change
  useEffect(() => { setCursor(-1); }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (cursor >= 0 && itemRefs.current[cursor]) {
      itemRefs.current[cursor].scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  function handleSearchKeyDown(e) {
    if (results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        return;
      }
      if (e.key === "Enter" && cursor >= 0 && results[cursor]) {
        e.preventDefault();
        pickResult(results[cursor]);
        return;
      }
    }
    // No result highlighted → Enter / ArrowDown moves into the form (new customer)
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusFieldAt(0);
    }
  }

  // Enter advances to the next field; arrow keys move up/down the form.
  function handleFieldKeyDown(e, idx) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === fieldRefs.length - 1) handleOk();
      else focusFieldAt(idx + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusFieldAt(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx === 0) searchRef.current?.focus();
      else focusFieldAt(idx - 1);
    }
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    // Editing the name/mobile after picking → treat as a fresh (new) entry
    if ((k === "name" || k === "mobile") && selId) setSelId(null);
  }

  // Pick an existing customer from results → auto-fill all fields,
  // then jump straight to OK so the user can confirm with Enter.
  function pickResult(c) {
    setSelId(c.id);
    setForm({
      name:    c.name    ?? "",
      mobile:  c.mobile  ?? "",
      email:   c.email   ?? "",
      address: c.address ?? "",
    });
    setQuery("");
    setTimeout(() => okRef.current?.focus(), 0);
  }

  function done(c) {
    onSelect({ id: c.id, name: c.name, mobile: c.mobile });
    setOpen(false);
  }

  function handleOk() {
    if (!form.name.trim()) { searchRef.current?.focus(); return; }
    if (selId) {
      // Link the already-existing customer (snapshot uses current field values)
      done({ id: selId, name: form.name.trim(), mobile: form.mobile.trim() || null });
    } else {
      // Create a new customer in the master, then link it
      createMut.mutate(
        {
          name:    form.name.trim(),
          mobile:  form.mobile.trim()  || null,
          email:   form.email.trim()   || null,
          address: form.address.trim() || null,
        },
        { onSuccess: (c) => done(c) },
      );
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <span>
          <PartyPill icon={UserAccountIcon} label="Customer" value={customerName ?? ""} sub={customerMobile ?? ""} disabled={disabled} />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name, mobile or code…"
              className="h-8 pl-7 text-xs"
            />
          </div>

          {/* Live results */}
          {query.trim().length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover">
              {searchQuery.isLoading ? (
                <div className="p-2 space-y-1.5">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}
                </div>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                  No match — fill the form below to add new
                </p>
              ) : (
                results.map((c, idx) => (
                  <button
                    key={c.id}
                    ref={(el) => (itemRefs.current[idx] = el)}
                    type="button"
                    onClick={() => pickResult(c)}
                    className={[
                      "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors border-b last:border-b-0",
                      idx === cursor ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.name ?? "—"}</p>
                      {(c.mobile || c.code) && (
                        <p className="text-[10px] text-muted-foreground">
                          {c.mobile ?? ""}{c.mobile && c.code ? " · " : ""}{c.code ? `#${c.code}` : ""}
                        </p>
                      )}
                    </div>
                    {selId === c.id && (
                      <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2} className="text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detail form (auto-filled on select, editable for new) */}
        <div className="p-3 space-y-2">
          <FieldWithIcon icon={UserAccountIcon} placeholder="Customer name" value={form.name} onChange={(v) => setField("name", v)} inputRef={nameRef} onKeyDown={(e) => handleFieldKeyDown(e, 0)} />
          <FieldWithIcon icon={SmartPhone01Icon} placeholder="Mobile no" value={form.mobile} onChange={(v) => setField("mobile", v)} maxLength={15} inputRef={mobileRef} onKeyDown={(e) => handleFieldKeyDown(e, 1)} />
          <FieldWithIcon icon={Mail01Icon} placeholder="Email (optional)" value={form.email} onChange={(v) => setField("email", v)} inputRef={emailRef} onKeyDown={(e) => handleFieldKeyDown(e, 2)} />
          <FieldWithIcon icon={Location01Icon} placeholder="Address (optional)" value={form.address} onChange={(v) => setField("address", v)} inputRef={addressRef} onKeyDown={(e) => handleFieldKeyDown(e, 3)} />

          {selId && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} />
              Existing customer selected
            </p>
          )}

          <Separator />
          <Button
            ref={okRef}
            type="button"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleOk}
            onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); focusFieldAt(3); } }}
            disabled={!form.name.trim() || createMut.isPending}
          >
            {createMut.isPending ? "Saving…" : "OK"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FieldWithIcon({ icon, placeholder, value, onChange, maxLength, inputRef, onKeyDown }) {
  return (
    <div className="relative">
      <HugeiconsIcon icon={icon} size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-8 pl-7 text-xs"
      />
      {/* `inputRef` is forwarded to the native input via React 19 ref-as-prop */}
    </div>
  );
}

// ─── Waiter picker ────────────────────────────────────────────

export function WaiterPicker({ waiterName, disabled, onSelect, autoOpen = false }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [cursor, setCursor] = useState(-1);
  const searchRef = useRef(null);
  const itemRefs  = useRef([]);

  // Pop open on mount when requested (used by the settle-dialog tip gate).
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);

  const empQuery  = useEmployeesForBilling();
  const employees = empQuery.data ?? [];

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => q
    ? employees.filter((e) =>
        (e.name ?? "").toLowerCase().includes(q) ||
        String(e.code ?? "").includes(q),
      )
    : employees,
  [employees, q]);

  useEffect(() => {
    if (open) { setCursor(-1); setTimeout(() => searchRef.current?.focus(), 80); }
    else setQuery("");
  }, [open]);

  useEffect(() => { setCursor(-1); }, [filtered]);

  useEffect(() => {
    if (cursor >= 0 && itemRefs.current[cursor]) {
      itemRefs.current[cursor].scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  function handleSearchKeyDown(e) {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0 && filtered[cursor]) {
      e.preventDefault();
      pick(filtered[cursor]);
    }
  }

  function pick(w) {
    onSelect({ id: w.id, name: w.name });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <span>
          <PartyPill icon={UserGroupIcon} label="Waiter" value={waiterName ?? ""} disabled={disabled} />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <div className="p-2 border-b">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name or code…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {empQuery.isLoading ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No waiters found</p>
          ) : (
            filtered.map((w, idx) => (
              <button
                key={w.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                type="button"
                onClick={() => pick(w)}
                className={[
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors border-b last:border-b-0",
                  idx === cursor ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium truncate block">{w.name}</span>
                  {w.code != null && <span className="text-[10px] text-muted-foreground">#{w.code}</span>}
                </div>
                {waiterName === w.name && (
                  <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2} className="text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
