import { DB } from "./core/db.js";
import { $, SCREENS, show } from "./core/dom.js";
import { paintOpts, renderPlayers } from "./ui/setup.js";
import { S, catWatch, paintEq } from "./ui/quiz.js";
import { paintHeld } from "./ui/held.js";
import { paintBowl } from "./ui/bowl.js";
import { applyTheme, paintCoins } from "./ui/chrome.js";

/* ============================ boot ============================ */
function boot(hot){
  applyTheme();
  $("#soundBtn").setAttribute("aria-pressed", String(DB.sound));
  $("#soundWaves").style.opacity = DB.sound ? "1" : ".2";
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
