import { FACES, TREATS, tinOf } from "./core/prizes.js";
import { DB, save } from "./core/db.js";
import { $, SCREENS, pick, show } from "./core/dom.js";
import { mountCats } from "./ui/mascot.js";
import { paintOpts, renderPlayers } from "./ui/setup.js";
import { S, catWatch, paintEq } from "./ui/quiz.js";
import { paintHeld } from "./ui/held.js";
import { paintBowl } from "./ui/bowl.js";
import { applyTheme, paintCoins } from "./ui/chrome.js";

/* ============================ boot ============================ */
// A hook for trying things out without grinding through rounds:
//   ?player=adam&treats=12
// selects that player, creating them if they are new, drops treats in their tin,
// then scrubs itself out of the address bar so a reload does not do it twice.
// Does nothing at all unless asked.
const COLORS = ["#2E86FF", "#0FA863", "#7C5CFF", "#FFC531", "#F0347B", "#FF7A1A"];
function devSeed(){
  let p;
  try { p = new URLSearchParams(location.search); } catch { return; }
  if (!p.has("treats") && !p.has("player")) return;
  const name = (p.get("player") || "").trim().slice(0, 14);
  if (name){
    let who = DB.profiles.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!who){
      who = { id: "p" + Date.now().toString(36), name,
              face: pick(FACES), color: COLORS[DB.profiles.length % COLORS.length] };
      DB.profiles.push(who);
    }
    DB.active = who.id;
  }
  const n = Math.max(0, Math.min(40, parseInt(p.get("treats"), 10) || 0));
  for (let i = 0; i < n; i++) tinOf(DB.active).push(pick(TREATS));
  save();
  try { history.replaceState(null, "", location.pathname); } catch {}
}

function boot(hot){
  devSeed();
  applyTheme();
  $("#soundBtn").setAttribute("aria-pressed", String(DB.sound));
  $("#soundWaves").style.opacity = DB.sound ? "1" : ".2";
  mountCats();                                    // both Numos, from one template
  renderPlayers();
  paintOpts();
  paintCoins();
  paintBowl();
  paintHeld();
  if (hot && hot.screen === "quiz" && hot.S){
    S = hot.S; S.seen = new Set(hot.S.seen || []);
    show("quiz"); paintEq();
    $("#qCount").textContent = `${S.i} / ${S.n}`;
    $("#fill").style.width = ((S.i - 1) / S.n * 100) + "%";
    catWatch();
  } else {
    show("setup");
  }
}
try {
  window.claude?.hot?.snapshot?.(() => ({
    screen: SCREENS.find(s => !$("#" + s).hidden),
    S: S ? { ...S, seen: [...S.seen] } : null
  }));
} catch {}
if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
else boot(window.claude?.hot?.data ?? null);
})();
