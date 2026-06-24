import { useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// SearchableSelect — type-to-search dropdown with full keyboard
// support (ArrowUp/ArrowDown to move, Enter to pick, Esc to close).
//
// Props:
//   options     [{ value, label }]  — value is compared with ===
//   value       currently selected value (string)
//   onSelect    (value) => void     — receives "" when cleared
//   placeholder string
//   className   extra classes on the wrapper
//   disabled    boolean
// ─────────────────────────────────────────────────────────────

export function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder = "Select…",
  className = "",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const displayText = open ? query : (selected?.label ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => { setActive(0); }, [filtered.length]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Move focus to the next focusable control (mimics tab) after picking.
  function focusNext() {
    const input = inputRef.current;
    if (!input) return;
    const all = Array.from(
      document.querySelectorAll(
        'input:not([disabled]):not([readonly]),textarea:not([disabled]):not([readonly]),button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.closest("[data-radix-popper-content-wrapper]"));
    const idx = all.indexOf(input);
    if (idx !== -1 && all[idx + 1]) all[idx + 1].focus();
  }

  function pick(opt) {
    onSelect(opt.value);
    setOpen(false);
    setQuery("");
    setTimeout(focusNext, 0);
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setQuery("");
        setOpen(true);
        setActive(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "Backspace" && query === "" && value) {
      // Clear current selection with backspace on an empty query.
      onSelect("");
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={displayText}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (!disabled) { setQuery(""); setOpen(true); setActive(0); } }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                  "cursor-pointer px-3 py-2 text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                ].join(" ")}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
