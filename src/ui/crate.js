import { TREATS, prizeOf, tierOf, tinOf } from "../core/prizes.js";
import { me, save } from "../core/db.js";
import { $, pick } from "../core/dom.js";
import { beep, sndDone } from "../core/audio.js";
import { confetti } from "./result.js";
import { paintBowl } from "./bowl.js";

/* ---------- the crate ---------- */
// What a round earned used to just appear in the totals. Now it is packed into a
// crate the child opens, and the contents come out one at a time — treats first
// so a sticker, when there is one, lands last.
export let crateQueue = [], crateBusy = false, crateTimers = [];
function laterInCrate(fn, ms){ crateTimers.push(setTimeout(fn, ms)); }
// A treat joins the tin as it comes out of the crate, not before — otherwise the
// loot is sitting in plain sight while the child is still deciding to tap.
function bankItem(x){
  if (x.done) return false;
  x.done = true;
  if (x.kind !== "treat") return false;
  tinOf(me().id).push(x.e);
  return true;
}
// ...but nothing may be lost either, so leaving with a crate unopened banks it.
export function flushCrate(){
  crateTimers.forEach(clearTimeout); crateTimers = [];
  if (!crateQueue.length) return;
  let moved = false;
  crateQueue.forEach(x => { if (bankItem(x)) moved = true; });
  crateQueue = [];
  crateBusy = false;
  const box = $("#crateBox");
  box.hidden = true;
  box.classList.remove("spent", "open"); box.classList.add("shut");
  if (moved) save();
  paintBowl();
}
export function packCrate(newTreats, newStickers){
  flushCrate();                                   // anything still pending is banked first
  crateQueue = [];
  for (let i = 0; i < newTreats; i++) crateQueue.push({ kind:"treat", e: pick(TREATS) });
  newStickers.forEach(i => crateQueue.push({ kind:"sticker", i }));
  const box = $("#crateBox");
  box.hidden = crateQueue.length === 0;
  box.classList.remove("open", "spent"); box.classList.add("shut");
  $("#lootRow").textContent = "";
  $("#bowlHead").innerHTML = crateQueue.length
    ? 'A crate for you! <small>tap it open</small>'
    : "Numo's bowl <small>drag a treat up to Numo</small>";
  crateBusy = false;
  paintBowl();
}
function openCrate(){
  if (crateBusy || !crateQueue.length) return;
  crateBusy = true;
  const box = $("#crateBox");
  box.classList.remove("shut"); box.classList.add("open");
  const burst = $("#crateBurst");
  burst.classList.remove("on"); void burst.offsetWidth; burst.classList.add("on");
  beep([320, 210], .12, "square", .07);
  const items = crateQueue.slice();
  items.forEach((item, k) => laterInCrate(() => revealOne(item, k === items.length - 1), 380 + k * 560));
}
function revealOne(item, last){
  const fig = document.createElement("figure");
  const art = document.createElement("span");
  art.className = "art";
  const tag = document.createElement("span");
  tag.className = "tag";
  if (item.kind === "treat"){
    art.textContent = item.e;
    tag.textContent = "treat";
    beep([760, 1010], .09, "triangle", .1);
    bankItem(item); save(); paintBowl();          // it lands in the tin as it appears
  } else {
    fig.className = "star";
    fig.style.setProperty("--ring", tierOf(item.i).ring);
    fig.style.setProperty("--glow", tierOf(item.i).glow);
    art.textContent = prizeOf(item.i).e;
    tag.textContent = prizeOf(item.i).n;
    sndDone();
    confetti();
  }
  fig.append(art, tag);
  $("#lootRow").append(fig);
  if (last){
    const t = crateQueue.filter(x => x.kind === "treat").length;
    const p = crateQueue.filter(x => x.kind === "sticker").length;
    const bits = [];
    if (t) bits.push(t + (t === 1 ? " treat" : " treats"));
    if (p) bits.push(p + (p === 1 ? " sticker" : " stickers"));
    $("#bowlHead").textContent = bits.join(" and ") + "!";
    // a beat to look at what came out, then it fades and folds away
    laterInCrate(() => $("#crateBox").classList.add("spent"), 900);
    laterInCrate(() => {
      const box = $("#crateBox");
      box.hidden = true;
      box.classList.remove("spent");
      crateQueue = [];
      paintBowl();
    }, 1540);
  }
}
$("#crateBox").addEventListener("click", () => openCrate());
$("#crateBox").addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openCrate(); }
});

