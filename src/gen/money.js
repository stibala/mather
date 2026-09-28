import { pick, rnd } from "../core/dom.js";
import { UNARY, makeFact } from "./sums.js";
import { makeClockQuestion, pad2 } from "./clock.js";
import { lineText, makeLineQuestion } from "./line.js";
import { makeWallQuestion } from "./wall.js";

/* ---------- Geld: euros and cents ---------- */
// Amounts are held in cents all the way through; only the display splits them,
// which is also how the child types - the last two digits are always the cents.
const MONEY = [
  { v:1,    kind:"coin", face:"1",    fill:"#C0763F", ring:"#8E5327" },
  { v:2,    kind:"coin", face:"2",    fill:"#C0763F", ring:"#8E5327" },
  { v:5,    kind:"coin", face:"5",    fill:"#C0763F", ring:"#8E5327" },
  { v:10,   kind:"coin", face:"10",   fill:"#D6A62B", ring:"#9E7813" },
  { v:20,   kind:"coin", face:"20",   fill:"#D6A62B", ring:"#9E7813" },
  { v:50,   kind:"coin", face:"50",   fill:"#D6A62B", ring:"#9E7813" },
  { v:100,  kind:"coin", face:"1 €",  fill:"#C6CCD4", ring:"#C9A227" },
  { v:200,  kind:"coin", face:"2 €",  fill:"#C9A227", ring:"#C6CCD4" },
  { v:500,  kind:"note", face:"5 €",  fill:"#B6BAC1", ring:"#8B9099" },
  { v:1000, kind:"note", face:"10 €", fill:"#D4908C", ring:"#A5615D" },
  { v:2000, kind:"note", face:"20 €", fill:"#93ADD6", ring:"#647FA8" },
  { v:5000, kind:"note", face:"50 €", fill:"#E0AC72", ring:"#AC7A42" },
  { v:10000,kind:"note", face:"100 €",fill:"#94C4A0", ring:"#5F9270" }
];
const PAY_WITH = [100, 200, 500, 1000, 2000, 5000, 10000];
// Something to buy. A toy with a price tag and a hand holding out a note says
// "it costs this, you pay that" without a sentence to read first — which is the
// hard part of the question for a child who is still learning to read.
const SHOP = ["🧸","⚽","🚗","📚","🍦","🎈","🪁","🤖","🥁","⛵","🧩","✏️","🎸","🦖","🍰","🎨","🛴","🪀"];
const euro = c => Math.floor(c / 100) + "," + pad2(c % 100) + " €";   // 1,35 €
const euroWhole = c => (c / 100) + " €";                              // 7 €
// Whole euros are typed as euros; with cents on, the last two digits are the
// cents. Which one applies is written on the question, not guessed at the keypad.
export const moneyText  = q => q.whole ? euroWhole(q.cents) : euro(q.cents);
export const moneyTyped = (q, t) => q.whole ? (t || "0") + " €" : euro(parseInt(t, 10) || 0);

function makeMoneyQuestion(settings, seen){
  const max = Number(settings.moneyTo);
  const whole = settings.moneyCents !== "yes";
  const step = whole ? 100 : 1;                      // the smallest coin in play
  const digits = whole ? String(max / 100).length : String(max).length;
  const dress = q => Object.assign(q, { kind:"money", whole, maxDigits: digits, keepZeros: !whole });
  const task = settings.moneyTask === "mixed" ? pick(["count","change"]) : settings.moneyTask;

  if (task === "change"){
    for (let t = 0; t < 90; t++){
      const price = rnd(Math.max(1, Math.round(max / 12 / step)), Math.floor((max - step) / step)) * step;
      const paid = PAY_WITH.find(v => v > price && v <= max);
      if (!paid) continue;
      const key = "mc" + price + "/" + paid;
      if (seen.has(key) && t < 84) continue;
      seen.add(key);
      const back = paid - price;
      return dress({
        task:"change", price, paid, cents: back, answer: whole ? back / 100 : back,
        items: [MONEY.find(m => m.v === paid)],
        toy: pick(SHOP), tag: whole ? euroWhole(price) : euro(price),
        ask: "How much money comes back?",
        key
      });
    }
  }
  const pool = MONEY.filter(m => m.v <= Math.max(step, Math.floor(max / 3)) && (!whole || m.v % 100 === 0));
  let items = [], sum = 0;
  for (let t = 0; t < 140; t++){
    items = Array.from({ length: rnd(3, max >= 10000 ? 5 : 6) }, () => pick(pool));
    sum = items.reduce((a, m) => a + m.v, 0);
    if (sum > max || sum < step * 2) continue;
    const key = "mn" + items.map(m => m.v).sort((a, b) => a - b).join(",");
    if (seen.has(key) && t < 132) continue;
    seen.add(key);
    break;
  }
  items.sort((a, b) => b.v - a.v);
  return dress({ task:"count", items, cents: sum, answer: whole ? sum / 100 : sum,
                 ask:"How much money is this?", key:"mn" + sum + items.length });
}

function moneyPiece(m, cx, cy){
  const R = 34, NW = 104, NH = 58;
  if (m.kind === "coin"){
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${m.ring}"/>`
         + `<circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="${m.fill}"/>`
         + `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="Fredoka, sans-serif" `
         + `font-size="${m.face.length > 2 ? 20 : 23}" font-weight="600" fill="#2A1A0B">${m.face}</text>`;
  }
  return `<rect x="${cx - NW / 2}" y="${cy - NH / 2}" width="${NW}" height="${NH}" rx="8" fill="${m.fill}" stroke="${m.ring}" stroke-width="3"/>`
       + `<text x="${cx}" y="${cy + 9}" text-anchor="middle" font-family="Fredoka, sans-serif" `
       + `font-size="${m.face.length > 4 ? 21 : 25}" font-weight="600" fill="#22262E">${m.face}</text>`;
}
const figCap = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Nunito, sans-serif" `
  + `font-size="18" font-weight="800" letter-spacing="1" fill="var(--ink-2)">${t}</text>`;

// The shop: what you are buying with its price tag, and the money in your hand.
function shopSVG(q){
  const W = 470, H = 192, LX = 118, RX = 352;
  const tagW = 108, tagH = 46, tagY = 108;
  return `<svg class="figart wide" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Something that costs ${q.tag}, and a ${q.items[0].face} to pay with. How much comes back?">
    <text x="${LX}" y="84" text-anchor="middle" font-size="72">${q.toy}</text>
    <line x1="${LX}" y1="86" x2="${LX - 32}" y2="${tagY + 4}" stroke="var(--ink-3)" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="${LX - tagW / 2}" y="${tagY}" width="${tagW}" height="${tagH}" rx="11"
      fill="var(--sun)" stroke="var(--sun-d)" stroke-width="3"/>
    <circle cx="${LX - tagW / 2 + 13}" cy="${tagY + tagH / 2}" r="4.5" fill="var(--sun-d)"/>
    <text x="${LX + 8}" y="${tagY + 32}" text-anchor="middle" font-family="Fredoka, sans-serif"
      font-size="25" font-weight="600" fill="#3A2A00">${q.tag}</text>
    ${figCap(LX, 182, "COSTS")}
    <line x1="235" y1="22" x2="235" y2="158" stroke="var(--line)" stroke-width="2.5" stroke-dasharray="7 7" stroke-linecap="round"/>
    ${moneyPiece(q.items[0], RX, 66)}
    <text x="${RX}" y="148" text-anchor="middle" font-size="50">✋</text>
    ${figCap(RX, 182, "YOU PAY")}
  </svg>`;
}

export function moneySVG(q){
  if (q.task === "change") return shopSVG(q);
  const per = Math.min(4, q.items.length), NH = 58, G = 14;
  const cell = Math.max(68, 104) + G;
  const rowsN = Math.ceil(q.items.length / per);
  const W = per * cell, H = rowsN * (NH + G) + 6;
  let out = "";
  q.items.forEach((m, i) => {
    out += moneyPiece(m, (i % per) * cell + cell / 2, Math.floor(i / per) * (NH + G) + NH / 2 + 3);
  });
  return `<svg class="figart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${q.items.length} coins or notes">${out}</svg>`;
}

export function makeQuestion(settings, seen){
  if (settings.mode === "wall")  return makeWallQuestion(settings, seen);
  if (settings.mode === "money") return makeMoneyQuestion(settings, seen);
  if (settings.mode === "clock") return makeClockQuestion(settings, seen);
  if (settings.mode === "line")  return makeLineQuestion(settings, seen);
  const max = Number(settings.range);
  for (let tries = 0; tries < 60; tries++){
    const op = pick(settings.ops);
    const f  = makeFact(op, max, settings.cross, settings.tables);
    const unary = f[2] === null;
    const slot = settings.style === "answer"  ? 2
               : settings.style === "missing" ? pick(unary ? [0] : [0,1])
               : pick(unary ? [0,2] : [0,1,2]);
    const answer = slot === 0 ? f[0] : slot === 1 ? f[2] : f[3];
    if (answer === 0 && tries < 50) continue;            // "7 + _ = 7" teaches nothing
    const key = `${f[0]}${f[1]}${f[2]}#${slot}`;
    if (seen.has(key) && tries < 55) continue;
    seen.add(key);
    return { x:f[0], op:f[1], y:f[2], z:f[3], slot, answer, key };
  }
  const f = makeFact(settings.ops[0], max);
  return { x:f[0], op:f[1], y:f[2], z:f[3], slot:2, answer:f[3], key:"fallback" };
}
export function factText(q){
  if (q.kind === "clock") return q.task === "span"
    ? `${fmtTime(q.h, q.m)} to ${fmtTime(q.eh, q.em)} is ${q.span} minutes`
    : q.answer;
  if (q.kind === "line") return lineText(q);
  if (q.kind === "wall") return `the missing brick is ${q.answer}`;
  if (UNARY[q.op]) return `${UNARY[q.op]} ${q.x} = ${q.z}`;
  if (q.kind === "money"){
    const f = q.whole ? euroWhole : euro;
    return q.task === "change" ? `${f(q.paid)} − ${f(q.price)} = ${f(q.cents)}`
                               : `that is ${f(q.cents)}`;
  }
  return `${q.x} ${q.op} ${q.y} = ${q.z}`;
}

