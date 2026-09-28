import { DB } from "../core/db.js";
import { $, pick, show } from "../core/dom.js";
import { sndMeow, sndRight, sndTap, sndWrong } from "../core/audio.js";
import { UNARY } from "../gen/sums.js";
import { clockSVG, dayPartOf, isTimeQ, parseTypedTime, showTyped } from "../gen/clock.js";
import { lineSVG } from "../gen/line.js";
import { wallSVG, wallState } from "../gen/wall.js";
import { factText, makeQuestion, moneySVG, moneyText, moneyTyped } from "../gen/money.js";
import { finish } from "./result.js";

/* ============================ the round ============================ */
export let S = null;   // live session

export function startRound(){
  const s = DB.settings;
  S = {
    n: s.count, i: 0, right: 0, streak: 0, best: 0, coins: 0,
    seen: new Set(), misses: [], times: [], q: null, typed: "", t0: 0, locked: false, waiting: false, alive: true,
    settings: { ...s, ops: [...s.ops] }
  };
  wallState = null;
  show("quiz");
  nextQuestion();
}
function nextQuestion(){
  S.i++;
  S.q = makeQuestion(S.settings, S.seen);
  S.typed = "";
  S.locked = false;
  S.waiting = false;
  $("#pad").classList.remove("await");
  $("#bubble").classList.remove("await");
  $("#pad").querySelector(".key.ok").setAttribute("aria-label", "Check answer");
  S.t0 = performance.now();
  paintEq();
  $("#qCount").textContent = `${S.i} / ${S.n}`;
  $("#fill").style.width = ((S.i - 1) / S.n * 100) + "%";
  setFace("idle");
  say(S.q.kind === "clock" ? (S.q.task === "span" ? "Count the minutes" : "What time is it?") : "Type your answer", "");
  if (S.q.kind === "line") say("Read it off the line", "");
  if (S.q.kind === "wall") say("Two bricks make the one above", "");
  if (S.q.kind === "money") say("Type the cents — they fill in from the right", "");
  catWatch();
}
export function paintEq(state){
  const q = S.q, host = $("#eq");
  host.textContent = "";
  $("#clockHost").hidden = q.kind !== "clock";
  const fig = q.kind === "line" || q.kind === "wall" || q.kind === "money";
  $("#figHost").hidden = !fig;
  $("#stage").classList.toggle("wide", fig);
  if (q.kind === "clock"){ host.className = "eq time"; paintClock(state); return; }
  host.className = "eq";
  if (q.kind === "line"){ paintLine(state); return; }
  if (q.kind === "wall"){ paintWall(state); return; }
  if (q.kind === "money"){ paintMoney(state); return; }
  const cell = (val, idx) => {
    if (idx === q.slot){
      const b = document.createElement("span");
      b.className = "slot" + (S.typed ? " filled" : "") + (state ? " " + state : "");
      if (S.typed) b.textContent = S.typed;
      else b.innerHTML = '<span class="caret"></span>';
      return b;
    }
    const n = document.createElement("span");
    n.textContent = val;
    return n;
  };
  const eqs = document.createElement("span"); eqs.className = "eqs"; eqs.textContent = "=";
  if (UNARY[q.op]){
    const w = document.createElement("span"); w.className = "word"; w.textContent = UNARY[q.op];
    host.append(w, cell(q.x, 0), eqs, cell(q.z, 2));
    host.setAttribute("aria-label", `${UNARY[q.op]} ${q.slot === 0 ? "what" : q.x} equals ${q.slot === 2 ? "what" : q.z}`);
    return;
  }
  const op = document.createElement("span"); op.className = "op"; op.textContent = q.op;
  host.append(cell(q.x, 0), op, cell(q.y, 1), eqs, cell(q.z, 2));
  host.setAttribute("aria-label", `${q.slot === 0 ? "what" : q.x} ${q.op} ${q.slot === 1 ? "what" : q.y} equals ${q.slot === 2 ? "what" : q.z}`);
}
function paintClock(state){
  const q = S.q, t = S.typed, host = $("#eq");
  const span = q.task === "span";
  $("#daypart").hidden = q.twelve || span;      // only a 24-hour face needs the hint
  if (!q.twelve && !span){
    const part = dayPartOf(q.h);
    $("#daypart").textContent = `${part.icon} ${part.label}`;
  }
  $("#clockPrompt").hidden = !q.ask;
  if (q.ask) $("#clockPrompt").textContent = q.ask;
  $("#clockFace").innerHTML = span
    ? `<div class="clockpair">
         <figure>${clockSVG(q.h, q.m)}<figcaption>from</figcaption></figure>
         <span class="clockarrow" aria-hidden="true">→</span>
         <figure>${clockSVG(q.eh, q.em)}<figcaption>to</figcaption></figure>
       </div>`
    : clockSVG(q.h, q.m, q.task === "later" ? q.span : 0);
  const chip = $("#spanChip");
  chip.hidden = q.task !== "later";
  if (q.task === "later") chip.textContent = `+ ${q.span} minutes`;
  const box = document.createElement("span");
  box.className = "slot" + (span ? "" : " time") + (t ? " filled" : "") + (state ? " " + state : "");
  if (t) box.textContent = span ? t : showTyped(t);
  else box.innerHTML = span ? '<span class="caret"></span>' : '<span class="ph">•:••</span>';
  host.append(box);
  if (span){
    const mins = document.createElement("span");
    mins.className = "word"; mins.textContent = "minutes";
    host.append(mins);
  }
  host.setAttribute("aria-label", q.ask || (q.twelve
    ? "What time is it? Type the hour, then the minutes."
    : `What time is it? It is ${dayPartOf(q.h).label}. Type the hour, then the minutes.`));
}

function paintLine(state){
  const q = S.q, host = $("#eq");
  $("#figPrompt").textContent = q.ask;
  $("#figArt").innerHTML = lineSVG(q);
  const box = document.createElement("span");
  box.className = "slot" + (S.typed ? " filled" : "") + (state ? " " + state : "");
  if (S.typed) box.textContent = S.typed;
  else box.innerHTML = '<span class="caret"></span>';
  host.append(box);
  host.setAttribute("aria-label", q.ask);
}

// The wall takes its answer in the brick itself, so there is no separate box.
function paintWall(state){
  const q = S.q;
  $("#figPrompt").textContent = q.ask;
  $("#figArt").innerHTML = wallSVG(q, S.typed, state);
  $("#eq").setAttribute("aria-label", q.ask);
}
function paintMoney(state){
  const q = S.q, host = $("#eq");
  $("#figPrompt").textContent = q.ask;
  $("#figArt").innerHTML = moneySVG(q);
  const box = document.createElement("span");
  box.className = "slot cash" + (S.typed ? " filled" : "") + (state ? " " + state : "");
  if (S.typed) box.textContent = moneyTyped(q, S.typed);
  else box.innerHTML = `<span class="ph">${q.whole ? "— €" : "0,00 €"}</span>`;
  host.append(box);
  host.setAttribute("aria-label", q.ask);
}

export function say(text, kind){ const el = $("#say"); el.textContent = text; el.className = "say" + (kind ? " " + kind : ""); }

const MOUTHS = {
  idle:  "M52 88 q8 7 16 0",
  happy: "M46 84 q14 16 28 0",
  oops:  "M52 92 q8 -8 16 0",
  wow:   "M54 84 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0",
  sleep: "M56 90 q4 3 8 0"
};
function setFace(kind){
  const m = $("#mascot");
  $("#mouth").setAttribute("d", MOUTHS[kind] || MOUTHS.idle);
  m.classList.remove("hop", "shake", "look", "tilt", "yawn", "sleep");
  void m.offsetWidth;
  if (kind === "happy" || kind === "wow") m.classList.add("hop");
  if (kind === "oops") m.classList.add("shake");
}

/* The cat gets bored while a question sits unanswered: it looks around, then
   meows, then yawns and dozes off. Any key wakes it and starts the clock over.
   Purely for show - the answer time is measured the same as always. */
const MEOWS = ["Meow?", "Mrrrow?", "Purr…", "Meow!"];
let boredTimers = [], purrTimer = null;
const answering = () => S && S.alive && !S.locked && !S.waiting && !$("#quiz").hidden;
function catClear(){
  const m = $("#mascot");
  m.classList.remove("look", "tilt", "yawn", "sleep");
  $("#purr").classList.remove("on");
}
function catMeow(text){
  const el = $("#purr");
  el.textContent = text;
  el.classList.add("on");
  clearTimeout(purrTimer);
  purrTimer = setTimeout(() => el.classList.remove("on"), 2200);
  // Heard at most once a round; after that the cat only meows in its bubble.
  if (!S.meowed){ S.meowed = true; sndMeow(); }
}
function catStop(){
  boredTimers.forEach(clearTimeout);
  boredTimers = [];
  const wasAsleep = $("#mascot").classList.contains("sleep");
  catClear();
  return wasAsleep;
}
export function catWatch(){
  catStop();
  const at = (secs, fn) => boredTimers.push(setTimeout(() => { if (answering()) fn(); }, secs * 1000));
  const m = $("#mascot");
  at(10, () => { catClear(); void m.offsetWidth; m.classList.add("look"); });
  at(18, () => { catClear(); void m.offsetWidth; m.classList.add("tilt"); if (!document.hidden) catMeow(pick(MEOWS)); });
  at(28, () => { catClear(); void m.offsetWidth; m.classList.add("yawn"); });
  at(30.2, () => { catClear(); $("#mouth").setAttribute("d", MOUTHS.sleep); m.classList.add("sleep"); });
}
// Called on every key. A sleeping cat jumps awake before settling back down.
function catNudge(){
  const wasAsleep = catStop();
  if (wasAsleep){ setFace("wow"); setTimeout(() => { if (answering()) setFace("idle"); }, 600); }
  else if ($("#mouth").getAttribute("d") !== MOUTHS.idle && answering()) setFace("idle");
  if (answering()) catWatch();
}

export function typeKey(k){
  catNudge();
  if (S.waiting){                      // showing the right answer — only ✓ moves on
    if (k === "ok"){ S.waiting = false; advance(); }
    return;
  }
  if (S.locked) return;
  if (k === "del"){ S.typed = S.typed.slice(0, -1); sndTap(); paintEq(); return; }
  if (k === "ok"){ submit(); return; }
  if (S.typed.length >= (S.q.maxDigits || 3)) return;
  if (!S.q.keepZeros && S.typed === "0") S.typed = "";   // 7 not 07 — but 07:30 keeps its zero
  S.typed += k;
  sndTap();
  paintEq();
}

const CHEERS  = ["Yes!","Nice one!","Spot on!","You got it!","Brilliant!","Exactly right!"];
const STREAKS = ["Three in a row!","On fire!","Unstoppable!","Wow, keep going!"];

function submit(){
  if (S.locked || S.typed === "") return;
  const q = S.q;
  const timed = isTimeQ(q);
  const asTime = timed ? parseTypedTime(S.typed) : null;
  if (timed && !asTime){
    say("Type the hour and both minute numbers", "bad");
    return;
  }
  const right = timed ? (asTime.h === q.ansH && asTime.m === q.ansM)
                      : parseInt(S.typed, 10) === q.answer;
  const shown = timed ? showTyped(S.typed)
              : q.kind === "money" ? moneyTyped(q, S.typed) : S.typed;
  const secs = (performance.now() - S.t0) / 1000;
  S.times.push(secs);
  S.locked = true;
  catStop();

  if (right){
    S.right++; S.streak++; S.best = Math.max(S.best, S.streak);
    const bonus = S.streak % 5 === 0 ? 1 : 0;      // a little extra every 5 in a row
    S.coins += 1 + bonus;
    paintEq("good");
    setFace(S.streak >= 3 ? "wow" : "happy");
    sndRight();
    say(S.streak >= 3 ? pick(STREAKS) : pick(CHEERS), "good");
    $("#streak").classList.toggle("on", S.streak >= 2);
    $("#streakVal").textContent = S.streak;
    setTimeout(advance, 700);
  } else {
    S.streak = 0;
    $("#streak").classList.remove("on");
    S.misses.push({ text: factText(q), given: shown, answer: q.answer });
    paintEq("bad");
    setFace("oops");
    sndWrong();
    $("#bubble").classList.add("buzz");
    setTimeout(() => $("#bubble").classList.remove("buzz"), 450);
    const solution = q.kind === "money" ? moneyText(q) : q.answer;
    say(`Not quite — the answer is ${solution}`, "bad");
    // Fill the right answer in, then wait for the child instead of moving on by
    // itself. The short delay first stops a key that was already on its way
    // down from skipping past the answer unseen.
    setTimeout(() => {
      if (!S || !S.alive) return;
      S.typed = isTimeQ(q) ? q.digits : String(q.answer);
      paintEq("good");
      S.waiting = true;
      say(`${factText(q)} — press ✓ when you have had a look`, "bad");
      $("#pad").classList.add("await");
      $("#bubble").classList.add("await");
      $("#pad").querySelector(".key.ok").setAttribute("aria-label", "Next question");
    }, 850);
  }
}
function advance(){
  if (!S || !S.alive) return;
  if (S.i >= S.n) finish();
  else nextQuestion();
}

