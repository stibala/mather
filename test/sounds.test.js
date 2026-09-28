// The synthesis is never heard here, but every line of it runs against a
// recording AudioContext. That catches a node type a browser does not have, a
// NaN in a schedule, and a sequence laid out in the wrong order — all of which
// are silent failures otherwise, because audio errors are swallowed on purpose.
function freshAudio(){
  const a = new FakeAudio();
  a.currentTime = 10;                    // not zero, so absolute times are obvious
  globalThis.__audio = a;
  return a;
}
// the app keeps its own AudioContext; drive it through the real entry points
function record(fn){
  const a = freshAudio();
  const realCtor = window.AudioContext;
  window.AudioContext = function(){ return a; };
  DB.sound = true;
  resetAudio();
  fn();
  window.AudioContext = realCtor;
  return a;
}
const kindsOf = a => a.started.map(s => s.kind);
const timesOf = a => a.started.map(s => s.t);
const sane = a => a.started.every(s => Number.isFinite(s.t) && s.t >= 10)
  && a.stopped.every(s => Number.isFinite(s.t));

section("a purr is pulsed noise, not a buzzing tone");
let a = record(() => sndPurr());
const breaths = kindsOf(a).filter(k => k === "noise").length;
ok(breaths === 3, "three breaths of noise (" + breaths + ")");
ok(kindsOf(a).filter(k => k === "osc").length === 6, "each with a chest tone and a pulse LFO");
ok(sane(a), "every event is scheduled at a real time");
const gains = a.made.filter(m => m === "gain").length;
ok(gains >= 6, "envelope and pulse gains per breath (" + gains + ")");
const starts = timesOf(a).filter((t, i) => kindsOf(a)[i] === "noise").sort((x, y) => x - y);
ok(starts[1] - starts[0] > .3 && starts[2] - starts[1] > .3, "breaths are spaced, not stacked");

section("each food gets its own sequence");
a = record(() => sndFeed("crunch"));
ok(kindsOf(a).filter(k => k === "noise").length === 6, "crunchy: six separate bites");
ok(kindsOf(a).filter(k => k === "osc").length === 6, "each with a low thump under it");
ok(sane(a), "all scheduled cleanly");

a = record(() => sndFeed("slurp"));
ok(kindsOf(a).filter(k => k === "noise").length === 5, "milk: five laps of the tongue");
const laps = timesOf(a).sort((x, y) => x - y);
ok(Math.abs((laps[4] - laps[0]) - 1.44) < .01, "spread across the 5 laps the cat makes (" + (laps[4] - laps[0]).toFixed(2) + "s)");

a = record(() => sndFeed("purr"));
ok(kindsOf(a).filter(k => k === "noise").length === 7, "cheese: four soft chews then three purr breaths");
ok(Math.max(...timesOf(a)) > 11.2, "the purr lands after the chewing, as he licks his lips");
const firstPurrOsc = Math.min(...a.started.filter(x => x.kind === "osc").map(x => x.t));
ok(firstPurrOsc > 11, "purring comes with the eating, not before it — only the meow leads");

a = record(() => sndFeed("meow"));
ok(kindsOf(a).filter(k => k === "noise").length === 5, "fish: four soft chews, then a meow with breath in it");
ok(kindsOf(a).filter(k => k === "osc").length === 3, "and the meow's voice plus its two wavers");
// a cat asks for its food and then eats it — so the call leads, and only for these
const firstOsc = Math.min(...a.started.filter(x => x.kind === "osc").map(x => x.t));
ok(firstOsc < 10.05, "the meow comes first, right at the start");
const noises = a.started.filter(x => x.kind === "noise").map(x => x.t).sort((x, y) => x - y);
ok(Math.abs(noises[1] - (10 + MEOW_FIRST)) < .06, "and the chewing begins as the call ends, in step with the picture");

section("the meow traces a specific real call");
// sound_garage-cat-meow-8-fx-306184.mp3, measured by tools/analyse-meow.py:
// .377 s; F0 551 -> 668 (plateau) -> 612 (plateau), range 117 Hz;
// brightness 1120 -> 2692 (plateau) -> 1830; loudest between .27 and .48.
a = record(() => sndMeow());
ok(a.made.filter(m => m === "filter").length === 2, "one mouth and one breath — not a stack of resonances");
ok(kindsOf(a).filter(k => k === "osc").length === 3, "voice and two wavers");
ok(kindsOf(a).filter(k => k === "noise").length === 1, "with breath riding behind it");

const f0 = MEOW_F0.map(p2 => p2[1]), br = MEOW_BRIGHT.map(p2 => p2[1]);
ok(Math.abs(MEOW_LEN - .377) < .02, "duration " + MEOW_LEN + "s matches the recording's .377");
ok(f0[0] === 551 && Math.max(...f0) === 668 && f0[f0.length - 1] === 612,
   "F0 traced: " + f0.join(" -> ") + " Hz");
ok(Math.max(...f0) - Math.min(...f0) === 117, "spanning the recorded 117 Hz, not three times it");
ok(br[0] === 1120 && Math.max(...br) === 2690, "brightness traced: " + br.join(" -> ") + " Hz");

// the plateaus and the step are the point — smooth ramps through the same
// endpoints gave a siren, so this guards the shape rather than the extremes
ok(MEOW_F0[1][1] === MEOW_F0[2][1], "F0 sits on a plateau at the top, it does not pass through");
ok(MEOW_BRIGHT[1][1] === MEOW_BRIGHT[2][1], "brightness holds its plateau too");
ok(MEOW_F0[3][1] < MEOW_F0[2][1] && MEOW_BRIGHT[3][1] < MEOW_BRIGHT[2][1],
   "then both step down together — the [a] to [u] of me-OW");
ok(MEOW_F0[3][1] === MEOW_F0[4][1] && Math.abs(MEOW_BRIGHT[3][1] - MEOW_BRIGHT[4][1]) < 100,
   "and settle on a second plateau to the end");
ok(f0[f0.length - 1] > f0[0], "finishing above where it began, as the recording does");

// loudest in the middle, per the measured envelope
const peakAmp = MEOW_AMP.reduce((m, p2) => p2[1] > m[1] ? p2 : m);
ok(peakAmp[0] >= .25 && peakAmp[0] <= .5, "loudest " + Math.round(peakAmp[0] * 100) + "% in, matching the recorded .27-.48");
ok(MEOW_AMP[0][1] < .2, "starting quiet, as it does");

const [[r1], [r2]] = MEOW_WAVER;
ok(Math.abs(r1 / r2 - Math.round(r1 / r2)) > .1, "two wavers at rates that never line up (" + r1 + " and " + r2 + " Hz)");
const one = record(() => sndMeow()), two = record(() => sndMeow());
ok(one.stopped[0].t !== two.stopped[0].t, "no two meows are quite the same length");

section("nothing is ever heard with the sound turned off");
DB.sound = false;
a = record(() => { DB.sound = false; sndFeed("crunch"); sndPurr(); sndMeow(); });
ok(a.started.length === 0, "silence means silence");
DB.sound = true;

section("a browser missing a node type must not break the feeding");
a = record(() => {
  const ctx = globalThis.__audio;
  ctx.createBiquadFilter = () => { throw new Error("not in this browser"); };
  sndFeed("crunch");                     // must swallow it
});
ok(true, "sndFeed survived a missing filter node");

done();
