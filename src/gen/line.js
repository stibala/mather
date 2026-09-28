import { pick, rnd } from "../core/dom.js";

/* ---------- the number line ---------- */
// A line of 100 ticks is unreadable on a phone. Rather than coarsen the ticks, the
// big line ZOOMS: it shows a 10-20 wide window somewhere in 0-100, still ticked
// every 1. Every number stays countable, and a jump can cross a ten.
const LINE_VIEWS = {
  "10":  () => ({ lo:0, hi:10, label:5, minJump:2, maxJump:5 }),
  "20":  () => ({ lo:0, hi:20, label:5, minJump:2, maxJump:9 }),
  "100": () => {
    const w = pick([10, 15, 20]);
    const lo = rnd(0, (100 - w) / 5) * 5;
    return { lo, hi: lo + w, label:5, minJump:2, maxJump: Math.min(w - 2, 12) };
  }
};
const LINE_ASKS = {
  read: "Where is the arrow pointing?",
  land: "Where do you land?",
  jump: "How big is the jump?",
  round: "Which ten is it nearest?"
};
export function makeLineQuestion(settings, seen){
  const tasks = settings.lineTask === "mixed" ? ["read","land","jump","round"] : [settings.lineTask];
  let q = null, view = null;
  for (let t = 0; t < 80; t++){
    view = (LINE_VIEWS[settings.lineTo] || LINE_VIEWS["10"])();
    const task = pick(tasks);
    if (task === "round"){
      // the window is pinned to whole tens so several are on screen to choose between
      if (view.hi - view.lo > 20 || view.lo % 10){
        const lo = rnd(0, Math.max(0, (100 - 20) / 10)) * 10;
        view = { lo, hi: lo + 20, label:10, minJump:2, maxJump:9 };
      }
      view = Object.assign({}, view, { label:10 });
      const at = rnd(view.lo + 1, view.hi - 1);
      if (at % 10 === 0) continue;                    // already sitting on a ten
      q = { task, v: at, answer: Math.round(at / 10) * 10, key:"lo" + at };
    } else if (task === "read"){
      const at = rnd(view.lo + 1, view.hi - 1);
      // sitting on a numbered tick would just be reading the label
      if (at % view.label === 0 && t < 70) continue;
      q = { task, v: at, answer: at, key: "lr" + at };
    } else {
      const j = rnd(view.minJump, view.maxJump);
      const back = Math.random() < .45;
      const from = rnd(view.lo, view.hi - j);
      const s0 = back ? from + j : from, e0 = back ? from : from + j;
      q = { task, s: s0, e: e0, j, back, answer: task === "land" ? e0 : j, key: "l" + task + s0 + ">" + e0 };
    }
    if (seen.has(q.key) && t < 74) continue;
    seen.add(q.key);
    break;
  }
  return Object.assign({ kind:"line", view, ask: LINE_ASKS[q.task] }, q);
}
export function lineText(q){
  if (q.task === "round") return `${q.v} rounds to ${q.answer}`;
  if (q.task === "read") return `the arrow points at ${q.v}`;
  if (q.task === "land") return `${q.s} ${q.back ? "−" : "+"} ${q.j} = ${q.e}`;
  return `${q.s} → ${q.e} is a jump of ${q.j}`;
}

export function lineSVG(q){
  const W = 640, arcs = q.task !== "read";
  const H = arcs ? 132 : 104, baseY = arcs ? 96 : 60;
  const padL = 30, padR = 30, v = q.view, span = v.hi - v.lo;
  const X = n => padL + ((n - v.lo) / span) * (W - padL - padR);
  let ticks = "";
  for (let n = v.lo; n <= v.hi; n++){
    const lab = n % v.label === 0, x = X(n).toFixed(1);
    ticks += `<line x1="${x}" y1="${baseY - (lab ? 13 : 6)}" x2="${x}" y2="${baseY + (lab ? 13 : 6)}" `
          +  `stroke="${lab ? "var(--ink-2)" : "var(--line)"}" stroke-width="${lab ? 3 : 1.8}" stroke-linecap="round"/>`;
    if (lab) ticks += `<text x="${x}" y="${baseY + 32}" text-anchor="middle" font-family="Fredoka, sans-serif" `
                   +  `font-size="17" font-weight="500" fill="var(--ink-2)">${n}</text>`;
  }
  // the line runs on past an edge only where there really are more numbers
  let axis = `<line x1="${padL - 16}" y1="${baseY}" x2="${W - padR + 16}" y2="${baseY}" stroke="var(--ink-2)" stroke-width="3.2" stroke-linecap="round"/>`;
  if (v.hi < 100) axis += `<path d="M${W - padR + 16} ${baseY} l-11 -6 v12 z" fill="var(--ink-2)"/>`;
  if (v.lo > 0)   axis += `<path d="M${padL - 16} ${baseY} l11 -6 v12 z" fill="var(--ink-2)"/>`;
  let art = "";
  if (q.task === "read" || q.task === "round"){
    const x = X(q.v).toFixed(1);
    art = `<path d="M${x} ${baseY - 5} l-13 -20 h26 z" fill="var(--berry)"/>
      <text x="${x}" y="${baseY - 32}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="30" font-weight="600" fill="var(--berry)">?</text>`;
  } else {
    const xs = X(q.s), xe = X(q.e), mid = (xs + xe) / 2, top = baseY - 66;
    art = `<path d="M${xs.toFixed(1)} ${baseY - 12} Q ${mid.toFixed(1)} ${top} ${xe.toFixed(1)} ${(baseY - 14).toFixed(1)}"
        fill="none" stroke="var(--tangerine)" stroke-width="4" stroke-linecap="round"/>
      <path d="M${xe.toFixed(1)} ${baseY - 5} l-8 -13 h16 z" fill="var(--tangerine)"/>
      <circle cx="${xs.toFixed(1)}" cy="${baseY}" r="8" fill="var(--ocean)"/>
      <text x="${xs.toFixed(1)}" y="${(baseY - 22).toFixed(1)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="20" font-weight="600" fill="var(--ocean)">${q.s}</text>
      <text x="${mid.toFixed(1)}" y="${(top + 6).toFixed(1)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="25" font-weight="600" fill="var(--tangerine)">${q.task === "jump" ? "?" : (q.back ? "−" : "+") + q.j}</text>`;
    art += q.task === "jump"
      ? `<circle cx="${xe.toFixed(1)}" cy="${baseY}" r="8" fill="var(--ocean)"/>
         <text x="${xe.toFixed(1)}" y="${(baseY + 32).toFixed(1)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="20" font-weight="600" fill="var(--ocean)">${q.e}</text>`
      : `<text x="${xe.toFixed(1)}" y="${(baseY + 34).toFixed(1)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="26" font-weight="600" fill="var(--berry)">?</text>`;
  }
  return `<svg class="linefig" viewBox="0 0 ${W} ${H}" role="img" aria-label="${q.ask} Read it from the number line running from ${v.lo} to ${v.hi}.">${axis}${ticks}${art}</svg>`;
}

