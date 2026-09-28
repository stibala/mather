import { pick, rnd } from "../core/dom.js";

/* ============================ questions ============================ */
// A fact is [x, op, y, z] meaning  x op y = z.  Slot 0/1/2 says which one is hidden.
const factCache = new Map();
// Times-table facts inside a range. The 1-times facts are real but trivial, so
// they go in once while the rest go in three times - that weights the draw
// towards facts worth practising without dropping any.
export function mulFacts(max, forDivision, tables){
  const rows = (tables && tables.length) ? tables : [1,2,3,4,5,6,7,8,9,10];
  const key = (forDivision ? "d" : "m") + max + "|" + rows.join("");
  if (factCache.has(key)) return factCache.get(key);
  const out = [];
  for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++){
    const p = x * y;
    const inRange = max === 10  ? (p >= 2 && p <= 10)
                  : max === 20  ? (p > 10 && p <= 20)
                  : true;
    if (!inRange) continue;
    if (forDivision && y === 1) continue;            // "6 ÷ 1" teaches nothing
    if (!rows.includes(x) && !rows.includes(y)) continue;   // only the chosen rows
    const times = (x === 1 || y === 1) ? 1 : 3;
    for (let i = 0; i < times; i++) out.push([x, y, p]);
  }
  // a row this narrow may hold nothing at this size — fall back rather than fail
  const list = out.length ? out : mulFacts(max, forDivision, null);
  factCache.set(key, list);
  return list;
}
// "Crossing ten" is the carry or the borrow: 47 + 5 crosses because 7 + 5 spills
// past a ten, while 44 + 3 stays inside one. That is its own difficulty step and
// has nothing to do with how big the numbers are, so it gets its own toggle.
const ones = n => n % 10;
function crossesTen(x, op, y){
  if (op === "+") return ones(x) + ones(y) >= 10;
  if (op === "−") return ones(x) < ones(y);
  return false;                       // a carry means nothing for × and ÷
}
// The biggest number in a question sits inside these bounds, so every range
// really does practise its own size of number rather than drifting small.
const SPAN = { 10:[4,10], 20:[11,20], 100:[21,100] };

function rawFact(op, max){
  const [lo, hi] = SPAN[max];
  if (op === "+"){ const z = rnd(lo, hi), x = rnd(1, z - 1); return [x,"+",z-x,z]; }
  const x = rnd(lo, hi), y = rnd(1, x - 1);
  return [x,"−",y,x-y];
}
// Doubling and halving have one number in, one out — no second operand — so the
// fact carries null in that slot and the row renders as "double 7 = ?".
export const UNARY = { "2×":"double", "½":"half of" };
export function makeFact(op, max, cross, tables){
  if (UNARY[op]){
    // draw from the even numbers inside the band — nudging an odd one down can
    // push it under the band's floor (11 would become 10 in the "up to 20" band)
    const [lo, hi] = SPAN[max];
    const first = lo + (lo % 2), last = hi - (hi % 2);
    const big = first + rnd(0, (last - first) / 2) * 2;
    return op === "2×" ? [big / 2, "2×", null, big] : [big, "½", null, big / 2];
  }
  if (op === "×"){ const [x,y,p] = pick(mulFacts(max, false, tables)); return [x,"×",y,p]; }
  if (op === "÷"){ const [x,y,p] = pick(mulFacts(max, true, tables)); return [p,"÷",y,x]; }
  const want = cross === "yes" ? true : cross === "no" ? false : null;
  let last = rawFact(op, max);
  if (want === null) return last;
  for (let t = 0; t < 240; t++){
    if (crossesTen(last[0], last[1], last[2]) === want) return last;
    last = rawFact(op, max);
  }
  return last;                        // asked for something this range can barely make
}
