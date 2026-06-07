// Formats a yyyy-MM-dd string or Date object as dd/mm/yyyy
export function fmtDate(value) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Formats a datetime string or Date object as dd/mm/yyyy HH:MM
export function fmtDatetime(value) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
