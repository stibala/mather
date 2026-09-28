import { $ } from "../core/dom.js";
import { MEOW_FIRST } from "../core/audio.js";

/* ---------- Numo himself ---------- */
// One cat, two places: beside the questions, and at the bowl. His markup lives
// here rather than in the page so the two copies cannot drift apart, and every
// part is a class rather than an id so two of him can exist at once. The bowl
// used to hold a 🐱 emoji instead, which is why feeding never looked like eating.
const CAT_SVG = `<svg class="mascot" viewBox="0 0 120 120" aria-hidden="true">
  <path class="ear" d="M30 44 L26 14 L54 32 Z" fill="var(--tangerine)" stroke="var(--tangerine-d)" stroke-width="3" stroke-linejoin="round"/>
  <path class="ear" d="M90 44 L94 14 L66 32 Z" fill="var(--tangerine)" stroke="var(--tangerine-d)" stroke-width="3" stroke-linejoin="round"/>
  <rect x="18" y="30" width="84" height="80" rx="32" fill="var(--tangerine)" stroke="var(--tangerine-d)" stroke-width="3"/>
  <circle cx="35" cy="84" r="9" fill="var(--berry)" opacity=".45"/>
  <circle cx="85" cy="84" r="9" fill="var(--berry)" opacity=".45"/>
  <ellipse class="eye" cx="46" cy="66" rx="12" ry="13" fill="#fff"/>
  <ellipse class="eye" cx="74" cy="66" rx="12" ry="13" fill="#fff"/>
  <circle class="pupil" cx="46" cy="68" r="5.5" fill="#16264A"/>
  <circle class="pupil" cx="74" cy="68" r="5.5" fill="#16264A"/>
  <path class="lid" d="M36 67 q10 7 20 0" fill="none" stroke="#16264A" stroke-width="3.4" stroke-linecap="round"/>
  <path class="lid" d="M64 67 q10 7 20 0" fill="none" stroke="#16264A" stroke-width="3.4" stroke-linecap="round"/>
  <path class="squint" d="M37 68 q9 -9 18 0" fill="none" stroke="#16264A" stroke-width="3.4" stroke-linecap="round"/>
  <path class="squint" d="M65 68 q9 -9 18 0" fill="none" stroke="#16264A" stroke-width="3.4" stroke-linecap="round"/>
  <g class="yawnMouth">
    <ellipse cx="60" cy="92" rx="9" ry="12" fill="#16264A"/>
    <ellipse cx="60" cy="99" rx="6" ry="4" fill="var(--berry)"/>
  </g>
  <ellipse class="tongue" cx="60" cy="90" rx="7" ry="9" fill="var(--berry)" stroke="var(--berry-d)" stroke-width="1.6"/>
  <path class="mouth" d="M52 88 q8 7 16 0" fill="none" stroke="#16264A" stroke-width="3.4" stroke-linecap="round"/>
  <g class="zzz" fill="var(--ocean)" font-family="Fredoka,sans-serif" font-weight="600">
    <text x="92" y="30" font-size="15">z</text>
    <text x="100" y="18" font-size="19">z</text>
    <text x="110" y="4" font-size="23">Z</text>
  </g>
</svg>`;

const MOUTHS = {
  idle:  "M52 88 q8 7 16 0",
  happy: "M46 84 q14 16 28 0",
  oops:  "M52 92 q8 -8 16 0",
  wow:   "M54 84 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0",
  sleep: "M56 90 q4 3 8 0"
};

function mountCats(){
  document.querySelectorAll(".cathost").forEach(h => {
    if (!h.querySelector(".mascot")) h.innerHTML = CAT_SVG;
  });
}
const catIn = sel => { const h = $(sel); return h ? h.querySelector(".mascot") : null; };
function setMouth(cat, kind){
  const m = cat ? cat.querySelector(".mouth") : null;
  if (m) m.setAttribute("d", MOUTHS[kind] || MOUTHS.idle);
}
function mouthIs(cat, kind){
  const m = cat ? cat.querySelector(".mouth") : null;
  return !!m && m.getAttribute("d") === MOUTHS[kind];
}

// Three beats, not realism: he leans in, chews with his eyes screwed shut and
// his ears twitching, then licks his lips. Milk skips the chewing and gets
// lapped; anything crunchy gets faster, sharper bites. The cat is one rounded
// shape with no separate head, so "leaning to the bowl" tips all of him — which
// is roughly what a real cat does anyway.
const CHEW_MS = { crunch: 1260, slurp: 1800, meow: 1280, purr: 1280 };
function feedFace(cat, kind){
  if (!cat) return;
  cat.classList.remove("eat", "fast", "lap", "lick", "call");
  void cat.offsetWidth;                            // restart, even mid-animation
  // For the foods he calls over, he asks first — head up, mouth open — and only
  // then gets on with eating. The wait matches MEOW_FIRST so the picture and the
  // sound stay together.
  if (kind === "meow"){
    cat.classList.add("call");
    setTimeout(() => {
      cat.classList.remove("call");
      chewFace(cat, kind);
    }, MEOW_FIRST * 1000);
    return;
  }
  chewFace(cat, kind);
}
function chewFace(cat, kind){
  const fast = kind === "crunch", lap = kind === "slurp";
  cat.classList.add("eat");
  if (fast) cat.classList.add("fast");
  if (lap) cat.classList.add("lap");
  setTimeout(() => {
    cat.classList.remove("eat", "fast", "lap");
    if (lap) return;                               // lapping was the licking
    cat.classList.add("lick");
    setTimeout(() => cat.classList.remove("lick"), 620);
  }, CHEW_MS[kind] || 1280);
}
