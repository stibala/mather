import { prizeOf, prizesFor } from "../core/prizes.js";
import { me, save, statsOf } from "../core/db.js";
import { $, toast } from "../core/dom.js";
import { sndRight, sndTap } from "../core/audio.js";
import { closeSticker, earnedCount, paintSticker, svIndex } from "./stickers.js";

/* ---------- what Numo is carrying ---------- */
// A sticker you can only look at is a poor prize, so it can be handed over. Numo
// keeps it through the next questions; a treat makes him put it down to eat.
const heldOf = id => {
  const i = statsOf(id).holding;
  return Number.isInteger(i) && i < prizesFor(statsOf(id).coins) ? i : null;
};
export function paintHeld(){
  const i = heldOf(me().id), on = i !== null;
  ["#heldQuiz", "#heldBowl"].forEach(sel => {
    const el = $(sel);
    el.hidden = !on;
    if (!on) return;
    el.textContent = prizeOf(i).e;
  });
}
function flashHeld(){
  paintHeld();
  ["#heldQuiz", "#heldBowl"].forEach(sel => {
    const el = $(sel);
    el.classList.remove("fresh"); void el.offsetWidth; el.classList.add("fresh");
  });
}
function giveToNumo(){
  const st = statsOf(me().id);
  if (svIndex >= earnedCount()) return;
  if (st.holding === svIndex){                    // already his — take it back
    st.holding = null; save(); paintHeld(); paintSticker();
    toast(`Numo gives the ${prizeOf(svIndex).n} back`);
    return;
  }
  st.holding = svIndex;
  save();
  const art = $("#svArt");
  art.classList.remove("given"); void art.offsetWidth; art.classList.add("given");
  sndRight();
  const name = prizeOf(svIndex).n;
  setTimeout(() => {
    art.classList.remove("given");
    closeSticker();
    flashHeld();
    toast(`Numo has the ${name}!`);
  }, 430);
}
$("#giveBtn").onclick = () => { sndTap(); giveToNumo(); };

