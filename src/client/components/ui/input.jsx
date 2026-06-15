import * as React from "react"

import { cn } from "@/lib/utils"

const INPUT_CLASS =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

// Decide whether a field should accept decimals. Anything with a fractional step
// (e.g. step="0.01") allows a decimal point; integer steppers (qty, counts) don't.
function allowsDecimal({ step }) {
  if (step == null || step === "any") return true;
  const s = String(step);
  return s.includes(".") || Number(s) % 1 !== 0;
}

// Strip everything except digits (and one optional decimal point / leading minus).
function sanitizeNumeric(raw, { decimal, allowNegative }) {
  let v = raw.replace(decimal ? /[^0-9.\-]/g : /[^0-9\-]/g, "");
  // Keep a leading minus only (and only when negatives are allowed).
  if (allowNegative) {
    const neg = v.startsWith("-");
    v = (neg ? "-" : "") + v.replace(/-/g, "");
  } else {
    v = v.replace(/-/g, "");
  }
  if (decimal) {
    // Collapse to a single decimal point.
    const firstDot = v.indexOf(".");
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return v;
}

function Input({
  className,
  type,
  ref,
  onChange,
  min,
  max,
  step,
  ...props
}) {
  // Render numeric fields as text + soft numeric keypad, so the browser's spinner
  // arrows never appear, while still restricting input to valid numbers.
  if (type === "number") {
    const decimal       = allowsDecimal({ step });
    const allowNegative = min != null && Number(min) < 0;

    function handleNumericChange(e) {
      const cleaned = sanitizeNumeric(e.target.value, { decimal, allowNegative });
      if (cleaned !== e.target.value) e.target.value = cleaned;
      onChange?.(e);
    }

    function clampOnBlur(e) {
      const n = parseFloat(e.target.value);
      if (Number.isNaN(n)) { props.onBlur?.(e); return; }
      let clamped = n;
      if (min != null && clamped < Number(min)) clamped = Number(min);
      if (max != null && clamped > Number(max)) clamped = Number(max);
      if (clamped !== n) {
        e.target.value = String(clamped);
        onChange?.(e);
      }
      props.onBlur?.(e);
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        data-slot="input"
        className={cn(INPUT_CLASS, className)}
        onChange={handleNumericChange}
        {...props}
        onBlur={clampOnBlur}
      />
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(INPUT_CLASS, className)}
      onChange={onChange}
      {...props} />
  );
}

export { Input }
