import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Capitalizes the first letter of each word, leaving the rest untouched.
// Used to tidy master "name" fields on blur (e.g. "gold member plan" -> "Gold Member Plan").
export function toTitleCase(value) {
  if (!value) return value;
  return value.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}
