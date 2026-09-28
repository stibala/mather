import { FACES, TREATS, TREAT_COST, tinOf } from "./core/prizes.js";
import { DB, histOf, me, save, statsOf } from "./core/db.js";
import { $, SCREENS, pick, show } from "./core/dom.js";
import { mountCats } from "./ui/mascot.js";
import { paintOpts, renderPlayers } from "./ui/setup.js";
import { S, catWatch, paintEq } from "./ui/quiz.js";
import { paintHeld } from "./ui/held.js";
import { paintBowl } from "./ui/bowl.js";
import { confetti, finish } from "./ui/result.js";
import { applyTheme, paintCoins } from "./ui/chrome.js";

/* ============================ boot ============================ */
// A hook for trying things out without grinding through rounds:
//   ?player=adam&treats=12&confetti=1&crate=4
// selects that player, creating them if they are new, drops treats in their tin,
// sets the confetti off, leaves a crate of four waiting to be opened, then scrubs
// itself out of the address bar so a reload does not do it twice. Does nothing at
// all unless asked.
const COLORS = ["#2E86FF", "#0FA863", "#7C5CFF", "#FFC531", "#F0347B", "#FF7A1A"];
const HOOKS = ["player", "treats", "confetti", "crate"];
let devCrate = 0;                                   // acted on once the page is painted
function devSeed(){
  let p;
  try { p = new URLSearchParams(location.search); } catch { return; }
  if (!HOOKS.some(k => p.has(k))) return;
  devCrate = Math.max(0, Math.min(20, parseInt(p.get("crate"), 10) || 0));
  if (p.has("confetti")) setTimeout(confetti, 400);   // after the first paint
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

// ?crate=N lands you on the results screen with a crate of N treats shut in front
// of you, so the reveal can be watched without playing a round. It goes through
// the real finish(), so the coins, the treats and any sticker the new total
// crosses are worked out exactly as they are after a real round — the only
// invented part is the round itself, and that is taken back out of the history
// afterwards so the stats screen keeps telling the truth.
function devRound(treats){
  const st = statsOf(me().id), h = histOf(me().id), rows = h.length;
  S = { alive: true, n: 10, i: 11, right: 9, best: 0, coins: treats * TREAT_COST,
        times: Array.from({ length: 10 }, () => 3 + Math.random() * 3),
        seen: new Set(), misses: [], settings: { ...DB.settings } };
  finish();
  h.length = rows;                                  // the round never happened
  st.questions -= 10;
  save();
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
  } else if (devCrate){
    devRound(devCrate);
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
