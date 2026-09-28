// Shared scaffolding for the suites.
let __bad = 0, __n = 0;
function ok(cond, msg){ __n++; if (cond) print("  ok     " + msg); else { print("  FAIL   " + msg); __bad++; } }
function tryIt(msg, fn){ __n++; try { fn(); print("  ok     " + msg); } catch (e){ print("  THROWS " + msg + " -> " + e); __bad++; } }
function section(t){ print(""); print(t); }
function done(){
  print("");
  print(__bad ? "!!! " + __bad + " of " + __n + " checks failed" : "all " + __n + " checks passed");
}
const q = s => document.querySelector(s);
