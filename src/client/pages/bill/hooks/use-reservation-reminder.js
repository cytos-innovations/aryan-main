import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFloorView } from "./use-billing-queries";

const STORAGE_KEY  = "billing-reminder-cfg";
// v3 key — invalidates stale data from all previous buggy versions
const REMINDED_KEY = "billing-reminder-v3";
const DEFAULTS     = { enabled: true, minutesBefore: 30 };

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Each fired entry is keyed as "reservationId_HH_MM" so the same reservation
// at a different time slot on the same day is treated as a separate event.
function firedKey(id, h, m) {
  return `${id}_${h}_${m}`;
}

function loadFiredSet() {
  try {
    const raw = localStorage.getItem(REMINDED_KEY);
    if (raw) {
      const { date, keys } = JSON.parse(raw);
      if (date === getLocalDateStr() && Array.isArray(keys)) return new Set(keys);
    }
  } catch { /* corrupt — treat as empty */ }
  return new Set();
}

function markFired(id, h, m) {
  try {
    const set = loadFiredSet();
    set.add(firedKey(id, h, m));
    localStorage.setItem(REMINDED_KEY, JSON.stringify({
      date: getLocalDateStr(),
      keys: [...set],
    }));
  } catch { /* storage unavailable */ }
}

export function getReminderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* corrupt — use defaults */ }
  return { ...DEFAULTS };
}

export function saveReminderSettings(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...cfg }));
}

/**
 * Loud restaurant bell chime — 4-note ascending arpeggio (C5→E5→G5→C6)
 * played twice for strong impact.
 *
 * Signal chain: oscillators → per-note gain → master gain (1.8×)
 *               → DynamicsCompressor (prevents clipping) → destination
 *
 * Three layers per note:
 *   1. Sine at fundamental        — warm body
 *   2. Sine at ×2.756 fundamental — inharmonic bell shimmer (metallic ring)
 *   3. Triangle at ×1.5           — mid harmonic (adds punch and brightness)
 */
export function playReminderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value       = 3;
    comp.ratio.value      = 4;
    comp.attack.value     = 0.001;
    comp.release.value    = 0.15;
    comp.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 1.8;
    master.connect(comp);

    const notes = [
      { freq: 523.25, start: 0.00, vol: 0.85 },
      { freq: 659.25, start: 0.20, vol: 0.80 },
      { freq: 783.99, start: 0.40, vol: 0.75 },
      { freq: 1046.5, start: 0.60, vol: 0.70 },
      { freq: 659.25, start: 1.05, vol: 0.75 },
      { freq: 1046.5, start: 1.25, vol: 0.70 },
    ];

    for (const { freq, start, vol } of notes) {
      const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
      o1.connect(g1); g1.connect(master);
      o1.type = "sine"; o1.frequency.value = freq;
      g1.gain.setValueAtTime(0, ctx.currentTime + start);
      g1.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.008);
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 2.0);
      o1.start(ctx.currentTime + start); o1.stop(ctx.currentTime + start + 2.0);

      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(master);
      o2.type = "sine"; o2.frequency.value = freq * 2.756;
      g2.gain.setValueAtTime(0, ctx.currentTime + start);
      g2.gain.linearRampToValueAtTime(vol * 0.45, ctx.currentTime + start + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.9);
      o2.start(ctx.currentTime + start); o2.stop(ctx.currentTime + start + 0.9);

      const o3 = ctx.createOscillator(); const g3 = ctx.createGain();
      o3.connect(g3); g3.connect(master);
      o3.type = "triangle"; o3.frequency.value = freq * 1.5;
      g3.gain.setValueAtTime(0, ctx.currentTime + start);
      g3.gain.linearRampToValueAtTime(vol * 0.30, ctx.currentTime + start + 0.008);
      g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.5);
      o3.start(ctx.currentTime + start); o3.stop(ctx.currentTime + start + 0.5);
    }

    setTimeout(() => ctx.close().catch(() => {}), 3500);
  } catch { /* AudioContext unavailable */ }
}

export function useReservationReminder() {
  const { data: floorData } = useFloorView();

  // Always keep the latest floor data accessible inside the interval
  const floorDataRef = useRef(floorData);
  useEffect(() => { floorDataRef.current = floorData; }, [floorData]);

  // 3-second tick — pure clock-based, no dependency on React Query polling
  useEffect(() => {
    const id = setInterval(() => {
      const data = floorDataRef.current;
      const cfg  = getReminderSettings();
      if (!cfg.enabled) return;
      if (!Array.isArray(data) || data.length === 0) return;

      const now      = Date.now();
      const winStart = cfg.minutesBefore;
      const fired    = loadFiredSet();

      for (const t of data) {
        if (!t.reservation_id)                   continue;
        if (t.reservation_status !== "RESERVED") continue;
        if (!t.reservation_time)                 continue;

        const [h, m] = t.reservation_time.split(":").map(Number);
        if (isNaN(h) || isNaN(m))               continue;

        // Skip only if THIS specific reservation at THIS specific time was already notified
        if (fired.has(firedKey(t.reservation_id, h, m))) continue;

        const resDate = new Date(now);
        resDate.setHours(h, m, 0, 0);
        const minsUntil = (resDate.getTime() - now) / 60_000;

        // Fire once the countdown enters the window. Lower bound -5 catches
        // the case where the app opens when the reservation is imminent.
        if (minsUntil <= winStart && minsUntil > -5) {
          markFired(t.reservation_id, h, m);
          playReminderChime();
          const label = Math.max(1, Math.round(minsUntil));
          toast.info(
            `🔔 Reservation in ~${label} min — ${t.reservation_customer ?? "Guest"} · Table ${t.table_name}`,
            { duration: 10_000 },
          );
        }
      }
    }, 3_000);

    return () => clearInterval(id);
  }, []);
}
