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

section("one cat, in two places");
const quiz = catIn("#quizCat"), bowl = catIn("#bowlCat");
ok(!!quiz && !!bowl, "both hosts hand back a cat");
ok(quiz !== bowl, "and they are different cats, not the same one twice");
setFace("happy");
ok(quiz.classList.contains("hop"), "the quiz cat hops when an answer is right");
setFace("oops");
ok(quiz.classList.contains("shake") && !quiz.classList.contains("hop"), "and shakes when it is wrong, clearing the hop");
ok(mouthIs(quiz, "oops"), "its mouth changed with it");
setFace("idle");
ok(mouthIs(quiz, "idle"), "and goes back to idle");

section("eating, in three beats");
globalThis.__resetClock();
st().tin = ["🍪", "🥛", "🐟"];
feedNumo("🍪");                                   // crunchy
ok(bowl.classList.contains("eat") && !bowl.classList.contains("call"), "he leans straight in — nobody asks for a biscuit");
ok(bowl.classList.contains("fast"), "fast, because a biscuit is crunchy");
globalThis.__runUntil(1300);
ok(!bowl.classList.contains("eat"), "chewing stops");
ok(bowl.classList.contains("lick"), "and he licks his lips");
globalThis.__runUntil(2100);
ok(!bowl.classList.contains("lick"), "then settles back to normal");

globalThis.__resetClock();
feedNumo("🥛");                                   // milk
ok(bowl.classList.contains("lap") && !bowl.classList.contains("call"), "milk is lapped straight away, not called for");
globalThis.__runUntil(1900);
ok(!bowl.classList.contains("lap") && !bowl.classList.contains("lick"), "and lapping was the licking — no extra beat");

globalThis.__resetClock();
feedNumo("🐟");                                   // fish — he asks before he eats
ok(bowl.classList.contains("call") && !bowl.classList.contains("eat"), "fish: he calls for it first");
globalThis.__runUntil(950);
ok(!bowl.classList.contains("call") && bowl.classList.contains("eat"), "then gets on with the chewing");
ok(!bowl.classList.contains("fast") && !bowl.classList.contains("lap"), "at the ordinary pace");
globalThis.__runUntil(3500);
ok(["eat","fast","lap","lick","call"].every(c => !bowl.classList.contains(c)), "every eating class is cleared afterwards");

section("the brand is the way home, and asks before it throws a round away");
q("#leaveAsk").hidden = true;
show("result");
q("#brand").onclick();
ok(!q("#setup").hidden && q("#result").hidden, "from the results it goes straight back");
ok(q("#leaveAsk").hidden, "with nothing to ask about");
S = { alive: true, n: 10, i: 4, right: 3, best: 2, coins: 12,
      times: [3], seen: new Set(), misses: [], settings: { ...DB.settings } };
show("quiz");
q("#brand").onclick();
ok(!q("#quiz").hidden, "mid-round one tap does not leave");
ok(!q("#leaveAsk").hidden, "it asks first");
ok(S.alive, "and the round is untouched while the question is up");
q("#leaveStay").onclick();
ok(q("#leaveAsk").hidden && !q("#quiz").hidden, "keep playing puts you back in the round");
ok(S.alive, "still alive");
q("#brand").onclick(); q("#leaveGo").onclick();
ok(q("#leaveAsk").hidden && !q("#setup").hidden, "stop and go back does leave");
ok(!S.alive, "and ends the round");

done();
