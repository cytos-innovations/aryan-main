import { toast } from "sonner";

const FOCUSABLE = 'input:not([type="hidden"]):not([readonly]):not([disabled])';

export function useEnterNav() {
  function onKeyDown(e) {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (target.tagName === "TEXTAREA") return;
    if (target.tagName !== "INPUT") return;

    e.preventDefault();

    if (target.required && !target.value.trim()) {
      const label =
        target.closest("[data-slot='field']")?.querySelector("[data-slot='field-label']")?.textContent?.replace(/\s*\*\s*$/, "").trim() ||
        target.getAttribute("placeholder") ||
        "This field";
      toast.error(`${label} cannot be left empty`);
      return;
    }

    const form = target.form;
    if (!form) return;

    const inputs = Array.from(form.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.closest("[data-enter-skip]") && getComputedStyle(el).display !== "none"
    );

    const idx = inputs.indexOf(target);
    if (idx === -1) return;

    if (idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    } else {
      form.requestSubmit();
    }
  }

  return onKeyDown;
}
