import { CROSS_FOR } from "../gen/sums.js";
import { FACES } from "../core/prizes.js";
import { DB, save } from "../core/db.js";
import { $, pick, toast } from "../core/dom.js";
import { sndTap } from "../core/audio.js";
import { UNARY, makeFact, mulFacts } from "../gen/sums.js";
import { paintHeld } from "./held.js";
import { paintBowl } from "./bowl.js";
import { bestPrize } from "./stickers.js";
import { paintCoins } from "./chrome.js";

/* ============================ setup screen ============================ */
export function renderPlayers(){
  const host = $("#players");
  host.textContent = "";
  DB.profiles.forEach(p => {
    const b = document.createElement("button");
    b.className = "player";
    b.type = "button";
    b.style.setProperty("--pc", p.color);
    b.setAttribute("aria-pressed", String(p.id === DB.active));
    b.innerHTML = `<span class="face">${p.face}</span><span></span>`;
    b.lastElementChild.textContent = p.name;
    const best = bestPrize(p.id);
    if (best){
      const badge = document.createElement("span");
      badge.className = "best";
      badge.textContent = best.p.e;
      badge.style.setProperty("--ring", best.t.ring);
      badge.style.setProperty("--glow", best.t.glow);
      badge.title = `${best.p.n} — ${best.t.name} ${best.t.kind}`;
      b.append(badge);
    }
    b.onclick = () => { DB.active = p.id; save(); renderPlayers(); paintCoins(); paintBowl(); paintHeld(); sndTap(); };
    host.append(b);
  });
  const add = document.createElement("button");
  add.className = "player add";
  add.type = "button";
  add.textContent = "+ New player";
  add.onclick = () => { sndTap(); openAddPlayer(); };
  host.append(add);
}
// A sandboxed page gets no prompt() or alert(), so the page has to ask for itself.
let paFace = FACES[0];
function openAddPlayer(){
  paFace = pick(FACES);
  $("#paName").value = "";
  const host = $("#paFaces");
  host.textContent = "";
  FACES.forEach(f => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = f;
    b.setAttribute("aria-pressed", String(f === paFace));
    b.onclick = () => {
      paFace = f;
      host.querySelectorAll("button").forEach(o => o.setAttribute("aria-pressed", String(o === b)));
      sndTap();
    };
    host.append(b);
  });
  $("#playerAdd").hidden = false;
  $("#paName").focus();
}
export function closeAddPlayer(){ $("#playerAdd").hidden = true; }
export function commitAddPlayer(){
  const name = $("#paName").value.trim().slice(0, 14);
  if (!name){ toast("Type a name first"); $("#paName").focus(); return; }
  if (DB.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())){
    toast(`${name} is already playing`);
    return;
  }
  const colors = ["#2E86FF","#0FA863","#7C5CFF","#FFC531","#F0347B","#FF7A1A"];
  const p = {
    id: "p" + Date.now().toString(36),
    name,
    face: paFace,
    color: colors[DB.profiles.length % colors.length]
  };
  DB.profiles.push(p); DB.active = p.id; save();
  closeAddPlayer(); renderPlayers(); paintCoins();
  toast(`${name} is in — have fun!`);
}

function wireOpts(sel, key, multi){
  $(sel).addEventListener("click", e => {
    const b = e.target.closest(".opt");
    if (!b) return;
    sndTap();
    const val = b.dataset[key];
    if (multi){
      const on = b.getAttribute("aria-pressed") === "true";
      const chosen = new Set(DB.settings.ops);
      if (on && chosen.size === 1) return;       // always keep at least one
      on ? chosen.delete(val) : chosen.add(val);
      DB.settings.ops = [...chosen];
      exampleCache.clear();
    } else {
      DB.settings[key] = key === "count" ? Number(val) : val;
    }
    save(); paintOpts();
  });
}
// Every example under a button is a real draw from the generator, cached so it
// stays put, so a setting can never advertise something it will not produce.
const exampleCache = new Map();
function exampleOf(range, op, cross){
  const key = range + op + cross;
  if (!exampleCache.has(key)){
    const f = makeFact(op, Number(range), cross, DB.settings.tables);
    exampleCache.set(key, f[2] === null ? `${UNARY[f[1]]} ${f[0]} = ${f[3]}`
                                        : `${f[0]} ${f[1]} ${f[2]} = ${f[3]}`);
  }
  return exampleCache.get(key);
}
$("#tableOpts").addEventListener("click", e => {
  const b = e.target.closest(".opt");
  if (!b) return;
  sndTap();
  const n = Number(b.dataset.table), chosen = new Set(DB.settings.tables);
  if (chosen.has(n) && chosen.size === 1) return;        // always keep one row
  chosen.has(n) ? chosen.delete(n) : chosen.add(n);
  DB.settings.tables = [...chosen].sort((a, b2) => a - b2);
  exampleCache.clear();
  save(); paintOpts();
});

export const CROSS_LABEL = { no: "No carry", one: "One carry", free: "Two big ones", mixed: "Mixed" };
function paintOpts(){
  const s = DB.settings;
  document.querySelectorAll(".for-sum").forEach(e => { e.hidden = s.mode !== "sum"; });
  document.querySelectorAll(".for-clock").forEach(e => { e.hidden = s.mode !== "clock"; });
  document.querySelectorAll(".for-line").forEach(e => { e.hidden = s.mode !== "line"; });
  document.querySelectorAll(".for-wall").forEach(e => { e.hidden = s.mode !== "wall"; });
  document.querySelectorAll(".for-money").forEach(e => { e.hidden = s.mode !== "money"; });
  // the times tables only mean anything when × or ÷ is in play
  const needsTables = s.mode === "sum" && (s.ops.includes("×") || s.ops.includes("÷"));
  document.querySelectorAll(".for-tables").forEach(e => { e.hidden = !needsTables; });
  $("#tableOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(s.tables.includes(Number(b.dataset.table)))));
  if (needsTables){
    const facts = new Set(mulFacts(Number(s.range), false, s.tables).map(f => f[0] + "x" + f[1])).size;
    const thin = facts < 6;
    const both = s.ops.includes("×") && s.ops.includes("÷");
    const what = both ? "sums, each way round" : s.ops.includes("÷") ? "divisions" : "sums";
    $("#tableHint").className = "hint" + (thin ? " warn" : "");
    $("#tableHint").textContent = thin
      ? `Only ${facts} fit at this size — try a bigger number size.`
      : `${facts} different ${what} to practise.`;
  }
  [["#wallRowsOpts","wallRows"],["#wallToOpts","wallTo"],
   ["#moneyToOpts","moneyTo"],["#moneyTaskOpts","moneyTask"],["#moneyCentsOpts","moneyCents"],
   ["#clockTaskOpts","clockTask"]].forEach(([sel, key]) => {
    $(sel).querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset[key] === s[key])));
  });
  $("#lineToOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lineTo === s.lineTo)));
  $("#lineTaskOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lineTask === s.lineTask)));
  // the part of the day only decides anything on a 24-hour clock
  document.querySelectorAll(".for-24").forEach(e => { e.hidden = !(s.mode === "clock" && s.system === "24"); });
  $("#systemOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.system === s.system)));
  $("#modeOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === s.mode)));
  $("#minuteOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.minutes === s.minutes)));
  $("#daypartOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.daypart === s.daypart)));
  const addSub = s.ops.includes("+") ? "+" : s.ops.includes("−") ? "−" : "+";
  $("#rangeOpts").querySelectorAll(".opt").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.range === s.range));
    const shownOp = s.ops.find(o => !UNARY[o]) || s.ops[0] || "+";
    b.querySelector(".s").textContent = exampleOf(b.dataset.range, shownOp, s.cross === "mixed" ? "no" : s.cross);
  });
  // Each band offers different carries, so the chips are built rather than fixed:
  // 10 has none at all, 20 cannot do two two-digit numbers, 100 can do all three.
  const offered = CROSS_FOR[s.range] || [];
  document.querySelectorAll(".for-cross").forEach(e => { e.hidden = s.mode !== "sum" || !offered.length; });
  if (offered.length){
    if (s.cross !== "mixed" && !offered.includes(s.cross)){ s.cross = "mixed"; save(); }
    const host = $("#crossOpts");
    const want = offered.concat("mixed");
    host.className = "opts " + (want.length > 3 ? "four" : "three");
    if (host.childElementCount !== want.length){
      host.textContent = "";
      want.forEach(v => {
        const b = document.createElement("button");
        b.className = "opt";
        b.dataset.cross = v;
        b.innerHTML = '<span class="t"></span><span class="s"></span>';
        b.firstElementChild.textContent = CROSS_LABEL[v];
        host.append(b);
      });
    }
    host.querySelectorAll(".opt").forEach(b => {
      const v = b.dataset.cross;
      b.setAttribute("aria-pressed", String(v === s.cross));
      b.querySelector(".s").textContent = v === "mixed" ? "a bit of each" : exampleOf(s.range, addSub, v);
    });
  }
  $("#opOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(s.ops.includes(b.dataset.op))));
  $("#styleOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.style === s.style)));
  $("#countOpts").querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.count) === s.count)));
}
wireOpts("#modeOpts", "mode", false);
wireOpts("#wallRowsOpts", "wallRows", false);
wireOpts("#wallToOpts", "wallTo", false);
wireOpts("#moneyToOpts", "moneyTo", false);
wireOpts("#moneyTaskOpts", "moneyTask", false);
wireOpts("#moneyCentsOpts", "moneyCents", false);
wireOpts("#clockTaskOpts", "clockTask", false);
wireOpts("#lineToOpts", "lineTo", false);
wireOpts("#lineTaskOpts", "lineTask", false);
wireOpts("#systemOpts", "system", false);
wireOpts("#minuteOpts", "minutes", false);
wireOpts("#daypartOpts", "daypart", false);
wireOpts("#rangeOpts", "range", false);
wireOpts("#opOpts", "op", true);
wireOpts("#crossOpts", "cross", false);
wireOpts("#styleOpts", "style", false);
wireOpts("#countOpts", "count", false);

