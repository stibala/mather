// Every question the app can ask, checked for the things a child would notice:
// sums that do not add up, numbers outside the band they were promised, a clock
// whose two faces are not really that far apart, a wall that cannot be solved.
const ALL_TABLES = [1,2,3,4,5,6,7,8,9,10];
const PLUS = "+", MINUS = "−", TIMES = "×", DIV = "÷", DBL = "2×", HALF = "½";

section("arithmetic: " + "+ − × ÷ 2× ½");
let n = 0, bad = 0, why = [];
for (const range of ["10","20","100"])
  for (const ops of [[PLUS],[MINUS],[TIMES],[DIV],[DBL],[HALF],[PLUS,MINUS,TIMES,DIV]])
    for (const cross of ["no","one","free","mixed"])
      for (const style of ["answer","missing","mixed"]) {
        const seen = new Set();
        for (let k = 0; k < 700; k++){
          if (k % 30 === 0) seen.clear();
          const q = makeQuestion({ mode:"sum", range, ops, cross, style, tables: ALL_TABLES }, seen);
          n++;
          const max = Number(range), f = [];
          const unary = q.y === null;
          if (unary){
            if (q.op === DBL && q.z !== q.x * 2) f.push("not a double");
            if (q.op === HALF && q.z * 2 !== q.x) f.push("not a half");
            if (q.slot === 1) f.push("slot 1 does not exist on a unary question");
            const big = Math.max(q.x, q.z);
            if (big < SPAN[max][0] || big > SPAN[max][1]) f.push("big number " + big + " outside the band");
            if (big % 2) f.push("big number is odd and cannot halve");
          } else {
            const calc = q.op === PLUS ? q.x + q.y : q.op === MINUS ? q.x - q.y
                       : q.op === TIMES ? q.x * q.y : q.x / q.y;
            if (calc !== q.z) f.push("arithmetic");
            if ([q.x,q.y,q.z].some(v => v < 0)) f.push("negative");
            if (![q.x,q.y,q.z].every(Number.isInteger)) f.push("not whole");
            if (Math.max(q.x,q.y,q.z) > max) f.push("over the range");
            if (q.op === DIV && q.y === 1) f.push("divide by 1");
            if ((q.op === PLUS || q.op === MINUS) && (CROSS_FOR[range] || []).includes(cross)
                && crossKind(q.x, q.op, q.y) !== cross) f.push("carry setting ignored");
            if ((q.op === PLUS || q.op === MINUS) && Math.max(q.x,q.y,q.z) < SPAN[max][0]) f.push("under the band");
          }
          if (q.answer !== (q.slot === 0 ? q.x : q.slot === 1 ? q.y : q.z)) f.push("answer does not match the gap");
          if (style === "answer" && q.slot !== 2) f.push("style ignored");
          if (style === "missing" && q.slot === 2) f.push("style ignored");
          if (f.length){ bad++; if (why.length < 4) why.push(q.x + q.op + q.y + "=" + q.z + " [" + range + "/" + cross + "] " + f.join(", ")); }
        }
      }
why.forEach(w => print("         " + w));
ok(bad === 0, n + " questions, " + bad + " bad");

section("carries come in three grades");
ok(CROSS_FOR["10"].length === 0, "up to 10 offers none — crossing a ten has no meaning there");
ok(CROSS_FOR["20"].join() === "no,one", "up to 20 offers no-carry and one-carry only");
ok(CROSS_FOR["100"].join() === "no,one,free", "up to 100 offers all three");
ok(crossKind(54, PLUS, 4) === "no", "54 + 4 does not carry");
ok(crossKind(54, PLUS, 8) === "one", "54 + 8 carries, with a single digit");
ok(crossKind(38, PLUS, 46) === "free", "38 + 46 carries, with two big numbers");
ok(crossKind(8, PLUS, 7) === "one", "8 + 7 = 15 counts as a carry — the classic one, which an operand-size rule would have missed");
ok(crossKind(13, PLUS, 4) === "no", "13 + 4 does not, even though a number is over ten");
ok(crossKind(52, MINUS, 18) === "free", "52 - 18 borrows between two big numbers");
ok(crossKind(52, MINUS, 8) === "one", "52 - 8 borrows with a single digit");
// Up to 20 "free" is not offered, and the reason is asymmetric: two numbers of ten
// or more cannot ADD to under 20 at all. Subtraction has a narrow corner (20 - 13)
// which is exactly why it is not worth offering as a setting.
let freeAdds = 0, freeSubs = 0;
for (let i = 0; i < 4000; i++){
  const add = makeQuestion({ mode:"sum", range:"20", ops:[PLUS], cross:"mixed", style:"answer", tables: ALL_TABLES }, new Set());
  if (crossKind(add.x, add.op, add.y) === "free") freeAdds++;
  const sub = makeQuestion({ mode:"sum", range:"20", ops:[MINUS], cross:"mixed", style:"answer", tables: ALL_TABLES }, new Set());
  if (crossKind(sub.x, sub.op, sub.y) === "free") freeSubs++;
}
ok(freeAdds === 0, "no addition up to 20 can be 'free' (" + freeAdds + " in 4000)");
ok(freeSubs > 0 && !CROSS_FOR["20"].includes("free"),
   "subtraction has a narrow corner (" + freeSubs + " in 4000, all 20 minus a teen) — not offered as a setting");

section("times tables: one row at a time");
[[[7],"100"],[[3],"100"],[[2,5,10],"100"]].forEach(c => {
  const facts = mulFacts(Number(c[1]), false, c[0]);
  const stray = facts.filter(f => !c[0].includes(f[0]) && !c[0].includes(f[1]));
  ok(stray.length === 0, "rows [" + c[0] + "] to " + c[1] + ": " +
     new Set(facts.map(f => f[0] + "x" + f[1])).size + " facts, none outside the rows");
});

section("number line: read, jump, how far, round");
n = 0; bad = 0;
for (const lineTo of ["10","20","100"])
  for (const lineTask of ["read","land","jump","round","mixed"]) {
    const seen = new Set();
    for (let k = 0; k < 1200; k++){
      if (k % 30 === 0) seen.clear();
      const q = makeQuestion({ mode:"line", lineTo, lineTask }, seen); n++;
      const v = q.view, f = [];
      if (v.lo < 0 || v.hi > 100 || v.lo % 5 || v.hi % 5) f.push("window " + v.lo + "-" + v.hi);
      if (lineTask !== "mixed" && q.task !== lineTask) f.push("wrong task");
      if (q.task === "read" || q.task === "round"){
        if (q.v <= v.lo || q.v >= v.hi) f.push("marker outside the window");
        if (q.task === "round" && (q.answer % 10 || Math.abs(q.answer - q.v) > 5 || q.v % 10 === 0)) f.push("rounding");
        if (q.task === "round" && v.label !== 10) f.push("tens not labelled");
      } else {
        if (q.s < v.lo || q.s > v.hi || q.e < v.lo || q.e > v.hi) f.push("jump leaves the window");
        if (Math.abs(q.e - q.s) !== q.j || q.j < 2) f.push("jump size");
        if (q.back !== (q.e < q.s)) f.push("direction");
      }
      if (f.length) bad++;
    }
  }
ok(bad === 0, n + " number-line questions, " + bad + " bad");

section("the clock: reading, later, how long");
n = 0; bad = 0;
for (const system of ["12","24"])
  for (const minutes of ["hour","half","quarter","five","any"])
    for (const clockTask of ["read","later","span","mixed"]) {
      const seen = new Set();
      for (let k = 0; k < 400; k++){
        if (k % 25 === 0) seen.clear();
        const q = makeQuestion({ mode:"clock", system, minutes, daypart:"any", clockTask }, seen); n++;
        const f = [], lo = system === "12" ? 1 : 0, hi = system === "12" ? 12 : 23, wrap = (system === "12" ? 12 : 24) * 60;
        if (q.h < lo || q.h > hi || q.m < 0 || q.m > 59) f.push("start time");
        if (q.task !== "read"){
          if (q.eh < lo || q.eh > hi) f.push("end hour");
          if (q.span < 5 || q.span > 60 || q.span % 5) f.push("span");
          const st = (q.h % (system === "12" ? 12 : 24)) * 60 + q.m;
          const en = (q.eh % (system === "12" ? 12 : 24)) * 60 + q.em;
          if (((st + q.span) % wrap) !== en) f.push("the two faces are not that far apart");
        }
        if (q.task === "span" && q.answer !== q.span) f.push("answer");
        if (q.task !== "span" && parseTypedTime(q.digits).h !== q.ansH) f.push("digits do not read back");
        if (f.length) bad++;
      }
    }
ok(bad === 0, n + " clock questions, " + bad + " bad");

section("the number wall: every gap must be solvable when it is asked");
n = 0; bad = 0;
for (const wallRows of ["3","4"])
  for (const wallTo of ["10","20","100"]) {
    for (let round = 0; round < 500; round++){
      wallState = null;
      const seen = new Set(), settings = { wallRows, wallTo };
      let q = makeWallQuestion(settings, seen);
      const rows = q.rows, total = q.gaps.size;
      for (let r = 1; r < rows.length; r++)
        for (let i = 0; i < rows[r].length; i++)
          if (rows[r][i] !== rows[r-1][i] + rows[r-1][i+1]) bad++;
      if (rows[rows.length-1][0] > Number(wallTo)) bad++;
      let steps = 0;
      for (;;){
        n++; steps++;
        const known = new Set();
        rows.forEach((row, r) => row.forEach((_, i) => { if (!q.gaps.has(r + "," + i)) known.add(r + "," + i); }));
        const r = q.br, i = q.bi, above = rows[r+1] || [];
        const up = r > 0 && known.has((r-1)+","+i) && known.has((r-1)+","+(i+1));
        const rt = i < above.length && known.has((r+1)+","+i) && known.has(r+","+(i+1));
        const lf = i > 0 && i-1 < above.length && known.has((r+1)+","+(i-1)) && known.has(r+","+(i-1));
        if (!(up || rt || lf)) bad++;                 // the child would be stuck
        if (q.answer !== rows[r][i]) bad++;
        if (!wallState.queue.length) break;
        q = makeWallQuestion(settings, seen);
        if (steps > 12) { bad++; break; }
      }
      if (steps !== total) bad++;
    }
  }
ok(bad === 0, n + " bricks walked end to end, " + bad + " bad");

section("money: counting and change");
n = 0; bad = 0;
for (const moneyTo of ["1000","2000","10000"])
  for (const moneyCents of ["no","yes"])
    for (const moneyTask of ["count","change","mixed"]) {
      const seen = new Set();
      for (let k = 0; k < 900; k++){
        if (k % 25 === 0) seen.clear();
        const q = makeQuestion({ mode:"money", moneyTo, moneyCents, moneyTask }, seen); n++;
        const max = Number(moneyTo), whole = moneyCents !== "yes", f = [];
        if (q.whole !== whole) f.push("whole flag");
        if (whole && q.cents % 100) f.push("not a whole euro");
        if (whole && q.items.some(i => i.v % 100)) f.push("a cent coin in a whole-euro round");
        if (q.cents > max || q.cents <= 0) f.push("amount");
        if (q.answer !== (whole ? q.cents / 100 : q.cents)) f.push("answer unit");
        if (String(q.answer).length > q.maxDigits) f.push("answer will not fit the keypad");
        if (q.task === "count" && q.items.reduce((a,m) => a + m.v, 0) !== q.cents) f.push("sum");
        if (q.task === "change"){
          if (q.paid - q.price !== q.cents || q.paid > max) f.push("change");
          if (!q.toy || !q.tag) f.push("nothing drawn to buy");
          if (/\d/.test(q.ask)) f.push("the prompt spells out a number");
          const svg = shopSVG(q);
          if (svg.includes("NaN") || svg.includes("undefined")) f.push("broken drawing");
        }
        if (f.length) bad++;
      }
    }
ok(bad === 0, n + " money questions, " + bad + " bad");

done();
