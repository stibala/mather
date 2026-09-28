import { TREATS, tinOf } from "../core/prizes.js";
import { me, save, statsOf } from "../core/db.js";
import { $, pick } from "../core/dom.js";
import { sndCrunch, sndMeow, sndPurr, sndSlurp } from "../core/audio.js";
import { say } from "./quiz.js";
import { paintHeld } from "./held.js";

/* ---------- feeding Numo ---------- */
// What each treat sounds like, and what he says about it.
const TREAT_SOUND = {
  "🥛":"slurp", "🍪":"crunch", "🥨":"crunch", "🍉":"crunch",
  "🐟":"meow", "🍤":"meow", "🥓":"meow", "🍗":"meow", "🥚":"meow",
  "🧀":"purr", "🍚":"purr", "🍯":"purr"
};
const NOMS_BY = {
  slurp:  ["Slurp!", "Lap lap…", "Mmmm!"],
  crunch: ["Crunch!", "Crrrunch!", "Munch munch!"],
  meow:   ["Nom nom!", "Meow!", "Yum!", "More?"],
  purr:   ["Purrr…", "Mmmm…", "Prrrp!"]
};
let bowlSayTimer = null;
export function paintBowl(){
  const tin = tinOf(me().id), left = tin.length;
  $("#treatCount").textContent = left;
  $("#treatWord").textContent = left === 1 ? "treat" : "treats";
  const host = $("#tin");
  host.textContent = "";
  host.classList.toggle("empty", left === 0);
  if (!left){
    const p = document.createElement("p");
    p.className = "tinempty";
    p.textContent = "No treats yet — finish a round to get some.";
    host.append(p);
    return;
  }
  // Two of the same treat is one picture with a little 2 on it, not two pictures.
  // Kept in TREATS order so the tin does not reshuffle itself as they are eaten.
  const counts = new Map();
  tin.forEach(f => counts.set(f, (counts.get(f) || 0) + 1));
  TREATS.filter(f => counts.has(f)).forEach(food => {
    const n = counts.get(food);
    const b = document.createElement("button");
    b.type = "button";
    const face = document.createElement("span");
    face.className = "face";
    face.textContent = food;
    b.append(face);
    if (n > 1){
      const tag = document.createElement("span");
      tag.className = "count";
      tag.textContent = n;
      b.append(tag);
    }
    b.setAttribute("aria-label", n > 1 ? `Feed Numo one of your ${n}` : "Feed this treat to Numo");
    b.addEventListener("pointerdown", e => liftTreat(e, b, food));
    host.append(b);
  });
}

function feedNumo(food){
  const st = statsOf(me().id), tin = tinOf(me().id);
  const at = tin.indexOf(food);
  if (at < 0) return;                             // not in the tin — nothing to give
  tin.splice(at, 1);
  st.fed = (st.fed || 0) + 1;
  st.holding = null;                              // paws full — he puts the toy down
  save();
  paintHeld();
  const kind = TREAT_SOUND[food] || "meow";
  const bite = $("#bowlFood"), cat = $("#bowlCat"), say = $("#bowlSay");
  bite.textContent = food;
  bite.classList.remove("fly"); cat.classList.remove("chomp");
  void bite.offsetWidth;
  bite.classList.add("fly"); cat.classList.add("chomp");
  say.textContent = pick(NOMS_BY[kind]);
  say.classList.add("on");
  clearTimeout(bowlSayTimer);
  bowlSayTimer = setTimeout(() => say.classList.remove("on"), 1700);
  if (kind === "crunch") sndCrunch();
  else if (kind === "slurp") sndSlurp();
  else if (kind === "purr") sndPurr();
  else sndMeow(.9 + Math.random() * .3);
  paintBowl();
}

/* ---------- dragging a treat to Numo ---------- */
// Pointer events rather than HTML5 drag-and-drop, which barely works on a tablet.
// A plain tap feeds too, so a small child who cannot drag is never stuck.
let ghost = null, ghostFood = null, ghostFrom = null, ghostAt = null, ghostMoved = 0;
function liftTreat(e, btn, food){
  if (btn.disabled || ghost) return;
  e.preventDefault();
  ghostFood = food; ghostFrom = btn; ghostMoved = 0;
  ghostAt = { x: e.clientX, y: e.clientY };
  ghost = document.createElement("div");
  ghost.className = "ghost";
  ghost.textContent = food;
  document.body.append(ghost);
  moveGhost(e.clientX, e.clientY);
  btn.classList.add("lifted");
  try { btn.setPointerCapture(e.pointerId); } catch {}
  btn.addEventListener("pointermove", dragTreat);
  btn.addEventListener("pointerup", dropTreat);
  btn.addEventListener("pointercancel", dropTreat);
}
function moveGhost(x, y){ if (ghost){ ghost.style.left = x + "px"; ghost.style.top = y + "px"; } }
function dragTreat(e){
  if (!ghost) return;
  ghostMoved += Math.abs(e.clientX - ghostAt.x) + Math.abs(e.clientY - ghostAt.y);
  ghostAt = { x: e.clientX, y: e.clientY };
  moveGhost(e.clientX, e.clientY);
  const over = onNumo(e.clientX, e.clientY);
  $("#bowlCat").style.transform = over ? "scale(1.16)" : "";
}
function onNumo(x, y){
  const r = $("#catDrop").getBoundingClientRect();
  const pad = 22;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}
function dropTreat(e){
  const btn = ghostFrom, food = ghostFood;
  if (btn){
    btn.classList.remove("lifted");
    btn.removeEventListener("pointermove", dragTreat);
    btn.removeEventListener("pointerup", dropTreat);
    btn.removeEventListener("pointercancel", dropTreat);
  }
  if (ghost){ ghost.remove(); ghost = null; }
  $("#bowlCat").style.transform = "";
  const tap = ghostMoved < 10;                    // never dragged — count it as a tap
  ghostFood = ghostFrom = null;
  if (e.type !== "pointercancel" && (tap || onNumo(e.clientX, e.clientY))) feedNumo(food);
}

