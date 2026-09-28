import { statsOf } from "./db.js";

// Two kinds of reward, which is what lets the collection be finite.
//
//   TREATS are food for Numo. They come often, they are CONSUMED when you feed
//   him, and so they can go on for ever without repeating themselves.
//   STICKERS are kept. There are 36, they never repeat, and when the last one is
//   won the collection is genuinely complete — the treats carry on regardless.
//
// The old design had one list that wrapped round and re-charged for prizes the
// child already owned. Nothing wraps now.
export const TREAT_COST = 10;
export const TREATS = ["🐟","🥛","🍪","🧀","🍤","🥓","🍗","🥚","🍚","🍯","🥨","🍉"];
const NOMS = ["Nom nom!","Purrr…","Meow!","Yum!","More?","Mrrrow!"];

const TIERS = [
  { name:"Bronze", kind:"toy",      cost:40,  ring:"#C07A3E", glow:"#EBB27C" },
  { name:"Silver", kind:"treasure", cost:60,  ring:"#8D99A6", glow:"#D2DAE3" },
  { name:"Gold",   kind:"place",    cost:90,  ring:"#C79413", glow:"#F7DB7A" },
  { name:"Diamond",kind:"friend",   cost:130, ring:"#2FA8CC", glow:"#A6EAF8" }
];
export const PRIZES = [
  // bronze — toys
  { e:"🧶", n:"Wool ball",  t:0 }, { e:"🎾", n:"Tennis ball", t:0 }, { e:"🪀", n:"Yo-yo",       t:0 },
  { e:"🎣", n:"Fishing rod",t:0 }, { e:"📦", n:"Cardboard box",t:0 },{ e:"🪶", n:"Feather",     t:0 },
  { e:"🔔", n:"Little bell",t:0 }, { e:"🎈", n:"Balloon",     t:0 }, { e:"🧸", n:"Teddy",       t:0 },
  { e:"🪁", n:"Kite",       t:0 },
  // silver — treasures
  { e:"👑", n:"Crown",      t:1 }, { e:"🎩", n:"Top hat",     t:1 }, { e:"🏅", n:"Medal",       t:1 },
  { e:"🗝️", n:"Golden key", t:1 }, { e:"💍", n:"Ring",        t:1 }, { e:"🏆", n:"Trophy",      t:1 },
  { e:"🎺", n:"Trumpet",    t:1 }, { e:"🪄", n:"Magic wand",  t:1 }, { e:"🧭", n:"Compass",     t:1 },
  { e:"🕰️", n:"Old clock",  t:1 },
  // gold — places to take Numo
  { e:"🏰", n:"Castle",     t:2 }, { e:"🚀", n:"Rocket",      t:2 }, { e:"🎪", n:"Circus",      t:2 },
  { e:"🗺️", n:"Treasure map",t:2 },{ e:"⛵", n:"Sailing boat",t:2 }, { e:"🎡", n:"Big wheel",   t:2 },
  { e:"🏝️", n:"Island",     t:2 }, { e:"🎠", n:"Carousel",    t:2 },
  // diamond — friends who join the club
  { e:"🦊", n:"Fox",        t:3 }, { e:"🦉", n:"Owl",         t:3 }, { e:"🐼", n:"Panda",       t:3 },
  { e:"🦁", n:"Lion",       t:3 }, { e:"🐧", n:"Penguin",     t:3 }, { e:"🦄", n:"Unicorn",     t:3 },
  { e:"🐬", n:"Dolphin",    t:3 }, { e:"🦖", n:"Dinosaur",    t:3 }
];
export const prizeOf = i => PRIZES[i];
export const tierOf  = i => TIERS[PRIZES[Math.min(i, PRIZES.length - 1)].t];
export const THRESH = (() => { const out = []; let c = 0; PRIZES.forEach(p => { c += TIERS[p.t].cost; out.push(c); }); return out; })();
export const prizesFor = coins => { let k = 0; while (k < THRESH.length && THRESH[k] <= coins) k++; return k; };
const ALL_DONE = THRESH[THRESH.length - 1];
// Treats are earned from the same lifetime coins but are not paid for out of
// them — feeding Numo never costs a child a sticker.
export const treatsEarned = coins => Math.floor(coins / TREAT_COST);
// The tin holds actual treats — the ones crates have handed over — so a child can
// only feed Numo what they really have, and can pick which.
export const tinOf = id => (statsOf(id).tin ||= []);
export const pantryOf = id => tinOf(id).length;
// Faces for a player's own avatar — kept short, and separate from the prizes.
export const FACES = ["🦊","🐢","🐙","🦉","🐝","🦄","🐳","🦖","🐼","🦁","🐧","🐸","🦋","🐨","🦩","🐬"];
