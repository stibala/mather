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
function audioOn(){
  if (!DB.sound) return false;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return true;
  } catch { return false; }
}
export function sndCrunch(){
  if (!audioOn()) return;
  const t0 = ac.currentTime;
  for (let k = 0; k < 3; k++){
    const t = t0 + k * (.085 + Math.random() * .03);
    const src = noiseSrc(.07), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "highpass"; f.frequency.value = 900 + Math.random() * 700;
    g.gain.setValueAtTime(.001, t);
    g.gain.linearRampToValueAtTime(.12 - k * .025, t + .008);
    g.gain.exponentialRampToValueAtTime(.0005, t + .07);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(t); src.stop(t + .08);
  }
}
export function sndSlurp(){
  if (!audioOn()) return;
  const t = ac.currentTime, src = noiseSrc(.42);
  const f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = "bandpass"; f.Q.value = 5;
  f.frequency.setValueAtTime(380, t);
  f.frequency.exponentialRampToValueAtTime(1900 + Math.random() * 400, t + .34);
  g.gain.setValueAtTime(.001, t);
  g.gain.linearRampToValueAtTime(.1, t + .06);
  g.gain.exponentialRampToValueAtTime(.0005, t + .4);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t + .43);
}
export function sndPurr(){
  if (!audioOn()) return;
  const t = ac.currentTime, len = 1.15;
  const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
  o.type = "sawtooth"; o.frequency.value = 42 + Math.random() * 8;
  lp.type = "lowpass"; lp.frequency.value = 420;
  const lfo = ac.createOscillator(), depth = ac.createGain();
  lfo.frequency.value = 20 + Math.random() * 6; depth.gain.value = .055;
  lfo.connect(depth); depth.connect(g.gain);
  g.gain.setValueAtTime(.06, t);
  g.gain.setValueAtTime(.06, t + len - .25);
  g.gain.exponentialRampToValueAtTime(.0005, t + len);
  o.connect(lp); lp.connect(g); g.connect(ac.destination);
  o.start(t); lfo.start(t); o.stop(t + len); lfo.stop(t + len);
}
// A voice, not a beep: a buzzy source goes through two vowel filters that slide
// from "ee" to "ow" while the pitch lifts and falls, with a little wobble on top.
export function sndMeow(tune){
  if (!audioOn()) return;
  try {
    const k = tune || 1;
    const t = ac.currentTime, len = .75;
    const src = ac.createOscillator();
    src.type = "sawtooth";
    src.frequency.setValueAtTime(560 * k, t);
    src.frequency.linearRampToValueAtTime(760 * k, t + .22);
    src.frequency.linearRampToValueAtTime(700 * k, t + .42);
    src.frequency.exponentialRampToValueAtTime(420 * k, t + len);
    const lfo = ac.createOscillator(), wob = ac.createGain();
    lfo.frequency.value = 7; wob.gain.value = 12;
    lfo.connect(wob); wob.connect(src.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.05, t + .15);     // quiet and eased in - a background purr, not an alarm
    g.gain.setValueAtTime(.05, t + .45);
    g.gain.exponentialRampToValueAtTime(.0001, t + len);
    [[2600, 1100], [1500, 800]].forEach(([from, to]) => {   // "ee" formants sliding to "ow"
      const f = ac.createBiquadFilter();
      f.type = "bandpass"; f.Q.value = 6;
      f.frequency.setValueAtTime(from, t);
      f.frequency.setValueAtTime(from, t + .18);
      f.frequency.exponentialRampToValueAtTime(to, t + .55);
      src.connect(f); f.connect(g);
    });
    g.connect(ac.destination);
    src.start(t); lfo.start(t);
    src.stop(t + len + .05); lfo.stop(t + len + .05);
  } catch {}
}

