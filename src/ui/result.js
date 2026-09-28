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
// It used to stop dead at 2.6 s, wiping whatever was still mid-air. Now the pieces
// fall under gravity, pile up along the bottom of the screen, sit there a moment,
// and only then fade — so the ending is the confetti finishing rather than the
// canvas being switched off.
//
// The pile is faked per column rather than by letting pieces collide: the screen is
// divided into strips, each strip remembers how deep its heap is, and a piece lands
// on top of whatever is already in its strip. Real collision between 110 pieces
// would be a lot of work for a heap nobody inspects; this gives the same picture —
// deeper where more of it fell — for about ten lines.
const CONFETTI_REST = 1000;                      // ms the pile sits before fading
const CONFETTI_FADE = 1100;                      // ms to fade away
const CONFETTI_MAX = 11000;                      // a hard stop, in case one gets stuck
const CONFETTI_COLS = 22;
export function confetti(){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("#confetti"), ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const cols = ["--tangerine","--berry","--leaf","--sun","--ocean","--grape"].map(v => css.getPropertyValue(v).trim());
  const bits = Array.from({ length: 110 }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6,
    w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
    vy: 1.2 + Math.random() * 1.7, vx: -.7 + Math.random() * 1.4,
    a: Math.random() * Math.PI, va: -.14 + Math.random() * .28,
    sway: Math.random() * Math.PI * 2, swayRate: .02 + Math.random() * .03,
    c: pick(cols), rest: false
  }));
  const heap = new Array(CONFETTI_COLS).fill(0);
  const strip = innerWidth / CONFETTI_COLS;
  const t0 = performance.now();
  let settled = null;                            // when the last piece came to rest
  (function frame(t){
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alpha = 1;
    if (settled !== null && t - settled > CONFETTI_REST){
      alpha = 1 - (t - settled - CONFETTI_REST) / CONFETTI_FADE;
      if (alpha <= 0) return;                    // canvas already cleared above
    }
    ctx.globalAlpha = Math.max(0, alpha);
    let flying = false;
    bits.forEach(b => {
      if (!b.rest){
        b.vy += .06;                             // gravity, so they accelerate down
        b.sway += b.swayRate;
        b.x += b.vx + Math.sin(b.sway) * .7;     // and flutter on the way
        b.y += b.vy;
        b.a += b.va;
        const col = Math.max(0, Math.min(CONFETTI_COLS - 1, Math.floor(b.x / strip)));
        const floor = innerHeight - heap[col] - b.h / 2;
        if (b.y >= floor){
          b.y = floor;
          b.rest = true;
          heap[col] += b.h * .42;                // pieces overlap as they pile
          b.a = Math.PI / 2 + (Math.random() - .5) * .6;   // settle roughly flat
        } else flying = true;
      }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h); ctx.restore();
    });
    ctx.globalAlpha = 1;
    if (!flying && settled === null) settled = t;
    if (t - t0 > CONFETTI_MAX && settled === null) settled = t;
    requestAnimationFrame(frame);
  })(t0);
}



