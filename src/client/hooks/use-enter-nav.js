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
  const seenDateInputs = new Set();
  return Array.from(form.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest("[data-enter-skip]") || getComputedStyle(el).display === "none") return false;
    // A segmented date input (DD/MM/YYYY) is a single navigation stop: keep
    // only its first segment so Enter/arrows jump over the whole date at once.
    const dateInput = el.closest("[data-date-input]");
    if (dateInput) {
      if (seenDateInputs.has(dateInput)) return false;
      seenDateInputs.add(dateInput);
    }
    return true;
  });
}

// Maps any element to the representative the field list knows about. For a
// date segment that is not the first one, that representative is the first
// segment of the same date input.
function navRepresentative(el) {
  const dateInput = el.closest?.("[data-date-input]");
  if (dateInput) return dateInput.querySelector(FOCUSABLE_SELECTOR) || el;
  return el;
}

function focusNext(form, current) {
  const all = getFocusableFields(form);
  const idx = all.indexOf(navRepresentative(current));
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

function focusPrev(form, current) {
  const all = getFocusableFields(form);
  const idx = all.indexOf(navRepresentative(current));
  if (idx === -1) return false;

  for (let i = idx - 1; i >= 0; i--) {
    const prev = all[i];
    if (prev.tagName === "INPUT" && prev.readOnly) continue;
    prev.focus();
    return true;
  }
  return false; // was first
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

// Inputs whose own Up/Down/Left/Right behavior we must NOT hijack:
// - time/date pickers have internal segments + value steppers
// - number inputs step the value with Up/Down
const ARROW_NATIVE_INPUT_TYPES = new Set(["time", "date", "datetime-local", "month", "week", "number"]);

// True when the text caret sits at the very start of the input (no selection).
function caretAtStart(el) {
  return el.selectionStart === 0 && el.selectionEnd === 0;
}

// True when the text caret sits at the very end of the input (no selection).
function caretAtEnd(el) {
  const len = el.value.length;
  return el.selectionStart === len && el.selectionEnd === len;
}

export function useEnterNav(options = {}) {
  const { arrows = false } = options;

  // Attached to <form onKeyDown={enterNav}> — handles Enter on INPUT fields,
  // and (when `arrows` is enabled) Up/Down/Left/Right field navigation.
  function onKeyDown(e) {
    if (arrows && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      handleArrow(e);
      return;
    }

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

  // Arrow-key navigation between fields. Edge-aware for Left/Right so it does
  // not interfere with moving the text caret while editing.
  function handleArrow(e) {
    const target = e.target;
    if (target.tagName !== "INPUT") return; // only from plain inputs

    const type = (target.getAttribute("type") || "text").toLowerCase();
    if (ARROW_NATIVE_INPUT_TYPES.has(type)) return; // time/date/number keep native arrows
    if (target.closest("[data-date-input]")) return; // custom date segments keep native arrows

    const form = target.form;
    if (!form) return;

    // Up/Down have no useful caret action in a single-line input, so we always
    // swallow them — on the first/last field they simply do nothing (no escape).
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusNext(form, target);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusPrev(form, target);
    } else if (e.key === "ArrowRight") {
      // Only jump fields when caret is at the end (otherwise move the cursor).
      // Swallow the key whenever we attempt a jump so it can't bubble/escape,
      // even if there is no next field.
      if (caretAtEnd(target)) {
        e.preventDefault();
        focusNext(form, target);
      }
    } else if (e.key === "ArrowLeft") {
      if (caretAtStart(target)) {
        e.preventDefault();
        focusPrev(form, target);
      }
    }
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
