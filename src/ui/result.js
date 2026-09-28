import { PRIZES, prizesFor, treatsEarned } from "../core/prizes.js";
import { histOf, me, save, statsOf } from "../core/db.js";
import { $, pick, show } from "../core/dom.js";
import { sndDone } from "../core/audio.js";
import { S } from "./quiz.js";
import { paintHeld } from "./held.js";
import { crateQueue, packCrate } from "./crate.js";
import { paintBowl } from "./bowl.js";
import { renderCoinBar, stickerButton } from "./stickers.js";
import { paintCoins } from "./chrome.js";

/* ============================ finish ============================ */
export function finish(){
  if (!S.alive) return;
  S.alive = false;
  $("#fill").style.width = "100%";
  const acc = S.right / S.n * 100;
  const avg = S.times.reduce((a, b) => a + b, 0) / S.times.length;
  const p = me(), st = statsOf(p.id);

  const coinsBefore = st.coins;
  st.coins += S.coins;
  st.questions += S.n;
  st.bestStreak = Math.max(st.bestStreak, S.best);
  histOf(p.id).push({
    ts: new Date().toISOString(),
    acc: +acc.toFixed(2), avgTime: +avg.toFixed(2), n: S.n,
    mode: S.settings.mode,
    ops: S.settings.mode === "clock" ? "clock" : S.settings.ops.join(""),
    range: S.settings.range, style: S.settings.style, cross: S.settings.cross,
    minutes: S.settings.minutes, daypart: S.settings.daypart, system: S.settings.system,
    lineTo: S.settings.lineTo, lineTask: S.settings.lineTask,
    wallRows: S.settings.wallRows, wallTo: S.settings.wallTo,
    moneyTo: S.settings.moneyTo, moneyTask: S.settings.moneyTask,
    moneyCents: S.settings.moneyCents, clockTask: S.settings.clockTask
  });
  save();

  const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 40 ? 1 : 0;
  $("#starRow").innerHTML = [0,1,2].map(i =>
    `<svg class="star ${i < stars ? "lit" : ""}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
       <path d="M12 2.2l3 6.3 6.8.9-5 4.8 1.3 6.8L12 17.7 5.9 21l1.3-6.8-5-4.8 6.8-.9z"/></svg>`).join("");
  $("#starRow").setAttribute("aria-label", `${stars} out of 3 stars`);
  $("#verdict").textContent =
    stars === 3 ? `Perfect round, ${p.name}!` :
    stars === 2 ? `Great going, ${p.name}!` :
    stars === 1 ? `Good effort, ${p.name}!` :
                  `Tricky one — try again, ${p.name}.`;
  $("#rRight").textContent = `${S.right}/${S.n}`;
  $("#rAcc").textContent   = Math.round(acc) + "%";
  $("#rTime").textContent  = avg.toFixed(1) + "s";
  $("#rCoins").textContent = "+" + S.coins;

  const before = prizesFor(coinsBefore), after = prizesFor(st.coins);
  const won = [];
  for (let i = before; i < after; i++) won.push(i);
  packCrate(treatsEarned(st.coins) - treatsEarned(coinsBefore), won);

  $("#stickerRow").textContent = "";
  if (after >= PRIZES.length){
    $("#stickerHead").innerHTML = 'All 36 stickers! <small>Numo is very impressed</small>';
  } else {
    $("#stickerHead").textContent = "Next sticker";
    $("#stickerRow").append(stickerButton(after, true, false));
  }
  renderCoinBar($("#resultBar"));

  const mp = $("#missPanel");
  if (S.misses.length){
    mp.hidden = false;
    $("#missList").innerHTML = "";
    S.misses.forEach(m => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><span class="yours">you said <s></s></span>`;
      li.firstElementChild.textContent = m.text;
      li.querySelector("s").textContent = m.given;
      $("#missList").append(li);
    });
  } else mp.hidden = true;

  paintCoins();
  paintBowl();
  paintHeld();
  show("result");
  sndDone();
  if (stars >= 2 && !crateQueue.length) confetti();   // the crate brings its own
}

/* ============================ confetti ============================ */
export function confetti(){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("#confetti"), ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const cols = ["--tangerine","--berry","--leaf","--sun","--ocean","--grape"].map(v => css.getPropertyValue(v).trim());
  const bits = Array.from({ length: 110 }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .5,
    w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
    vy: 2.4 + Math.random() * 3.2, vx: -1.4 + Math.random() * 2.8,
    a: Math.random() * Math.PI, va: -.16 + Math.random() * .32,
    c: pick(cols)
  }));
  const t0 = performance.now();
  (function frame(t){
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h); ctx.restore();
    });
    if (t - t0 < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

