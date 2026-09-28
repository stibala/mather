// Coins, treats, stickers, the crate and the bowl. Mostly about promises made to
// a child: a treat you were shown is a treat you keep, a sticker you earned is
// never taken back, and nothing can be collected twice.
const P1 = () => me().id;
const st = () => statsOf(P1());
const tin = () => tinOf(P1());
const shown = () => q("#tin").kids.filter(b => !b.classList.contains("tinempty"))
  .map(b => (b.kids[0] ? b.kids[0].textContent : "?") + (b.kids[1] ? "x" + b.kids[1].textContent : ""));

section("the sticker set is finite and well formed");
const names = {}, emos = {};
let dup = 0;
PRIZES.forEach(p => { if (names[p.n] || emos[p.e]) dup++; names[p.n] = 1; emos[p.e] = 1; });
ok(dup === 0, PRIZES.length + " stickers, no repeats");
ok(PRIZES.every(p => p.t >= 0 && p.t < TIERS.length), "every sticker has a tier");
let rising = true, priced = true;
THRESH.forEach((t, i) => {
  if (i && t <= THRESH[i-1]) rising = false;
  if (t - (i ? THRESH[i-1] : 0) !== tierOf(i).cost) priced = false;
});
ok(rising, "prices only ever go up");
ok(priced, "each step costs exactly its tier");
let boundaries = true;
THRESH.forEach((t, i) => { if (prizesFor(t) !== i + 1 || prizesFor(t - 1) !== i) boundaries = false; });
ok(boundaries, "the count flips on the exact coin, not a coin early or late");
ok(prizesFor(999999) === PRIZES.length, "and stops at " + PRIZES.length + " — the set ends rather than wrapping");

section("the tin holds real treats, and stacks them");
globalThis.__resetClock();
st().coins = 100; st().tin = []; st().holding = null; st().fed = 0;
paintBowl();
ok(q("#tin").kids[0].classList.contains("tinempty"), "an empty tin says so rather than offering food it hasn't got");
st().tin = ["🥛", "🐟", "🥛"];
paintBowl();
ok(shown().length === 2, "3 treats, 2 the same -> 2 tiles: " + shown().join("  "));
ok(shown().some(x => x.includes("x2")), "the pair carries a small 2");
ok(q("#treatCount").textContent === "3", "the total still reads 3");
const before = tin().slice();
feedNumo("🥛");
ok(tin().length === 2, "feeding takes one");
ok(!shown().some(x => x.includes("x2")), "the badge goes when only one is left");
feedNumo("🥯");
ok(tin().length === 2, "feeding something not in the tin does nothing");
const order1 = shown().map(x => x[0]).join("");
st().tin = ["🍉","🐟","🍉","🥛"]; paintBowl();
const o1 = shown().map(x => x[0]).join(""); feedNumo("🍉");
ok(o1 === shown().map(x => x[0]).join(""), "eating one does not reshuffle the tin");

section("the crate: shown first, banked as it opens, never lost");
globalThis.__resetClock();
st().tin = []; packCrate(3, []);
ok(tin().length === 0, "packed, but the tin is still empty — no spoilers");
ok(!q("#crateBox").hidden, "the crate is sitting there");
openCrate();
globalThis.__runUntil(400);  ok(tin().length === 1, "first treat lands as it pops out");
globalThis.__runUntil(960);  ok(tin().length === 2, "then the second");
globalThis.__runUntil(1520); ok(tin().length === 3, "then the third");
globalThis.__runUntil(2300); ok(!q("#crateBox").classList.contains("spent"), "a beat to look at the loot");
globalThis.__runUntil(2450); ok(q("#crateBox").classList.contains("spent"), "then it starts fading");
globalThis.__runUntil(3000); ok(!q("#crateBox").hidden, "still holding its space mid-fade, not yanked");
globalThis.__runUntil(3100); ok(q("#crateBox").hidden, "gone once the fade ends");

globalThis.__resetClock(); st().tin = []; packCrate(2, []);
show("setup");
ok(tin().length === 2, "walking away from an unopened crate still banks it");
globalThis.__resetClock(); st().tin = []; packCrate(3, []); openCrate();
globalThis.__runUntil(960); show("quiz");
ok(tin().length === 3, "leaving mid-reveal banks the rest");
globalThis.__runUntil(9000);
ok(tin().length === 3, "and the cancelled pops do not double-count");
show("setup"); st().tin = []; packCrate(2, []); packCrate(1, []);
ok(tin().length === 2, "a new crate banks the one before it");

section("stickers you give to Numo");
st().coins = 500; st().tin = []; st().holding = null;
const owned = prizesFor(500);
svIndex = 2; giveToNumo();
ok(st().holding === 2, "giving hands it over");
ok(heldOf(P1()) === 2, "and he is carrying it");
svIndex = 2; giveToNumo();
ok(st().holding === null, "pressing again takes it back");
svIndex = 4; giveToNumo(); svIndex = 7; giveToNumo();
ok(st().holding === 7, "giving another swaps it, never stacks");
st().tin = ["🐟"]; feedNumo("🐟");
ok(st().holding === null, "he puts the toy down to eat");
st().holding = null; svIndex = PRIZES.length - 1; giveToNumo();
ok(st().holding === null, "an unearned sticker cannot be given");
st().holding = 20; st().coins = 50;
ok(heldOf(P1()) === null, "holding something now out of reach reads as nothing");
tryIt("every screen renders at every stage", () => {
  [0, 15, 40, 300, 1000, 2760, 4000].forEach(c => {
    st().coins = c; st().fed = 0; st().tin = [];
    renderProgress(); renderPlayers(); paintBowl(); paintHeld();
  });
});

done();
