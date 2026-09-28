import { PRIZES, pantryOf } from "../core/prizes.js";
import { histOf, me, statsOf } from "../core/db.js";
import { $, show } from "../core/dom.js";
import { bestPrize, earnedCount, renderCoinBar, stickerButton } from "./stickers.js";

/* ============================ progress ============================ */
export function renderProgress(){
  const p = me(), st = statsOf(p.id), h = histOf(p.id);
  $("#progTitle").textContent = `${p.name}'s progress`;
  const best = bestPrize(p.id), bh = $("#bestPrize");
  bh.hidden = !best;
  if (best){
    bh.innerHTML = `<span class="best big-best"></span><span><b></b><em></em></span>`;
    const chip = bh.firstElementChild;
    chip.textContent = best.p.e;
    chip.style.setProperty("--ring", best.t.ring);
    chip.style.setProperty("--glow", best.t.glow);
    bh.querySelector("b").textContent = best.p.n;
    bh.querySelector("em").textContent = `${best.t.name} ${best.t.kind}`;
  }
  $("#pQ").textContent = st.questions;
  $("#pAcc").textContent = h.length ? Math.round(h.reduce((a, r) => a + r.acc, 0) / h.length) + "%" : "—";
  $("#pStreak").textContent = st.bestStreak;
  $("#pCoins").textContent = st.coins;
  $("#pTreats").textContent = pantryOf(p.id);

  const earned = earnedCount();
  const sh = $("#allStickers");
  sh.textContent = "";
  for (let i = 0; i < earned; i++) sh.append(stickerButton(i, false, false));
  if (earned < PRIZES.length) sh.append(stickerButton(earned, true, false));   // the one coming next
  renderCoinBar($("#collectionBar"));

  drawChart(h.slice(-14));

  const list = $("#sessionList");
  list.innerHTML = "";
  if (!h.length){
    list.innerHTML = `<li class="empty" style="border:0">Nothing yet.</li>`;
  } else {
    [...h].reverse().slice(0, 20).forEach(r => {
      const d = new Date(r.ts);
      const li = document.createElement("li");
      const when = d.toLocaleDateString(undefined, { day:"numeric", month:"short" }) + " " +
                   d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
      const add = (cls, text) => { const e = document.createElement("span"); e.className = cls; e.textContent = text; li.append(e); };
      add("when", when);
      if (r.mode === "wall"){
        add("pill", "🧱 wall");
        add("pill", (r.wallRows || 3) + " rows");
        add("pill", "to " + (r.wallTo || 20));
      } else if (r.mode === "money"){
        add("pill", "💶 money");
        add("pill", "to " + Math.floor(Number(r.moneyTo || 1000) / 100) + " €");
        if (r.moneyCents === "yes") add("pill", "with cents");
        add("pill", r.moneyTask === "change" ? "change" : r.moneyTask === "mixed" ? "mixed" : "count it");
      } else if (r.mode === "line"){
        add("pill", "📏 line");
        add("pill", "0–" + (r.lineTo || "10"));
        add("pill", { read:"read it", land:"jump", jump:"how far", mixed:"mixed" }[r.lineTask] || "mixed");
      } else if (r.mode === "clock"){
        add("pill", "🕐 clock");
        if (r.clockTask === "later") add("pill", "later");
        else if (r.clockTask === "span") add("pill", "how long");
        else if (r.clockTask === "mixed") add("pill", "mixed");
        add("pill", { hour:"o'clock", half:"half", quarter:"quarters", five:"fives", any:"any minute" }[r.minutes] || "clock");
        add("pill", (r.system || "24") + "h");
        if (r.system === "24" && r.daypart === "later") add("pill", "afternoon");
        else if (r.system === "24" && r.daypart === "any") add("pill", "any time");
      } else {
        add("pill", r.ops.split("").join(" "));
        add("pill", "to " + (r.range || "10"));
        if (r.cross === "yes") add("pill", "crossing");
        else if (r.cross === "no") add("pill", "no carry");
      }
      add("acc", Math.round(r.acc) + "%");
      list.append(li);
    });
  }
  show("progress");
}

function drawChart(rows){
  const host = $("#chartHost");
  if (!rows.length){ host.innerHTML = `<p class="empty">No rounds yet — play one and it shows up here.</p>`; return; }
  const W = 640, H = 220, L = 34, R = 14, T = 18, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const step = iw / rows.length;
  const bw = Math.min(38, step * .62);
  const y = v => T + ih - (v / 100) * ih;

  let g = "";
  [0, 50, 100].forEach(v => {
    g += `<line class="grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"/>`;
    g += `<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  });

  let bars = "";
  rows.forEach((r, i) => {
    const cx = L + step * i + step / 2;
    const h = Math.max(3, (r.acc / 100) * ih);
    const d = new Date(r.ts);
    const label = d.toLocaleDateString(undefined, { day:"numeric", month:"short" });
    bars += `<rect class="bar" x="${(cx - bw/2).toFixed(1)}" y="${(T + ih - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4">
               <title>${label} — ${Math.round(r.acc)}% correct, ${r.n} questions</title></rect>`;
    if (i === rows.length - 1 || rows.length <= 7 || i % 2 === 0)
      bars += `<text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${label}</text>`;
  });
  const last = rows[rows.length - 1];
  const lx = L + step * (rows.length - 1) + step / 2;
  bars += `<text class="lead" x="${lx.toFixed(1)}" y="${(y(last.acc) - 8).toFixed(1)}" text-anchor="middle">${Math.round(last.acc)}%</text>`;

  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Percent correct for the last ${rows.length} rounds, most recent on the right: ${rows.map(r => Math.round(r.acc) + "%").join(", ")}">
    ${g}${bars}<line class="grid" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/></svg>`;
}

