/* Binder — offline MTG collection app. Single file, no build step.
   Sections: index loading, state, nav, search, card, OCR, scan, review, binder, decks, more.
*/
/* ========================= INDEX LOADING =========================
   data/cards0.json + cards1.json: every card from the magic-search-engine index
   (36k cards, 114k printings, built 2026-10-17). data/sets.json: code → [name, year, types].
   Row shape: [name, types, subtypes, supertypes, mana, ci, oracle, keywords, mv, prints[[set,num,rarity]...], power, toughness] */
let INDEX=[],BY_ID={},BY_LOWER={},SETS={};
const RARITY={0:"special",1:"common",2:"uncommon",3:"rare",4:"mythic"};
function setName(code){return (SETS[code]||[code.toUpperCase()])[0];}
function setYear(code){return (SETS[code]||["",""])[1];}
function buildCard(r){
  const [name,types,sub,sup,mana,ci,o,k,mv,prints,pw,tg]=r;
  const cost=(mana||"").replace(/[{}]/g,"").toUpperCase().replace(/\/(?=[WUBRGC])/g,"");
  const ps=prints.map(p=>({set:p[0],num:p[1],rarity:p[2],sid:p[3]||"",n:/^\d+$/.test(p[1])?+p[1]:NaN})).reverse();
  const card={id:name,name,types:types||[],sub:sub||[],sup:sup||[],cost,ci:(ci||"").toUpperCase().split("").filter(x=>"WUBRG".includes(x)),o:o||"",kw:(k||[]).map(x=>x.toLowerCase()),mv:mv||0,prints:ps,pt:pw!=null?pw+"/"+tg:""};
  card.type=[...card.sup,...card.types].join(" ")+(card.sub.length?" — "+card.sub.join(" "):"");
  card.lower=name.toLowerCase();
  return card;
}
const MAIN=["standard","core","booster","commander","masters","draft innovation","expansion"];
function defaultPrint(card){const ty=p=>(SETS[p.set]||["","",[]])[2]||[];return card.prints.find(p=>{const t=ty(p);return t.some(x=>MAIN.includes(x))&&!t.includes("promo");})||card.prints.find(p=>!ty(p).includes("promo"))||card.prints[0];}
async function loadIndex(){
  const prog=(p,m)=>{const b=document.getElementById("ldbar");if(b)b.style.width=p+"%";const t=document.getElementById("ldmsg");if(t&&m)t.textContent=m;};
  const sub=m=>{const t=document.getElementById("ldsub");if(t)t.textContent=m;};
  const got={};let total=0;
  const get=async(u,key)=>{const r=await fetch(new URL(u,document.baseURI).href);if(!r.ok)throw new Error(u+" "+r.status);
    const len=r.headers?(+r.headers.get("content-length")||0):0;if(key&&len&&r.body&&r.body.getReader){total+=len;const rd=r.body.getReader();const chunks=[];let n=0;for(;;){const {done,value}=await rd.read();if(done)break;chunks.push(value);n+=value.length;got[key]=n;const g=Object.values(got).reduce((a,b)=>a+b,0);prog(10+Math.round(70*g/total));sub((g/1048576).toFixed(1)+" of "+(total/1048576).toFixed(1)+" MB");}
      const all=new Uint8Array(n);let o=0;for(const ch of chunks){all.set(ch,o);o+=ch.length;}return JSON.parse(new TextDecoder().decode(all));}
    return r.json();};
  prog(6,"Loading sets…");SETS=await get("data/sets.json");
  prog(10,"Loading the card index…");sub("First run downloads it once; after that it's cached.");
  const [a,b]=await Promise.all([get("data/cards0.json","a"),get("data/cards1.json","b")]);
  prog(82,"Building index…");sub("");
  INDEX=a.concat(b).map(buildCard);
  for(const c of INDEX){BY_ID[c.id]=c;BY_LOWER[c.lower]=c;}
  prog(100,"Ready");
}

/* ========================= STATE ========================= */
const KEY="binder-v2";
let S=null;
const SEEDS=[["Lightning Bolt","clb",3],["Lightning Strike","m19",7,"NM",false,"typed","2026-07-11"],["Rift Bolt","tsr",2],["Bolt Bend","war",1],["Bolt of Keranos","bng",1,"LP"],["Lightning Greaves","clb",2],["Counterspell","mh2",3],["Brainstorm","mh2",4],["Ponder","m12",2],["Rhystic Study","clb",1,"NM",true],["Mystic Remora","ice",1,"LP"],["Fact or Fiction","mh3",2],["Mana Leak","2x2",4],["Murktide Regent","mh2",1],["Swords to Plowshares","2x2",1],["Esper Sentinel","mh2",1],["Thoughtseize","2x2",1],["Sheoldred's Edict","mom",2,"NM",false,"scan","2026-10-17"],["Llanowar Elves","fdn",1,"NM",true,"scan","2026-10-17"],["Goblin Chieftain","mh2",1],["Goblin Rabblemaster","m15",1],["Legion Loyalist","gtc",1],["Goblin Motivator","m19",2],["Goblin Bushwhacker","zen",1],["Fervor","m13",1],["Krenko, Mob Boss","fdn",1],["Sol Ring","clb",3],["Arcane Signet","clb",2],["Mountain","fdn",30,"LP",false,"typed","2026-07-11"]];
function seed(){
  const col={};
  for(const [name,set,n,cond="NM",foil=false,via="scan",date="2026-08-02"] of SEEDS){
    const card=BY_ID[name];if(!card)continue;
    const inSet=card.prints.filter(x=>x.set===set).sort((a,b)=>parseInt(a.num,10)-parseInt(b.num,10));const p=inSet[0]||defaultPrint(card);
    for(let i=0;i<n;i++)addCopy(col,card.id,p.set,p.num,{cond,foil,via,date,conf:via==="scan"?90+(i%8):0});
  }
  const rv=[];const sw=BY_ID["Swords to Plowshares"],th=BY_ID["Thassa's Oracle"];
  if(sw){const ps=sw.prints.slice(0,3);rv.push({id:"r1",guess:sw.id,print:{set:ps[0].set,num:ps[0].num},conf:71,alts:ps.slice(1).map((p,i)=>({id:sw.id,set:p.set,num:p.num,conf:66-i*5})),img:null,at:"2026-10-17"});}
  if(th){const p=th.prints[0];rv.push({id:"r2",guess:th.id,print:{set:p.set,num:p.num},conf:52,alts:[],img:null,at:"2026-10-17"});}
  return {col,review:rv,decks:[
    {id:"d1",name:"Krenko, Mob Boss",format:"Commander",lines:parseDeck("1 Krenko, Mob Boss\n1 Goblin Chieftain\n1 Goblin Rabblemaster\n1 Legion Loyalist\n1 Goblin Warchief\n1 Skirk Prospector\n1 Muxus, Goblin Grandee\n1 Goblin Guide\n1 Lightning Bolt\n1 Chaos Warp\n1 Deflecting Swat\n1 Fervor\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Greaves\n1 Castle Embereth\n1 Ancient Tomb\n30 Mountain")},
    {id:"d2",name:"Mono-U Tempo",format:"Pauper",lines:parseDeck("4 Counterspell\n4 Brainstorm\n2 Ponder\n4 Mana Leak\n2 Fact or Fiction\n18 Island")}],
    session:[],prefs:{}};
}
function pk(id,set,num){return id+"|"+set+"|"+num;}
function cid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9);}
function fnv(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36);}
function addCopy(col,id,set,num,copy){const k=pk(id,set,num);if(!copy.id)copy.id=cid();if(typeof S!=="undefined"&&S&&col===S.col&&S.tomb)delete S.tomb[copy.id];(col[k]=col[k]||{id,set,num,copies:[]}).copies.push(copy);if(typeof SETSTATS!=="undefined")SETSTATS=null;if(typeof S!=="undefined"&&S&&col===S.col){const c=BY_ID[id];const p=c&&c.prints.find(x=>x.set===set&&x.num===num);if(p&&typeof wantPrices==="function")setTimeout(()=>wantPrices([p]),0);}}
function empty(){return {col:{},review:[],decks:[],session:[],prefs:{},tomb:{},deckTomb:{},prefsAt:0};}
/* Every copy carries a stable id and removals leave a tombstone, so two devices can be merged as a
   set: union of copies minus tombstones, which is commutative and idempotent. Copies that predate ids
   get deterministic ones (printing + date + position), so the same backup restored on two devices
   does not double up. */
function migrate(st){
  st.tomb=st.tomb||{};st.deckTomb=st.deckTomb||{};st.prefsAt=st.prefsAt||0;st.prefs=st.prefs||{};
  for(const k of Object.keys(st.col)){const e=st.col[k];e.copies.forEach((c,i)=>{if(!c.id)c.id="m"+fnv(k+"|"+(c.date||"")+"|"+i);});}
  for(const d of st.decks)if(!d.updatedAt)d.updatedAt=0;
  const cut=Date.now()-90*864e5;for(const id in st.tomb)if(st.tomb[id]<cut)delete st.tomb[id];for(const id in st.deckTomb)if(st.deckTomb[id]<cut)delete st.deckTomb[id];
  return st;
}
/* Remove the newest copy of a printing, leaving a tombstone. Returns the copy so an undo can put it back. */
function removeLastCopy(k){const e=S.col[k];if(!e||!e.copies.length)return null;const c=e.copies.pop();if(c&&c.id)S.tomb[c.id]=Date.now();if(!e.copies.length)delete S.col[k];return c;}
function touchPrefs(){S.prefsAt=Date.now();}
function touchDeck(d){d.updatedAt=Date.now();}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){S=migrate(JSON.parse(raw));for(const k of Object.keys(S.col))if(!BY_ID[S.col[k].id])delete S.col[k];S.review=S.review.filter(r=>BY_ID[r.guess]);return;}}catch(e){}S=empty();save();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(typeof scheduleSync==="function")scheduleSync();}
function ownedOf(id){let n=0;for(const k in S.col){const e=S.col[k];if(e.id===id)n+=e.copies.length;}return n;}
function ownedPrint(id,set,num){const e=S.col[pk(id,set,num)];return e?e.copies.length:0;}
function totalOwned(){return Object.values(S.col).reduce((n,e)=>n+e.copies.length,0);}

/* ========================= HELPERS ========================= */
const $=s=>document.querySelector(s);
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function ciClass(card){if(!card.ci.length)return "C";if(card.ci.length>1)return "M";return card.ci[0];}
function stripe(card,extra=""){const k=ciClass(card);if(k==="M"){const g=card.ci.map((x,i,a)=>`var(--${x}) ${i*100/a.length}% ${(i+1)*100/a.length}%`).join(",");return `<span class="stripe" style="background:linear-gradient(${g});${extra}"></span>`;}return `<span class="stripe ${k}" style="${extra}"></span>`;}
function pips(cost){if(!cost)return "";let out="";for(const ch of cost){out+=/[WUBRG]/.test(ch)?`<span class="pip ${ch}"></span>`:`<span class="pip">${esc(ch)}</span>`;}return `<span class="pips">${out}</span>`;}
/* Card images come from Scryfall's CDN by printing id, lazily, over the typographic card;
   if the image can't load (offline, not yet cached) the text card stays. */
function imagesOn(){return !(S&&S.prefs&&S.prefs.images===false);}
function imgUrl(p,size){if(!p||!p.sid||p.sid.length!==32)return "";const h=p.sid;const d=h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);return `https://cards.scryfall.io/${size}/front/${h[0]}/${h[1]}/${d}.jpg`;}
/* CDN first; if that URL form ever fails, fall back once to the documented API redirect by set and number. */
function imgFail(el){const a=el.dataset.alt;if(a&&!el.dataset.tried){el.dataset.tried="1";el.src=a;return;}el.remove();}
function showPrint(card){const ops=ownedPrints(card.id);if(ops.length){const e=ops[0];return card.prints.find(p=>p.set===e.set&&p.num===e.num)||defaultPrint(card);}return defaultPrint(card);}
function thumb(card,size,extra="",print){const k=ciClass(card);const st=k==="M"?`class="card ${size} M" style="--ci1:var(--${card.ci[0]});--ci2:var(--${card.ci[card.ci.length-1]})"`:`class="card ${size} ${k}"`;
  const ft=size==="sm"?"":`<div class="ft"><span>${esc(card.pt||card.types[0]||"")}</span>${card.cost?pips(card.cost):""}</div>`;
  const pr0=print||showPrint(card);const url=imagesOn()?imgUrl(pr0,size==="lg"?"normal":"small"):"";
  const alt=imagesOn()&&pr0?`https://api.scryfall.com/cards/${encodeURIComponent(pr0.set)}/${encodeURIComponent(pr0.num)}?format=image&version=${size==="lg"?"normal":"small"}`:"";
  const img=url?`<img class="ci" src="${url}" data-alt="${esc(alt)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)">`:"";
  return `<div ${st} aria-hidden="true"><div class="ttl">${esc(card.name)}</div><div class="art"></div>${ft}${img}${extra}</div>`;}
function pr(p){return p.set.toUpperCase()+" "+p.num;}
function ownedPrints(id){return Object.values(S.col).filter(e=>e.id===id).sort((a,b)=>b.copies.length-a.copies.length);}
function toast(msg,undo){const t=$("#toast");t.innerHTML=esc(msg)+(undo?'<button id="undo">Undo</button>':"");t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),undo?5000:2400);if(undo)$("#undo").onclick=()=>{undo();t.classList.remove("on");};}
function today(){return new Date().toISOString().slice(0,10);}

/* ========================= PRICES =========================
   Scryfall's collection endpoint returns up to 75 cards per POST with TCGplayer (usd) and
   Cardmarket (eur) prices. Binder asks only for printings it needs (what you own, the card you
   are looking at), keeps them for a day in local storage, and totals the collection once a day. */
const PRICE_TTL=24*3600*1000,PRICE_BATCH=75;
let priceQueue=new Set(),priceBusy=false,priceErr="";
function currency(){return (S.prefs&&S.prefs.currency)||"usd";}
function dashed(h){return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);}
function priceOf(p,foil){const r=S.prices&&S.prices[p.sid];if(!r)return null;const c=currency();const v=foil?(r[c+"_foil"]!=null?r[c+"_foil"]:r[c+"_etched"]!=null?r[c+"_etched"]:r[c]):(r[c]!=null?r[c]:r[c+"_foil"]);return v==null?null:+v;}
function fmt(v){if(v==null)return "—";const c=currency();return (c==="eur"?"€":"$")+(v>=100?v.toFixed(0):v.toFixed(2));}
function entryValue(e){const card=BY_ID[e.id];const p=card&&card.prints.find(x=>x.set===e.set&&x.num===e.num);if(!p)return null;let t=0,known=0;for(const cp of e.copies){const v=priceOf(p,cp.foil);if(v!=null){t+=v;known++;}}return {total:t,known,of:e.copies.length};}
function collectionValue(){let t=0,known=0,of=0;for(const e of Object.values(S.col)){const v=entryValue(e);if(!v)continue;t+=v.total;known+=v.known;of+=v.of;}return {total:t,known,of};}
function stale(sid){const r=S.prices&&S.prices[sid];return !r||(Date.now()-r.at)>PRICE_TTL;}
function wantPrices(prints){if(!prints)return;for(const p of prints){if(p&&p.sid&&stale(p.sid))priceQueue.add(p.sid);}pumpPrices();}
function wantOwnedPrices(){const seen=new Set();for(const e of Object.values(S.col)){const card=BY_ID[e.id];const p=card&&card.prints.find(x=>x.set===e.set&&x.num===e.num);if(p&&p.sid&&!seen.has(p.sid)){seen.add(p.sid);if(stale(p.sid))priceQueue.add(p.sid);}}pumpPrices();}
async function pumpPrices(){
  if(priceBusy||!priceQueue.size||(typeof navigator!=="undefined"&&navigator.onLine===false))return;
  priceBusy=true;
  try{
    while(priceQueue.size){
      const chunk=[...priceQueue].slice(0,PRICE_BATCH);chunk.forEach(x=>priceQueue.delete(x));
      const res=await fetch("https://api.scryfall.com/cards/collection",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({identifiers:chunk.map(id=>({id:dashed(id)}))})});
      if(!res.ok){priceErr="Scryfall answered "+res.status;break;}
      const j=await res.json();S.prices=S.prices||{};const now=Date.now();
      for(const c of (j.data||[])){const pr=c.prices||{};S.prices[c.id.replace(/-/g,"")]={usd:pr.usd,usd_foil:pr.usd_foil,usd_etched:pr.usd_etched,eur:pr.eur,eur_foil:pr.eur_foil,at:now};}
      for(const nf of (j.not_found||[])){const id=(nf.id||"").replace(/-/g,"");if(id)S.prices[id]={at:now};}
      priceErr="";save();snapshotValue();rerender();
      if(priceQueue.size)await new Promise(r=>setTimeout(r,150));
    }
  }catch(e){priceErr=(e&&e.message)||String(e);}
  priceBusy=false;
}
function snapshotValue(){
  const v=collectionValue();if(!v.of||v.known<v.of)return;
  S.hist=S.hist||[];const d=today();const last=S.hist[S.hist.length-1];
  const rec={d,v:+v.total.toFixed(2),n:v.of,c:currency()};
  if(last&&last.d===d)S.hist[S.hist.length-1]=rec;else S.hist.push(rec);
  if(S.hist.length>730)S.hist=S.hist.slice(-730);save();
}
function valueChange(){const h=S.hist||[];if(h.length<2)return "first snapshot";const last=h[h.length-1];const weekAgo=[...h].reverse().find(x=>(Date.parse(last.d)-Date.parse(x.d))>=6*864e5)||h[0];const d=last.v-weekAgo.v;const days=Math.round((Date.parse(last.d)-Date.parse(weekAgo.d))/864e5);return `${d>=0?"+":"−"}${fmt(Math.abs(d)).replace(/^[$€]/,m=>m)} over ${days} day${days===1?"":"s"}`;}
function sparkline(h){
  const pts=h.slice(-90);const vs=pts.map(x=>x.v);const lo=Math.min(...vs),hi=Math.max(...vs);const W=320,H=56,pad=4;
  const X=i=>pad+(pts.length===1?0:i*(W-2*pad)/(pts.length-1)),Y=v=>hi===lo?H/2:H-pad-(v-lo)*(H-2*pad)/(hi-lo);
  const d=pts.map((x,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(x.v).toFixed(1)).join(" ");
  const last=pts[pts.length-1],first=pts[0];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="56" role="img" aria-label="Collection value, ${first.d} to ${last.d}" style="margin-top:8px;display:block"><path d="${d} L${X(pts.length-1).toFixed(1)} ${H} L${X(0)} ${H} Z" fill="var(--acs)" opacity=".5"/><path d="${d}" fill="none" stroke="var(--fg)" stroke-width="1.5"/><circle cx="${X(pts.length-1).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="3" fill="var(--fg)"/></svg><div style="display:flex;justify-content:space-between" class="mu"><small>${first.d}</small><small>${fmt(lo)} – ${fmt(hi)}</small><small>${last.d}</small></div>`;
}
function pricesAsOf(){let newest=0;for(const k in (S.prices||{})){const a=S.prices[k].at;if(a>newest)newest=a;}return newest;}
function ago(ts){if(!ts)return "never";const m=Math.round((Date.now()-ts)/60000);if(m<2)return "just now";if(m<60)return m+" min ago";const h=Math.round(m/60);if(h<48)return h+" h ago";return Math.round(h/24)+" days ago";}

/* Re-render the current screen without losing scroll position or a focused input. */
function rerender(){const a=document.activeElement;if(a&&/^(input|textarea)$/i.test(a.tagName))return;if($("#overlay").classList.contains("on"))return;if(camOn&&view==="scan"){updateLiveUI();return;}const el=$("#v-"+view);const st=el?el.scrollTop:0;render();if(el)el.scrollTop=st;}

/* ========================= NAV ========================= */
let view="search",stack=[],curArg=null;
/* Destinations are flat peers. The bottom bar shows four pinned ones plus a tray that holds the
   rest; the archetype picked on first open sets the pins, and the tray's editor changes them. */
const DEST={
  search:{label:"Search",icon:"search",render:()=>rSearch()},
  scan:{label:"Scan",icon:"scan",render:()=>rScan()},
  binder:{label:"Binder",icon:"binder",render:()=>rBinder()},
  sets:{label:"Sets",icon:"sets",render:()=>rSets()},
  types:{label:"Types",icon:"types",render:()=>rTypes()},
  decks:{label:"Decks",icon:"decks",render:()=>rDecks()},
  review:{label:"Review",icon:"review",render:()=>rReview()},
  more:{label:"Settings",icon:"more",render:()=>rMore()},
};
/* Colour schemes. Two roles: the action colour (buttons, active filters, alerts) and the owned colour
   (counts, progress, the active tab). Presets are named for the basic lands; "custom" picks each role
   from the six colours. The CSS holds the preset values; custom writes the primitives inline. */
const SCHEMES=[{id:"gold",name:"Top 8",acc:"#d7301f",own:"#d9a441"},{id:"w",name:"Plains",acc:"#e9dfc0",own:"#d9a441"},{id:"u",name:"Island",acc:"#2b6fd0",own:"#6cc3ff"},{id:"b",name:"Swamp",acc:"#7d4fc9",own:"#d9ccb3"},{id:"r",name:"Mountain",acc:"#d7301f",own:"#f2a93b"},{id:"g",name:"Forest",acc:"#257a42",own:"#b7d86a"},{id:"c",name:"Steel",acc:"#b8c0cc",own:"#6fb6d6"}];
const COLOUR_ACT={W:["#e9dfc0","#1a1609","#121110","#1c1a17","#26231f","#33302a","#6b5a2a"],U:["#2b6fd0","#ffffff","#0b1017","#131a24","#1a2331","#263241","#1f63b8"],B:["#7d4fc9","#ffffff","#0d0b10","#17131c","#201a27","#2d2636","#5f3aa6"],R:["#d7301f","#ffffff","#120e0d","#1c1514","#261c1a","#352826","#c8281c"],G:["#257a42","#ffffff","#0b110e","#131b16","#1a241d","#25332a","#237a3e"],C:["#b8c0cc","#111111","#0e0f12","#17191d","#1f2227","#2c3038","#4a5563"]};
const COLOUR_OWN={W:["#d9a441","#8a5f0e"],U:["#6cc3ff","#1b6fb0"],B:["#d9ccb3","#6f6252"],R:["#f2a93b","#a3500a"],G:["#b7d86a","#497310"],C:["#6fb6d6","#1f7398"]};
const COLOUR_NAME={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colourless"};
function applyScheme(){
  const p=(S&&S.prefs)||{};const root=document.documentElement;const st=root.style;const id=SCHEMES.some(s=>s.id===p.scheme)||p.scheme==="custom"?p.scheme:"gold";
  const keys=["--s-acc","--s-aci","--s-bg","--s-sf","--s-sf2","--s-ln","--l-acc","--l-aci","--s-own","--l-own"];
  if(id==="custom"){const a=COLOUR_ACT[p.schemeAcc]||COLOUR_ACT.R,o=COLOUR_OWN[p.schemeOwn]||COLOUR_OWN.W;[a[0],a[1],a[2],a[3],a[4],a[5],a[6],"#ffffff",o[0],o[1]].forEach((v,i)=>st.setProperty(keys[i],v));}
  else keys.forEach(k=>st.removeProperty(k));
  root.setAttribute("data-scheme",id);
  if(p.appearance==="dark"||p.appearance==="light")root.setAttribute("data-theme",p.appearance);else root.removeAttribute("data-theme");
  requestAnimationFrame(()=>{const bg=getComputedStyle(document.body).backgroundColor;document.querySelectorAll("meta[name=theme-color]").forEach(m=>m.content=bg);});
}
function schemeControls(){
  const p=S.prefs||{};const cur=SCHEMES.some(s=>s.id===p.scheme)||p.scheme==="custom"?p.scheme:"gold";
  const sw=s=>`<span class="sw" style="background:linear-gradient(135deg,${s.acc} 50%,${s.own} 50%)"></span>`;
  return `<div class="schemes">${SCHEMES.map(s=>`<button class="scheme ${cur===s.id?"on":""}" data-scheme="${s.id}" aria-pressed="${cur===s.id}">${sw(s)}${s.name}</button>`).join("")}<button class="scheme ${cur==="custom"?"on":""}" data-scheme="custom" aria-pressed="${cur==="custom"}"><span class="sw" style="background:conic-gradient(#e9dfc0,#2b6fd0,#7d4fc9,#d7301f,#257a42,#e9dfc0)"></span>Your own</button></div>
  ${cur==="custom"?`<div class="pipsel"><span class="lbl">Actions</span>${Object.keys(COLOUR_ACT).map(c=>`<button data-cacc="${c}" aria-pressed="${(p.schemeAcc||"R")===c}" aria-label="${COLOUR_NAME[c]} actions" style="background:${COLOUR_ACT[c][0]}"></button>`).join("")}</div>
  <div class="pipsel"><span class="lbl">Owned</span>${Object.keys(COLOUR_OWN).map(c=>`<button data-cown="${c}" aria-pressed="${(p.schemeOwn||"W")===c}" aria-label="${COLOUR_NAME[c]} for owned" style="background:${COLOUR_OWN[c][0]}"></button>`).join("")}</div>`:""}`;
}
function wireSchemeControls(el,after){
  el.querySelectorAll("[data-scheme]").forEach(b=>b.onclick=()=>{S.prefs=S.prefs||{};S.prefs.scheme=b.dataset.scheme;touchPrefs();if(b.dataset.scheme==="custom"){S.prefs.schemeAcc=S.prefs.schemeAcc||"R";S.prefs.schemeOwn=S.prefs.schemeOwn||"W";}save();applyScheme();after();});
  el.querySelectorAll("[data-cacc]").forEach(b=>b.onclick=()=>{S.prefs.schemeAcc=b.dataset.cacc;touchPrefs();save();applyScheme();after();});
  el.querySelectorAll("[data-cown]").forEach(b=>b.onclick=()=>{S.prefs.schemeOwn=b.dataset.cown;touchPrefs();save();applyScheme();after();});
}
const ARCHETYPES=[
  {id:"collector",name:"Collector",blurb:"I chase sets, tribes and full binders.",pins:["sets","scan","types","search"]},
  {id:"builder",name:"Deck builder",blurb:"I build Commander or Constructed decks from what I own.",pins:["decks","search","binder","scan"]},
  {id:"player",name:"Player and trader",blurb:"I keep a pile, check prices and trade.",pins:["search","scan","binder","decks"]},
];
const DEFAULT_PINS=["search","scan","binder","decks"];
const TABS=Object.keys(DEST);
const TABOF={card:"search",deck:"decks",checklist:"sets"};
function pins(){const p=(S&&S.prefs&&S.prefs.pins)||DEFAULT_PINS;return p.filter(k=>DEST[k]).slice(0,4);}
function setPins(p){S.prefs=S.prefs||{};S.prefs.pins=p.slice(0,4);touchPrefs();save();buildTabbar();}
const ICONS={
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  scan:'<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><rect x="8.5" y="7" width="7" height="10" rx="1"/>',
  binder:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>',
  sets:'<path d="M4 7.5h16M4 12h16M4 16.5h10"/><circle cx="18.5" cy="16.5" r="1.3" fill="currentColor"/>',
  types:'<path d="M12 4l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4L7.5 17.8l.9-5L4.8 9.3l5-.7z"/>',
  decks:'<rect x="6.5" y="3.5" width="11" height="15" rx="1.5"/><path d="M4.5 7.5v11A1.5 1.5 0 0 0 6 20h10"/>',
  review:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5M12 15.5v.5"/>',
  more:'<circle cx="12" cy="6" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/>',
  tray:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">${ICONS[k]}</svg>`;
function badgeFor(k){if(k==="review"||k==="scan")return S.review.length;return 0;}
function buildTabbar(){
  const bar=$("#tabbar");const p=pins();
  bar.innerHTML=p.map(k=>`<button data-tab="${k}" aria-label="${DEST[k].label}">${svg(DEST[k].icon)}<span>${DEST[k].label}</span><span class="badge" data-badge="${k}" hidden></span></button>`).join("")+`<button data-tab="tray" aria-label="More destinations" aria-haspopup="dialog">${svg("tray")}<span>More</span><span class="badge" data-badge="tray" hidden></span></button>`;
  bar.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{if(b.dataset.tab==="tray")openTray();else go(b.dataset.tab);});
  updateBadges();
}
function updateBadges(){
  const p=pins();const n=S.review.length;
  document.querySelectorAll("[data-badge]").forEach(b=>{const k=b.dataset.badge;let v=0;if(k==="review"||(k==="scan"&&!p.includes("review")))v=n;if(k==="tray"&&!p.includes("review")&&!p.includes("scan"))v=n;b.hidden=!v;b.textContent=v;});
}
function openTray(){
  const p=pins();const rest=TABS.filter(k=>!p.includes(k));
  $("#sheet").innerHTML=`<div class="grab"></div>
  <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-weight:700;font-size:17px">Everything</div><button class="btn sm" id="editpins">Edit bar</button></div>
  <div class="traygrid">${rest.map(k=>`<button class="trayitem" data-go="${k}">${svg(DEST[k].icon)}<span>${DEST[k].label}</span>${badgeFor(k)&&k==="review"?`<span class="badge">${S.review.length}</span>`:""}</button>`).join("")}</div>
`;
  $("#sheet").querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{closeSheet();go(b.dataset.go);});
  $("#editpins").onclick=()=>openPinEditor();
  openSheet();
}
function openPinEditor(){
  let p=pins().slice();
  const draw=()=>{
    const rest=TABS.filter(k=>!p.includes(k));
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div style="font-weight:700;font-size:17px">Your bar</div>
    <div class="note" style="margin-top:2px">Four pinned destinations. Tap one below to swap it in; use the arrows to reorder. The first one is your home screen.</div>
    <div class="h">Pinned</div>
    <div class="lst">${p.map((k,i)=>`<div class="row" style="min-height:48px">${svg(DEST[k].icon)}<div class="tx"><div class="n">${DEST[k].label}</div>${i===0?'<div class="d">Home</div>':""}</div><button class="iconbtn" data-up="${i}" ${i===0?"disabled":""} aria-label="Move up">↑</button><button class="iconbtn" data-down="${i}" ${i===p.length-1?"disabled":""} aria-label="Move down">↓</button></div>`).join("")}</div>
    <div class="h">In the tray</div>
    <div class="lst">${rest.map(k=>`<button class="row" data-swapin="${k}" style="min-height:48px">${svg(DEST[k].icon)}<div class="tx"><div class="n">${DEST[k].label}</div></div><span class="mu" style="font-size:12px">Pin</span></button>`).join("")}</div>
    <div class="h">Presets</div>
    <div class="chips" style="margin-top:0">${ARCHETYPES.map(a=>`<button class="chip" data-arch="${a.id}">${a.name}</button>`).join("")}</div>
    <div class="btnrow"><button class="btn ghost" id="pincancel">Cancel</button><button class="btn pri" id="pinsave">Save</button></div>`;
    const sh=$("#sheet");
    sh.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[p[i-1],p[i]]=[p[i],p[i-1]];draw();});
    sh.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>{const i=+b.dataset.down;[p[i+1],p[i]]=[p[i],p[i+1]];draw();});
    sh.querySelectorAll("[data-swapin]").forEach(b=>b.onclick=()=>{openSwapPicker(b.dataset.swapin,p,draw);});
    sh.querySelectorAll("[data-arch]").forEach(b=>b.onclick=()=>{p=ARCHETYPES.find(a=>a.id===b.dataset.arch).pins.slice();draw();});
    $("#pincancel").onclick=()=>closeSheet();
    $("#pinsave").onclick=()=>{setPins(p);closeSheet();render();toast("Bar updated");};
  };
  draw();openSheet();
}
function openSwapPicker(incoming,p,back){
  $("#sheet").innerHTML=`<div class="grab"></div><div style="font-weight:700;font-size:17px">Pin ${DEST[incoming].label}</div><div class="note" style="margin-top:2px">Which pinned destination should it replace?</div>
  <div class="lst" style="margin-top:8px">${p.map((k,i)=>`<button class="row" data-rep="${i}" style="min-height:48px">${svg(DEST[k].icon)}<div class="tx"><div class="n">${DEST[k].label}</div></div><span class="mu" style="font-size:12px">Replace</span></button>`).join("")}</div>
  <button class="btn ghost" id="swapcancel" style="margin-top:10px">Back</button>`;
  $("#sheet").querySelectorAll("[data-rep]").forEach(b=>b.onclick=()=>{p[+b.dataset.rep]=incoming;back();});
  $("#swapcancel").onclick=back;
}
function rArchetype(step){
  const el=$("#v-archetype");
  if(step==="colours"){
    el.innerHTML=`<div class="arch">
      <div class="arch-head"><b>Your colours</b><div class="mu">One colour for buttons and filters, one for the cards you own. Named for the basic lands; pick whatever you play. You can change it in Settings.</div></div>
      <div id="schemepick">${schemeControls()}</div>
      <button class="btn ghost" id="archdone" style="margin-top:6px">Done</button>
    </div>`;
    const redraw=()=>{const sp=$("#schemepick");if(sp)sp.innerHTML=schemeControls();wireSchemeControls(el,redraw);};
    wireSchemeControls(el,redraw);
    $("#archdone").onclick=finishOnboarding;
    return;
  }
  el.innerHTML=`<div class="arch">
    <div class="arch-head"><b>Binder</b><div class="mu">How do you play Magic? This only sets which four things sit in the bottom bar. Everything else is the same, and you can change it any time.</div></div>
    <div class="arch-list">${ARCHETYPES.map(a=>`<button class="arch-opt" data-arch="${a.id}"><div class="arch-name">${a.name}</div><div class="arch-blurb">${a.blurb}</div><div class="arch-bar">${a.pins.map(k=>`<span>${svg(DEST[k].icon)}${DEST[k].label}</span>`).join("")}</div></button>`).join("")}
    <button class="arch-opt quiet" data-arch="custom"><div class="arch-name">Let me choose</div><div class="arch-blurb">Start with Search · Scan · Binder · Decks and edit the bar yourself.</div></button></div>
  </div>`;
  el.querySelectorAll("[data-arch]").forEach(b=>b.onclick=()=>{const a=ARCHETYPES.find(x=>x.id===b.dataset.arch);S.prefs=S.prefs||{};S.prefs.archetype=b.dataset.arch;S.prefs.pins=(a?a.pins:DEFAULT_PINS).slice();save();buildTabbar();rArchetype("colours");el.scrollTop=0;});
}
function finishOnboarding(){const el=$("#v-archetype");S.prefs=S.prefs||{};S.prefs.onboarded=true;save();el.classList.remove("on");el.setAttribute("aria-hidden","true");$("#tabbar").hidden=false;view=pins()[0];render();}
/* Sub-screens push a history entry so the phone's back button (or Escape) returns from a card
   instead of leaving the app. Sheets do the same. */
function go(v,arg){
  const fromSheet=pendingBack||sheetOpen();if(sheetOpen())closeSheet(true);pendingBack=false;
  if(TABS.includes(v)){stack=[];try{history.replaceState({tab:v},"","#"+v);}catch(e){}}
  else{stack.push({view,arg:curArg});try{if(fromSheet)history.replaceState({sub:true},"","#"+v);else history.pushState({sub:true},"","#"+v);}catch(e){}}
  if(v!=="scan"&&view==="scan")closeCamera();
  view=v;curArg=arg;render();
}
function back(){if(stack.length&&history.state&&history.state.sub){history.back();return;}popView();}
function popView(){const p=stack.pop();if(p){view=p.view;curArg=p.arg;}else{view=pins()[0];curArg=null;}render();}
window.addEventListener("popstate",()=>{
  if($("#overlay").classList.contains("on")){closeSheet(true);return;}
  if(stack.length){popView();return;}
  const h=(location.hash||"").slice(1);if(TABS.includes(h)){if(h!==view){view=h;curArg=null;render();}}
  else if(["card","deck","checklist"].includes(h)&&TABS.includes(view)){try{history.back();}catch(e){}} /* orphaned sub-screen entry (left when a sheet navigated away): skip it */
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#overlay").classList.contains("on"))closeSheet();else if(stack.length)back();}});
function render(){
  document.querySelectorAll(".screen").forEach(s=>{s.classList.remove("on");s.setAttribute("aria-hidden","true");});
  let tab=TABS.includes(view)?view:(TABOF[view]||stack[0]?.view||pins()[0]);
  if(view==="checklist"&&curArg&&curArg.kind==="type")tab="types";
  const p=pins();const barTab=p.includes(tab)?tab:"tray";
  document.querySelectorAll("#tabbar button").forEach(b=>{const on=b.dataset.tab===barTab;b.classList.toggle("on",on);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  updateBadges();
  const r=DEST[view]?DEST[view].render:({card:rCard,deck:rDeck,checklist:rChecklist})[view];r();
  const el=$("#v-"+view);el.classList.add("on");el.removeAttribute("aria-hidden");el.scrollTop=0;
}

/* ========================= SEARCH ========================= */
let q="",colorF=new Set(),ownedF=true,showN=100;
const TRY=["bolt","t:goblin owned","o:draw c:u owned","e:fdn -owned","mv<=1 t:creature owned"];
function recents(){return (S.prefs&&S.prefs.recent)||[];}
function remember(qs){qs=qs.trim();if(qs.length<2)return;S.prefs=S.prefs||{};S.prefs.recent=[qs,...recents().filter(x=>x!==qs)].slice(0,6);save();}
function parseQuery(s){
  const f={text:[],t:[],c:[],e:[],o:[],owned:null,foil:null,cmc:null};
  for(const tok of s.toLowerCase().split(/\s+/).filter(Boolean)){
    let m;
    if((m=tok.match(/^(t|c|e|o):(.+)$/)))f[m[1]].push(m[2]);
    else if(tok==="owned")f.owned=true;
    else if(tok==="-owned")f.owned=false;
    else if(tok==="foil")f.foil=true;
    else if((m=tok.match(/^(?:cmc|mv)(<=|>=|=|<|>)(\d+)$/)))f.cmc=[m[1],+m[2]];
    else f.text.push(tok);
  }return f;
}
function runSearch(){
  const f=parseQuery(q);const cset=new Set([...f.c.map(x=>x.toUpperCase()),...colorF]);
  const res=[];
  for(const card of INDEX){
    if(f.text.length&&!f.text.every(t=>card.lower.includes(t)))continue;
    if(f.t.length&&!f.t.every(t=>card.type.toLowerCase().includes(t)))continue;
    if(cset.size){const ci=card.ci.length?card.ci:["C"];if(![...cset].some(x=>ci.includes(x)))continue;}
    if(f.e.length&&!card.prints.some(p=>f.e.includes(p.set)))continue;
    if(f.o.length){const lo=card.o.toLowerCase();if(!f.o.every(o=>lo.includes(o)||card.kw.includes(o)))continue;}
    if(f.cmc){const [op,n]=f.cmc,v=card.mv;if(!({"<=":v<=n,">=":v>=n,"=":v===n,"<":v<n,">":v>n})[op])continue;}
    const own=ownedOf(card.id);
    if(f.owned===true&&!own)continue;
    if(f.owned===false&&own)continue;
    if(f.foil&&!Object.values(S.col).some(e=>e.id===card.id&&e.copies.some(cp=>cp.foil)))continue;
    res.push(card);
    if(res.length>600)break;
  }
  const t0=f.text[0]||"";
  res.sort((a,b)=>(ownedF?(ownedOf(b.id)-ownedOf(a.id)):0)||(t0?(b.lower.startsWith(t0)-a.lower.startsWith(t0)):0)||a.name.localeCompare(b.name));
  return res;
}
function rSearch(){
  const active=q.trim()||colorF.size;
  const res=active?runSearch():null;
  const el=$("#v-search");
  el.innerHTML=`
  <div class="in"><span class="mu">⌕</span><input id="qin" aria-label="Search cards" placeholder="Card name, or t:goblin c:r mv<=2" value="${esc(q)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"><button class="x" id="qx" ${q?"":"hidden"}>✕</button></div>
  <div class="chips">
    ${["W","U","B","R","G","C"].map(x=>`<button class="chip ${colorF.has(x)?"on":""}" data-c="${x}"><span class="pip ${x==="C"?"":x}">${x==="C"?"C":""}</span></button>`).join("")}
    <button class="chip ${ownedF?"on":""}" id="ownedF">Owned first</button>
  </div>
  ${res?`<div class="h">${res.length>showN?showN+" of "+res.length+(res.length>600?"+":""):res.length} cards · ${res.filter(x=>ownedOf(x.id)).length} owned</div>
    <div class="lst">${res.length?res.slice(0,showN).map(rowCard).join(""):'<div class="empty">Nothing in the index matches. Check the spelling, or drop a filter.</div>'}</div>
    ${res.length>showN?'<button class="btn ghost" id="moreres" style="margin-top:10px">Show more</button>':""}`
  :`<div class="h">Syntax</div><div class="sect mono" style="font-size:12px;line-height:1.8"><span class="mu">t:</span>type &nbsp;<span class="mu">c:</span>colour &nbsp;<span class="mu">e:</span>set &nbsp;<span class="mu">o:</span>oracle<br><span class="mu">mv</span>&lt;=2 &nbsp;<span class="mu">owned</span> &nbsp;<span class="mu">-owned</span> &nbsp;<span class="mu">foil</span></div>
    <div class="h">${recents().length?"Recent":"Try"}</div><div class="lst">${(recents().length?recents():TRY).map(r=>`<button class="row recent" data-q="${esc(r)}"><div class="tx"><div class="n mono" style="font-weight:500">${esc(r)}</div></div><span class="mu">›</span></button>`).join("")}</div>
    <div class="h">Collection</div><div class="sect"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:22px;font-weight:700" class="mono">${totalOwned()}</span><span class="mu" style="font-size:12px">cards · ${Object.keys(S.col).length} printings · index ${INDEX.length.toLocaleString()} cards</span></div>${totalOwned()?(()=>{const v=collectionValue();return v.known?`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px"><span style="font-size:22px;font-weight:700" class="mono">${fmt(v.total)}</span><span class="mu" style="font-size:12px">${v.known<v.of?`${v.known} of ${v.of} copies priced`:"collection value"} · ${valueChange()}</span></div>`:`<div class="note">${navigator.onLine===false?"Prices update when you're back online.":priceErr?"Prices: "+esc(priceErr):"Fetching prices…"}</div>`;})():'<div class="note">Nothing here yet. Scan a card, add one by name, or load the demo collection under More.</div><div class="btnrow" style="margin-top:10px"><button class="btn" id="goscan">Scan a card</button><button class="btn" id="golDemo">Load demo</button></div>'}</div>`}`;
  const inp=$("#qin");
  inp.oninput=()=>{q=inp.value;showN=100;const sel=inp.selectionStart;rSearch();const n=$("#qin");n.focus();n.setSelectionRange(sel,sel);};
  inp.onchange=()=>remember(inp.value);
  const mr=$("#moreres");if(mr)mr.onclick=()=>{showN+=100;rSearch();};
  $("#qx").onclick=()=>{q="";rSearch();$("#qin").focus();};
  el.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{const x=b.dataset.c;colorF.has(x)?colorF.delete(x):colorF.add(x);rSearch();});
  $("#ownedF").onclick=()=>{ownedF=!ownedF;rSearch();};
  el.querySelectorAll(".recent").forEach(b=>b.onclick=()=>{q=b.dataset.q;rSearch();});
  const gs=$("#goscan");if(gs)gs.onclick=()=>go("scan");
  const gd=$("#golDemo");if(gd)gd.onclick=()=>{S=seed();save();rSearch();toast("Demo collection loaded");};
  el.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{remember(q);go("card",{id:b.dataset.card});});
}
function rowCard(card){
  const own=ownedOf(card.id);const ops=own?ownedPrints(card.id):[];
  const where=own?pr(ops[0])+(ops.length>1?" +"+(ops.length-1)+" more":""):pr(defaultPrint(card))+(card.prints.length>1?" · "+card.prints.length+" printings":"");
  const sp=own?card.prints.find(x=>x.set===ops[0].set&&x.num===ops[0].num):null;const pv=sp?priceOf(sp,ops[0].copies.some(c=>c.foil)&&ops[0].copies.every(c=>c.foil)):null;
  return `<button class="row ${own?"":"dim"}" data-card="${esc(card.id)}">${stripe(card)}${thumb(card,"sm")}<div class="tx"><div class="n">${esc(card.name)}</div><div class="d">${pips(card.cost)}<span>${esc(card.types.join(" "))} · ${where}</span></div></div><span class="q ${own?"own":""}">${own?"×"+own:"<span class='dash'>—</span>"}${pv!=null?`<small>${fmt(pv)}</small>`:""}</span></button>`;
}

/* ========================= CARD ========================= */
let showAllPrints=false;
function rCard(){
  const card=BY_ID[curArg.id];if(!card){back();return;}
  const own=ownedOf(card.id);const el=$("#v-card");
  const decksIn=S.decks.map(d=>({d,n:d.lines.filter(l=>l.cardId===card.id).reduce((a,l)=>a+l.qty,0)})).filter(x=>x.n);
  const ownedP=card.prints.filter(p=>ownedPrint(card.id,p.set,p.num));
  const shown=showAllPrints?card.prints:[...ownedP,...card.prints.filter(p=>!ownedP.includes(p)).slice(0,Math.max(0,8-ownedP.length))];
  el.innerHTML=`
  <div class="top"><button class="back" id="bk">‹ Back</button><span class="mu" style="font-size:12px">${esc(card.type)}</span></div>
  <div style="display:flex;gap:12px;align-items:flex-start">
    ${stripe(card,"min-height:146px")}
    ${thumb(card,"lg")}
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--display);font-weight:600;font-size:24px;line-height:1.05;text-wrap:balance">${esc(card.name)}</div>
      <div class="mu" style="font-size:13px;margin:4px 0 10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${pips(card.cost)} <span>${esc([...card.sup,...card.types].join(" "))}${card.sub.length?" — ":""}${card.sub.map(t=>(card.types.includes("Creature")||card.types.includes("Kindred"))?`<button class="lnk" data-typelink="${esc(t)}">${esc(t)}</button>`:esc(t)).join(" ")}</span>${card.pt?`<span class="mono">${esc(card.pt)}</span>`:""}</div>
      <div style="font-family:var(--display);font-size:40px;font-weight:600;line-height:.9;color:${own?"var(--own)":"var(--mu)"}">${own}<span class="mu" style="font-size:12.5px;font-weight:500;font-family:var(--sans)"> &nbsp;owned</span></div>
      <div class="mu" style="font-size:12px;margin-top:4px">${(()=>{let t=0,k=0,n=0;for(const e of Object.values(S.col)){if(e.id!==card.id)continue;const v=entryValue(e);if(v){t+=v.total;k+=v.known;n+=v.of;}}return k?`worth ${fmt(t)}${k<n?" (partial)":""} · `:"";})()}${card.prints.length} printing${card.prints.length>1?"s":""}</div>
    </div>
  </div>
  ${card.o?`<div class="h">Oracle</div><div class="oracle">${esc(card.o)}</div>`:""}
  <div class="h">Printings</div>
  <div class="lst">${shown.map(p=>{const n=ownedPrint(card.id,p.set,p.num);return `<div class="row ${n?"":"dim"}">${thumb(card,"sm","",p)}<div class="tx"><div class="n mono">${pr(p)} <span class="mu" style="font-weight:400;font-size:11px">${RARITY[p.rarity]||""}</span></div><div class="d"><button class="lnk" data-setlink="${p.set}">${esc(setName(p.set))}</button> · ${setYear(p.set)}${priceOf(p)!=null?` · <span class="mono" style="color:var(--fg)">${fmt(priceOf(p))}</span>${priceOf(p,true)!=null&&priceOf(p,true)!==priceOf(p)?`<span class="mono"> · foil ${fmt(priceOf(p,true))}</span>`:""}`:""}</div></div>
    <div class="step" role="group" aria-label="${pr(p)} copies"><button data-dec="${p.set}|${esc(p.num)}" ${n?"":"disabled"} aria-label="Remove one">−</button><span class="v" aria-live="polite">${n}</span><button data-inc="${p.set}|${esc(p.num)}" aria-label="Add one">+</button></div></div>`;}).join("")}</div>
  ${card.prints.length>shown.length?`<button class="btn sm ghost" id="allp" style="margin-top:6px">Show all ${card.prints.length} printings</button>`:(showAllPrints&&card.prints.length>8?`<button class="btn sm ghost" id="allp" style="margin-top:6px">Show fewer</button>`:"")}
  ${own?`<div class="h">Copies</div><div class="lst">${Object.values(S.col).filter(e=>e.id===card.id).flatMap(e=>e.copies.map(cp=>({e,cp}))).sort((a,b)=>b.cp.date.localeCompare(a.cp.date)).slice(0,8).map(({e,cp})=>`<div class="row" style="min-height:40px"><div class="tx"><div class="d" style="color:var(--fg)"><span class="mono">${cp.date}</span><span class="mu">·</span>${pr(e)}<span class="mu">·</span>${cp.cond}${cp.foil?'<span class="pill">foil</span>':""}</div></div><span class="mu" style="font-size:12px">${cp.via==="scan"?"scan "+cp.conf+"%":cp.via}</span></div>`).join("")}</div>`:""}
  ${decksIn.length?`<div class="h">In decks</div><div class="chips" style="margin-top:0">${decksIn.map(x=>`<button class="chip" data-deck="${x.d.id}">${esc(x.d.name)} · ${x.n}</button>`).join("")}</div>`:""}
  <div class="btnrow" style="margin-top:auto;padding-top:16px"><button class="btn" id="scanone">Scan a copy</button><button class="btn pri" id="addone">+ Add copy</button></div>`;
  wantPrices(shown.slice(0,PRICE_BATCH));
  $("#bk").onclick=()=>{showAllPrints=false;back();};
  el.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{const [set,num]=b.dataset.inc.split("|");addCopy(S.col,card.id,set,num,{cond:"NM",foil:false,via:"typed",date:today()});save();rCard();toast(`${card.name} · ${set.toUpperCase()} ${num} · now ×${ownedPrint(card.id,set,num)}`);});
  el.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{const [set,num]=b.dataset.dec.split("|");const k=pk(card.id,set,num);const removed=removeLastCopy(k);save();rCard();toast(`Removed 1 · ${set.toUpperCase()} ${num}`,()=>{if(removed)addCopy(S.col,card.id,set,num,removed);save();if(view==="card")rCard();});});
  el.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>go("deck",{id:b.dataset.deck}));
  const ap=$("#allp");if(ap)ap.onclick=()=>{showAllPrints=!showAllPrints;rCard();};
  el.querySelectorAll("[data-setlink]").forEach(b=>b.onclick=e=>{e.stopPropagation();go("checklist",{kind:"set",code:b.dataset.setlink});});
  el.querySelectorAll("[data-typelink]").forEach(b=>b.onclick=e=>{e.stopPropagation();go("checklist",{kind:"type",code:b.dataset.typelink});});
  $("#addone").onclick=()=>openAddSheet(card);
  $("#scanone").onclick=()=>go("scan");
}
function printChips(card,sel,limit){
  const list=showAllPrints||card.prints.length<=limit?card.prints:[...new Set([sel,...card.prints.slice(0,limit)])];
  return list.map(p=>`<button class="chip ${p.set===sel.set&&p.num===sel.num?"on":""}" data-p="${p.set}|${esc(p.num)}">${pr(p)}</button>`).join("")+(card.prints.length>list.length?`<button class="chip" data-p="more">+ ${card.prints.length-list.length} more</button>`:"");
}
function openAddSheet(card,prefer){
  let print=prefer||defaultPrint(card),cond="NM",foil=false,all=false;
  const draw=()=>{
    const list=all?card.prints:[...new Set([print,...card.prints.slice(0,8)])];
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div style="display:flex;gap:12px;align-items:center">${thumb(card,"md","",print)}<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(card.name)}</div><div class="mu" style="font-size:12px">${esc(card.type)}</div><div class="mu" style="font-size:12px;margin-top:4px">now ×${ownedOf(card.id)} → <b style="color:var(--fg)">×${ownedOf(card.id)+1}</b></div></div></div>
    <div class="h">Printing · ${esc(setName(print.set))} ${setYear(print.set)}</div><div class="chips" style="margin-top:0">${list.map(p=>`<button class="chip ${p===print?"on":""}" data-p="${p.set}|${esc(p.num)}">${pr(p)}</button>`).join("")}${card.prints.length>list.length?`<button class="chip" id="morep">+ ${card.prints.length-list.length} more</button>`:""}</div>
    <div class="h">Condition</div><div class="chips" style="margin-top:0">${["NM","LP","MP","HP"].map(x=>`<button class="chip ${x===cond?"on":""}" data-cond="${x}">${x}</button>`).join("")}<button class="chip ${foil?"on":""}" id="foil">Foil</button></div>
    <div class="btnrow"><button class="btn ghost" id="cancel">Cancel</button><button class="btn pri" id="ok">Add · ${pr(print)}</button></div>`;
    $("#sheet").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const [s,n]=b.dataset.p.split("|");print=card.prints.find(p=>p.set===s&&p.num===n)||print;draw();});
    const mp=$("#morep");if(mp)mp.onclick=()=>{all=true;draw();};
    $("#sheet").querySelectorAll("[data-cond]").forEach(b=>b.onclick=()=>{cond=b.dataset.cond;draw();});
    $("#foil").onclick=()=>{foil=!foil;draw();};
    $("#cancel").onclick=closeSheet;
    $("#ok").onclick=()=>{addCopy(S.col,card.id,print.set,print.num,{cond,foil,via:"typed",date:today()});save();closeSheet();render();toast(`Added ${card.name} · now ×${ownedOf(card.id)}`);};
  };
  draw();openSheet();
}
let sheetReturn=null,pendingBack=false;
/* A sheet owns one history entry. Closing it pops that entry, but only after the current task:
   if another sheet opens, or go() navigates, in the same tick, that entry is reused instead,
   so the deferred popstate can never undo the navigation. */
function sheetOpen(){return $("#overlay").classList.contains("on");}
function openSheet(){const ov=$("#overlay");if(!ov.classList.contains("on")){if(pendingBack)pendingBack=false;else{sheetReturn=document.activeElement;try{history.pushState({sheet:true},"");}catch(e){}}}ov.classList.add("on");
  requestAnimationFrame(()=>{const f=$("#sheet").querySelector("input,button:not([disabled])");if(f&&!/input/i.test(f.tagName))f.focus({preventScroll:true});else if(f)f.focus();});}
function closeSheet(fromHistory){const ov=$("#overlay");if(!ov.classList.contains("on"))return;ov.classList.remove("on");
  if(!fromHistory&&history.state&&history.state.sheet){pendingBack=true;setTimeout(()=>{if(!pendingBack)return;pendingBack=false;if(!ov.classList.contains("on"))try{history.back();}catch(e){}},0);}
  if(sheetReturn&&sheetReturn.focus&&document.contains(sheetReturn))sheetReturn.focus({preventScroll:true});sheetReturn=null;}
$("#overlay").onclick=e=>{if(e.target===$("#overlay"))closeSheet();};

/* ========================= OCR =========================
   Tesseract.js runs in a worker from the page's own files (ocr/worker.min.js, the
   LSTM core, eng.traineddata.gz). The title band is read first; the bottom edge
   gives collector number and set code. Names are matched against the index with a
   trigram candidate pass and Dice similarity. */
let ocrWorker=null,ocrState="idle",ocrMsg="",ocrErr="";
/* A recognition can be abandoned (Cancel, Close, leaving the screen) or time out. Tesseract has no
   abort, so the worker is terminated and recreated on the next scan; scanGen lets the abandoned
   call's result fall on the floor. */
let scanGen=0;
function dropOCR(){if(ocrWorker){const w=ocrWorker;ocrWorker=null;ocrState="idle";try{w.terminate();}catch(e){}}}
function cancelScan(){const was=scanning;scanGen++;if(was){scanning=false;ocrMsg="";dropOCR();}const b=$("#v-scan .busy");if(b)b.remove();live.busy=false;return was;}
function recognizeTimed(src,opts,ms){const gen=scanGen;return new Promise((res,rej)=>{const t=setTimeout(()=>{if(gen===scanGen){dropOCR();}rej(new Error("timeout"));},ms);recognize(src,opts).then(v=>{clearTimeout(t);res(v);},e=>{clearTimeout(t);rej(e);});});}
function ocrLog(m){if(live&&live.busy&&!scanning)return;if(m&&m.status){ocrMsg=m.status+(m.progress!=null?" "+Math.round(m.progress*100)+"%":"");const t=document.getElementById("ocrmsg");if(t)t.textContent=ocrMsg;}}
async function getOCR(){
  if(ocrWorker)return ocrWorker;
  if(ocrState==="failed")return null;
  if(ocrState==="loading"){while(ocrState==="loading")await new Promise(r=>setTimeout(r,200));return ocrWorker;}
  ocrState="loading";
  try{
    if(typeof Tesseract==="undefined")throw new Error("Tesseract script missing");
    const base=new URL("ocr/",document.baseURI).href;
    const init=Tesseract.createWorker("eng",1,{workerPath:base+"worker.min.js",corePath:base,langPath:base.replace(/\/$/,""),cacheMethod:"none",workerBlobURL:false,gzip:true,logger:ocrLog});
    const w=await Promise.race([init,new Promise((_,rej)=>setTimeout(()=>rej(new Error("OCR engine took too long to start")),90000))]);
    ocrWorker=w;ocrState="ready";ocrMsg="";const t=document.getElementById("ocrmsg");if(t)t.textContent="";return w;
  }catch(e){ocrState="failed";ocrErr=(e&&e.message)||String(e);return null;}
}
async function loadBitmap(file){
  try{return await createImageBitmap(file,{imageOrientation:"from-image"});}
  catch(e){return await new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>res(img);img.onerror=rej;img.src=u;});}
}
function crop(src,x,y,w,h,scale,keepColour){const cv=document.createElement("canvas");cv.width=Math.max(1,Math.round(w*scale));cv.height=Math.max(1,Math.round(h*scale));const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(src,x,y,w,h,0,0,cv.width,cv.height);
  if(keepColour)return cv;
  const id=ctx.getImageData(0,0,cv.width,cv.height),d=id.data;for(let i=0;i<d.length;i+=4){const g=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=d[i+1]=d[i+2]=g;}ctx.putImageData(id,0,0);return cv;}
/* Image variants for the title band: a thresholded copy (Otsu) for low-contrast prints and an
   inverted copy for light-on-dark titles (showcase frames, full-art lands, Secret Lairs). */
function grayData(cv){return cv.getContext("2d").getImageData(0,0,cv.width,cv.height);}
function variant(cv,kind){const out=document.createElement("canvas");out.width=cv.width;out.height=cv.height;const ctx=out.getContext("2d");const id=grayData(cv),d=id.data;
  if(kind==="invert"){for(let i=0;i<d.length;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2];}}
  else if(kind==="otsu"){const hist=new Array(256).fill(0);for(let i=0;i<d.length;i+=4)hist[d[i]]++;const n=d.length/4;let sum=0;for(let t=0;t<256;t++)sum+=t*hist[t];let sumB=0,wB=0,best=0,thr=127;for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=n-wB;if(!wF)break;sumB+=t*hist[t];const mB=sumB/wB,mF=(sum-sumB)/wF;const v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;thr=t;}}
    for(let i=0;i<d.length;i+=4){const v=d[i]>thr?255:0;d[i]=d[i+1]=d[i+2]=v;}}
  ctx.putImageData(id,0,0);return out;}
/* Quality gates: sharpness = variance of a Laplacian on a small gray copy; glare = share of blown-out pixels. */
function quality(cv){const w=Math.min(160,cv.width),h=Math.round(cv.height*w/cv.width)||1;const t=document.createElement("canvas");t.width=w;t.height=h;t.getContext("2d").drawImage(cv,0,0,w,h);const d=t.getContext("2d").getImageData(0,0,w,h).data;
  const g=new Float32Array(w*h);let bright=0;for(let i=0,j=0;i<d.length;i+=4,j++){g[j]=d[i]*.3+d[i+1]*.59+d[i+2]*.11;if(d[i]>245&&d[i+1]>245&&d[i+2]>245)bright++;}
  let sum=0,sum2=0,n=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;const l=4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w];sum+=l;sum2+=l*l;n++;}
  const mean=sum/n;const sharp=sum2/n-mean*mean;return {sharp,glare:bright/(w*h)};}
/* Frame colour from the card's side margins: a confident single hue that the matched card's
   colour identity does not contain is a strong sign of a wrong match. */
function frameColour(cv){const w=cv.width,h=cv.height;const ctx=cv.getContext("2d");const samples=[];for(const [x0,x1] of [[0,Math.max(1,Math.round(w*.03))],[w-Math.max(1,Math.round(w*.03)),w]]){const d=ctx.getImageData(x0,Math.round(h*.15),x1-x0,Math.round(h*.7)).data;for(let i=0;i<d.length;i+=16)samples.push([d[i],d[i+1],d[i+2]]);}
  if(!samples.length)return null;let votes={W:0,U:0,B:0,R:0,G:0,A:0,M:0};for(const [r,g,b] of samples){const max=Math.max(r,g,b),min=Math.min(r,g,b),v=max/255,sat=max?(max-min)/max:0;let hue=0;if(max!==min){if(max===r)hue=((g-b)/(max-min)+6)%6;else if(max===g)hue=(b-r)/(max-min)+2;else hue=(r-g)/(max-min)+4;hue*=60;}
    if(v<.22)votes.B++;else if(sat<.18)votes[v>.75?"W":"A"]++;else if(hue<20||hue>=340)votes.R++;else if(hue<65)votes[v>.6&&sat<.55?"W":"M"]++;else if(hue<170)votes.G++;else if(hue<260)votes.U++;else votes.B++;}
  const total=samples.length;const top=Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];return {colour:top[0],share:top[1]/total};}
function colourAgree(card,fc){if(!fc||fc.share<.6)return null;const c=fc.colour;if(c==="A"||c==="M")return null;const ci=card.ci;if(!ci.length)return c==="B"||c==="W"?null:false;if(ci.length>1)return c==="M"||ci.includes(c)?true:null;return ci[0]===c;}
async function ocrText(w,cv){const r=await w.recognize(cv);return r.data.text||"";}
let TRI=null;
function norm(s){return s.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();}
function trigrams(s){const t=" "+s+" ";const out=[];for(let i=0;i<t.length-2;i++)out.push(t.slice(i,i+3));return out;}
function buildTri(){TRI=new Map();INDEX.forEach((c,i)=>{c.norm=norm(c.name);for(const g of new Set(trigrams(c.norm))){let a=TRI.get(g);if(!a)TRI.set(g,a=[]);a.push(i);}});}
function dice(a,b){const ga=trigrams(a),gb=new Map();for(const g of trigrams(b))gb.set(g,(gb.get(g)||0)+1);let hit=0;for(const g of ga){const n=gb.get(g);if(n){hit++;gb.set(g,n-1);}}return 2*hit/(ga.length+trigrams(b).length);}
function matchName(text){
  if(!TRI)buildTri();
  const lines=text.split(/\n+/).map(norm).filter(l=>l.length>=3);
  const queries=new Map();
  for(const l of lines){queries.set(l,l.length);const w=l.split(" ");for(let n=1;n<=Math.min(5,w.length);n++)for(let i=0;i+n<=w.length;i++){const s=w.slice(i,i+n).join(" ");if(s.length>=3&&!queries.has(s))queries.set(s,l.length);}}
  const scores=new Map();
  for(const [qs,lineLen] of queries){
    const cnt=new Map();for(const g of new Set(trigrams(qs))){const a=TRI.get(g);if(a)for(const i of a)cnt.set(i,(cnt.get(i)||0)+1);}
    const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25);
    for(const [i] of top){const c=INDEX[i];const s=dice(qs,c.norm)*Math.sqrt(Math.min(1,c.norm.length/lineLen));if(s>(scores.get(i)||0))scores.set(i,s);}
  }
  return [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([i,s])=>({card:INDEX[i],score:s}));
}
function matchPrint(card,text){
  const t=(text||"").toUpperCase();
  const nums=[...t.matchAll(/\b0*(\d{1,4})(?:\s*[\/·.]\s*\d{1,4})?\b/g)].map(m=>m[1]);
  const codes=[...t.matchAll(/\b([A-Z0-9]{3,4})\b/g)].map(m=>m[1].toLowerCase()).filter(c=>SETS[c]);
  const byNum=card.prints.filter(p=>nums.includes(String(p.num).replace(/^0+/,"").replace(/[^0-9].*$/,"")));
  const both=byNum.filter(p=>codes.includes(p.set));
  if(both.length)return {print:both[0],conf:1,how:"set + number"};
  const byCode=card.prints.filter(p=>codes.includes(p.set));
  if(byNum.length===1)return {print:byNum[0],conf:.9,how:"number"};
  if(byCode.length===1)return {print:byCode[0],conf:.85,how:"set"};
  if(byNum.length)return {print:byNum[0],conf:.7,how:"number (several sets)"};
  return {print:defaultPrint(card),conf:.5,how:"default"};
}
/* recognize(src, opts): src is a Blob (photo) or a canvas/bitmap (live frame). Returns
   {guess, print, conf, alts, how, signals} or {guess:null}. Signals carry every score so the
   compare sheet can show why, and so weights can be retuned from logged corrections later.
   opts.fast (live mode): no whole-image fallback, variants only when the first pass is weak. */
async function recognize(src,opts={}){
  const w=await getOCR();
  if(!w)return null;
  const bmp=(src instanceof Blob)?await loadBitmap(src):src;
  const W=bmp.width,H=bmp.height;const scale=Math.min(1,1600/W);
  const colourBand=crop(bmp,0,0,W,H,Math.min(1,400/W),true);
  const band=crop(bmp,0,0,W,H*.3,scale*1.5);
  const q=quality(band);
  const signals={sharp:Math.round(q.sharp),glare:+q.glare.toFixed(3),variants:["gray"]};
  await w.setParameters({tessedit_pageseg_mode:"6"});
  let text=await ocrText(w,band);let cands=matchName(text);
  const good=()=>cands.length&&cands[0].score>=.92;
  if(!good()){const t2=await ocrText(w,variant(band,"otsu"));const c2=matchName(t2);signals.variants.push("otsu");if(c2.length&&(!cands.length||c2[0].score>cands[0].score)){cands=c2;text=t2;}}
  if(!good()){const t3=await ocrText(w,variant(band,"invert"));const c3=matchName(t3);signals.variants.push("invert");if(c3.length&&(!cands.length||c3[0].score>cands[0].score)){cands=c3;text=t3;}}
  if(!opts.fast&&(!cands.length||cands[0].score<.6)){
    await w.setParameters({tessedit_pageseg_mode:"11"});
    const t4=await ocrText(w,crop(bmp,0,0,W,H,scale));const c4=matchName(t4);signals.variants.push("sparse");
    if(c4.length&&(!cands.length||c4[0].score>cands[0].score)){cands=c4;text=t4;}
    await w.setParameters({tessedit_pageseg_mode:"6"});
  }
  if(!cands.length){if(bmp.close&&src instanceof Blob)bmp.close();return {guess:null,text,signals};}
  const best=cands[0];signals.name=+best.score.toFixed(3);
  // Second text signal: the type line, matched against the candidate's type line.
  const typeText=norm(await ocrText(w,crop(bmp,0,H*.55,W,H*.12,scale*1.5)));
  const typeNorm=norm(best.card.type);
  signals.type=typeText.length>=4?+Math.max(dice(typeText,typeNorm),...typeNorm.split(" ").filter(x=>x.length>3).map(x=>typeText.includes(x)?.8:0)).toFixed(2):null;
  // Frame colour guard.
  const fc=frameColour(colourBand);signals.frame=fc?fc.colour+" "+Math.round(fc.share*100)+"%":null;signals.colour=colourAgree(best.card,fc);
  // Printing from the collector line.
  const foot=crop(bmp,0,H*.86,W,H*.14,scale*1.5);
  const footText=await ocrText(w,foot);
  const pm=matchPrint(best.card,footText);signals.print=pm.conf;signals.how=pm.how;
  if(bmp.close&&src instanceof Blob)bmp.close();
  // Composite confidence.
  let conf=Math.pow(best.score,.7)*100;
  if(signals.type!=null){if(signals.type>=.6)conf=Math.min(100,conf+4);else if(signals.type<.25&&best.score<.97)conf-=12;}
  if(signals.colour===false)conf-=15;
  if(q.sharp<40)conf-=6;
  conf=Math.round(Math.max(5,conf));
  if(pm.conf<1)conf=Math.min(conf,pm.conf>=.85?84:pm.conf>=.7?78:72);
  signals.conf=conf;
  const alts=[];
  for(const p of best.card.prints.slice(0,6)){if(p!==pm.print)alts.push({id:best.card.id,set:p.set,num:p.num,conf:Math.max(10,conf-10-alts.length*4)});}
  for(const c of cands.slice(1,3)){const p=defaultPrint(c.card);alts.push({id:c.card.id,set:p.set,num:p.num,conf:Math.round(Math.pow(c.score,.7)*90)});}
  return {guess:best.card.id,print:{set:pm.print.set,num:pm.print.num},conf,alts:alts.sort((a,b)=>b.conf-a.conf),how:pm.how,text,signals};
}
/* Fallback when the OCR engine cannot start in this viewer: deterministic pick from the image bytes, so the flows still work. */
async function recognizeStub(file){
  const buf=file?new Uint8Array(await file.slice(0,65536).arrayBuffer()):crypto.getRandomValues(new Uint8Array(64));
  let h=2166136261;for(const b of buf){h^=b;h=Math.imul(h,16777619)>>>0;}
  const pool=INDEX.filter(x=>!x.sup.includes("Basic")&&x.prints.length>1);
  const card=pool[h%pool.length];const print=card.prints[((h>>>8)%card.prints.length+card.prints.length)%card.prints.length]||card.prints[0];const conf=55+((h>>>16)%43);
  const alts=card.prints.filter(p=>p!==print).slice(0,3).map((p,i)=>({id:card.id,set:p.set,num:p.num,conf:Math.max(20,conf-8-i*5)}));
  await new Promise(r=>setTimeout(r,400));
  return {guess:card.id,print:{set:print.set,num:print.num},conf,alts,how:"demo"};
}
const THRESHOLD=85;
let lastImg=null,scanning=false;

/* ========================= SCAN ========================= */
let stream=null,camOn=false,camErr="";
const hasCamera=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
async function openCamera(){
  if(!hasCamera()){camErr="This browser can't open the camera here; use a photo instead.";rScan();return;}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1440}},audio:false});camOn=true;camErr="";}
  catch(e){camErr=(e&&e.name==="NotAllowedError")?"Camera permission was declined. You can still take a photo.":"Couldn't open the camera ("+((e&&e.message)||e)+").";camOn=false;}
  rScan();
  if(camOn)getOCR();
}
function closeCamera(){stopLive();cancelScan();if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}camOn=false;}

/* ---- Continuous mode ----
   The camera stays open. Every ~120 ms the guide region is sampled at thumbnail size: motion
   (mean difference from the previous sample), sharpness (Laplacian variance) and a difference
   hash. When the view has been still and sharp for three samples, and looks different from the
   card last added, the full-resolution guide crop goes to recognition. The result becomes a
   banner and a tray entry, never a sheet; uncertain matches go to the review queue. The next add
   is armed only once the region has changed substantially (card lifted, next one in). */
let live={on:true,timer:null,prevGray:null,still:0,lastHash:null,lastGray:null,armed:true,busy:false,cooldownUntil:0,fails:0,sound:true,sharpHist:[],state:"",hashes:[],presentSince:0,absent:0,sawAbsent:true,lastAdd:null,diag:""};
/* The guide frame shows what the scanner is doing: seek (dashed), hold (solid white: a card is
   there, waiting for it to settle), read (amber pulse), ok / review (green / amber, with a
   full-screen flash so it registers without looking at the screen). */
function setGuideState(s){if(live.state===s)return;live.state=s;const g=$("#guide");if(g)g.dataset.state=s;}
function flash(kind){let f=$("#flash");if(!f){f=document.createElement("div");f.id="flash";document.body.appendChild(f);}f.classList.remove("go");void f.offsetWidth;f.style.background=kind==="ok"?"#fff":"#e9b451";f.classList.add("go");}
function liveOn(){return live.on&&camOn;}
function sampleGuide(v,g,w,h,keepColour){
  const vr=v.getBoundingClientRect(),gr=g.getBoundingClientRect();if(!vr.width||!gr.width)return null;
  const scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const offX=(vr.width-v.videoWidth*scale)/2,offY=(vr.height-v.videoHeight*scale)/2;
  let sx=(gr.left-vr.left-offX)/scale,sy=(gr.top-vr.top-offY)/scale,sw=gr.width/scale,sh=gr.height/scale;
  sx=Math.max(0,sx);sy=Math.max(0,sy);sw=Math.min(sw,v.videoWidth-sx);sh=Math.min(sh,v.videoHeight-sy);
  if(sw<8||sh<8)return null;
  const cv=document.createElement("canvas");cv.width=w||Math.round(sw);cv.height=h||Math.round(sh);
  cv.getContext("2d").drawImage(v,sx,sy,sw,sh,0,0,cv.width,cv.height);
  if(keepColour)return cv;
  return cv;
}
function dhash(cv){const t=document.createElement("canvas");t.width=9;t.height=8;t.getContext("2d").drawImage(cv,0,0,9,8);const d=t.getContext("2d").getImageData(0,0,9,8).data;const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=(y*9+x)*4,j=(y*9+x+1)*4;const a=d[i]*.3+d[i+1]*.59+d[i+2]*.11,b=d[j]*.3+d[j+1]*.59+d[j+2]*.11;bits.push(a>b?1:0);}return bits;}
function hamming(a,b){if(!a||!b)return 64;let n=0;for(let i=0;i<64;i++)if(a[i]!==b[i])n++;return n;}
function grayOf(cv){const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;const g=new Float32Array(d.length/4);for(let i=0,j=0;i<d.length;i+=4,j++)g[j]=d[i]*.3+d[i+1]*.59+d[i+2]*.11;return g;}
function startLive(){stopLive();live.prevGray=null;live.still=0;live.armed=true;live.lastHash=null;live.lastGray=null;live.fails=0;live.sharpHist=[];live.hashes=[];live.presentSince=0;live.absent=0;live.sawAbsent=true;live.lastAdd=null;live.state="";setGuideState("seek");live.timer=setInterval(liveTick,120);}
function stopLive(){if(live.timer){clearInterval(live.timer);live.timer=null;}}
async function liveTick(){
  if(!liveOn())return;
  const v=$("#video"),g=$("#guide");if(!v||!g||!v.videoWidth)return;
  const small=sampleGuide(v,g,48,66);if(!small)return;
  const gray=grayOf(small);
  let motion=255;if(live.prevGray&&live.prevGray.length===gray.length){let d=0;for(let i=0;i<gray.length;i++)d+=Math.abs(gray[i]-live.prevGray[i]);motion=d/gray.length;}
  live.prevGray=gray;
  const hash=dhash(small);
  // Re-arm once the view has clearly changed from the card last added: hash distance or a
  // large mean difference against the sample taken at add time (flat frames hash alike).
  if(!live.armed&&live.lastGray){let d=0;for(let i=0;i<gray.length;i++)d+=Math.abs(gray[i]-live.lastGray[i]);d/=gray.length;if(hamming(hash,live.lastHash)>18||d>22){live.armed=true;live.fails=0;setLiveHint("");}}
  // Stillness: raw pixel difference is swamped by hand jitter and sensor noise on many phones,
  // so the difference hash (robust to both) decides; the pixel measure is kept as a fast path.
  live.hashes.push(hash);if(live.hashes.length>4)live.hashes.shift();
  const hashStable=live.hashes.length>=3&&hamming(hash,live.hashes[0])<=10;
  if(motion<6||hashStable)live.still++;else live.still=0;
  if(live.busy)return;
  if(!live.armed){setGuideState("seek");return;}
  if(Date.now()<live.cooldownUntil)return;
  const mid=sampleGuide(v,g,160,222);const q=quality(mid);
  // Sharpness is judged against the best this camera has produced recently, with a floor, so a
  // phone whose preview never reaches the old absolute bar still gets to try; OCR is the real test.
  live.sharpHist.push(q.sharp);if(live.sharpHist.length>25)live.sharpHist.shift();
  const peak=Math.max(...live.sharpHist);const need=Math.min(35,Math.max(12,peak*.5));
  const now=Date.now();const cg=cardGate(mid);
  if(q.sharp<8||!cg.ok){if(++live.absent>=2)live.sawAbsent=true;if(live.absent>=4)live.presentSince=0;setGuideState("seek");setLiveHint((q.sharp<8?"Looking for a card…":"Line the card up in the frame")+diag(motion,q,cg));return;}
  live.absent=0;if(!live.presentSince)live.presentSince=now;
  // Fallback: a card has been lined up for over 1.5 s but the gates never agreed; try anyway.
  const overdue=now-live.presentSince>1500;
  if(!overdue){
    if(live.still<3){setGuideState("hold");setLiveHint("Hold still…"+diag(motion,q,cg));return;}
    if(q.sharp<need){setGuideState("hold");setLiveHint("Hold still, a little closer"+diag(motion,q,cg));return;}
    if(q.glare>.12){setGuideState("hold");setLiveHint("Glare on the card, tilt it"+diag(motion,q,cg));return;}
  }
  live.presentSince=0;
  live.busy=true;setGuideState("read");setLiveHint("Reading…");
  try{
    const full=sampleGuide(v,g);
    const r=await recognizeTimed(full,{fast:true},15000);
    // Auto mode adds without asking, so it needs corroboration: a strong name alone, or a plausible
    // name backed by an agreeing type line or a confirmed collector line. Garbage OCR from a gap
    // between cards can fuzzy-match some name; it cannot also match a type line or a set code.
    const s=r&&r.signals||{};
    const solid=r&&r.guess&&((s.name||0)>=.85||((s.name||0)>=.6&&((s.type||0)>=.5||(s.print||0)>=.85)));
    if(r&&r.guess&&!solid)r.guess=null;
    // Same card and printing as the last add, with no empty frame in between: the card never left,
    // whatever the shimmer and wobble did to the pixels. Don't add it again; say what would.
    const la=live.lastAdd;
    if(r&&r.guess&&la&&!live.sawAbsent&&la.id===r.guess&&la.set===r.print.set&&la.num===r.print.num){
      live.lastHash=hash;live.lastGray=gray;live.armed=false;live.cooldownUntil=Date.now()+800;
      setGuideState("seek");setLiveHint("Same card as before. Lift it away before scanning another copy, or tap Capture.");
      live.busy=false;return;
    }
    if(r&&r.guess){
      live.lastHash=hash;live.lastGray=gray;live.armed=false;live.fails=0;
      live.lastAdd={id:r.guess,set:r.print.set,num:r.print.num,at:Date.now()};live.sawAbsent=false;
      const img=await thumbData(full);
      if(r.conf>=THRESHOLD){commitScan(r,{quiet:true});liveBanner(r,"ok");flash("ok");setGuideState("ok");feedback();}
      else{S.review.push({id:"r"+Date.now(),guess:r.guess,print:r.print,conf:r.conf,alts:r.alts||[],img,at:today(),signals:r.signals});save();liveBanner(r,"review");flash("review");setGuideState("review");feedback(true);}
      setLiveHint("Got it. Next card");updateLiveUI();
      setTimeout(()=>{if(live.state==="ok"||live.state==="review")setGuideState("seek");},900);
    }else{
      live.fails++;live.cooldownUntil=Date.now()+700;setGuideState("hold");
      setLiveHint(live.fails>=3?"Can't read this one. Tap Capture, or type the name.":"Nothing readable yet, trying again");
      if(live.fails>=3){live.lastHash=hash;live.lastGray=gray;live.armed=false;setGuideState("seek");}
    }
  }catch(e){setGuideState("hold");if(e&&e.message==="timeout"){setLiveHint("That took too long; trying again");live.cooldownUntil=Date.now()+1500;}else{ocrErr=(e&&e.message)||String(e);setLiveHint("Scanner error: "+ocrErr);live.cooldownUntil=Date.now()+2000;}}
  live.busy=false;
}
function setLiveHint(t){const h=$("#livehint");if(h)h.textContent=t;}
/* Cheap "is a card lined up" test on the guide sample: a card's top edge and title bar put a strong
   horizontal edge in the top 16% of the frame (about 9x the median row on phone previews); a
   tablecloth, a gap between cards, or a frame that has slid down the card does not (<1x). */
function cardGate(cv){
  const w=cv.width,h=cv.height;const d=cv.getContext("2d").getImageData(0,0,w,h).data;
  const g=new Float32Array(w*h);for(let i=0,j=0;i<d.length;i+=4,j++)g[j]=d[i]*.3+d[i+1]*.59+d[i+2]*.11;
  const rows=new Float32Array(h);for(let y=1;y<h-1;y++){let s=0;for(let x=1;x<w-1;x++){const i=y*w+x;s+=Math.abs(g[i+w]-g[i-w]);}rows[y]=s/(w-2);}
  const sorted=Array.from(rows.subarray(1,h-1)).sort((a,b)=>a-b);const med=sorted[sorted.length>>1]||0;
  let top=0;for(let y=1;y<Math.round(h*.16);y++)top=Math.max(top,rows[y]);
  let mid=0;for(let y=Math.round(h*.5);y<Math.round(h*.68);y++)mid=Math.max(mid,rows[y]);
  const ok=top>=20&&(top>=3*med||top>=45);
  return {ok,top:Math.round(top),mid:Math.round(mid),med:+med.toFixed(1)};
}
function diag(motion,q,cg){if(!(S.prefs&&S.prefs.diag))return "";return ` · m ${motion.toFixed(1)} s ${Math.round(q.sharp)} still ${live.still}${cg?` edge ${cg.top}/${cg.med}`:""}`;}
function liveBanner(r,kind){const b=$("#livebanner");if(!b)return;const card=BY_ID[r.guess];const p=card.prints.find(x=>x.set===r.print.set&&x.num===r.print.num);
  b.className="livebanner "+kind;b.innerHTML=`${thumb(card,"sm","",p)}<div class="tx"><div class="n">${esc(card.name)}${kind==="review"?"?":""}</div><div class="d">${pr(r.print)} · ${r.conf}%${kind==="ok"?` · now ×${ownedOf(card.id)}`:" · sent to review"}</div></div>${kind==="ok"?'<button class="btn sm" id="liveundo">Undo</button>':'<button class="btn sm" id="livefix">Fix</button>'}`;
  b.hidden=false;clearTimeout(b._t);b._t=setTimeout(()=>{b.hidden=true;},kind==="ok"?3500:6000);
  const u=$("#liveundo");if(u)u.onclick=()=>{undoLast(r);b.hidden=true;updateLiveUI();};
  const f=$("#livefix");if(f)f.onclick=()=>{const item=S.review[S.review.length-1];if(item)openMatchSheet(item,true);};
}
function undoLast(r){const card=BY_ID[r.guess];const k=pk(card.id,r.print.set,r.print.num);removeLastCopy(k);const i=S.session.map(x=>x.id+x.set+x.num).lastIndexOf(card.id+r.print.set+r.print.num);if(i>-1)S.session.splice(i,1);save();toast("Removed "+card.name);}
let audioCtx=null;
function feedback(soft){try{if(navigator.vibrate)navigator.vibrate(soft?[20,40,20]:35);}catch(e){}
  if(!live.sound)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),gn=audioCtx.createGain();o.type="sine";o.frequency.value=soft?440:880;gn.gain.value=.0001;o.connect(gn);gn.connect(audioCtx.destination);const t=audioCtx.currentTime;gn.gain.exponentialRampToValueAtTime(.15,t+.01);gn.gain.exponentialRampToValueAtTime(.0001,t+(soft?.18:.09));o.start(t);o.stop(t+.2);}catch(e){}}
/* Update counters, tray and badge in place; a full rScan would recreate the video element. */
function updateLiveUI(){
  const ses=S.session;const sub=$("#v-scan .top .s");if(sub)sub.innerHTML=`Session · ${ses.length} added${S.review.length?` · <span style="color:var(--wn)">${S.review.length} to review</span>`:""}`;
  const es=$("#endses");if(es)es.disabled=!(ses.length||camOn||scanning);
  const sp=$("#sesprog");if(sp){const counts={};for(const s of ses)counts[s.set]=(counts[s.set]||0)+1;const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(top){const st=allSetStats().find(x=>x.code===top[0]);sp.hidden=!st;if(st)sp.innerHTML=`<button class="row" data-setprog="${st.code}" style="min-height:44px"><div class="tx"><div class="n">${esc(st.name)}</div><div class="bar" style="margin-top:5px"><i style="width:${100*st.owned/st.base}%"></i></div></div><span class="q own">${st.owned} / ${st.base}</span></button>`;const b=sp.querySelector("[data-setprog]");if(b)b.onclick=()=>go("checklist",{kind:"set",code:b.dataset.setprog});}else sp.hidden=true;}
  const tray=$("#livetray");if(tray){tray.innerHTML=[...ses].reverse().slice(0,12).map(s=>{const card=BY_ID[s.id];const p=card.prints.find(x=>x.set===s.set&&x.num===s.num);return `<button data-card="${esc(card.id)}" title="${esc(card.name)}">${thumb(card,"md","",p)}</button>`;}).join("")||'<div class="empty" style="padding:12px">Pan over your cards; each one lands here as it is read.</div>';tray.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>go("card",{id:b.dataset.card}));}
  updateBadges();
  const tr=$("#torev");if(tr){tr.hidden=!S.review.length;tr.textContent=`Review ${S.review.length} uncertain scan${S.review.length>1?"s":""}`;}
}
async function captureFrame(){
  const v=$("#video"),g=$("#guide");if(!v||!v.videoWidth||scanning||live.busy)return;
  const vr=v.getBoundingClientRect(),gr=g.getBoundingClientRect();
  const scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const offX=(vr.width-v.videoWidth*scale)/2,offY=(vr.height-v.videoHeight*scale)/2;
  const pad=gr.width*.08;
  let sx=(gr.left-vr.left-offX-pad)/scale,sy=(gr.top-vr.top-offY-pad)/scale,sw=(gr.width+2*pad)/scale,sh=(gr.height+2*pad)/scale;
  sx=Math.max(0,sx);sy=Math.max(0,sy);sw=Math.min(sw,v.videoWidth-sx);sh=Math.min(sh,v.videoHeight-sy);
  const cv=document.createElement("canvas");cv.width=Math.round(sw);cv.height=Math.round(sh);
  cv.getContext("2d").drawImage(v,sx,sy,sw,sh,0,0,cv.width,cv.height);
  const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.92));
  if(blob)doScan(blob);
}
function rScan(){
  const el=$("#v-scan");const ses=S.session;
  const engine=ocrState==="failed"?`<div class="sect warn" style="margin-top:10px;font-size:12.5px">The OCR engine couldn't start in this browser (${esc(ocrErr)}). Scans use the demo recognizer until it can.</div>`:"";
  const camBox=camOn?`<div class="cam live"><video id="video" autoplay playsinline muted></video><div class="guide" id="guide"></div>
      <div class="livebanner" id="livebanner" hidden></div>
      <div class="z mono" id="ocrmsg" style="font-size:11px;text-align:center">${scanning?esc(ocrMsg):ocrState==="loading"?"Starting OCR…":""}</div>
      <div class="livehint" id="livehint">${ocrState==="ready"?"":"Starting the scanner…"}</div>
      ${scanning?'<div class="busy"><span>Reading…</span><button class="btn sm" id="scancancel">Cancel</button></div>':""}
      <div class="ctl"><button class="btn ${live.on?"pri":""}" id="liveauto" aria-pressed="${live.on}">${live.on?"Auto: on":"Auto: off"}</button><button class="btn" id="capture" ${scanning?"disabled":""}>Capture</button><button class="btn" id="livesound" aria-pressed="${live.sound}" title="Sound">${live.sound?"Sound on":"Muted"}</button><button class="btn" id="camoff">Close</button></div></div>
      <div class="h">This session</div><div id="sesprog" hidden></div><div class="tray" id="livetray"></div>`
  :`<div class="cam">${lastImg?`<img src="${lastImg}" alt="">`:""}<div class="guide" id="guide"></div>
    <div class="btnrow z" style="margin-top:0;width:100%;max-width:320px"><button class="btn pri" id="camon" ${scanning?"disabled":""}>${scanning?"Reading…":"Open camera"}</button><label class="btn" style="${scanning?"opacity:.5;pointer-events:none":""}"><input type="file" id="file" accept="image/*" capture="environment">Photo</label></div>
    <div class="z mono" id="ocrmsg" style="font-size:11px;color:var(--mu);min-height:14px">${scanning?esc(ocrMsg):ocrState==="ready"?"OCR ready":""}</div>
    ${camErr?`<div class="note z" style="margin:0;color:var(--wn)">${esc(camErr)}</div>`:""}
    <div class="note z" style="margin:0">Card upright inside the frame, title band sharp. At or above ${THRESHOLD}% it goes straight in; below that you confirm.</div>
    ${scanning?'<button class="demo z" id="scancancel">Cancel</button>':'<button class="demo z" id="simulate">Try a demo scan</button>'}
  </div>`;
  el.innerHTML=`
  <div class="top"><div><h1>Scan</h1><div class="s">Session · ${ses.length} added${S.review.length?` · <span style="color:var(--wn)">${S.review.length} to review</span>`:""}</div></div><button class="btn sm" id="endses" ${ses.length||camOn||scanning?"":"disabled"}>End session</button></div>
  ${camBox}
  ${engine}
  ${camOn?"":'<div class="h">Tray</div>'}
  ${camOn?"":ses.length?`<div class="tray">${[...ses].reverse().map(s=>{const card=BY_ID[s.id];const p=card.prints.find(x=>x.set===s.set&&x.num===s.num);return `<button data-card="${esc(card.id)}" title="${esc(card.name)}">${thumb(card,"md","",p)}</button>`;}).join("")}</div>
  <div class="lst">${[...ses].reverse().slice(0,8).map(s=>{const card=BY_ID[s.id];return `<button class="row" data-card="${esc(card.id)}">${stripe(card)}<div class="tx"><div class="n">${esc(card.name)}</div><div class="d">${s.set.toUpperCase()} ${esc(s.num)} · ${s.conf}%${s.conf>=THRESHOLD?"":" · confirmed"}</div></div><span class="q own">×${ownedOf(card.id)}</span></button>`;}).join("")}</div>`
  :`<div class="empty">Nothing scanned this session yet. Each card you capture lands here with its printing and confidence.</div>`}
  <button class="btn" id="torev" style="margin-top:12px" ${S.review.length?"":"hidden"}>Review ${S.review.length} uncertain scan${S.review.length>1?"s":""}</button>`;
  const fi=$("#file");if(fi)fi.onchange=e=>{const f=e.target.files[0];if(f)doScan(f);};
  const sim=$("#simulate");if(sim)sim.onclick=()=>doScan(null);
  const con=$("#camon");if(con)con.onclick=openCamera;
  const coff=$("#camoff");if(coff)coff.onclick=()=>{closeCamera();rScan();};
  const cap=$("#capture");if(cap)cap.onclick=captureFrame;
  const la=$("#liveauto");if(la)la.onclick=()=>{live.on=!live.on;S.prefs=S.prefs||{};S.prefs.live=live.on;save();rScan();};
  const ls=$("#livesound");if(ls)ls.onclick=()=>{live.sound=!live.sound;S.prefs=S.prefs||{};S.prefs.sound=live.sound;save();rScan();};
  const vid=$("#video");if(vid&&stream){vid.srcObject=stream;vid.play().catch(()=>{});if(live.on){getOCR().then(()=>{setLiveHint("");startLive();});}}
  if(camOn)updateLiveUI();
  $("#endses").onclick=()=>{const n=S.session.length;closeCamera();S.session=[];save();scheduleSync(0);rScan();toast(n?`Session closed · ${n} added`:"Session closed");};
  const sc=$("#scancancel");if(sc)sc.onclick=()=>{cancelScan();if(camOn)updateLiveUI();else rScan();toast("Scan cancelled");};
  el.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>go("card",{id:b.dataset.card}));
  const tr=$("#torev");if(tr)tr.onclick=()=>go("review");
}
async function doScan(file){
  if(scanning)return;
  const gen=++scanGen;scanning=true;ocrMsg=file?"Preparing image…":"";
  lastImg=file?await thumbData(file):null;
  if(gen!==scanGen)return;
  if(camOn){const c=$("#v-scan .cam");if(c&&!$("#v-scan .busy")){const b=document.createElement("div");b.className="busy";b.innerHTML='<span>Reading…</span><button class="btn sm" id="scancancel">Cancel</button>';c.appendChild(b);$("#scancancel").onclick=()=>{cancelScan();updateLiveUI();toast("Scan cancelled");};}}else rScan();
  let r=null;
  try{
    if(file){r=await recognizeTimed(file,{},30000);if(r===null)r=await recognizeStub(file);}
    else r=await recognizeStub(null);
  }catch(e){
    if(gen!==scanGen)return;
    if(e&&e.message==="timeout"){scanning=false;if(camOn){const b=$("#v-scan .busy");if(b)b.remove();updateLiveUI();}else rScan();toast("That took too long. Try again with the card closer and in better light.");return;}
    ocrErr=(e&&e.message)||String(e);ocrState="failed";r=await recognizeStub(file);
  }
  if(gen!==scanGen)return;
  scanning=false;
  const refresh=()=>{if(camOn){const b=$("#v-scan .busy");if(b)b.remove();updateLiveUI();}else rScan();};
  if(!r.guess){refresh();toast("Couldn't read a name. Try closer, or type it.");openTypeSheet(name=>{const c=BY_LOWER[name.toLowerCase()];if(c)openAddSheetScan(c,{conf:0,img:lastImg},false);});return;}
  if(r.conf>=THRESHOLD){commitScan(r);refresh();}
  else{refresh();openMatchSheet({...r,img:lastImg,at:today()});}
}
function thumbData(file){return new Promise(res=>{const draw=img=>{const cv=document.createElement("canvas");const w=200,h=Math.round(200*img.height/img.width);cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);res(cv.toDataURL("image/jpeg",.7));};if(file instanceof Blob)loadBitmap(file).then(draw).catch(()=>res(null));else try{draw(file);}catch(e){res(null);}});}
function commitScan(r,opts={}){
  const card=BY_ID[r.guess];
  addCopy(S.col,card.id,r.print.set,r.print.num,{cond:opts.cond||"NM",foil:!!opts.foil,via:"scan",date:today(),conf:r.conf,sig:r.signals?{n:r.signals.name,t:r.signals.type,c:r.signals.colour,p:r.signals.print,s:r.signals.sharp}:undefined});
  S.session.push({id:card.id,set:r.print.set,num:r.print.num,conf:r.conf});
  save();
  if(opts.quiet)return;
  toast(`${card.name} · ${r.print.set.toUpperCase()} ${r.print.num} · now ×${ownedOf(card.id)}`,()=>{const k=pk(card.id,r.print.set,r.print.num);removeLastCopy(k);const i=S.session.map(s=>s.id+s.set+s.num).lastIndexOf(card.id+r.print.set+r.print.num);if(i>-1)S.session.splice(i,1);save();render();});
}
function openMatchSheet(r,fromReview){
  let pick={id:r.guess,set:r.print.set,num:r.print.num,conf:r.conf},showAll=false;
  const list=()=>[{id:r.guess,set:r.print.set,num:r.print.num,conf:r.conf},...(r.alts||[])];
  const draw=()=>{
    const pc=BY_ID[pick.id];
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div class="compare"><div class="col"><div class="crop">${r.img?`<img src="${r.img}" alt="">`:""}</div>Your scan</div><span class="mu" style="align-self:center">→</span><div class="col">${thumb(pc,"lg","",pc.prints.find(p=>p.set===pick.set&&p.num===pick.num))}Best match</div></div>
    <div style="text-align:center;margin-top:10px"><div style="font-weight:700;font-size:18px">${esc(pc.name)}</div><div class="meter" style="justify-content:center;margin-top:6px"><span>${pick.conf}%</span><div class="conf ${pick.conf>=THRESHOLD?"":pick.conf>=40?"wn":"bad"}" style="max-width:120px"><i style="width:${pick.conf}%"></i></div><span class="mono">${pick.set.toUpperCase()} ${esc(pick.num)}</span></div>${r.how?`<div class="mu" style="font-size:11px;margin-top:4px">printing from ${esc(r.how)}${r.signals?` · name ${Math.round((r.signals.name||0)*100)}%${r.signals.type!=null?" · type "+Math.round(r.signals.type*100)+"%":""}${r.signals.colour===false?" · frame colour disagrees":""}`:""}</div>`:""}</div>
    <div class="h">Candidates</div>
    <div class="lst">${(()=>{const all=list();const pi=all.findIndex(a=>a.id===pick.id&&a.set===pick.set&&a.num===pick.num);const shown=showAll?all:all.filter((a,i)=>i<4||i===pi);return shown.map(a=>{const i=all.indexOf(a);const ac=BY_ID[a.id];if(!ac)return "";const on=i===pi;return `<button class="row ${on?"":"dim"}" data-alt="${i}" style="min-height:52px">${stripe(ac)}${thumb(ac,"sm","",ac.prints.find(p=>p.set===a.set&&p.num===a.num))}<div class="tx"><div class="n">${esc(ac.name)}</div><div class="d">${a.set.toUpperCase()} ${esc(a.num)} · ${esc(setName(a.set))}</div></div><span class="q ${on?"own":""}">${a.conf}%</span></button>`;}).join("")+(all.length>shown.length?`<button class="row" id="morealts" style="min-height:44px;justify-content:center"><span class="mu" style="font-size:12.5px">${all.length-shown.length} more printing${all.length-shown.length>1?"s":""}</span></button>`:"");})()}</div>
    <div class="stick"><div class="btnrow" style="margin-top:0"><button class="btn ghost" id="typeit">Type the name</button><button class="btn pri" id="accept">Accept ${pick.set.toUpperCase()} ${esc(pick.num)}</button></div>
    ${fromReview?'<button class="btn sm ghost" id="discard" style="width:100%;margin-top:8px">Discard · not adding this</button>':'<button class="btn sm ghost" id="later" style="width:100%;margin-top:8px">Decide later</button>'}</div>`;
    const ma=$("#morealts");if(ma)ma.onclick=()=>{showAll=true;draw();};
    $("#sheet").querySelectorAll("[data-alt]").forEach(b=>b.onclick=()=>{pick=list()[+b.dataset.alt];draw();});
    $("#accept").onclick=()=>{commitScan({guess:pick.id,print:{set:pick.set,num:pick.num},conf:pick.conf});if(fromReview)S.review=S.review.filter(x=>x.id!==r.id);save();closeSheet();render();};
    $("#typeit").onclick=()=>{closeSheet();openTypeSheet(name=>{const c=BY_LOWER[name.toLowerCase()];if(c)openAddSheetScan(c,r,fromReview);});};
    const l=$("#later");if(l)l.onclick=()=>{S.review.push({id:"r"+Date.now(),guess:r.guess,print:r.print,conf:r.conf,alts:r.alts||[],img:r.img,at:r.at});save();closeSheet();render();toast("Kept in review");};
    const d=$("#discard");if(d)d.onclick=()=>{const item=S.review.find(x=>x.id===r.id);S.review=S.review.filter(x=>x.id!==r.id);save();closeSheet();render();toast("Discarded",item?()=>{S.review.push(item);save();render();}:undefined);};
  };
  draw();openSheet();
}
function openAddSheetScan(card,r,fromReview){
  let print=defaultPrint(card),all=false;
  const draw=()=>{
    const list=all?card.prints:[...new Set([print,...card.prints.slice(0,8)])];
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div style="display:flex;gap:12px;align-items:center">${r&&r.img?`<div class="crop" style="width:60px;height:84px"><img src="${r.img}" alt=""></div>`:""}${thumb(card,"md","",print)}<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(card.name)}</div><div class="mu" style="font-size:12px">${esc(card.type)}</div></div></div>
    <div class="h">Printing · ${esc(setName(print.set))} ${setYear(print.set)}</div><div class="chips" style="margin-top:0">${list.map(p=>`<button class="chip ${p===print?"on":""}" data-p="${p.set}|${esc(p.num)}">${pr(p)}</button>`).join("")}${card.prints.length>list.length?`<button class="chip" id="morep">+ ${card.prints.length-list.length} more</button>`:""}</div>
    <div class="btnrow"><button class="btn ghost" id="cancel">Cancel</button><button class="btn pri" id="ok">Save · ${pr(print)}</button></div>`;
    $("#sheet").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const [s,n]=b.dataset.p.split("|");print=card.prints.find(p=>p.set===s&&p.num===n)||print;draw();});
    const mp=$("#morep");if(mp)mp.onclick=()=>{all=true;draw();};
    $("#cancel").onclick=closeSheet;
    $("#ok").onclick=()=>{commitScan({guess:card.id,print:{set:print.set,num:print.num},conf:r?r.conf:0});if(fromReview&&r)S.review=S.review.filter(x=>x.id!==r.id);save();closeSheet();render();};
  };
  draw();openSheet();
}
function openTypeSheet(onPick){
  let t="";
  const draw=()=>{
    const tl=t.toLowerCase();
    const hits=[];if(tl.length){for(const x of INDEX){if(x.lower.includes(tl)){hits.push(x);if(hits.length>60)break;}}hits.sort((a,b)=>(b.lower.startsWith(tl)-a.lower.startsWith(tl))||a.name.length-b.name.length);}
    const show=hits.slice(0,8);
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div class="in"><span class="mu">⌕</span><input id="tin" placeholder="Start typing the card name" value="${esc(t)}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <div class="lst" style="margin-top:6px">${show.map(h=>{const i=h.lower.indexOf(tl);const nm=esc(h.name.slice(0,i))+"<mark style='background:var(--acs);color:inherit;border-radius:2px'>"+esc(h.name.slice(i,i+t.length))+"</mark>"+esc(h.name.slice(i+t.length));const own=ownedOf(h.id);return `<button class="row" data-name="${esc(h.name)}" style="min-height:52px">${stripe(h)}${thumb(h,"sm")}<div class="tx"><div class="n">${nm}</div><div class="d">${esc(h.type)}${own?" · owned ×"+own:""}</div></div><span class="mu">›</span></button>`;}).join("")}
    ${tl.length>=3&&!hits.length?'<div class="empty">Not in the index.</div>':""}</div>`;
    const inp=$("#tin");inp.focus();inp.setSelectionRange(t.length,t.length);
    inp.oninput=()=>{t=inp.value;draw();};
    $("#sheet").querySelectorAll("[data-name]").forEach(b=>b.onclick=()=>{closeSheet();onPick(b.dataset.name);});
  };
  draw();openSheet();
}

/* ========================= REVIEW ========================= */
function rReview(){
  const el=$("#v-review");
  const items=[...S.review].sort((a,b)=>a.conf-b.conf);
  el.innerHTML=`<div class="top"><div><h1>Review</h1><div class="s">${items.length} uncertain · lowest first</div></div>${pins().includes("review")?"":'<button class="btn sm" id="bk">Scan</button>'}</div>
  ${items.length?`<div class="lst">${items.map(r=>{const card=BY_ID[r.guess];return `<button class="row" data-rv="${r.id}" style="min-height:60px"><div class="crop" style="width:34px;height:48px;border-radius:4px">${r.img?`<img src="${r.img}" alt="">`:""}</div><div class="tx"><div class="n">${esc(card.name)}?</div><div class="meter" style="margin-top:4px"><span>${r.conf}%</span><div class="conf ${r.conf>=40?"wn":"bad"}"><i style="width:${r.conf}%"></i></div><span class="mono">${r.print.set.toUpperCase()} ${esc(r.print.num)}</span></div></div><span class="mu">›</span></button>`;}).join("")}</div>
  <div class="note">Most of these are the right name with an uncertain printing; the sheet groups same-name candidates so set is the only decision.</div>
  <div class="btnrow"><button class="btn ghost" id="clearall">Clear all</button><button class="btn" id="acceptall" ${items.some(r=>r.conf>=70)?"":"disabled"}>Accept all ≥ 70%${items.some(r=>r.conf>=70)?` · ${items.filter(r=>r.conf>=70).length}`:""}</button></div>`
  :`<div class="empty">Nothing to review. Scans below ${THRESHOLD}% confidence land here.</div>`}`;
  const bk=$("#bk");if(bk)bk.onclick=()=>go("scan");
  el.querySelectorAll("[data-rv]").forEach(b=>b.onclick=()=>{const r=S.review.find(x=>x.id===b.dataset.rv);openMatchSheet(r,true);});
  const aa=$("#acceptall");if(aa)aa.onclick=()=>{const ok=S.review.filter(r=>r.conf>=70);ok.forEach(r=>commitScan({guess:r.guess,print:r.print,conf:r.conf}));S.review=S.review.filter(r=>r.conf<70);save();render();toast(`Accepted ${ok.length}`);};
  const ca=$("#clearall");if(ca)ca.onclick=()=>{const gone=S.review.slice();S.review=[];save();render();toast(`Cleared ${gone.length} · nothing was added`,()=>{S.review=gone.concat(S.review);save();render();});};
}

/* ========================= BINDER ========================= */
let binderTab="R",binderPage=0,setFilter="",typeFilter="",showAllSets=false,showAllTypes=false;
/* ========================= COLLECTION: SETS & TYPES =========================
   A checklist is a set (slots = base-set collector numbers, one of each) or a creature type
   (slots = cards with the type; makers = cards whose text names it). */
let SETSTATS=null,TYPEIDX=null,CHANGELINGS=[];
function baseSize(code){const s=SETS[code];if(!s)return 0;if(s[3])return s[3];let m=0;for(const c of INDEX)for(const p of c.prints)if(p.set===code&&p.n>m)m=p.n;return m;}
function setSlots(code){const base=baseSize(code);const slots=new Map(),variants=[];
  for(const c of INDEX)for(const p of c.prints){if(p.set!==code)continue;if(p.n>=1&&p.n<=base){if(!slots.has(p.n))slots.set(p.n,{card:c,print:p});}else variants.push({card:c,print:p});}
  const arr=[...slots.values()].sort((a,b)=>a.print.n-b.print.n);variants.sort((a,b)=>(a.print.n||1e9)-(b.print.n||1e9)||String(a.print.num).localeCompare(String(b.print.num)));
  return {base,slots:arr,variants};}
function setChecklist(code){
  const {base,slots,variants}=setSlots(code);
  let owned=0,value=0,known=0;const byR={1:[0,0],2:[0,0],3:[0,0],4:[0,0],0:[0,0]};
  for(const sl of slots){const n=ownedPrint(sl.card.id,sl.print.set,sl.print.num);sl.owned=n;const r=byR[sl.print.rarity]||byR[0];r[1]++;if(n){owned++;r[0]++;const v=priceOf(sl.print);if(v!=null){value+=v;known++;}}}
  let vOwned=0;for(const v of variants){v.owned=ownedPrint(v.card.id,v.print.set,v.print.num);if(v.owned)vOwned++;}
  return {kind:"set",code,name:setName(code),year:setYear(code),base,slots,variants,owned,total:slots.length,missing:slots.length-owned,value,known,byR,vOwned};}
function buildTypeIndex(){
  TYPEIDX=new Map();
  const add=(t,c,makes)=>{let e=TYPEIDX.get(t);if(!e)TYPEIDX.set(t,e={has:[],makes:[]});(makes?e.makes:e.has).push(c);};
  const count=new Map();for(const c of INDEX)if(c.types.includes("Creature")||c.types.includes("Kindred"))for(const t of c.sub)count.set(t,(count.get(t)||0)+1);
  const types=new Set([...count.entries()].filter(([t,n])=>/^[A-Z][a-z'-]+$/.test(t)&&(n>=2||t.length>3)).map(([t])=>t));
  for(const c of INDEX){const isCreature=c.types.includes("Creature")||c.types.includes("Kindred");if(isCreature)for(const t of c.sub)if(types.has(t))add(t,c,false);}
  CHANGELINGS=INDEX.filter(c=>c.kw.includes("changeling")).sort((a,b)=>a.name.localeCompare(b.name));
  for(const t of types){const re=new RegExp("\\b"+t.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")+"s?\\b");const e=TYPEIDX.get(t);const inHas=new Set(e.has);for(const c of INDEX){if(inHas.has(c))continue;if(re.test(c.o)&&!(c.types.includes("Creature")&&c.sub.includes(t)))e.makes.push(c);}}
  for(const [t,e] of TYPEIDX){e.has.sort((a,b)=>a.name.localeCompare(b.name));e.makes.sort((a,b)=>a.name.localeCompare(b.name));}
}
function typeChecklist(t){
  if(!TYPEIDX)buildTypeIndex();const e=TYPEIDX.get(t);if(!e)return null;
  const mk=c=>{const n=ownedOf(c.id);const op=n?ownedPrints(c.id)[0]:null;const print=op?c.prints.find(p=>p.set===op.set&&p.num===op.num):defaultPrint(c);return {card:c,print,owned:n};};
  const has=e.has.map(mk),makes=e.makes.map(mk),changelings=CHANGELINGS.filter(c=>!c.sub.includes(t)).map(mk);
  const owned=has.filter(x=>x.owned).length,mOwned=makes.filter(x=>x.owned).length,cOwned=changelings.filter(x=>x.owned).length;
  let value=0,known=0;for(const x of [...has,...makes])if(x.owned){const v=entryValue(S.col[pk(x.card.id,x.print.set,x.print.num)]||{id:x.card.id,set:x.print.set,num:x.print.num,copies:[]});if(v){value+=v.total;known+=v.known;}}
  return {kind:"type",code:t,name:t,slots:has,makes,changelings,owned,total:has.length,missing:has.length-owned,mOwned,cOwned,value,known};}
function allSetStats(){
  if(SETSTATS)return SETSTATS;
  const ownedBySet={};for(const e of Object.values(S.col)){const c=BY_ID[e.id];const p=c.prints.find(x=>x.set===e.set&&x.num===e.num);if(!p)continue;const base=baseSize(e.set);const o=ownedBySet[e.set]=ownedBySet[e.set]||{slots:new Set(),variants:0,copies:0};o.copies+=e.copies.length;if(p.n>=1&&p.n<=base)o.slots.add(p.n);else o.variants++;}
  SETSTATS=Object.keys(SETS).map(code=>{const o=ownedBySet[code];return {code,name:setName(code),year:setYear(code),base:baseSize(code),owned:o?o.slots.size:0,variants:o?o.variants:0,copies:o?o.copies:0,touched:(S.prefs&&S.prefs.touched&&S.prefs.touched[code])||0};}).filter(x=>x.base>0);
  return SETSTATS;}
function invalidateStats(){SETSTATS=null;}
function touch(code){S.prefs=S.prefs||{};S.prefs.touched=S.prefs.touched||{};S.prefs.touched[code]=Date.now();save();invalidateStats();}
function rSetList(el){
  const all=allSetStats();const f=setFilter.trim().toLowerCase();
  let list=all.filter(x=>!f||x.name.toLowerCase().includes(f)||x.code.includes(f));
  const mine=list.filter(x=>x.owned||x.variants),rest=list.filter(x=>!x.owned&&!x.variants).sort((a,b)=>b.year.localeCompare(a.year)||a.name.localeCompare(b.name));
  mine.sort((a,b)=>(b.touched-a.touched)||(b.owned-a.owned)||b.year.localeCompare(a.year));
  const row=x=>`<button class="row setrow2" data-set="${x.code}"><div class="tx"><div class="n">${esc(x.name)}</div><div class="d"><span class="mono">${x.code.toUpperCase()}</span><span>${x.year}</span>${x.variants?`<span>+${x.variants} variant${x.variants>1?"s":""}</span>`:""}</div><div class="bar"><i style="width:${x.base?100*x.owned/x.base:0}%"></i></div></div><div class="frac ${x.owned?"own":""}"><b>${x.owned}</b><span>/ ${x.base}</span></div></button>`;
  el.innerHTML=`<div class="in" style="margin-bottom:6px"><span class="mu">⌕</span><input id="setf" placeholder="Filter sets by name or code" value="${esc(setFilter)}" autocomplete="off" autocapitalize="off"></div>
  ${mine.length?`<div class="h">Your sets · ${mine.length}</div><div class="lst">${mine.map(row).join("")}</div>`:(f?"":'<div class="empty">No sets yet. Scan a card and its set appears here with a progress bar.</div>')}
  ${rest.length?(showAllSets||f?`<div class="h">All sets · ${rest.length}</div><div class="lst">${rest.slice(0,showAllSets?rest.length:60).map(row).join("")}</div>`:`<button class="btn ghost" id="allsets" style="margin-top:12px">Show all ${rest.length} sets</button>`):""}`;
  const inp=$("#setf");inp.oninput=()=>{setFilter=inp.value;const sel=inp.selectionStart;rSets();const n=$("#setf");n.focus();n.setSelectionRange(sel,sel);};
  el.querySelectorAll(".setrow2").forEach(b=>b.onclick=()=>go("checklist",{kind:"set",code:b.dataset.set}));
  const a=$("#allsets");if(a)a.onclick=()=>{showAllSets=true;rSets();};
}
function rTypeList(el){
  if(!TYPEIDX)buildTypeIndex();const f=typeFilter.trim().toLowerCase();
  const ownedNames=new Set(Object.values(S.col).map(e=>e.id));
  const rows=[...TYPEIDX.entries()].map(([t,e])=>({t,n:e.has.length,m:e.makes.length,owned:e.has.filter(c=>ownedNames.has(c.id)).length,mOwned:e.makes.filter(c=>ownedNames.has(c.id)).length})).filter(x=>!f||x.t.toLowerCase().includes(f));
  const mine=rows.filter(x=>x.owned||x.mOwned).sort((a,b)=>(b.owned-a.owned)||(b.mOwned-a.mOwned)||a.t.localeCompare(b.t)),rest=rows.filter(x=>!x.owned&&!x.mOwned).sort((a,b)=>a.t.localeCompare(b.t));
  const row=x=>`<button class="row typerow" data-type="${esc(x.t)}"><div class="tx"><div class="n">${esc(x.t)}</div><div class="d"><span>${x.n} with the type</span>${x.m?`<span>${x.m} make them</span>`:""}${x.mOwned?`<span>${x.mOwned} maker${x.mOwned>1?"s":""} owned</span>`:""}</div></div><div class="frac ${x.owned?"own":""}"><b>${x.owned}</b><span>/ ${x.n}</span></div></button>`;
  el.innerHTML=`<div class="in" style="margin-bottom:6px"><span class="mu">⌕</span><input id="typef" placeholder="Filter creature types" value="${esc(typeFilter)}" autocomplete="off" autocapitalize="off"></div>
  ${mine.length?`<div class="h">Your types · ${mine.length}</div><div class="lst">${mine.map(row).join("")}</div>`:(f?"":'<div class="empty">No creature types yet. Each type you own a card of appears here with how many of its cards you have.</div>')}
  ${rest.length?(showAllTypes||f?`<div class="h">All types · ${rest.length}</div><div class="lst">${rest.map(row).join("")}</div>`:`<button class="btn ghost" id="alltypes" style="margin-top:12px">Show all ${rest.length} creature types</button>`):""}`;
  const inp=$("#typef");inp.oninput=()=>{typeFilter=inp.value;const sel=inp.selectionStart;rTypes();const n=$("#typef");n.focus();n.setSelectionRange(sel,sel);};
  el.querySelectorAll(".typerow").forEach(b=>b.onclick=()=>go("checklist",{kind:"type",code:b.dataset.type}));
  const a=$("#alltypes");if(a)a.onclick=()=>{showAllTypes=true;rTypes();};
}
function rSets(){const el=$("#v-sets");el.innerHTML=`<div class="top"><div><h1>Sets</h1><div class="s">${allSetStats().filter(x=>x.owned||x.variants).length} with cards · ${Object.keys(SETS).length} in the index</div></div></div><div id="segbody"></div>`;rSetList($("#segbody"));}
function rTypes(){if(!TYPEIDX)buildTypeIndex();const el=$("#v-types");const ownedNames=new Set(Object.values(S.col).map(e=>e.id));const n=[...TYPEIDX.values()].filter(e=>e.has.some(c=>ownedNames.has(c.id))).length;el.innerHTML=`<div class="top"><div><h1>Creature types</h1><div class="s">${n} with cards · ${TYPEIDX.size} in the index</div></div></div><div id="segbody"></div>`;rTypeList($("#segbody"));}
function rBinder(){
  const el=$("#v-binder");
  const entries=Object.values(S.col).filter(e=>{const k=ciClass(BY_ID[e.id]);return binderTab==="M"?k==="M":k===binderTab;}).sort((a,b)=>BY_ID[a.id].name.localeCompare(BY_ID[b.id].name)||a.set.localeCompare(b.set));
  const pages=Math.max(1,Math.ceil(entries.length/9));binderPage=Math.min(binderPage,pages-1);
  const slice=entries.slice(binderPage*9,binderPage*9+9);
  const names={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",M:"Multi",C:"Colourless"};
  el.innerHTML=`<div class="top"><div><h1>Binder</h1><div class="s">${names[binderTab]} · page ${binderPage+1} of ${pages} · ${entries.reduce((n,e)=>n+e.copies.length,0)} cards · ${totalOwned()} total</div></div></div>
  <div class="sidetabs">${["W","U","B","R","G","M","C"].map(x=>`<button class="${x===binderTab?"on":""}" data-bt="${x}">${x==="M"?'<span class="pips"><span class="pip R"></span><span class="pip W"></span></span>':x==="C"?'<span class="pip">C</span>':`<span class="pip ${x}"></span>`}</button>`).join("")}</div>
  <div class="grid3" id="bgrid">${slice.map(e=>{const card=BY_ID[e.id];const foil=e.copies.some(c=>c.foil);return `<button data-card="${esc(card.id)}" aria-label="${esc(card.name)}, ${pr(e)}, ${e.copies.length} owned">${thumb(card,"md",foil?'<span class="foil" title="foil"></span>':"")}<span class="lbl">${pr(e)} · <b>×${e.copies.length}</b>${(()=>{const v=entryValue(e);return v&&v.known?` · ${fmt(v.total)}`:"";})()}</span></button>`;}).join("")}${Array.from({length:9-slice.length}).map(()=>'<div class="card md ph" aria-hidden="true"><div class="art"></div></div>').join("")}</div>
  <div class="dots">${Array.from({length:Math.min(pages,40)}).map((_,i)=>`<i class="${i===binderPage?"on":""}"></i>`).join("")}</div>
  <div class="btnrow" style="margin-top:0"><button class="btn sm" id="pp" ${binderPage?"":"disabled"} style="flex:1">‹ Prev</button><button class="btn sm" id="np" ${binderPage<pages-1?"":"disabled"} style="flex:1">Next ›</button></div>
  <div class="h">Sets in this colour</div>
  <div class="lst">${Object.entries(entries.reduce((m,e)=>(m[e.set]=(m[e.set]||0)+e.copies.length,m),{})).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<button class="row setrow" data-set="${s}" style="min-height:44px"><div class="tx"><div class="n">${esc(setName(s))} <span class="mono mu" style="font-weight:400">${s.toUpperCase()}</span></div></div><span class="q own">${n}</span></button>`).join("")||'<div class="empty">No cards in this colour yet.</div>'}</div>`;
  el.querySelectorAll("[data-bt]").forEach(b=>b.onclick=()=>{binderTab=b.dataset.bt;binderPage=0;rBinder();});
  el.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>go("card",{id:b.dataset.card}));
  $("#pp").onclick=()=>{binderPage--;rBinder();};$("#np").onclick=()=>{binderPage++;rBinder();};
  let x0=null;const g=$("#bgrid");
  g.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
  g.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(dx<-50&&binderPage<pages-1){binderPage++;rBinder();}else if(dx>50&&binderPage>0){binderPage--;rBinder();}},{passive:true});
  el.querySelectorAll(".setrow").forEach(b=>b.onclick=()=>go("checklist",{kind:"set",code:b.dataset.set}));
}

/* ========================= CHECKLIST ========================= */
let clState={chip:"all",rarity:null,group:"has",cols:3,sort:null,listMode:null};
function milestone(cl){
  if(cl.kind!=="set"||!cl.total)return "";const parts=[];
  const names={4:"mythics",3:"rares",2:"uncommons",1:"commons"};
  for(const r of [4,3,2,1]){const [o,t]=cl.byR[r]||[0,0];if(t&&o<t&&t-o<=5&&o>0){parts.push(`${t-o} more to finish the ${names[r]}`);break;}}
  const pct=cl.owned/cl.total;for(const m of [.25,.5,.75,1]){if(pct<m){const need=Math.ceil(m*cl.total)-cl.owned;if(need>0)parts.push(`${need} more to ${Math.round(m*100)}%`);break;}}
  if(cl.owned===cl.total)return "Complete.";
  return parts.join(" · ");
}
function rChecklist(){
  const el=$("#v-checklist");
  const {kind,code}=curArg;const cl=kind==="set"?setChecklist(code):typeChecklist(code);
  if(!cl){back();return;}
  if(kind==="set")touch(code);
  const st=clState;const listMode=st.listMode!=null?st.listMode:kind==="type";
  if(kind==="type"&&st.autoGroupFor!==code){st.autoGroupFor=code;st.group=(cl.total<=2&&cl.makes.length>cl.total)?"makes":"has";st.chip="all";st.rarity=null;}
  if(kind==="set"&&st.autoGroupFor!==code){st.autoGroupFor=code;st.chip="all";st.rarity=null;st.group="has";}
  const pool=kind==="type"&&st.group==="makes"?cl.makes:kind==="type"&&st.group==="changelings"?cl.changelings:cl.slots;
  let items=st.chip==="missing"?pool.filter(x=>!x.owned):st.chip==="owned"?pool.filter(x=>x.owned):st.chip==="variants"?cl.variants:pool;
  if(st.rarity&&kind==="set")items=items.filter(x=>x.print.rarity===st.rarity);
  const sort=st.sort||(kind==="set"?"number":"name");
  items=[...items];
  if(sort==="name")items.sort((a,b)=>a.card.name.localeCompare(b.card.name));
  else if(sort==="price")items.sort((a,b)=>(priceOf(b.print)||0)-(priceOf(a.print)||0));
  else if(sort==="rarity")items.sort((a,b)=>(b.print.rarity-a.print.rarity)||((a.print.n||0)-(b.print.n||0)));
  const pct=cl.total?Math.round(100*cl.owned/cl.total):0;
  const sub=kind==="set"?`${cl.code.toUpperCase()} · ${cl.year}`:`${cl.total} card${cl.total===1?"":"s"} with the type${cl.makes.length?` · ${cl.makes.length} that make them`:""}`;
  const chips=kind==="set"?[["all","All",cl.total],["missing","Missing",cl.missing],["owned","Owned",cl.owned],["variants","Variants",cl.variants.length]]:[["all","All",pool.length],["missing","Missing",pool.filter(x=>!x.owned).length],["owned","Owned",pool.filter(x=>x.owned).length]];
  const rar=kind==="set"?`<div class="chips rail" style="margin-top:6px">${[1,2,3,4].map(r=>{const [o,t]=cl.byR[r];return t?`<button class="chip ${st.rarity===r?"on":""}" data-rar="${r}">${RARITY[r][0].toUpperCase()} <span class="mono cnt">${o}/${t}</span></button>`:""}).join("")}<span class="chipgap"></span><button class="chip" id="sortc">Sort: ${sort}</button><button class="chip" id="viewc">${listMode?"Grid":"List"}</button></div>`
    :`<div class="chips rail" style="margin-top:6px"><button class="chip ${st.group==="has"?"on":""}" data-grp="has">Has the type <span class="mono cnt">${cl.total}</span></button>${cl.makes.length?`<button class="chip ${st.group==="makes"?"on":""}" data-grp="makes">Makes them <span class="mono cnt">${cl.makes.length}</span></button>`:""}${cl.changelings.length?`<button class="chip ${st.group==="changelings"?"on":""}" data-grp="changelings">Changelings <span class="mono cnt">${cl.changelings.length}</span></button>`:""}<span class="chipgap"></span><button class="chip" id="sortc">Sort: ${sort}</button><button class="chip" id="viewc">${listMode?"Grid":"List"}</button></div>`;
  const ms=milestone(cl);
  const cell=x=>{const own=x.owned;const v=priceOf(x.print);return `<button class="slot ${own?"own":"miss"}" data-card="${esc(x.card.id)}" data-set="${x.print.set}" data-num="${esc(x.print.num)}" aria-label="${esc(x.card.name)} ${pr(x.print)}${own?", "+own+" owned":", missing"}">${thumb(x.card,"md","",x.print)}${own?`<span class="cnt mono">×${own}</span>`:'<span class="addq" aria-hidden="true">+</span>'}<span class="under"><span class="num mono">${esc(String(x.print.num))}</span>${v!=null?`<span class="pr mono">${fmt(v)}</span>`:""}</span></button>`;};
  const rowi=x=>{const own=x.owned;const v=priceOf(x.print);return `<div class="row ${own?"":"dim"}" style="min-height:52px"><button class="rowbtn" data-card="${esc(x.card.id)}">${stripe(x.card)}${thumb(x.card,"sm","",x.print)}<div class="tx"><div class="n">${esc(x.card.name)}</div><div class="d">${pr(x.print)} · ${RARITY[x.print.rarity]||""}${v!=null?` · <span class="mono" style="color:var(--fg)">${fmt(v)}</span>`:""}${kind==="type"&&x.card.prints.length>1?` · ${x.card.prints.length} printings`:""}</div></div></button>${own?`<span class="q own">×${own}</span>`:`<button class="plus" data-add="${esc(x.card.id)}|${x.print.set}|${esc(x.print.num)}" aria-label="Add ${esc(x.card.name)}">+</button>`}</div>`;};
  el.innerHTML=`<div class="top"><button class="back" id="bk">‹ ${stack.length?(DEST[stack[stack.length-1].view]||{label:"Back"}).label:(kind==="set"?"Sets":"Types")}</button><span class="mu" style="font-size:12px">${esc(sub)}</span></div>
  <h2 class="title">${esc(cl.name)}</h2>
  <div class="bignum"><span class="mono">${cl.owned}</span><span class="mu">of ${cl.total}</span><span class="mu mono" style="margin-left:auto">${pct}%</span></div>
  <div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div>
  <div class="mu" style="font-size:12px;margin-top:6px">${cl.known?`worth ${fmt(cl.value)}${cl.known<cl.owned?" (partial)":""} · `:""}${cl.missing} missing${kind==="set"&&cl.vOwned?` · ${cl.vOwned} of ${cl.variants.length} variants`:""}${kind==="type"&&cl.mOwned?` · ${cl.mOwned} maker${cl.mOwned>1?"s":""} owned`:""}${kind==="type"&&cl.cOwned?` · ${cl.cOwned} changeling${cl.cOwned>1?"s":""} owned`:""}</div>
  ${ms?`<div class="mu" style="font-size:12px;margin-top:2px">${esc(ms)}</div>`:""}
  <div class="chips rail" style="margin-top:12px">${chips.map(([k,l,n])=>`<button class="chip ${st.chip===k?"on":""}" data-chip="${k}">${l} <span class="mono cnt">${n}</span></button>`).join("")}</div>
  ${rar}
  ${items.length?(listMode?`<div class="lst" style="margin-top:8px">${items.map(rowi).join("")}</div>`:`<div class="slots cols${st.cols}" id="slots" style="margin-top:10px">${items.map(cell).join("")}</div>`):'<div class="empty">Nothing here with these filters.</div>'}`;
  $("#bk").onclick=()=>{if(stack.length)back();else go(kind==="set"?"sets":"types");};
  el.querySelectorAll("[data-chip]").forEach(b=>b.onclick=()=>{st.chip=b.dataset.chip;rChecklist();});
  el.querySelectorAll("[data-rar]").forEach(b=>b.onclick=()=>{st.rarity=st.rarity===+b.dataset.rar?null:+b.dataset.rar;rChecklist();});
  el.querySelectorAll("[data-grp]").forEach(b=>b.onclick=()=>{st.group=b.dataset.grp;rChecklist();});
  $("#sortc").onclick=()=>{const order=kind==="set"?["number","name","price","rarity"]:["name","price","rarity"];st.sort=order[(order.indexOf(sort)+1)%order.length];rChecklist();};
  $("#viewc").onclick=()=>{st.listMode=!listMode;rChecklist();};
  el.querySelectorAll(".slot").forEach(b=>{b.onclick=e=>{if(e.target.closest(".addq")){quickAdd(b.dataset.card,b.dataset.set,b.dataset.num);return;}go("card",{id:b.dataset.card});};});
  el.querySelectorAll(".rowbtn").forEach(b=>b.onclick=()=>go("card",{id:b.dataset.card}));
  el.querySelectorAll(".plus").forEach(b=>b.onclick=()=>{const [id,set,num]=b.dataset.add.split("|");quickAdd(id,set,num);});
  // pinch to change columns
  const g=$("#slots");if(g){let d0=null;g.addEventListener("touchstart",e=>{if(e.touches.length===2)d0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
    g.addEventListener("touchmove",e=>{if(e.touches.length===2&&d0){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(d<d0*.8&&st.cols<6){st.cols++;d0=d;rChecklist();}else if(d>d0*1.25&&st.cols>3){st.cols--;d0=d;rChecklist();}}},{passive:true});}
  wantPrices(items.slice(0,PRICE_BATCH).map(x=>x.print));
}
function quickAdd(id,set,num){const card=BY_ID[id];if(!card)return;addCopy(S.col,id,set,num,{cond:"NM",foil:false,via:"typed",date:today()});invalidateStats();save();rChecklist();
  toast(`${card.name} · ${set.toUpperCase()} ${num} · now ×${ownedPrint(id,set,num)}`,()=>{const k=pk(id,set,num);removeLastCopy(k);invalidateStats();save();if(view==="checklist")rChecklist();});}

/* ========================= DECKS ========================= */
function parseDeck(text){
  return text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!/^(\/\/|#|sideboard|deck|commander|about|name )/i.test(l)).map(l=>{
    let m=l.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\(([A-Z0-9]{3,5})\)\s*(\S+)?)?\s*$/i);
    let qty=1,name=l,set=null;
    if(m){qty=+m[1];name=m[2];set=m[3]?m[3].toLowerCase():null;}
    name=name.replace(/\s*\/\/.*$/,"").trim();
    const card=BY_LOWER[name.toLowerCase()]||INDEX.find(x=>x.lower.startsWith(name.toLowerCase()+" //"));
    return {qty,name:card?card.name:name,cardId:card?card.id:null,set};
  });
}
function deckStats(d){let need=0,have=0;for(const l of d.lines){need+=l.qty;have+=Math.min(l.qty,l.cardId?ownedOf(l.cardId):0);}return {need,have};}
function rDecks(){
  const el=$("#v-decks");
  el.innerHTML=`<div class="top"><h1>Decks</h1><button class="btn sm pri" id="paste">Paste list</button></div>
  <div class="lst">${S.decks.length?"":'<div class="empty">No decks yet. Paste a list from Arena, Moxfield or a text file and Binder checks every line against what you own.</div>'}${S.decks.map(d=>{const s=deckStats(d);return `<button class="row" data-deck="${d.id}"><div class="tx"><div class="n">${esc(d.name)}</div><div class="d"><span>${esc(d.format)}</span><span>${s.need} cards</span></div><div class="bar"><i style="width:${s.need?100*s.have/s.need:0}%"></i></div></div><div class="frac ${s.have===s.need?"ok":"wn"}"><b>${s.have}</b><span>/ ${s.need}</span></div></button>`;}).join("")}</div>
  <div id="pastebox" hidden style="margin-top:12px">
    <div class="in" style="margin-bottom:8px"><input id="dname" placeholder="Deck name"></div>
    <textarea id="dtext" placeholder="1 Goblin Chieftain (MH2) 127&#10;1x Lightning Bolt&#10;Sol Ring"></textarea>
    <div class="note">Arena, Moxfield and plain lines all parse. Unknown names stay as text and count as missing.</div>
    <div class="btnrow"><button class="btn ghost" id="pcancel">Cancel</button><button class="btn pri" id="psave">Check against collection</button></div>
  </div>`;
  el.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>go("deck",{id:b.dataset.deck}));
  $("#paste").onclick=()=>{$("#pastebox").hidden=false;$("#dtext").focus();};
  $("#pcancel").onclick=()=>{$("#pastebox").hidden=true;};
  $("#psave").onclick=()=>{const text=$("#dtext").value;if(!text.trim())return;const d={id:"d"+Date.now(),name:$("#dname").value.trim()||"Pasted list",format:"Pasted",lines:parseDeck(text),updatedAt:Date.now()};S.decks.unshift(d);save();go("deck",{id:d.id});};
}
function rDeck(){
  const d=S.decks.find(x=>x.id===curArg.id);if(!d){go("decks");return;}
  const el=$("#v-deck");const s=deckStats(d);
  const groups={};for(const l of d.lines){const card=l.cardId?BY_ID[l.cardId]:null;const g=card?(card.types.includes("Land")?"Lands":card.types.includes("Creature")?"Creatures":card.types[0]==="Sorcery"?"Sorceries":(card.types[0]||"Other")+"s"):"Unknown";(groups[g]=groups[g]||[]).push(l);}
  const order=["Creatures","Instants","Sorceries","Enchantments","Artifacts","Planeswalkers","Battles","Lands","Others","Unknown"];
  el.innerHTML=`<div class="top"><button class="back" id="bk">‹ Decks</button><button class="btn sm" id="del">Delete</button></div>
  <h2 class="title">${esc(d.name)}</h2>
  <div class="mu" style="font-size:13px;margin:4px 0 10px">${esc(d.format)} · <span style="color:${s.have===s.need?"var(--ok)":"var(--wn)"};font-weight:600">${s.have} / ${s.need} owned</span>${s.need-s.have?` · ${s.need-s.have} missing`:""}</div>
  <div class="bar"><i style="width:${s.need?100*s.have/s.need:0}%"></i></div>
  ${order.filter(g=>groups[g]).map(g=>`<div class="h">${g} · ${groups[g].filter(l=>!l.cardId||ownedOf(l.cardId)<l.qty).length} of ${groups[g].length} missing</div>
    <div class="lst">${groups[g].map((l,i)=>({l,i})).sort((a,b)=>{const am=a.l.cardId?ownedOf(a.l.cardId)>=a.l.qty:false,bm=b.l.cardId?ownedOf(b.l.cardId)>=b.l.qty:false;return am-bm;}).map(({l,i})=>{const own=l.cardId?ownedOf(l.cardId):0;const ok=own>=l.qty;const card=l.cardId?BY_ID[l.cardId]:null;return `<button class="deckline ${ok?"ok":""}" data-line="${g}|${i}" ${card?"":"disabled"}><span class="qn">${l.qty}</span>${card?stripe(card,"min-height:26px;width:3px"):'<span class="stripe" style="min-height:26px;width:3px"></span>'}<span class="nm">${esc(l.name)}</span><span class="st">${card?(ok?"✓":own+" / "+l.qty):"not in index"}</span></button>`;}).join("")}</div>`).join("")}
  <div class="btnrow" style="margin-top:auto;padding-top:16px"><button class="btn" id="copymiss">Copy missing</button><button class="btn pri" id="scanfill">Scan to fill</button></div>`;
  $("#bk").onclick=()=>go("decks");
  $("#del").onclick=()=>{const idx=S.decks.indexOf(d);S.decks.splice(idx,1);S.deckTomb[d.id]=Date.now();save();go("decks");toast(`Deleted ${d.name}`,()=>{delete S.deckTomb[d.id];touchDeck(d);S.decks.splice(idx,0,d);save();render();});};
  el.querySelectorAll("[data-line]").forEach(b=>b.onclick=()=>{const [g,i]=b.dataset.line.split("|");const l=groups[g][+i];const own=ownedOf(l.cardId);if(own>=l.qty)go("card",{id:l.cardId});else openSuggestSheet(l,d);});
  $("#copymiss").onclick=()=>{const txt=d.lines.filter(l=>!l.cardId||ownedOf(l.cardId)<l.qty).map(l=>`${l.qty-(l.cardId?Math.min(l.qty,ownedOf(l.cardId)):0)} ${l.name}`).join("\n");copyText(txt,"Missing list copied");};
  $("#scanfill").onclick=()=>go("scan");
}
function openSuggestSheet(line,deck){
  const card=BY_ID[line.cardId];
  const inDeck=new Set(deck.lines.map(l=>l.cardId));
  const seen=new Set();const owned=[];for(const e of Object.values(S.col)){if(seen.has(e.id)||e.id===card.id||inDeck.has(e.id))continue;seen.add(e.id);owned.push(BY_ID[e.id]);}
  const t1=card.types[0];
  const score=x=>{let s=0;if(x.types[0]===t1)s+=2;for(const k of card.kw)if(x.kw.includes(k))s+=3;for(const st of card.sub)if(x.sub.includes(st))s+=2;if(card.ci.every(c=>x.ci.includes(c)))s+=1;if(x.ci.some(c=>!card.ci.includes(c)))s-=4;return s;};
  const sugg=owned.map(x=>({x,s:score(x),why:[...card.kw.filter(k=>x.kw.includes(k)),...card.sub.filter(st=>x.sub.includes(st)),x.types[0]===t1?"same type":null].filter(Boolean)})).filter(o=>o.s>1).sort((a,b)=>b.s-a.s).slice(0,4);
  $("#sheet").innerHTML=`<div class="grab"></div>
  <div class="mu" style="font-size:12px">Missing</div><div style="font-weight:700;font-size:18px">${esc(card.name)}</div><div class="mu" style="font-size:12px;display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap">${pips(card.cost)} ${esc(card.type)}${card.kw.length?" · "+card.kw.join(", "):""}</div>
  <div class="h">From your collection</div>
  <div class="lst">${sugg.length?sugg.map(o=>`<button class="row" data-swap="${esc(o.x.id)}" style="min-height:52px">${stripe(o.x)}${thumb(o.x,"sm")}<div class="tx"><div class="n">${esc(o.x.name)}</div><div class="d">${esc(o.why.join(" · "))}</div></div><span class="q own">×${ownedOf(o.x.id)}</span></button>`).join(""):'<div class="empty">Nothing you own shares its role and colours.</div>'}</div>
  <div class="note">Matched on type, subtypes and keywords only, offline. No price or metagame data involved.</div>
  <div class="btnrow"><button class="btn ghost" id="keep">Keep missing</button><button class="btn pri" id="addit">Add ${esc(card.name)}</button></div>`;
  $("#sheet").querySelectorAll("[data-swap]").forEach(b=>b.onclick=()=>{const sub=BY_ID[b.dataset.swap];line.name=sub.name;line.cardId=sub.id;touchDeck(deck);save();closeSheet();render();toast(`Swapped in ${sub.name}`);});
  $("#keep").onclick=closeSheet;
  $("#addit").onclick=()=>{closeSheet();openAddSheet(card);};
  openSheet();
}

/* ========================= IMPORT / EXPORT / BACKUP ========================= */
function csvQuote(v){v=String(v==null?"":v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function exportCSV(){
  const rows=[["Count","Name","Edition","Collector Number","Foil","Condition","Scryfall ID"]];
  for(const e of Object.values(S.col)){const card=BY_ID[e.id];const p=card.prints.find(x=>x.set===e.set&&x.num===e.num)||{};
    const groups={};for(const cp of e.copies){const k=(cp.foil?"foil":"")+"|"+(cp.cond||"NM");groups[k]=(groups[k]||0)+1;}
    for(const k in groups){const [f,cond]=k.split("|");rows.push([groups[k],card.name,e.set.toUpperCase(),e.num,f?"foil":"",cond,p.sid?dashed(p.sid):""]);}}
  return rows.map(r=>r.map(csvQuote).join(",")).join("\n");
}
function exportList(){
  const lines=[];for(const e of Object.values(S.col)){const card=BY_ID[e.id];const nf=e.copies.filter(c=>!c.foil).length,f=e.copies.length-nf;
    if(nf)lines.push(`${nf} ${card.name} (${e.set.toUpperCase()}) ${e.num}`);if(f)lines.push(`${f} ${card.name} (${e.set.toUpperCase()}) ${e.num} *F*`);}
  return lines.join("\n");
}
function downloadText(name,text,type){
  try{const blob=new Blob([text],{type:type||"text/plain"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Downloading "+name);}
  catch(e){copyText(text,"Download blocked here; copied instead");}
}
/* Minimal CSV parser: quotes, escaped quotes, CRLF. */
function parseCSV(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
    else if(ch==='"')q=true;else if(ch===","){row.push(cell);cell="";}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell="";}
    else cell+=ch;}
  if(cell.length||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>c.trim()!==""));
}
const COLS={
  name:["name","card name","card","product name","cardname"],
  set:["set code","set","edition code","edition","setcode","set_code","expansion code"],
  setname:["set name","expansion","edition name","setname"],
  num:["collector number","collector's number","collectors number","number","card number","collectornumber","collector_number","cn"],
  foil:["foil","finish","printing","foil/etched","is_foil","variant"],
  qty:["quantity","qty","count","quantityx","total quantity","amount","q"],
  id:["scryfall id","scryfall_id","scryfallid","id","scryfall"],
  cond:["condition","cond"]
};
function colIndex(header,key){const h=header.map(x=>x.trim().toLowerCase());for(const n of COLS[key]){const i=h.indexOf(n);if(i>-1)return i;}return -1;}
function isFoilValue(v){v=String(v||"").trim().toLowerCase();return ["foil","true","yes","y","1","etched","foil etched","*f*"].includes(v)||/foil/.test(v)&&!/non/.test(v);}
function normCond(v){v=String(v||"").trim().toUpperCase();const m={"NEAR MINT":"NM","NM":"NM","MINT":"NM","M":"NM","LIGHTLY PLAYED":"LP","LP":"LP","EXCELLENT":"LP","EX":"LP","GOOD":"LP","MODERATELY PLAYED":"MP","MP":"MP","PLAYED":"MP","PL":"MP","HEAVILY PLAYED":"HP","HP":"HP","POOR":"HP","DAMAGED":"HP","D":"HP"};return m[v]||(["NM","LP","MP","HP"].includes(v)?v:"NM");}
let BY_SID=null;
function findBySid(sid){if(!BY_SID){BY_SID=new Map();for(const c of INDEX)for(const p of c.prints)if(p.sid)BY_SID.set(p.sid,{card:c,print:p});}return BY_SID.get(String(sid).replace(/-/g,"").toLowerCase())||null;}
const normSet=n=>String(n||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
function setCodeFromName(name){const n=normSet(name);if(!n)return null;for(const code in SETS)if(normSet(SETS[code][0])===n)return code;const alt=n.replace(/\bii\b/,"2").replace(/\biii\b/,"3");for(const code in SETS)if(normSet(SETS[code][0]).replace(/\bii\b/,"2").replace(/\biii\b/,"3")===alt)return code;return null;}
/* Resolve one imported line to a printing. Order: Scryfall id, name+set+number, name+set, name. */
function resolveLine(l){
  if(l.id){const hit=findBySid(l.id);if(hit)return {card:hit.card,print:hit.print,how:"id"};}
  const nm=String(l.name||"").replace(/\s*\/\/.*$/,"").trim().toLowerCase();if(!nm)return null;
  const card=BY_LOWER[nm]||INDEX.find(x=>x.lower.startsWith(nm+" //"));if(!card)return null;
  let set=(l.set||"").trim().toLowerCase();if(!set&&l.setname)set=setCodeFromName(l.setname)||"";
  const num=String(l.num||"").trim().replace(/^0+(?=\d)/,"");
  if(set&&num){const p=card.prints.find(x=>x.set===set&&String(x.num).replace(/^0+(?=\d)/,"")===num);if(p)return {card,print:p,how:"set+number"};}
  if(set){const ps=card.prints.filter(x=>x.set===set).sort((a,b)=>parseInt(a.num,10)-parseInt(b.num,10));if(ps.length)return {card,print:ps[0],how:"set"};}
  return {card,print:defaultPrint(card),how:"name"};
}
function parseImport(text){
  const lines=[];const rows=parseCSV(text);
  const header=rows[0]||[];const iName=colIndex(header,"name");
  if(rows.length>1&&iName>-1){
    const ix={set:colIndex(header,"set"),setname:colIndex(header,"setname"),num:colIndex(header,"num"),foil:colIndex(header,"foil"),qty:colIndex(header,"qty"),id:colIndex(header,"id"),cond:colIndex(header,"cond")};
    for(const r of rows.slice(1)){const g=i=>i>-1?r[i]:"";lines.push({name:g(iName),set:g(ix.set),setname:g(ix.setname),num:g(ix.num),foil:isFoilValue(g(ix.foil)),qty:Math.max(1,parseInt(String(g(ix.qty)).replace(/[^0-9]/g,""),10)||1),id:g(ix.id),cond:normCond(g(ix.cond))});}
    return {lines,kind:"csv"};
  }
  for(const l of text.split(/\r?\n/)){const t=l.trim();if(!t||/^(\/\/|#|sideboard|deck|commander|about|name )/i.test(t))continue;
    const m=t.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)\s*([^\s*]+)?)?\s*(\*F\*)?\s*$/);
    if(m)lines.push({name:m[2],set:(m[3]||"").toLowerCase(),num:m[4]||"",foil:!!m[5],qty:+m[1],cond:"NM"});else lines.push({name:t,qty:1,cond:"NM",foil:false});}
  return {lines,kind:"list"};
}
async function importFile(file){
  const text=await file.text();const {lines,kind}=parseImport(text);
  const ok=[],miss=[];for(const l of lines){const r=resolveLine(l);if(r)ok.push({l,r});else miss.push(l);}
  const copies=ok.reduce((n,x)=>n+x.l.qty,0);const byHow={};for(const x of ok)byHow[x.r.how]=(byHow[x.r.how]||0)+1;
  $("#sheet").innerHTML=`<div class="grab"></div>
  <div style="font-weight:700;font-size:17px">Import ${esc(file.name)}</div>
  <div class="mu" style="font-size:12.5px;margin-top:2px">${kind==="csv"?"CSV":"Decklist"} · ${lines.length} lines · ${copies} copies matched${miss.length?` · <span style="color:var(--wn)">${miss.length} not matched</span>`:""}</div>
  <div class="h">How printings were matched</div>
  <div class="sect" style="font-size:12.5px;line-height:1.6">${["id","set+number","set","name"].filter(k=>byHow[k]).map(k=>`${byHow[k]} by ${k==="id"?"Scryfall id":k==="set+number"?"set and collector number":k==="set"?"set only (lowest number in the set)":"name only (newest booster printing)"}`).join("<br>")||"nothing matched"}</div>
  ${miss.length?`<div class="h">Not in the index</div><div class="lst">${miss.slice(0,8).map(l=>`<div class="row" style="min-height:36px"><div class="tx"><div class="n" style="font-weight:500">${esc(l.name||"(blank)")}</div></div><span class="q">${l.qty}</span></div>`).join("")}${miss.length>8?`<div class="note">and ${miss.length-8} more</div>`:""}</div>`:""}
  <div class="h">Preview</div>
  <div class="lst">${ok.slice(0,6).map(({l,r})=>`<div class="row" style="min-height:44px">${stripe(r.card)}${thumb(r.card,"sm","",r.print)}<div class="tx"><div class="n">${esc(r.card.name)}</div><div class="d">${pr(r.print)} · ${l.foil?"foil · ":""}${l.cond}</div></div><span class="q own">×${l.qty}</span></div>`).join("")}${ok.length>6?`<div class="note">and ${ok.length-6} more lines</div>`:""}</div>
  <div class="btnrow"><button class="btn ghost" id="impcancel">Cancel</button><button class="btn pri" id="impok" ${ok.length?"":"disabled"}>Add ${copies} cop${copies===1?"y":"ies"}</button></div>`;
  $("#impcancel").onclick=closeSheet;
  $("#impok").onclick=()=>{const d=today();for(const {l,r} of ok)for(let i=0;i<l.qty;i++)addCopy(S.col,r.card.id,r.print.set,r.print.num,{cond:l.cond,foil:l.foil,via:"import",date:d});save();closeSheet();wantOwnedPrices();render();toast(`Imported ${copies} copies from ${file.name}`);};
  openSheet();
}
async function restoreBackup(file){
  let data=null;try{data=JSON.parse(await file.text());}catch(e){toast("That file isn't a Binder backup");return;}
  const st=data&&data.state;if(!st||typeof st!=="object"||!st.col){toast("That file isn't a Binder backup");return;}
  const n=Object.values(st.col).reduce((a,e)=>a+(e.copies?e.copies.length:0),0);
  $("#sheet").innerHTML=`<div class="grab"></div><div style="font-weight:700;font-size:17px">Restore ${esc(file.name)}?</div>
  <div class="mu" style="font-size:12.5px;margin-top:4px">Backup from ${esc(data.at||"unknown date")} · ${n} cards · ${(st.decks||[]).length} decks. This replaces the ${totalOwned()} cards and ${S.decks.length} decks here now.</div>
  <div class="btnrow"><button class="btn ghost" id="rbcancel">Cancel</button><button class="btn pri" id="rbok">Replace and restore</button></div>`;
  $("#rbcancel").onclick=closeSheet;
  $("#rbok").onclick=()=>{S=Object.assign(empty(),st);invalidateStats();for(const k of Object.keys(S.col))if(!BY_ID[S.col[k].id])delete S.col[k];S.review=(S.review||[]).filter(r=>BY_ID[r.guess]);save();closeSheet();wantOwnedPrices();go("search");toast("Backup restored");};
  openSheet();
}

/* ========================= MORE ========================= */
let confirmReset=false;
function rMore(){
  const el=$("#v-more");
  el.innerHTML=`<div class="top"><h1>Settings</h1></div>
  <div class="h">Colours</div>
  <div class="sect"><div>One colour for actions, one for what you own.</div>${schemeControls()}
    <div class="note" style="margin-top:14px">Appearance</div>
    <div class="chips" style="margin-top:6px">${[["system","Match system"],["dark","Dark"],["light","Light"]].map(([k,l])=>`<button class="chip ${(S.prefs&&S.prefs.appearance||"system")===k?"on":""}" data-appear="${k}" aria-pressed="${(S.prefs&&S.prefs.appearance||"system")===k}">${l}</button>`).join("")}</div></div>
  <div class="h">Google Drive</div>
  ${(()=>{const g=S.prefs.gdrive||{};
    if(!driveConfigured())return `<div class="sect"><div>Sync across devices</div><div class="note" style="margin-top:2px">Not set up on this install. A Google OAuth client ID in <span class="mono">js/binder.js</span> turns it on; your collection then lives as one file in your own Drive.</div></div>`;
    if(!g.on)return `<div class="sect"><div>Keep your collection the same on every device you sign into.</div><div class="note" style="margin-top:2px">Stored as one file in your own Google Drive, in a folder called Binder. Binder can only see files it created. Changes merge: nothing you add on one phone overwrites another.</div>
      <button class="btn pri" id="gdon" style="margin-top:10px">Sync with Google Drive</button></div>`;
    return `<div class="sect"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div>Google Drive</div><div class="note" style="margin-top:2px">${esc(syncStatusLine())}</div></div>${sync.needAuth?'<button class="btn sm pri" id="gdsignin">Sign in</button>':`<button class="btn sm" id="gdsync" ${sync.busy?"disabled":""}>Sync now</button>`}</div>
      <div class="btnrow" style="margin-top:10px">${g.link?`<a class="btn" href="${esc(g.link)}" target="_blank" rel="noopener">Open in Drive</a>`:""}<button class="btn ghost" id="gdoff">Turn off</button></div></div>`;})()}
  <div class="h">Bottom bar</div>
  <div class="sect"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div>${pins().map(k=>DEST[k].label).join(" · ")}</div><div class="note" style="margin-top:2px">${(()=>{const m=ARCHETYPES.find(a=>a.pins.join()===pins().join());return m?"Preset: "+m.name:"Custom";})()}. The first one is your home screen.</div></div><button class="btn sm" id="editbar">Edit</button></div></div>
  <div class="sect"><div style="display:flex;justify-content:space-between"><span>Collection</span><span class="mono">${totalOwned()} cards</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Printings</span><span class="mono">${Object.keys(S.col).length}</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Index</span><span class="mono">${INDEX.length.toLocaleString()} cards · ${Object.keys(SETS).length} sets</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Index built</span><span class="mono">2026-10-17</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>OCR engine</span><span class="mono" id="ocrstate">${ocrState==="ready"?"ready":ocrState==="failed"?"unavailable":ocrState==="loading"?"starting…":"starts on first scan"}</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Auto-accept threshold</span><span class="mono">${THRESHOLD}%</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>App version</span><span class="mono">${APP_VERSION}</span></div></div>
  <div class="btnrow" style="margin-top:10px"><button class="btn" id="checkupd">Check for updates</button><button class="btn" id="clearcache">Reset app cache</button></div>
  <div class="note">Reset re-downloads the app, index and OCR engine on next load. Your collection stays.</div>
  ${ocrState==="idle"?'<button class="btn" id="warm" style="margin-top:10px">Start OCR engine now</button>':""}
  ${ocrState==="failed"?`<div class="sect warn" style="margin-top:10px;font-size:12.5px">${esc(ocrErr)}</div>`:""}
  <div class="sect" style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div>Scanner diagnostics</div><div class="note" style="margin-top:2px">Shows motion, sharpness and stillness under the live hint. Useful when auto mode won't fire.</div></div><button class="chip ${S.prefs&&S.prefs.diag?"on":""}" id="diagtoggle" role="switch" aria-checked="${!!(S.prefs&&S.prefs.diag)}">${S.prefs&&S.prefs.diag?"On":"Off"}</button></div></div>
  <div class="h">Collection value</div>
  <div class="sect">${(()=>{const v=collectionValue();const h=S.hist||[];return `<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:26px;font-weight:700" class="mono">${v.known?fmt(v.total):"—"}</span><span class="mu" style="font-size:12px">${v.known?`${v.known} of ${v.of} copies priced`:(v.of?"no prices yet":"no cards yet")}</span></div>
    ${h.length>1?sparkline(h):'<div class="note">A point is added each day the collection is fully priced; the line appears after the second day.</div>'}
    <div class="mu" style="font-size:12px;margin-top:10px">Prices from Scryfall (TCGplayer, Cardmarket) · ${ago(pricesAsOf())}${priceErr?" · "+esc(priceErr):""}</div><div class="chips"><button class="chip ${currency()==="usd"?"on":""}" data-cur="usd">USD · TCGplayer</button><button class="chip ${currency()==="eur"?"on":""}" data-cur="eur">EUR · Cardmarket</button></div>`;})()}</div>
  <button class="btn" id="refreshp" style="margin-top:10px" ${priceBusy?"disabled":""}>${priceBusy?"Fetching prices…":"Refresh prices now"}</button>
  <div class="h">Card images</div>
  <div class="sect"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div>Show card art</div><div class="note" style="margin-top:2px">Loaded from Scryfall as you browse; cards you've viewed stay cached for offline use.</div></div><button class="chip ${imagesOn()?"on":""}" id="imgtoggle" role="switch" aria-checked="${imagesOn()}">${imagesOn()?"On":"Off"}</button></div></div>
  <div class="h">Import</div>
  <label class="btn"><input type="file" id="impfile" accept=".csv,.txt,text/csv,text/plain">Import a CSV or decklist file</label>
  <div class="note">ManaBox, Delver Lens, TCGplayer, Dragon Shield, Moxfield and Archidekt exports all work: Binder reads name, set code, collector number, foil, quantity and Scryfall id from whichever columns are there, and shows what matched before adding anything.</div>
  <div class="h">Export</div>
  <div class="btnrow" style="margin-top:0"><button class="btn" id="csvdl">Download CSV</button><button class="btn" id="csv">Copy CSV</button></div>
  <button class="btn" id="moxtxt" style="margin-top:8px">Copy as Moxfield list</button>
  <div class="note">CSV has one row per printing and finish with the Scryfall id, so Moxfield, Archidekt, MythicHub and Deckbox import it directly. The list form is <span class="mono">1 Lightning Bolt (CLB) 187 *F*</span>.</div>
  <div class="h">Backup</div>
  <div class="btnrow" style="margin-top:0"><button class="btn" id="bkdl">Download backup</button><label class="btn"><input type="file" id="bkfile" accept=".json,application/json">Restore backup</label></div>
  <div class="note">A JSON file with the collection, decks, review queue and settings. Restoring replaces what's here.</div>
  <div class="h">Data</div>
  <div class="note" style="margin-top:0">The collection lives in this browser's local storage. The card index (magic-search-engine build of 2026-10-17, every printing through the latest sets) and the OCR engine (Tesseract.js 5, English LSTM model) are cached by the service worker after first use, so the whole app works offline; card art is the one thing fetched on demand. Add it to your home screen for a full-screen install.</div>
  <div class="btnrow" style="margin-top:10px"><button class="btn" id="demo">Load demo collection</button><button class="btn" id="reset">Clear everything</button></div>`;
  $("#csv").onclick=()=>copyText(exportCSV(),"CSV copied");
  $("#csvdl").onclick=()=>downloadText("binder-collection-"+today()+".csv",exportCSV(),"text/csv");
  $("#moxtxt").onclick=()=>copyText(exportList(),"List copied");
  $("#bkdl").onclick=()=>downloadText("binder-backup-"+today()+".json",JSON.stringify({app:"binder",version:APP_VERSION,at:new Date().toISOString(),state:S},null,1),"application/json");
  $("#bkfile").onchange=e=>{const f=e.target.files[0];if(f)restoreBackup(f);e.target.value="";};
  $("#impfile").onchange=e=>{const f=e.target.files[0];if(f)importFile(f);e.target.value="";};
  $("#demo").onclick=()=>{S=seed();save();lastImg=null;go("search");toast("Demo collection loaded");};
  $("#reset").onclick=()=>{if(!confirmReset){confirmReset=true;$("#reset").textContent="Tap again to clear";setTimeout(()=>{confirmReset=false;const b=$("#reset");if(b)b.textContent="Clear everything";},4000);return;}confirmReset=false;S=empty();save();lastImg=null;go("search");toast("Collection cleared");};
  $("#checkupd").onclick=async()=>{const b=$("#checkupd");b.disabled=true;b.textContent="Checking…";try{if(swReg)await swReg.update();}catch(e){}setTimeout(()=>{if(document.contains(b)){b.disabled=false;b.textContent="Check for updates";toast("You're on the latest version");}},2500);};
  el.querySelectorAll("[data-cur]").forEach(b=>b.onclick=()=>{S.prefs=S.prefs||{};S.prefs.currency=b.dataset.cur;save();snapshotValue();rMore();});
  $("#refreshp").onclick=()=>{for(const k in (S.prices||{}))S.prices[k].at=0;wantOwnedPrices();rMore();};
  $("#clearcache").onclick=async()=>{const b=$("#clearcache");b.disabled=true;b.textContent="Resetting…";try{if("serviceWorker" in navigator){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));}if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));}}catch(e){}location.reload();};
  $("#editbar").onclick=openPinEditor;
  $("#imgtoggle").onclick=()=>{S.prefs=S.prefs||{};S.prefs.images=!imagesOn();save();rMore();};
  wireSchemeControls(el,()=>rMore());
  const gon=$("#gdon");if(gon)gon.onclick=()=>{gon.disabled=true;gon.textContent="Opening Google…";connectDrive().finally(()=>{if(view==="more")rMore();});};
  const gsy=$("#gdsync");if(gsy)gsy.onclick=()=>{rMore();syncNow("manual").then(r=>{if(r&&!r.added&&!r.removed)toast("Up to date");if(view==="more")rMore();});};
  const gsi=$("#gdsignin");if(gsi)gsi.onclick=()=>{signIn().then(()=>{sync.needAuth=false;rMore();syncNow("signin");}).catch(e=>toast(e.message));};
  const gof=$("#gdoff");if(gof)gof.onclick=disconnectDrive;
  el.querySelectorAll("[data-appear]").forEach(b=>b.onclick=()=>{S.prefs=S.prefs||{};S.prefs.appearance=b.dataset.appear;touchPrefs();save();applyScheme();rMore();});
  const dg=$("#diagtoggle");if(dg)dg.onclick=()=>{S.prefs=S.prefs||{};S.prefs.diag=!S.prefs.diag;save();rMore();};
  const wm=$("#warm");if(wm)wm.onclick=async()=>{wm.disabled=true;wm.textContent="Starting…";await getOCR();rMore();toast(ocrState==="ready"?"OCR ready":"OCR couldn't start");};
}
function copyText(txt,msg){
  const done=()=>toast(msg);
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done).catch(()=>fallback());}else fallback();
  function fallback(){const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done();}catch(e){toast("Select and copy manually");ta.style.left="16px";ta.style.top="16px";ta.style.zIndex="40";setTimeout(()=>ta.remove(),8000);return;}ta.remove();}
}

/* ========================= BOOT ========================= */
/* ========================= SYNC · Google Drive ========================= */
/* One file in the user's own Drive (scope drive.file: the app sees only files it created). Sync is a
   merge, never an overwrite: union of copies minus tombstones, newest deck wins, newest prefs win, so
   "save", "import" and "sync" are the same operation and there is no conflict to show. Auth is the
   browser OAuth flow with no SDK: a popup (or tab, in an installed app) to Google, back to oauth.html,
   which stores the token and tells this page. Tokens last an hour; background syncs that find one
   expired simply wait for the next user-initiated action. */
const GDRIVE_CLIENT_ID="202525328453-lgbfe18bsoafi3mcata3sf0pj7bhevg9.apps.googleusercontent.com";
const GDRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE=Object.assign({api:"https://www.googleapis.com/drive/v3",upload:"https://www.googleapis.com/upload/drive/v3",auth:"https://accounts.google.com/o/oauth2/v2/auth"},(typeof window!=="undefined"&&window.BINDER_DRIVE)||{});
const SYNC_FILE="collection.json",SYNC_FOLDER="Binder",TOKEN_KEY="binder-gdrive-token";
const sync={busy:false,timer:null,lastHash:null,lastRev:null,err:null,needAuth:false,waiting:null};
function deviceId(){let d=null;try{d=localStorage.getItem("binder-device");if(!d){d=cid();localStorage.setItem("binder-device",d);}}catch(e){d=d||"dev";}return d;}
function driveOn(){return !!(S&&S.prefs&&S.prefs.gdrive&&S.prefs.gdrive.on);}
function driveConfigured(){return !!GDRIVE_CLIENT_ID||!!(typeof window!=="undefined"&&window.BINDER_DRIVE);}
/* --- the document that travels --- */
const SYNC_PREFS=["pins","archetype","scheme","schemeAcc","schemeOwn","appearance","live","sound"];
function syncDoc(st){st=st||S;const prefs={};for(const k of SYNC_PREFS)if(st.prefs&&st.prefs[k]!==undefined)prefs[k]=st.prefs[k];
  return {v:1,at:Date.now(),device:deviceId(),col:st.col,tomb:st.tomb||{},decks:st.decks,deckTomb:st.deckTomb||{},prefs,prefsAt:st.prefsAt||0,hist:st.hist||[]};}
function docHash(doc){const o={col:doc.col,tomb:doc.tomb,decks:doc.decks,deckTomb:doc.deckTomb,prefs:doc.prefs,prefsAt:doc.prefsAt,hist:doc.hist};return fnv(JSON.stringify(o));}
function copyIds(col){const s=new Set();for(const k in col)for(const c of col[k].copies)if(c.id)s.add(c.id);return s;}
/* Merge two documents into a third. Commutative and idempotent. */
function mergeDocs(a,b){
  const tomb={};for(const src of [a.tomb||{},b.tomb||{}])for(const id in src)tomb[id]=Math.max(tomb[id]||0,src[id]);
  const col={};
  for(const src of [a.col||{},b.col||{}])for(const k in src){const e=src[k];if(!e||!e.copies)continue;const t=col[k]||(col[k]={id:e.id,set:e.set,num:e.num,copies:[]});
    for(const c of e.copies){if(!c||!c.id||tomb[c.id])continue;if(!t.copies.some(x=>x.id===c.id))t.copies.push(c);}}
  for(const k in col){if(!col[k].copies.length)delete col[k];else col[k].copies.sort((x,y)=>String(x.date||"").localeCompare(String(y.date||""))||String(x.id).localeCompare(String(y.id)));}
  const deckTomb={};for(const src of [a.deckTomb||{},b.deckTomb||{}])for(const id in src)deckTomb[id]=Math.max(deckTomb[id]||0,src[id]);
  const decks={};for(const src of [a.decks||[],b.decks||[]])for(const d of src){if(!d||!d.id)continue;const cur=decks[d.id];if(!cur||(d.updatedAt||0)>(cur.updatedAt||0))decks[d.id]=d;}
  const deckList=Object.values(decks).filter(d=>!((deckTomb[d.id]||0)>(d.updatedAt||0))).sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0));
  const newerPrefs=(b.prefsAt||0)>(a.prefsAt||0)?b:a;
  const hist={};for(const src of [a.hist||[],b.hist||[]])for(const h of src){if(!h||!h.d)continue;const cur=hist[h.d];if(!cur||(h.k||0)>(cur.k||0))hist[h.d]=h;}
  const histList=Object.values(hist).sort((x,y)=>x.d.localeCompare(y.d)).slice(-730);
  return {v:1,at:Math.max(a.at||0,b.at||0),col,tomb,decks:deckList,deckTomb,prefs:Object.assign({},newerPrefs.prefs||{}),prefsAt:newerPrefs.prefsAt||0,hist:histList};
}
/* Write a merged document into S. Returns what changed for the toast. */
function applyDoc(doc){
  const before=copyIds(S.col);
  S.col={};for(const k in doc.col){const e=doc.col[k];if(!BY_ID[e.id])continue;S.col[k]={id:e.id,set:e.set,num:e.num,copies:e.copies.slice()};}
  S.tomb=doc.tomb||{};S.decks=doc.decks||[];S.deckTomb=doc.deckTomb||{};S.hist=doc.hist||[];
  if((doc.prefsAt||0)>=(S.prefsAt||0)){for(const k of SYNC_PREFS)if(doc.prefs&&doc.prefs[k]!==undefined)S.prefs[k]=doc.prefs[k];S.prefsAt=doc.prefsAt||0;}
  const after=copyIds(S.col);let added=0,removed=0;for(const id of after)if(!before.has(id))added++;for(const id of before)if(!after.has(id))removed++;
  invalidateStats();if(typeof live!=="undefined"){live.on=S.prefs.live!==false;live.sound=S.prefs.sound!==false;}
  return {added,removed};
}
/* --- token --- */
function readToken(){try{const t=JSON.parse(localStorage.getItem(TOKEN_KEY)||"null");return t&&t.exp>Date.now()+30000?t.access_token:null;}catch(e){return null;}}
function clearToken(){try{localStorage.removeItem(TOKEN_KEY);}catch(e){}}
function authUrl(prompt){const state=cid();try{localStorage.setItem("binder-oauth-state",state);}catch(e){}
  const redirect=new URL("oauth.html",document.baseURI).href;
  const q=new URLSearchParams({client_id:GDRIVE_CLIENT_ID,redirect_uri:redirect,response_type:"token",scope:GDRIVE_SCOPE,state,include_granted_scopes:"true"});if(prompt)q.set("prompt",prompt);
  return DRIVE.auth+"?"+q.toString();}
/* Interactive sign-in: open Google, wait for oauth.html to store a token (it tells us over a BroadcastChannel; storage and visibility events cover the installed-app case). */
function signIn(prompt){
  if(readToken())return Promise.resolve(readToken());
  if(!GDRIVE_CLIENT_ID)return Promise.reject(new Error("Google Drive isn't set up for this install"));
  return new Promise((res,rej)=>{
    const done=()=>{const t=readToken();if(t){cleanup();res(t);}};
    const fail=msg=>{cleanup();rej(new Error(msg));};
    const onStore=e=>{if(e.key===TOKEN_KEY)done();};const onVis=()=>{if(document.visibilityState==="visible")done();};
    let bc=null;try{bc=new BroadcastChannel("binder-sync");bc.onmessage=e=>{if(e.data&&e.data.type==="token")done();else if(e.data&&e.data.type==="error")fail(e.data.error||"Sign-in failed");};}catch(e){}
    const to=setTimeout(()=>fail("Sign-in timed out"),180000);
    function cleanup(){clearTimeout(to);window.removeEventListener("storage",onStore);document.removeEventListener("visibilitychange",onVis);if(bc)bc.close();}
    window.addEventListener("storage",onStore);document.addEventListener("visibilitychange",onVis);
    const w=window.open(authUrl(prompt),"binder-oauth","popup,width=480,height=680");
    if(!w){cleanup();location.assign(authUrl(prompt));}
  });
}
/* --- transport --- */
async function driveFetch(url,opts){const t=readToken();if(!t){sync.needAuth=true;throw new Error("signed out");}
  const o=Object.assign({},opts||{});o.headers=Object.assign({Authorization:"Bearer "+t},o.headers||{});
  const r=await fetch(url,o);if(r.status===401){clearToken();sync.needAuth=true;throw new Error("signed out");}if(!r.ok)throw new Error("Drive error "+r.status);return r;}
async function driveFind(){const q=encodeURIComponent("appProperties has { key='binder' and value='collection' } and trashed=false");
  const r=await driveFetch(`${DRIVE.api}/files?q=${q}&fields=files(id,headRevisionId,modifiedTime,webViewLink,size)&spaces=drive&pageSize=5`);const j=await r.json();return (j.files&&j.files[0])||null;}
async function driveFolder(){const q=encodeURIComponent("appProperties has { key='binder' and value='folder' } and trashed=false and mimeType='application/vnd.google-apps.folder'");
  const r=await driveFetch(`${DRIVE.api}/files?q=${q}&fields=files(id)&pageSize=1`);const j=await r.json();if(j.files&&j.files[0])return j.files[0].id;
  const c=await driveFetch(`${DRIVE.api}/files?fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:SYNC_FOLDER,mimeType:"application/vnd.google-apps.folder",appProperties:{binder:"folder"}})});return (await c.json()).id;}
async function driveCreate(doc){const folder=await driveFolder();const meta={name:SYNC_FILE,mimeType:"application/json",parents:[folder],appProperties:{binder:"collection"}};
  const b="binder"+cid();const body=`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(doc)}\r\n--${b}--`;
  const r=await driveFetch(`${DRIVE.upload}/files?uploadType=multipart&fields=id,headRevisionId,webViewLink`,{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+b},body});return r.json();}
async function driveUpdate(id,doc){const r=await driveFetch(`${DRIVE.upload}/files/${id}?uploadType=media&fields=id,headRevisionId,webViewLink`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(doc)});return r.json();}
async function driveDownload(id){const r=await driveFetch(`${DRIVE.api}/files/${id}?alt=media`);return r.json();}
/* --- the sync pass --- */
function scheduleSync(ms){if(!driveOn()||sync.busy)return;clearTimeout(sync.timer);sync.timer=setTimeout(()=>syncNow("auto"),ms==null?20000:ms);}
async function syncNow(reason){
  if(!driveOn()||sync.busy)return null;clearTimeout(sync.timer);
  if(!navigator.onLine)return null;
  if(!readToken()){sync.needAuth=true;if(view==="more")rMore();return null;}
  sync.busy=true;sync.err=null;let result=null;
  try{
    const local=syncDoc();const lh=docHash(local);
    let file=S.prefs.gdrive.fileId?{id:S.prefs.gdrive.fileId}:null;
    let remote=null;
    if(!file){const f=await driveFind();if(f){file=f;S.prefs.gdrive.fileId=f.id;}}
    if(file){try{remote=await driveDownload(file.id);}catch(e){if(/404/.test(e.message)){file=null;S.prefs.gdrive.fileId=null;}else throw e;}}
    const merged=remote?mergeDocs(local,remote):local;
    const mh=docHash(merged);
    let change={added:0,removed:0};
    if(mh!==lh){change=applyDoc(merged);}
    if(!remote||docHash(remote)!==mh){const saved=file?await driveUpdate(file.id,merged):await driveCreate(merged);S.prefs.gdrive.fileId=saved.id||(file&&file.id);if(saved.webViewLink)S.prefs.gdrive.link=saved.webViewLink;}
    sync.lastHash=mh;S.prefs.gdrive.lastSync=Date.now();sync.needAuth=false;
    result=change;
  }catch(e){sync.err=(e&&e.message)||String(e);if(/signed out/.test(sync.err))sync.needAuth=true;}
  sync.busy=false;
  try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}
  if(result&&(result.added||result.removed)){applyScheme();buildTabbar();render();const parts=[];if(result.added)parts.push(`${result.added} card${result.added>1?"s":""} added`);if(result.removed)parts.push(`${result.removed} removed`);toast(parts.join(", ")+" from your other device");}
  else if(view==="more")rMore();
  return result;
}
/* --- connect / disconnect --- */
async function connectDrive(){
  try{await signIn();}catch(e){toast(e.message||"Sign-in failed");return;}
  S.prefs.gdrive={on:false};
  let remote=null,file=null;
  try{file=await driveFind();if(file)remote=await driveDownload(file.id);}catch(e){toast("Couldn't reach Drive: "+e.message);return;}
  const localN=totalOwned();const remoteN=remote?Object.values(remote.col||{}).reduce((a,e)=>a+e.copies.length,0):0;
  const start=()=>{S.prefs.gdrive={on:true,fileId:file?file.id:null,link:file&&file.webViewLink||null,connectedAt:Date.now()};save();rMore();syncNow("connect").then(()=>{toast(remote?"Merged with your Drive copy":"Synced to Drive");if(view==="more")rMore();});};
  if(remote&&remoteN&&localN){
    $("#sheet").innerHTML=`<div class="grab"></div><div style="font-weight:700;font-size:17px">Found your Binder in Drive</div>
    <div class="note" style="margin-top:4px">${remoteN} card${remoteN>1?"s":""}, last synced ${ago(remote.at)}. This device has ${localN}. Merging keeps every copy from both and any card you removed on either stays removed.</div>
    <div class="btnrow"><button class="btn ghost" id="syncno">Cancel</button><button class="btn pri" id="syncgo">Merge</button></div>`;
    $("#syncno").onclick=()=>closeSheet();$("#syncgo").onclick=()=>{closeSheet();start();};openSheet();
  }else start();
}
function disconnectDrive(){S.prefs.gdrive={on:false};clearToken();sync.needAuth=false;sync.err=null;save();rMore();toast("Sync turned off. Your Drive file stays as it is.");}
function syncStatusLine(){const g=S.prefs.gdrive||{};if(sync.busy)return "Syncing…";if(sync.needAuth)return "Sign in to keep syncing";if(sync.err)return "Last try failed: "+sync.err+(g.lastSync?" · last synced "+ago(g.lastSync):"");if(g.lastSync)return "Synced "+ago(g.lastSync);return "Not synced yet";}

(async function boot(){
  try{await loadIndex();}
  catch(e){const t=document.getElementById("ldmsg");if(t)t.textContent="Couldn't load the card index ("+((e&&e.message)||e)+"). Reload to try again.";return;}
  load();applyScheme();
  /* URL hash: #scan opens a tab; #demo/binder loads the demo collection first; #demo/card/Lightning%20Bolt opens a card. */
  const h=decodeURIComponent((location.hash||"").slice(1));const parts=h.split("/");
  if(parts[0]==="demo"){if(!totalOwned()){S=seed();save();}parts.shift();}
  if(TABS.includes(parts[0]))view=parts[0];else if(parts[0]!=="card"&&parts[0]!=="deck"&&parts[0]!=="set"&&parts[0]!=="type"&&parts[0]!=="review")view=pins()[0];
  if(parts[0]==="card"&&BY_ID[parts.slice(1).join("/")]){view="card";curArg={id:parts.slice(1).join("/")};}
  if(parts[0]==="search"&&parts[1]){q=parts[1];}
  if(parts[0]==="review")view="review";
  if(parts[0]==="set"&&SETS[parts[1]]){view="checklist";curArg={kind:"set",code:parts[1]};}
  if(parts[0]==="type"&&parts[1]){if(!TYPEIDX)buildTypeIndex();const t=[...TYPEIDX.keys()].find(k=>k.toLowerCase()===parts[1].toLowerCase());if(t){view="checklist";curArg={kind:"type",code:t};}}

  if(parts[0]==="deck"&&S.decks[0]){view="deck";curArg={id:S.decks[0].id};}
  for(const id of ["v-checklist","v-sets","v-types","v-archetype"])if(!$("#"+id)){const sec=document.createElement("section");sec.className="screen";sec.id=id;$("#tabbar").before(sec);}
  buildTabbar();
  if(!(S.prefs&&S.prefs.onboarded)&&!(parts.length&&parts[0])){document.querySelectorAll(".screen").forEach(x=>{x.classList.remove("on");x.setAttribute("aria-hidden","true");});rArchetype();$("#v-archetype").classList.add("on");$("#v-archetype").removeAttribute("aria-hidden");$("#tabbar").hidden=true;}
  else{if(!(S.prefs&&S.prefs.onboarded)){S.prefs=S.prefs||{};S.prefs.onboarded=true;S.prefs.archetype="custom";save();}$("#tabbar").hidden=false;render();}
  if(TABS.includes(view))try{history.replaceState({tab:view},"","#"+view);}catch(e){} /* base entry carries the tab, so back from a tray navigation returns here */
  try{setupUpdates();}catch(e){}
  if(driveOn()){setTimeout(()=>syncNow("boot"),1500);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")syncNow("hide");else scheduleSync(2000);});window.addEventListener("online",()=>scheduleSync(1000));}
  wantOwnedPrices();
  if(S.prefs){if(S.prefs.live===false)live.on=false;if(S.prefs.sound===false)live.sound=false;}
  window.addEventListener("online",()=>{wantOwnedPrices();});
})();
/* After a deploy the old cached app runs once while the new service worker installs.
   When the new one takes over, reload once so the new build is what you see. */
const APP_VERSION="20261018m";
let swReg=null;
function setupUpdates(){
  if(!("serviceWorker" in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>{swReg=reg;
    reg.addEventListener("updatefound",()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener("statechange",()=>{if(nw.state==="installed"&&navigator.serviceWorker.controller)toast("Update ready, reloading…");});});
  }).catch(()=>{});
  let done=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(done||!hadController)return;done=true;setTimeout(()=>location.reload(),600);});
}
