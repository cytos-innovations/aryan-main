import { toast } from "sonner";

const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([readonly]):not([disabled]), button[data-slot="select-trigger"]:not([disabled])';

function getLabel(el) {
  return (
    el.closest("[data-slot='field']")
      ?.querySelector("[data-slot='field-label']")
      ?.textContent?.replace(/\s*\*\s*$/, "")
      .trim() ||
    el.getAttribute("placeholder") ||
    "This field"
  );
}

function isSelectTrigger(el) {
  return el.tagName === "BUTTON" && el.dataset.slot === "select-trigger";
}

function isSelectEmpty(el) {
  return (
    el.hasAttribute("data-placeholder") ||
    !!el.querySelector("[data-slot='select-value'][data-placeholder]") ||
    el.querySelector("[data-slot='select-value']")?.hasAttribute("data-placeholder")
  );
}

function getFocusableFields(form) {
  return Array.from(form.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest("[data-enter-skip]") && getComputedStyle(el).display !== "none"
  );
}

function focusNext(form, current) {
  const all = getFocusableFields(form);
  const idx = all.indexOf(current);
  if (idx === -1) return false;

  for (let i = idx + 1; i < all.length; i++) {
    const next = all[i];
    // skip readonly inputs
    if (next.tagName === "INPUT" && next.readOnly) continue;
    next.focus();
    return true;
  }
  return false; // was last
}

function validateAndSubmit(form) {
  const all = getFocusableFields(form);
  for (const el of all) {
    if (isSelectTrigger(el) && el.dataset.required === "true" && isSelectEmpty(el)) {
      toast.error(`${getLabel(el)} cannot be left empty`);
      el.focus();
      return;
    }
    if (el.tagName === "INPUT" && el.required && !el.value.trim()) {
      toast.error(`${getLabel(el)} cannot be left empty`);
      el.focus();
      return;
    }
  }
  form.requestSubmit();
}

export function useEnterNav() {
  // Attached to <form onKeyDown={enterNav}> — handles Enter on INPUT fields
  function onKeyDown(e) {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (target.tagName === "TEXTAREA") return;
    if (target.tagName !== "INPUT") return;

    e.preventDefault();

    if (target.required && !target.value.trim()) {
      toast.error(`${getLabel(target)} cannot be left empty`);
      return;
    }

    const form = target.form;
    if (!form) return;

    const moved = focusNext(form, target);
    if (!moved) validateAndSubmit(form);
  }

  // Attached to each <SelectTrigger onKeyDown={enterNav.select}> — handles Enter on selects
  function onSelectKeyDown(e) {
    if (e.key !== "Enter") return;
    const target = e.currentTarget;
    if (!isSelectTrigger(target)) return;

    // If dropdown is open, let Radix confirm the selection naturally
    if (target.getAttribute("data-state") === "open") return;

    if (target.dataset.required === "true" && isSelectEmpty(target)) {
      e.preventDefault();
      toast.error(`${getLabel(target)} cannot be left empty`);
      return;
    }

    const form = target.closest("form");
    if (!form) return;

    const moved = focusNext(form, target);
    if (!moved) {
      e.preventDefault();
      validateAndSubmit(form);
    } else {
      e.preventDefault();
    }
  }

  // Keep backward compat: enterNav still works as onKeyDown={enterNav}
  onKeyDown.select = onSelectKeyDown;
  return onKeyDown;
}
