// server/src/lib/slots.js

// 30-minute slots, daily window 09:00–18:00 (end exclusive)
const SLOT_MINUTES = 30;
const WINDOW = { startHour: 9, endHour: 18 };

// Returns a new Date at local midnight for the given date 
function startOfDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
}

// Build Date objects for the given day using local time
function makeDayWindow(date) {
  const day0 = startOfDay(date);
  const windowStart = new Date(day0);
  windowStart.setHours(WINDOW.startHour, 0, 0, 0);

  const windowEnd = new Date(day0);
  windowEnd.setHours(WINDOW.endHour, 0, 0, 0); 

  return { windowStart, windowEnd };
}

 // Generate slot objects for a given day.

function generateSlots(date, durationMin = SLOT_MINUTES) {
  const { windowStart, windowEnd } = makeDayWindow(date);
  const stepMs = SLOT_MINUTES * 60 * 1000;
  const durMs = durationMin * 60 * 1000;

  const out = [];
  for (let t = windowStart.getTime(); t + durMs <= windowEnd.getTime(); t += stepMs) {
    const startAt = new Date(t);
    const endAt = new Date(t + durMs);
    out.push({ startAt, endAt, durationMin });
  }
  return out;
}

//  overlap check 
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Ensure a given startAt/duration sits fully inside the day window; returns null if not 
function clampToWindow(startAt, durationMin = SLOT_MINUTES) {
  const { windowStart, windowEnd } = makeDayWindow(startAt);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
  if (startAt < windowStart || endAt > windowEnd) return null;
  return { startAt, endAt, durationMin };
}

// format to ISO without milliseconds
function toIsoNoMs(d) {
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
}

module.exports = {
  SLOT_MINUTES,
  WINDOW,
  startOfDay,
  makeDayWindow,
  generateSlots,
  overlaps,
  clampToWindow,
  toIsoNoMs,
};
