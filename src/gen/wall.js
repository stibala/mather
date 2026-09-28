import { rnd } from "../core/dom.js";

/* ---------- Zahlenmauer: the number wall ---------- */
// Two neighbouring bricks add up to the brick resting on them. A gap at the top
// is addition, a gap in the base is subtraction, and a gap in the middle makes
// the child work out which of the two it needs — one picture, three skills.
function buildWall(base){
  const rows = [base.slice()];
  while (rows[rows.length - 1].length > 1){
    const below = rows[rows.length - 1], up = [];
    for (let i = 0; i < below.length - 1; i++) up.push(below[i] + below[i + 1]);
    rows.push(up);
  }
  return rows;                                    // rows[0] is the base
}
// Not every set of gaps can be solved. This walks the wall repeatedly, taking any
// gap whose two partners are known, and returns the order they fall in — which is
// both the proof that the wall is solvable and the order to ask the child in.
function solveOrder(rows, gaps){
  const known = new Set();
  rows.forEach((row, r) => row.forEach((_, i) => { if (!gaps.has(r + "," + i)) known.add(r + "," + i); }));
  const order = [];
  let moved = true;
  while (moved){
    moved = false;
    for (const key of gaps){
      if (known.has(key)) continue;
      const [r, i] = key.split(",").map(Number);
      const up    = r > 0 && known.has((r-1) + "," + i) && known.has((r-1) + "," + (i+1));
      const above = rows[r+1] || [];
      const right = i < above.length            && known.has((r+1) + "," + i)     && known.has(r + "," + (i+1));
      const left  = i > 0 && i - 1 < above.length && known.has((r+1) + "," + (i-1)) && known.has(r + "," + (i-1));
      if (up || right || left){ known.add(key); order.push({ r, i }); moved = true; }
    }
  }
  return order.length === gaps.size ? order : null;
}

// A wall spans as many questions as it has gaps: the child sees them all at once
// and fills them one at a time, so every question still has a single answer.
export let wallState = null;
function newWall(settings){
  const r = Number(settings.wallRows), max = Number(settings.wallTo);
  const weightSum = r === 3 ? 4 : r === 4 ? 8 : 16;
  const cap = Math.max(2, Math.floor(max / weightSum) * 2);
  let rows = null;
  for (let t = 0; t < 160; t++){
    const built = buildWall(Array.from({ length: r }, () => rnd(1, cap)));
    const top = built[built.length - 1][0];
    if (top > max || top < Math.floor(max / 3)) continue;
    rows = built;
    break;
  }
  if (!rows) rows = buildWall(Array.from({ length: r }, () => rnd(1, Math.max(2, cap))));

  const cells = [];
  rows.forEach((row, ri) => row.forEach((_, i) => cells.push({ r: ri, i })));
  const want = r === 3 ? 2 : 3;          // as many gaps as the wall can carry and stay solvable
  for (let t = 0; t < 200; t++){
    const pool = cells.slice();
    const gaps = new Set();
    for (let k = 0; k < want; k++){
      const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      gaps.add(c.r + "," + c.i);
    }
    const order = solveOrder(rows, gaps);
    if (order) return { rows, queue: order };
  }
  return { rows, queue: [cells[Math.floor(Math.random() * cells.length)]] };   // one gap is always solvable
}
export function makeWallQuestion(settings, seen){
  if (!wallState || !wallState.queue.length) wallState = newWall(settings);
  const b = wallState.queue.shift();
  const rows = wallState.rows;
  const open = new Set([b.r + "," + b.i, ...wallState.queue.map(g => g.r + "," + g.i)]);
  const key = "w" + rows[0].join(",") + "#" + b.r + b.i;
  seen.add(key);
  return {
    kind:"wall", rows, br:b.r, bi:b.i, gaps: open, answer: rows[b.r][b.i], key,
    ask: b.r === rows.length - 1 && open.size === 1 ? "What goes in the top brick?"
       : open.size > 1 ? "Fill in the next brick" : "Which brick is missing?"
  };
}
export function wallSVG(q, typed, state){
  const BW = 104, BH = 48, G = 7, r = q.rows[0].length;
  const W = r * BW + (r - 1) * G, H = r * BH + (r - 1) * G;
  let out = "";
  q.rows.forEach((row, ri) => {
    const rowW = row.length * BW + (row.length - 1) * G;
    const x0 = (W - rowW) / 2, y = H - (ri + 1) * BH - ri * G;
    row.forEach((val, i) => {
      const x = x0 + i * (BW + G);
      const now = ri === q.br && i === q.bi;                 // the brick being answered
      const later = !now && q.gaps.has(ri + "," + i);        // a gap still to come
      const fill = now ? (state === "good" ? "color-mix(in srgb, var(--leaf) 22%, var(--surface))"
                        : state === "bad" ? "color-mix(in srgb, var(--berry) 20%, var(--surface))"
                        : "color-mix(in srgb, var(--berry) 10%, var(--surface))")
                       : "var(--surface-2)";
      const edge = now ? (state === "good" ? "var(--leaf)" : "var(--berry)") : "var(--line)";
      out += `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="13" fill="${fill}" `
          +  `stroke="${edge}" stroke-width="${now ? 3.5 : 2.5}"`
          +  `${(now && !state) || later ? ' stroke-dasharray="9 6"' : ""}/>`;
      const text = now ? (typed || "?") : later ? "?" : val;
      const ink = now ? (state === "good" ? "var(--leaf)" : "var(--berry)") : later ? "var(--ink-3)" : "var(--ink)";
      out += `<text x="${(x + BW / 2).toFixed(1)}" y="${(y + BH / 2 + 10).toFixed(1)}" text-anchor="middle" `
          +  `font-family="Fredoka, sans-serif" font-size="27" font-weight="600" fill="${ink}">${text}</text>`;
    });
  });
  return `<svg class="figart" viewBox="-3 -3 ${W + 6} ${H + 6}" role="img" aria-label="A number wall — two bricks add up to the brick above them. ${q.gaps.size} brick${q.gaps.size === 1 ? " is" : "s are"} missing.">${out}</svg>`;
}

