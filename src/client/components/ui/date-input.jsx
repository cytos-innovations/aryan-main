import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Parses "yyyy-MM-dd" → { dd, mm, yyyy }
function fromISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { dd: "", mm: "", yyyy: "" };
  const [y, m, d] = iso.split("-");
  return { dd: d, mm: m, yyyy: y };
}

// Builds "yyyy-MM-dd" from parts (empty string if incomplete)
function toISO(dd, mm, yyyy) {
  if (dd.length === 2 && mm.length === 2 && yyyy.length === 4) return `${yyyy}-${mm}-${dd}`;
  return "";
}

export function DateInput({ value, onChange, className, disabled }) {
  const [{ dd, mm, yyyy }, setParts] = useState(() => fromISO(value));
  const [open, setOpen] = useState(false);
  const mmRef   = useRef(null);
  const yyyyRef = useRef(null);

  // Sync inward when value changes externally
  useEffect(() => {
    setParts(fromISO(value));
  }, [value]);

  function emit(updated) {
    const iso = toISO(updated.dd, updated.mm, updated.yyyy);
    if (iso) onChange?.({ target: { value: iso } });
  }

  function handleDD(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    const updated = { dd: v, mm, yyyy };
    setParts(updated);
    emit(updated);
    if (v.length === 2) mmRef.current?.focus();
  }

  function handleMM(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    const updated = { dd, mm: v, yyyy };
    setParts(updated);
    emit(updated);
    if (v.length === 2) yyyyRef.current?.focus();
  }

  function handleYYYY(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    const updated = { dd, mm, yyyy: v };
    setParts(updated);
    emit(updated);
  }

  function handleKeyDown(e, field) {
    if (e.key === "Backspace") {
      const cur = { dd, mm, yyyy }[field];
      if (cur === "") {
        if (field === "mm") {
          e.preventDefault();
          e.currentTarget.closest("[data-date-input]")?.querySelector("[data-field='dd']")?.focus();
        } else if (field === "yyyy") {
          e.preventDefault();
          mmRef.current?.focus();
        }
      }
    }
  }

  // Calendar selection → emit ISO and close
  function handleDaySelect(date) {
    if (!date) return;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = String(date.getFullYear());
    setParts({ dd: d, mm: m, yyyy: y });
    onChange?.({ target: { value: `${y}-${m}-${d}` } });
    setOpen(false);
  }

  // Convert current value to Date object for Calendar's selected prop
  const selectedDate = (() => {
    const iso = toISO(dd, mm, yyyy);
    if (!iso) return undefined;
    const d = new Date(iso);
    return isNaN(d) ? undefined : d;
  })();

  const segCls = "w-7 text-center bg-transparent outline-none border-0 p-0 text-sm tabular-nums caret-transparent selection:bg-primary/30 disabled:pointer-events-none disabled:opacity-50";
  const sepCls = "text-muted-foreground select-none text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        data-date-input
        className={cn(
          "h-9 flex items-center gap-0.5 rounded-md border border-input bg-transparent px-2.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          data-field="dd"
          type="text"
          inputMode="numeric"
          placeholder="DD"
          maxLength={2}
          value={dd}
          disabled={disabled}
          onChange={handleDD}
          onKeyDown={(e) => handleKeyDown(e, "dd")}
          className={segCls}
        />
        <span className={sepCls}>/</span>
        <input
          ref={mmRef}
          data-field="mm"
          type="text"
          inputMode="numeric"
          placeholder="MM"
          maxLength={2}
          value={mm}
          disabled={disabled}
          onChange={handleMM}
          onKeyDown={(e) => handleKeyDown(e, "mm")}
          className={segCls}
        />
        <span className={sepCls}>/</span>
        <input
          ref={yyyyRef}
          data-field="yyyy"
          type="text"
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          value={yyyy}
          disabled={disabled}
          onChange={handleYYYY}
          onKeyDown={(e) => handleKeyDown(e, "yyyy")}
          className={cn(segCls, "w-11")}
        />

        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            tabIndex={-1}
            className="ml-auto flex items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={2} />
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={2100}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
