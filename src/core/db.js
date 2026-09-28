import { KEY, PER_STICKER } from "./storage.js";
import { THRESH, TREATS, TREAT_COST } from "./prizes.js";

const DEFAULT_DB = {
  active: "p1",
  profiles: [
    { id:"p1", name:"Julie",   face:"🦊", color:"#FF7A1A" },
    { id:"p2", name:"Jasmina", face:"🦄", color:"#F0347B" }
  ],
  stats: {},                       // id -> {coins, bestStreak, questions}
  history: {},                     // id -> [{ts,acc,avgTime,n,ops,range,style}]
  settings: { mode:"sum", range:"10", ops:["+","−"], style:"mixed", cross:"mixed",
              minutes:"hour", daypart:"morning", system:"12",
              lineTo:"10", lineTask:"mixed",
              tables:[1,2,3,4,5,6,7,8,9,10],
              wallRows:"3", wallTo:"20",
              moneyTo:"1000", moneyTask:"count", moneyCents:"no",
              clockTask:"read", count:10 },
  sound: true,
  theme: "system",
  v: 6
};

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_DB);
    const stored = JSON.parse(raw);
    const db = Object.assign(structuredClone(DEFAULT_DB), stored);
    // settings gained a key, so merge that one a level deeper
    db.settings = Object.assign(structuredClone(DEFAULT_DB.settings), db.settings || {});
    // the money ranges were rescaled from cents-sized to euro-sized
    if (!["1000","2000","10000"].includes(db.settings.moneyTo)) db.settings.moneyTo = "1000";
    if (db.settings.cross === "yes") db.settings.cross = "one";   // carries got graded
    // Coins have been repriced twice. Rescale an older balance by price-then over
    // price-now, so nobody wakes up with fewer stickers than they went to bed with.
    const wasPricedAt = !stored.v ? 100 : stored.v === 2 ? 300 : PER_STICKER;
    if (wasPricedAt !== PER_STICKER){
      Object.values(db.stats || {}).forEach(st => {
        st.coins = Math.floor((st.coins || 0) * PER_STICKER / wasPricedAt);
      });
    }
    // Prizes used to be a flat 25 each; tiers made the later ones dearer, which
    // would quietly take some back. Top the balance up to whatever the old flat
    // price had already bought, so the collection only ever grows.
    // Migrations, in version order. The rule every time: a child may gain from a
    // repricing but must never lose. What counted as a keepsake changed though --
    // v1 to v3 sold 16 animal stickers and nothing else, v4 put 12 snacks at the
    // front of the same list, and v5 pulled those snacks out into treats. So only
    // a v4 save has 12 prizes to discount; discounting them for an older save
    // silently takes stickers off a child who earned them.
    if (!stored.v || stored.v < 5){
      const wereFood = stored.v === 4 ? 12 : 0;
      Object.values(db.stats || {}).forEach(st => {
        const hadFlat = Math.floor((st.coins || 0) / PER_STICKER);
        const keepsakes = Math.min(Math.max(0, hadFlat - wereFood), THRESH.length);
        if (keepsakes > 0) st.coins = Math.max(st.coins, THRESH[keepsakes - 1]);
        st.fed = st.fed || 0;
      });
    }
    // v6: treats stopped being a number and became things in a tin.
    if (!stored.v || stored.v < 6){
      Object.values(db.stats || {}).forEach(st => {
        if (!Array.isArray(st.tin)){
          const left = Math.max(0, Math.floor((st.coins || 0) / TREAT_COST) - (st.fed || 0));
          st.tin = Array.from({ length: left }, () => TREATS[Math.floor(Math.random() * TREATS.length)]);
        }
      });
    }
    db.v = 6;
    return db;
  } catch { return structuredClone(DEFAULT_DB); }
}
export function save(){ try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch {} }

export let DB = load();
export const statsOf = id => (DB.stats[id] ||= { coins:0, bestStreak:0, questions:0, fed:0, holding:null, tin:[] });
export const histOf  = id => (DB.history[id] ||= []);
export const me      = () => DB.profiles.find(p => p.id === DB.active) || DB.profiles[0];

