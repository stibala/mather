// Rewards have been repriced four times. Each time, the rule was the same: a
// child may gain from the change but must never lose. These are the saves those
// old versions wrote, replayed through the current load().
const HIST = [];
for (let i = 0; i < 7; i++) HIST.push({ ts:"2026-09-2" + i + "T10:00:00.000Z", acc:90, avgTime:4, n:10,
  mode:"sum", ops:"+−", range:"10", style:"mixed", cross:"mixed" });

function saveOf(v, coins, extra){
  const stats = Object.assign({ coins, bestStreak:7, questions:70 }, extra || {});
  const db = { active:"p1", profiles:[{ id:"p1", name:"Julie", face:"🦊", color:"#FF7A1A" }],
    stats:{ p1: stats }, history:{ p1: HIST }, settings:{}, sound:true, theme:"system" };
  if (v !== null) db.v = v;
  return db;
}
function loadSave(db){
  localStorage.setItem(KEY, JSON.stringify(db));
  globalThis.__loadErr = null;
  return load();
}

section("nothing a child had is thrown away");
// What each old version sold, so the test knows how many keepsakes to expect.
// v1-v3 sold 16 animals and nothing else; v4 put 12 snacks at the front of its
// list; v5 priced stickers exactly as today does.
[["the original release (no version flag)", null, 400, c => Math.floor(c / 100)],
 ["v2, prizes at 300 coins",                2,    900, c => Math.floor(c / 300)],
 ["v3, a flat 25 each",                     3,    150, c => Math.floor(c / 25)],
 ["v4, tiers with 12 snacks in front",      4,    600, c => Math.max(0, Math.floor(c / 25) - 12)],
 ["v5, priced as today",                    5,    250, c => prizesFor(c)]].forEach(c => {
  const [label, v, coins, expect] = c;
  const db = loadSave(saveOf(v, coins, v === 5 ? { fed:3 } : null));
  if (globalThis.__loadErr){ ok(false, label + " -> load threw: " + globalThis.__loadErr); return; }
  const s = db.stats.p1, rounds = (db.history.p1 || []).length, keepsakes = expect(coins);
  ok(rounds === 7 && s.questions === 70, label + ": " + rounds + " rounds and " + s.questions + " questions kept");
  ok(prizesFor(s.coins) >= keepsakes,
     "   " + prizesFor(s.coins) + " stickers, and they had earned " + keepsakes);
  ok(Array.isArray(s.tin), "   treats are real items now (" + s.tin.length + " in the tin)");
  ok(db.v === 6, "   stamped as v" + db.v);
});

section("a v5 tin converts exactly");
[[100, 3], [100, 10], [250, 0]].forEach(c => {
  const db = loadSave(saveOf(5, c[0], { fed:c[1] }));
  const want = Math.max(0, Math.floor(c[0] / TREAT_COST) - c[1]);
  ok(db.stats.p1.tin.length === want,
     c[0] + " coins with " + c[1] + " fed -> " + db.stats.p1.tin.length + " treats (expected " + want + ")");
});

section("loading twice changes nothing");
let a = loadSave(saveOf(3, 600));
let b = loadSave(a);
let c2 = loadSave(b);
ok(b.stats.p1.coins === c2.stats.p1.coins, "coins settle at " + b.stats.p1.coins + " and stay there");
ok(b.stats.p1.tin.length === c2.stats.p1.tin.length, "and the tin stops growing (" + c2.stats.p1.tin.length + ")");

section("a save from the future, or a broken one, does not wipe the child");
const good = loadSave(saveOf(6, 300, { tin:["🐟"], holding:1 }));
ok(good.history.p1.length === 7 && good.stats.p1.tin.length === 1, "a current save round-trips untouched");
localStorage.setItem(KEY, "{not json at all");
const fallback = load();
ok(fallback && fallback.profiles.length === 2, "unreadable storage falls back to a fresh start rather than throwing");

section("settings that no longer exist are replaced");
const old = saveOf(4, 100); old.settings = { range:"10", moneyTo:"500", wallBlank:"any" };
const s2 = loadSave(old).settings;
ok(["1000","2000","10000"].includes(s2.moneyTo), "a money range that was rescaled becomes a valid one (" + s2.moneyTo + ")");
ok(s2.mode === "sum" && s2.lineTask, "settings added since then get their defaults");

done();
