// A fake DOM, just enough of one to run the real app outside a browser.
//
// It is deliberately faithful where the app leans on the platform: className and
// classList are the same thing, append() moves a node and sets parentNode, and
// setTimeout runs on a virtual clock the tests advance by hand. Every one of
// those started as a lie that made a correct change look broken.
//
// Element ids come from the built page, injected as __IDS by test/run.py, so a
// querySelector for an id that does not exist throws instead of silently
// returning a stub.


// --- tiny DOM so the real script can run outside a browser ---
const IDS = globalThis.__IDS || ["againBtn", "allStickers", "backBtn", "bestPrize", "bowlCat", "bowlFood", "bowlHead", "bowlPanel", "bowlSay", "bowlSlotProgress", "bowlSlotResult", "bubble", "catDrop", "chartBtn", "chartHost", "clockFace", "clockHost", "clockPrompt", "clockTaskOpts", "coinVal", "collectionBar", "confetti", "countOpts", "crateBox", "crateBurst", "crossOpts", "daypart", "daypartOpts", "eq", "exportBtn", "figArt", "figHost", "figPrompt", "fill", "giveBtn", "heldBowl", "heldQuiz", "importBtn", "importFile", "lineTaskOpts", "lineToOpts", "lootRow", "mascot", "minuteOpts", "missList", "missPanel", "modeOpts", "moneyCentsOpts", "moneyTaskOpts", "moneyToOpts", "mouth", "opOpts", "pAcc", "pCoins", "pQ", "pStreak", "pTreats", "paAdd", "paCancel", "paClose", "paFaces", "paName", "paTitle", "pad", "playBtn", "playerAdd", "players", "progTitle", "progress", "pupilL", "pupilR", "purr", "qCount", "quitBtn", "quiz", "rAcc", "rCoins", "rRight", "rTime", "rangeOpts", "result", "resultBar", "say", "sessionList", "setup", "soundBtn", "soundWaves", "spanChip", "stage", "starRow", "startBtn", "stickerHead", "stickerPanel", "stickerRow", "stickerView", "streak", "streakVal", "styleOpts", "svArt", "svBar", "svClose", "svMeta", "svName", "svNext", "svPrev", "systemOpts", "tableHint", "tableOpts", "themeBtn", "tin", "toast", "treatCount", "treatWord", "verdict", "wallRowsOpts", "wallToOpts"];
class El {
  constructor(tag){ this.tag=tag; this._text=""; this._html=""; this.style={setProperty(){},removeProperty(){}};
    this.attrs={}; this.dataset={}; this.kids=[]; this.hidden=false; this.value="";
    this.classList={ _s:new Set(), add(...c){c.forEach(x=>this._s.add(x))}, remove(...c){c.forEach(x=>this._s.delete(x))},
      toggle(c,f){ f===undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (f?this._s.add(c):this._s.delete(c)); },
      contains(c){return this._s.has(c)} };
  }
  get className(){ return [...this.classList._s].join(" "); }
  set className(v){ this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get textContent(){return this._text} set textContent(v){this._text=String(v); this.kids.forEach(k=>{ if(k&&k.parentNode===this) k.parentNode=null; }); this.kids=[];}
  get innerHTML(){return this._html} set innerHTML(v){this._html=String(v); this.kids=[];}
  get firstElementChild(){ return this.kids[0] || new El("span"); }
  get lastElementChild(){ return this.kids[this.kids.length-1] || new El("span"); }
  get children(){ return this.kids; }
  get offsetWidth(){ return 1; }
  get isConnected(){ return true; }
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null}
  removeAttribute(k){delete this.attrs[k]}
  append(...n){ n.forEach(x=>{
    if (x && x.parentNode && x.parentNode.kids){ const k=x.parentNode.kids.indexOf(x); if(k>=0) x.parentNode.kids.splice(k,1); }
    if (x && typeof x === "object") x.parentNode = this;
    this.kids.push(x);
  }); }
  querySelector(){ return new El("span"); }
  querySelectorAll(){ return []; }
  addEventListener(k,f){ (this._ev||(this._ev={}))[k]=f; } removeEventListener(k){ if(this._ev) delete this._ev[k]; }
  fire(k,e){ if(this._ev&&this._ev[k]) this._ev[k](e); }
  setPointerCapture(){} releasePointerCapture(){}
  getContext(){ return { setTransform(){}, clearRect(){}, save(){}, restore(){}, translate(){}, rotate(){}, fillRect(){}, set fillStyle(v){} }; }
  getBoundingClientRect(){ return { left:100, top:100, right:160, bottom:160, width:60, height:60 }; }
  focus(){} remove(){ } closest(){ return null; }
  get disabled(){ return this._dis||false; } set disabled(v){ this._dis=v; }
}
const REG = {};
IDS.forEach(id => REG["#"+id] = new El("div"));
const document = {
  querySelector(sel){ if(REG[sel]) return REG[sel]; if(sel.startsWith("#")){ throw new Error("querySelector found nothing for "+sel); } return new El("div"); },
  querySelectorAll(){ return []; },
  createElement(t){ return new El(t); },
  documentElement: new El("html"),
  activeElement: null, hidden:false, body: new El("body"),
  addEventListener(){}
};
const localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
const window = { claude:undefined, AudioContext:undefined, innerWidth:400, innerHeight:800, devicePixelRatio:1,
  scrollTo(){}, addEventListener(){}, matchMedia(){return {matches:false}} };
function addEventListener(){}
// a virtual clock: setTimeout schedules at now+ms, and the test advances time
let __now = 0, __seq = 0;
const __timers = [];
function setTimeout(fn, ms){ __timers.push({ fn, at: __now + (ms||0), seq: __seq++ }); return __seq; }
function clearTimeout(id){ const k = __timers.findIndex(t => t.seq === id - 1); if (k >= 0) __timers.splice(k, 1); }
globalThis.__runUntil = t => {
  for(;;){
    const due = __timers.filter(x => x.at <= t).sort((a,b) => a.at - b.at || a.seq - b.seq);
    if (!due.length) break;
    const job = due[0];
    __timers.splice(__timers.indexOf(job), 1);
    __now = Math.max(__now, job.at);
    job.fn();
  }
  __now = Math.max(__now, t);
};
globalThis.__flush = () => globalThis.__runUntil(__now + 100000);
globalThis.__resetClock = () => { __now = 0; __timers.length = 0; };
function requestAnimationFrame(){return 0}
function matchMedia(){return {matches:false}}
const performance = { now(){ return 0; } };
const getComputedStyle = () => ({ getPropertyValue(){ return "#000"; } });
const devicePixelRatio = 1, innerWidth = 400, innerHeight = 800;
globalThis.document = document; globalThis.window = window; globalThis.localStorage = localStorage;
globalThis.addEventListener = addEventListener; globalThis.setTimeout = setTimeout;
globalThis.clearTimeout = clearTimeout; globalThis.requestAnimationFrame = requestAnimationFrame;
globalThis.matchMedia = matchMedia; globalThis.performance = performance;
globalThis.getComputedStyle = getComputedStyle; globalThis.HTMLInputElement = El;
globalThis.devicePixelRatio = devicePixelRatio; globalThis.innerWidth = innerWidth; globalThis.innerHeight = innerHeight;
globalThis.structuredClone = o => JSON.parse(JSON.stringify(o));
globalThis.__probe = {};













