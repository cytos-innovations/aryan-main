const PREFIX = "pos-hold:";

export function holdKey(tableId) {
  return `${PREFIX}${tableId}`;
}

export function saveHold(tableId, draft) {
  if (!tableId) return;
  try {
    localStorage.setItem(holdKey(tableId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function loadHold(tableId) {
  if (!tableId) return null;
  try {
    const raw = localStorage.getItem(holdKey(tableId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearHold(tableId) {
  if (!tableId) return;
  try { localStorage.removeItem(holdKey(tableId)); } catch { /* ignore */ }
}

/** Returns all tableIds that currently have a hold saved */
export function getHeldTableIds() {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => Number(k.slice(PREFIX.length)))
      .filter(Boolean);
  } catch { return []; }
}
