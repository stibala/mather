import { DB } from "./db.js";

/* ============================ sound ============================ */
let ac = null;
export function beep(freqs, dur = .12, type = "sine", vol = .16){
  if (!DB.sound) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      const t = ac.currentTime + i * dur * .78;
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + .02);
    });
  } catch {}
}
export const sndTap   = () => beep([620], .05, "triangle", .07);
export const sndRight = () => beep([660, 880, 1170], .13, "triangle", .14);
export const sndWrong = () => beep([200, 150], .17, "sawtooth", .09);
export const sndDone  = () => beep([523, 659, 784, 1047], .16, "triangle", .15);
// Numo does not make one noise. Crunchy things crunch, milk gets lapped, and the
// rest earn a meow or a purr — each with a little pitch jitter so a run of feeds
// never sounds like a loop.
function noiseSrc(dur){
  const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf; return src;
}
export function resetAudio(){ ac = null; }   // tests drive this with a recording context
function audioOn(){
  if (!DB.sound) return false;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return true;
  } catch { return false; }
}
/* ---------- what Numo sounds like ---------- */
// All synthesised, no files. The parts that matter for sounding like an animal
// rather than a synthesiser: a purr is broadband noise pulsed almost fully on
// and off about 25 times a second, not a buzzing tone with a wobble on it; a
// meow is a pitch arc through moving vowel formants; and chewing is a run of
// separate bites, not one long noise.

// One bite. A sharp band of noise for the shell, and a little low thump under
// it so it lands as a bite rather than a hiss.
function crunchBite(t, vol){
  const src = noiseSrc(.1), bp = ac.createBiquadFilter(), g = ac.createGain();
  bp.type = "bandpass"; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(1500 + Math.random() * 900, t);
  bp.frequency.exponentialRampToValueAtTime(620 + Math.random() * 280, t + .07);
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(.03, vol), t + .006);
  g.gain.exponentialRampToValueAtTime(.0001, t + .085);
  src.connect(bp); bp.connect(g); g.connect(ac.destination);
  const thud = ac.createOscillator(), tg = ac.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(150, t);
  thud.frequency.exponentialRampToValueAtTime(70, t + .06);
  tg.gain.setValueAtTime(.0001, t);
  tg.gain.linearRampToValueAtTime(vol * .55, t + .005);
  tg.gain.exponentialRampToValueAtTime(.0001, t + .07);
  thud.connect(tg); tg.connect(ac.destination);
  src.start(t); src.stop(t + .11);
  thud.start(t); thud.stop(t + .08);
}

// Soft food: duller, wetter, no shell to break.
function softChew(t){
  const src = noiseSrc(.13), lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = "lowpass"; lp.frequency.value = 700 + Math.random() * 300; lp.Q.value = 3;
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(.05, t + .02);
  g.gain.exponentialRampToValueAtTime(.0001, t + .12);
  src.connect(lp); lp.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t + .14);
}

// One lap of the tongue: a quick wet sweep up and back down.
function lapTick(t){
  const src = noiseSrc(.17), bp = ac.createBiquadFilter(), g = ac.createGain();
  bp.type = "bandpass"; bp.Q.value = 6;
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.exponentialRampToValueAtTime(2500, t + .085);
  bp.frequency.exponentialRampToValueAtTime(900, t + .15);
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(.07, t + .03);
  g.gain.exponentialRampToValueAtTime(.0001, t + .15);
  src.connect(bp); bp.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t + .18);
}

// A purr is three breaths of low noise, each pulsed nearly all the way off and
// back ~25 times a second, slowing a little as the breath runs out. The depth of
// that pulsing is the whole trick: a shallow wobble just sounds like a buzz.
function purrBreath(t, len){
  const src = noiseSrc(len + .06), lp = ac.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 290 + Math.random() * 70; lp.Q.value = 1.4;
  const sub = ac.createOscillator();                 // chest underneath
  sub.type = "sine"; sub.frequency.value = 34 + Math.random() * 7;
  const pulse = ac.createGain();
  pulse.gain.value = .55;                            // the LFO swings around this
  const lfo = ac.createOscillator(), depth = ac.createGain();
  lfo.type = "triangle";
  lfo.frequency.setValueAtTime(26 + Math.random() * 3, t);
  lfo.frequency.linearRampToValueAtTime(22, t + len);
  depth.gain.value = .45;                            // so it swings .10 -> 1.00
  lfo.connect(depth); depth.connect(pulse.gain);
  const env = ac.createGain();
  env.gain.setValueAtTime(.0001, t);
  env.gain.linearRampToValueAtTime(.09, t + .13);
  env.gain.setValueAtTime(.09, t + len - .15);
  env.gain.exponentialRampToValueAtTime(.0001, t + len);
  src.connect(lp); lp.connect(pulse); sub.connect(pulse);
  pulse.connect(env); env.connect(ac.destination);
  [src, sub, lfo].forEach(n => { n.start(t); n.stop(t + len + .02); });
}
export function sndPurr(t0){
  if (t0 === undefined && !audioOn()) return;
  const t = t0 === undefined ? ac.currentTime : t0;
  for (let b = 0; b < 3; b++) purrBreath(t + b * .47, .43);
}

// Three goes at stacking bandpass "formants" all came out nasal, because that is
// what a stack of narrow resonances sounds like — no matter where you put them.
// So: no formants. One resonant lowpass that opens and shuts, which is what a
// mouth actually is. The sweep does the talking; the pitch arc just rides on it.
// This is one specific cat, traced rather than approximated: the call in
// sound_garage-cat-meow-8-fx-306184.mp3, measured by tools/analyse-meow.py.
//
// It is not a pair of smooth curves. It rises, sits on a plateau, steps down, and
// sits on a second plateau before fading — and the pitch and the brightness step
// together, which is the [a] -> [u] of "me-OW". Reproducing the plateaus and the
// step is what makes it read as an animal; smooth ramps through the same endpoints
// gave a siren.
//
//   frac    F0   bright   level
//   0.00   551    1120      9%
//   0.22   668    2638     68%     <- top of the rise
//   0.28   668    2692     91%     <- loudest
//   0.43   649    2595     81%     <- end of the plateau
//   0.49   649    1938     87%     <- the step down
//   0.65   612    1830     82%
//   1.00   612    1830     25%     <- fading out
//
// F0 spans only 117 Hz across the whole call. Earlier guesses used three times that.
const MEOW_F0     = [[0, 551], [.22, 668], [.42, 668], [.55, 612], [1, 612]];
const MEOW_BRIGHT = [[0, 1120], [.25, 2690], [.44, 2690], [.52, 1880], [1, 1830]];
const MEOW_AMP    = [[0, .10], [.28, 1], [.48, .92], [.62, .72], [.82, .34], [1, .02]];
const MEOW_LEN    = .46;                     // the recording is .377; stretched a little,
                                             // which the trace tolerates because every
                                             // breakpoint is a fraction of the whole
// A cat asks for food and then eats it, so for the foods he meows over the call
// comes first and the chewing follows. Shared with the animation so the picture
// and the sound stay in step.
export const MEOW_FIRST = .54;
const MEOW_WAVER = [[5.3, 5], [7.9, 3]];     // rate Hz, depth Hz — two, so they never line up
const MEOW_LEVEL = .055;
export function sndMeow(tune, t0){
  if (t0 === undefined && !audioOn()) return;
  try {
    const k = (tune || 1) * (.97 + Math.random() * .06);   // never twice the same
    const t = t0 === undefined ? ac.currentTime : t0;
    const len = MEOW_LEN + Math.random() * .04;
    const at = f => t + len * f;               // the trace stretches with the length

    const src = ac.createOscillator();
    src.type = "sawtooth";
    src.frequency.setValueAtTime(MEOW_F0[0][1] * k, t);
    MEOW_F0.slice(1).forEach(([f, v]) => src.frequency.exponentialRampToValueAtTime(v * k, at(f)));
    MEOW_WAVER.forEach(([rate, depth]) => {
      const lfo = ac.createOscillator(), wob = ac.createGain();
      lfo.frequency.value = rate * (.94 + Math.random() * .12);
      wob.gain.value = depth;
      lfo.connect(wob); wob.connect(src.frequency);
      lfo.start(t); lfo.stop(t + len + .05);
    });

    const mouth = ac.createBiquadFilter();
    mouth.type = "lowpass";
    mouth.Q.value = 4;
    mouth.frequency.setValueAtTime(MEOW_BRIGHT[0][1], t);
    MEOW_BRIGHT.slice(1).forEach(([f, v]) => mouth.frequency.exponentialRampToValueAtTime(v, at(f)));

    const g = ac.createGain();
    g.gain.setValueAtTime(MEOW_AMP[0][1] * MEOW_LEVEL, t);
    MEOW_AMP.slice(1).forEach(([f, v]) => g.gain.linearRampToValueAtTime(Math.max(.0001, v) * MEOW_LEVEL, at(f)));
    g.gain.exponentialRampToValueAtTime(.0001, at(1) + .04);
    src.connect(mouth); mouth.connect(g); g.connect(ac.destination);

    // air moving through the call, following the same curve
    const air = noiseSrc(len + .08), abp = ac.createBiquadFilter(), ag = ac.createGain();
    abp.type = "bandpass"; abp.Q.value = 1.1;
    abp.frequency.setValueAtTime(MEOW_BRIGHT[0][1], t);
    abp.frequency.exponentialRampToValueAtTime(MEOW_BRIGHT[1][1], at(.25));
    abp.frequency.exponentialRampToValueAtTime(MEOW_BRIGHT[4][1], at(1));
    ag.gain.setValueAtTime(.0001, t);
    ag.gain.linearRampToValueAtTime(.013, at(.2));
    ag.gain.linearRampToValueAtTime(.005, at(.6));
    ag.gain.exponentialRampToValueAtTime(.0001, at(1));
    air.connect(abp); abp.connect(ag); ag.connect(ac.destination);

    air.start(t); air.stop(t + len + .08);
    src.start(t); src.stop(t + len + .06);
  } catch {}
}

// One call per feed, laid out to match what the cat is doing on screen: the
// crunching lines up with the fast chew, the lapping with the tongue, and the
// meow or purr lands as he finishes and licks his lips.
export function sndFeed(kind){
  if (!audioOn()) return;
  try { feedSounds(kind); } catch {}                 // never let audio break the feed
}
function feedSounds(kind){
  const t = ac.currentTime;
  if (kind === "crunch"){
    for (let k = 0; k < 6; k++) crunchBite(t + k * .175 + Math.random() * .02, .1 - k * .011);
    return;
  }
  if (kind === "slurp"){
    for (let k = 0; k < 5; k++) lapTick(t + k * .36);
    return;
  }
  if (kind === "meow"){                              // he asks, then he eats
    sndMeow(.92 + Math.random() * .2, t);
    for (let k = 0; k < 4; k++) softChew(t + MEOW_FIRST + k * .32 + Math.random() * .03);
    return;
  }
  for (let k = 0; k < 4; k++) softChew(t + k * .32 + Math.random() * .03);
  sndPurr(t + 1.24);                                 // purring comes with the eating
}
