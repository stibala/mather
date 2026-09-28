import { flushCrate } from "../ui/crate.js";

/* ============================ helpers ============================ */
const $ = s => document.querySelector(s);
export const rnd = (a,b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const SCREENS = ["setup","quiz","result","progress"];
export function show(name){
  SCREENS.forEach(s => { $("#"+s).hidden = (s !== name); });
  // one bowl, moved to whichever screen is up — feeding should not be something
  // you can only do in the moment after a round ends
  const slot = name === "progress" ? $("#bowlSlotProgress") : $("#bowlSlotResult");
  if (slot && $("#bowlPanel").parentNode !== slot) slot.append($("#bowlPanel"));
  $("#bowlPanel").hidden = (name !== "result" && name !== "progress");
  if (name !== "result" && name !== "progress") flushCrate();
  $("#chartBtn").setAttribute("aria-pressed", String(name === "progress"));
  window.scrollTo(0, 0);
}

/* ---------- a word to the user, without a browser dialog ---------- */
let toastTimer = null;
export function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

