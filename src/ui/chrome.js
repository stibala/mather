import { DB, me, save, statsOf } from "../core/db.js";
import { $, show } from "../core/dom.js";
import { sndTap } from "../core/audio.js";
import { closeAddPlayer } from "./setup.js";
import { S, startRound, typeKey } from "./quiz.js";
import { renderProgress } from "./progress.js";
import { closeSticker, svStep } from "./stickers.js";
import { exportCSV, importCSV } from "./csv.js";

/* ============================ chrome ============================ */
export function paintCoins(){ $("#coinVal").textContent = statsOf(me().id).coins; }
export function applyTheme(){
  const t = DB.theme;
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}
$("#themeBtn").onclick = () => {
  DB.theme = DB.theme === "system" ? "dark" : DB.theme === "dark" ? "light" : "system";
  save(); applyTheme(); sndTap();
};
$("#soundBtn").onclick = () => {
  DB.sound = !DB.sound; save();
  $("#soundBtn").setAttribute("aria-pressed", String(DB.sound));
  $("#soundWaves").style.opacity = DB.sound ? "1" : ".2";
  if (DB.sound) sndTap();
};
$("#chartBtn").onclick  = () => {
  sndTap();
  if ($("#progress").hidden) renderProgress();
  else show("setup");                          // tapping it again comes back out
};
$("#playBtn").onclick   = () => { sndTap(); show("setup"); };
$("#startBtn").onclick  = () => { sndTap(); startRound(); };
$("#againBtn").onclick  = () => { sndTap(); startRound(); };
$("#backBtn").onclick   = () => { sndTap(); show("setup"); };
$("#quitBtn").onclick   = () => { sndTap(); if (S) S.alive = false; show("setup"); };
$("#exportBtn").onclick = exportCSV;
$("#importBtn").onclick = () => $("#importFile").click();
$("#importFile").onchange = e => { if (e.target.files[0]) importCSV(e.target.files[0]); e.target.value = ""; };

$("#bubble").addEventListener("click", () => { if (S && S.waiting) typeKey("ok"); });
$("#pad").addEventListener("click", e => {
  const k = e.target.closest(".key");
  if (k) typeKey(k.dataset.k);
});
addEventListener("keydown", e => {
  if (!$("#playerAdd").hidden){                 // the name field owns the keyboard
    if (e.key === "Escape") closeAddPlayer();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (!$("#stickerView").hidden){
    if (e.key === "Escape"){ e.preventDefault(); closeSticker(); }
    else if (e.key === "ArrowLeft"){ e.preventDefault(); svStep(-1); }
    else if (e.key === "ArrowRight"){ e.preventDefault(); svStep(1); }
    return;
  }
  if ($("#quiz").hidden) {
    if (e.key === "Enter" && !$("#setup").hidden){ e.preventDefault(); $("#startBtn").click(); }
    if (e.key === "Enter" && !$("#result").hidden){ e.preventDefault(); $("#againBtn").click(); }
    return;
  }
  if (e.key >= "0" && e.key <= "9"){ e.preventDefault(); typeKey(e.key); }
  else if (e.key === "Backspace"){ e.preventDefault(); typeKey("del"); }
  else if (e.key === "Enter" || e.key === "="){ e.preventDefault(); typeKey("ok"); }
  else if (e.key === "Escape"){ if (S) S.alive = false; show("setup"); }
});

