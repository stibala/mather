import { PRIZES, THRESH, TREAT_COST, prizeOf, prizesFor, tierOf, treatsEarned } from "../core/prizes.js";
import { me, statsOf } from "../core/db.js";
import { $ } from "../core/dom.js";
import { sndTap } from "../core/audio.js";
import { closeAddPlayer, commitAddPlayer } from "./setup.js";

/* ---------- tap a sticker to see it big ---------- */
export const earnedCount = () => prizesFor(statsOf(me().id).coins);
export const bestPrize = id => { const k = prizesFor(statsOf(id).coins); return k ? { p: prizeOf(k - 1), t: tierOf(k - 1) } : null; };

export function stickerButton(i, locked, isNew){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sticker" + (locked ? " locked" : "") + (isNew ? " new" : "");
  b.dataset.i = i;
  if (!locked){
    const t = tierOf(i);
    b.style.setProperty("--ring", t.ring);
    b.style.setProperty("--glow", t.glow);
    b.classList.add("won");
  }
  b.textContent = locked ? "?" : prizeOf(i).e;
  b.setAttribute("aria-label", locked ? "Not earned yet"
    : `${prizeOf(i).n}, a ${tierOf(i).name} ${tierOf(i).kind}. Tap to see it bigger.`);
  b.onclick = () => { sndTap(); openSticker(i); };
  return b;
}

// How close is this child to the next sticker?
export function renderCoinBar(host){
  const coins = statsOf(me().id).coins, earned = prizesFor(coins);
  // Every sticker won: the bar turns to the treats, which never run out.
  const done = earned >= PRIZES.length;
  const from = done ? treatsEarned(coins) * TREAT_COST : earned ? THRESH[earned - 1] : 0;
  const to   = done ? from + TREAT_COST : THRESH[earned];
  const into = coins - from, need = to - from, togo = to - coins;
  const what = done ? "treat" : tierOf(earned).kind;
  host.textContent = "";
  const track = document.createElement("div");
  track.className = "track coin";
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `${into} of ${need} coins towards the next ${tierOf(earned).kind}`);
  const fill = document.createElement("div");
  fill.className = "fill";
  track.append(fill);
  const note = document.createElement("p");
  note.className = "coin-note";
  note.innerHTML = "<b></b> more coins to the next " + what;
  note.firstElementChild.textContent = togo;
  if (togo === 1) note.lastChild.textContent = " more coin to the next " + what;
  host.append(track, note);
  requestAnimationFrame(() => { fill.style.width = (into / need * 100) + "%"; });
}

export let svIndex = 0, svReturn = null;
function openSticker(i){
  svIndex = Math.max(0, Math.min(i, earnedCount()));
  paintSticker();
  svReturn = document.activeElement;
  $("#stickerView").hidden = false;
  $("#svClose").focus();
}
export function closeSticker(){
  $("#stickerView").hidden = true;
  if (svReturn && svReturn.isConnected) svReturn.focus();
}
export function svStep(d){
  svIndex = Math.max(0, Math.min(svIndex + d, earnedCount()));
  paintSticker();
}
export function paintSticker(){
  const earned = earnedCount();
  const locked = svIndex >= earned, t = tierOf(svIndex), art = $("#svArt");
  art.classList.toggle("locked", locked);
  art.style.setProperty("--ring", locked ? "var(--line)" : t.ring);
  art.style.setProperty("--glow", locked ? "var(--surface-2)" : t.glow);
  art.textContent = locked ? "?" : prizeOf(svIndex).e;
  $("#svName").textContent = locked ? "Not yet!" : prizeOf(svIndex).n;
  $("#svMeta").textContent = locked
    ? `A ${t.name} ${t.kind}, still hidden`
    : `${t.name} ${t.kind} · number ${svIndex + 1} · earned at ${THRESH[svIndex]} coins`;
  $("#svBar").hidden = !locked;
  if (locked) renderCoinBar($("#svBar"));
  const give = $("#giveBtn");
  give.hidden = locked;
  if (!locked) give.textContent = statsOf(me().id).holding === svIndex ? "Take it back" : "Give to Numo";
  $("#svPrev").disabled = svIndex <= 0;
  $("#svNext").disabled = svIndex >= earned;
}
$("#paClose").onclick  = () => { sndTap(); closeAddPlayer(); };
$("#paCancel").onclick = () => { sndTap(); closeAddPlayer(); };
$("#paAdd").onclick    = () => { sndTap(); commitAddPlayer(); };
$("#paName").addEventListener("keydown", e => {
  if (e.key === "Enter"){ e.preventDefault(); commitAddPlayer(); }
  if (e.key === "Escape"){ e.preventDefault(); closeAddPlayer(); }
});
$("#playerAdd").addEventListener("click", e => { if (e.target === $("#playerAdd")) closeAddPlayer(); });

$("#svClose").onclick = () => { sndTap(); closeSticker(); };
$("#svPrev").onclick  = () => { sndTap(); svStep(-1); };
$("#svNext").onclick  = () => { sndTap(); svStep(1); };
$("#stickerView").addEventListener("click", e => { if (e.target === $("#stickerView")) closeSticker(); });

