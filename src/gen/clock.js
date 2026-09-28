import { rnd } from "../core/dom.js";

/* ---------- telling the time ---------- */
export const pad2 = n => String(n).padStart(2, "0");
const fmtTime = (h, m) => pad2(h) + ":" + pad2(m);
const MINUTE_STEP = { hour:60, half:30, quarter:15, five:5, any:1 };
const DAY_HOURS   = { morning:[6,11], later:[12,23], any:[0,23] };
// An analogue face cannot tell 3 o'clock from 15:00 on its own, so every question
// carries the part of the day. Reading that and adding the twelve is the whole
// skill being practised here.
export function dayPartOf(h){
  if (h < 6)  return { icon:"🌙", label:"at night" };
  if (h < 12) return { icon:"☀️", label:"in the morning" };
  if (h < 18) return { icon:"🌤️", label:"in the afternoon" };
  return { icon:"🌆", label:"in the evening" };
}
export function makeClockQuestion(settings, seen){
  const step = MINUTE_STEP[settings.minutes] || 60;
  const twelve = settings.system !== "24";
  // On a 12-hour clock the hour just is what the short hand points at, so the
  // hours run 1-12 and no part of the day needs saying. On a 24-hour clock the
  // same face means two different times, which is why that one shows the badge.
  const [lo, hi] = twelve ? [1, 12] : (DAY_HOURS[settings.daypart] || DAY_HOURS.any);
  const task = settings.clockTask === "mixed" ? pick(["read","later","span"]) : (settings.clockTask || "read");
  const asTime = (h, m) => ({
    answer: twelve ? h + ":" + pad2(m) : fmtTime(h, m),
    digits: twelve ? String(h) + pad2(m) : pad2(h) + pad2(m)
  });
  let h = 0, m = 0, key = "";
  for (let t = 0; t < 60; t++){
    h = rnd(lo, hi);
    m = step === 1 ? rnd(0, 59) : rnd(0, 60 / step - 1) * step;
    key = "c" + task + h + ":" + m;
    if (!seen.has(key) || t > 54) break;
  }
  seen.add(key);

  if (task === "read"){
    const a = asTime(h, m);
    return { kind:"clock", task, h, m, twelve, key, ansH:h, ansM:m, maxDigits:4, keepZeros:true, ...a };
  }
  // A span keeps both faces on a grid the child can read: whole steps of the
  // chosen minutes, or quarter hours when the setting is o'clock only.
  const sstep = step >= 60 ? 15 : Math.max(5, step);
  const span = sstep * rnd(1, Math.floor(60 / sstep));
  const total = h * 60 + m + span;
  const hi24 = twelve ? 12 : 24;
  const end = total % (hi24 * 60);
  let eh = Math.floor(end / 60), em = end % 60;
  if (twelve && eh === 0) eh = 12;

  if (task === "later"){
    const a = asTime(eh, em);
    return { kind:"clock", task, h, m, eh, em, span, twelve, key, ansH:eh, ansM:em,
             maxDigits:4, keepZeros:true, ...a,
             ask:"What time will it be?" };
  }
  return { kind:"clock", task:"span", h, m, eh, em, span, twelve, key,
           answer: span, maxDigits:3, keepZeros:false,
           ask:"How many minutes?" };
}
export const isTimeQ = q => q.kind === "clock" && q.task !== "span";

// Digits land left to right and the last two are always the minutes, so both
// "330" and "0330" read as half past three. Nothing to teach about zero padding.
export function parseTypedTime(t){
  if (t.length < 3) return null;
  return { h: parseInt(t.slice(0, t.length - 2), 10), m: parseInt(t.slice(-2), 10) };
}
export const showTyped = t => t.length < 3 ? t : t.slice(0, t.length - 2) + ":" + t.slice(-2);

// The hour hand creeps on as the minutes pass — that is how you read 3:45.
export function clockSVG(h, m, sweep){
  const C = 100;
  const at = (deg, r) => [C + r * Math.sin(deg * Math.PI / 180), C - r * Math.cos(deg * Math.PI / 180)];
  let marks = "";
  for (let i = 0; i < 60; i++){
    const big = i % 5 === 0;
    const [x1, y1] = at(i * 6, big ? 76 : 82), [x2, y2] = at(i * 6, 87);
    marks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" `
          +  `stroke="${big ? "var(--ink-2)" : "var(--line)"}" stroke-width="${big ? 3.4 : 1.6}" stroke-linecap="round"/>`;
  }
  let nums = "";
  for (let n = 1; n <= 12; n++){
    const [x, y] = at(n * 30, 61);
    nums += `<text x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}" text-anchor="middle" `
         +  `font-family="Fredoka, sans-serif" font-size="20" font-weight="600" fill="var(--ink)">${n}</text>`;
  }
  const hourDeg = ((h % 12) + m / 60) * 30, minDeg = m * 6;
  // The interval is drawn as a sweep round the rim, starting where the long hand
  // stands now, so "in 25 minutes" is something you can see rather than read.
  let ring = "";
  if (sweep){
    const R = 104, a0 = minDeg, a1 = a0 + Math.min(sweep, 58.5) * 6;
    const [x0, y0] = at(a0, R), [x1, y1] = at(a1, R);
    ring = `<circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="5.5" fill="var(--tangerine)"/>`
      + `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" `
      + `fill="none" stroke="var(--tangerine)" stroke-width="7" stroke-linecap="round"/>`
      + `<g transform="translate(${x1.toFixed(1)} ${y1.toFixed(1)}) rotate(${a1.toFixed(1)})">`
      + `<path d="M-2 -10 L13 0 L-2 10 Z" fill="var(--tangerine)"/></g>`;
  }
  const box = sweep ? "-22 -22 244 244" : "0 0 200 200";
  return `<svg class="clockface" viewBox="${box}" role="img" aria-label="An analogue clock — read the time from the hands">
    <circle cx="100" cy="100" r="92" fill="var(--surface-2)" stroke="var(--ink-2)" stroke-width="4"/>${ring}
    ${marks}${nums}
    <g transform="rotate(${minDeg.toFixed(2)} 100 100)"><line x1="100" y1="100" x2="100" y2="24" stroke="var(--ocean)" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="rotate(${hourDeg.toFixed(2)} 100 100)"><line x1="100" y1="100" x2="100" y2="52" stroke="var(--tangerine)" stroke-width="8.5" stroke-linecap="round"/></g>
    <circle cx="100" cy="100" r="6.5" fill="var(--ink)"/></svg>`;
}

