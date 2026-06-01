import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Comment01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useSearchKotMessages } from "../hooks/use-billing-queries";

// Per-item KOT message picker — searches kot_message master by text/code.
export default function KotMessagePicker({ value, disabled, onSelect }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  const searchQuery = useSearchKotMessages(query, open);
  const results     = searchQuery.data ?? [];

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => searchRef.current?.focus(), 80); }
  }, [open]);

  function pick(msg) {
    onSelect(msg);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          title={value || "Add KOT message"}
          className={[
            "h-5 w-5 shrink-0 rounded flex items-center justify-center transition-colors",
            value
              ? "text-primary bg-primary/10"
              : "text-muted-foreground/50 hover:text-foreground hover:bg-muted",
            disabled ? "pointer-events-none opacity-0" : "",
          ].join(" ")}
        >
          <HugeiconsIcon icon={Comment01Icon} size={11} strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <div className="p-2 border-b">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search message or code…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[11px] text-destructive hover:bg-destructive/5 border-b transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
              Clear message
            </button>
          )}
          {searchQuery.isLoading ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-5 text-center text-[11px] text-muted-foreground">No messages found</p>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m.message)}
                className={[
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors border-b last:border-b-0",
                  value === m.message ? "bg-primary/10 text-primary" : "hover:bg-muted",
                ].join(" ")}
              >
                <span className="text-xs font-medium truncate">{m.message}</span>
                {m.code != null && <span className="text-[10px] text-muted-foreground shrink-0">#{m.code}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
