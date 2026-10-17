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
  const ps=prints.map(p=>({set:p[0],num:p[1],rarity:p[2],sid:p[3]||""})).reverse();
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
function addCopy(col,id,set,num,copy){const k=pk(id,set,num);(col[k]=col[k]||{id,set,num,copies:[]}).copies.push(copy);}
function empty(){return {col:{},review:[],decks:[],session:[],prefs:{}};}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){S=JSON.parse(raw);for(const k of Object.keys(S.col))if(!BY_ID[S.col[k].id])delete S.col[k];S.review=S.review.filter(r=>BY_ID[r.guess]);return;}}catch(e){}S=empty();save();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
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

/* ========================= NAV ========================= */
let view="search",stack=[],curArg=null;
const TABS=["search","scan","binder","decks","more"];
const TABOF={card:"search",deck:"decks",review:"scan"};
/* Sub-screens push a history entry so the phone's back button (or Escape) returns from a card
   instead of leaving the app. Sheets do the same. */
function go(v,arg){
  if(TABS.includes(v)){stack=[];try{history.replaceState({tab:v},"","#"+v);}catch(e){}}
  else{stack.push({view,arg:curArg});try{history.pushState({sub:true},"","#"+v);}catch(e){}}
  if(v!=="scan"&&view==="scan")closeCamera();
  view=v;curArg=arg;render();
}
function back(){if(stack.length&&history.state&&history.state.sub){history.back();return;}popView();}
function popView(){const p=stack.pop();if(p){view=p.view;curArg=p.arg;}else{view="search";curArg=null;}render();}
window.addEventListener("popstate",()=>{
  if($("#overlay").classList.contains("on")){closeSheet(true);return;}
  if(stack.length){popView();return;}
  const h=(location.hash||"").slice(1);if(TABS.includes(h)&&h!==view){view=h;curArg=null;render();}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#overlay").classList.contains("on"))closeSheet();else if(stack.length)back();}});
document.querySelectorAll("#tabbar button").forEach(b=>b.onclick=()=>go(b.dataset.tab));
function render(){
  document.querySelectorAll(".screen").forEach(s=>{s.classList.remove("on");s.setAttribute("aria-hidden","true");});
  const tab=TABS.includes(view)?view:(TABOF[view]||stack[0]?.view||"search");
  document.querySelectorAll("#tabbar button").forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle("on",on);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  const bd=$("#rvbadge");bd.hidden=!S.review.length;bd.textContent=S.review.length;
  ({search:rSearch,scan:rScan,binder:rBinder,decks:rDecks,card:rCard,deck:rDeck,review:rReview,more:rMore})[view]();
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
    <div class="h">Collection</div><div class="sect"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:22px;font-weight:700" class="mono">${totalOwned()}</span><span class="mu" style="font-size:12px">cards · ${Object.keys(S.col).length} printings · index ${INDEX.length.toLocaleString()} cards</span></div>${totalOwned()?"":'<div class="note">Nothing here yet. Scan a card, add one by name, or load the demo collection under More.</div><div class="btnrow" style="margin-top:10px"><button class="btn" id="goscan">Scan a card</button><button class="btn" id="golDemo">Load demo</button></div>'}</div>`}`;
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
  return `<button class="row ${own?"":"dim"}" data-card="${esc(card.id)}">${stripe(card)}${thumb(card,"sm")}<div class="tx"><div class="n">${esc(card.name)}</div><div class="d">${pips(card.cost)}<span>${esc(card.types.join(" "))} · ${where}</span></div></div><span class="q ${own?"own":""}">${own?"×"+own:"—"}</span></button>`;
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
      <div style="font-weight:700;font-size:19px;line-height:1.15;text-wrap:balance">${esc(card.name)}</div>
      <div class="mu" style="font-size:13px;margin:4px 0 10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${pips(card.cost)} <span>${esc(card.type)}</span>${card.pt?`<span class="mono">${esc(card.pt)}</span>`:""}</div>
      <div style="font-size:30px;font-weight:700;line-height:1" class="mono">${own}<span class="mu" style="font-size:12px;font-weight:500;font-family:var(--sans)"> &nbsp;owned</span></div>
      <div class="mu" style="font-size:12px;margin-top:4px">${card.prints.length} printing${card.prints.length>1?"s":""} · ${card.kw.join(" · ")}</div>
    </div>
  </div>
  ${card.o?`<div class="h">Oracle</div><div class="oracle">${esc(card.o)}</div>`:""}
  <div class="h">Printings</div>
  <div class="lst">${shown.map(p=>{const n=ownedPrint(card.id,p.set,p.num);return `<div class="row ${n?"":"dim"}">${thumb(card,"sm","",p)}<div class="tx"><div class="n mono">${pr(p)} <span class="mu" style="font-weight:400;font-size:11px">${RARITY[p.rarity]||""}</span></div><div class="d">${esc(setName(p.set))} · ${setYear(p.set)}</div></div>
    <div class="step" role="group" aria-label="${pr(p)} copies"><button data-dec="${p.set}|${esc(p.num)}" ${n?"":"disabled"} aria-label="Remove one">−</button><span class="v" aria-live="polite">${n}</span><button data-inc="${p.set}|${esc(p.num)}" aria-label="Add one">+</button></div></div>`;}).join("")}</div>
  ${card.prints.length>shown.length?`<button class="btn sm ghost" id="allp" style="margin-top:6px">Show all ${card.prints.length} printings</button>`:(showAllPrints&&card.prints.length>8?`<button class="btn sm ghost" id="allp" style="margin-top:6px">Show fewer</button>`:"")}
  ${own?`<div class="h">Copies</div><div class="lst">${Object.values(S.col).filter(e=>e.id===card.id).flatMap(e=>e.copies.map(cp=>({e,cp}))).sort((a,b)=>b.cp.date.localeCompare(a.cp.date)).slice(0,8).map(({e,cp})=>`<div class="row" style="min-height:40px"><div class="tx"><div class="d" style="color:var(--fg)"><span class="mono">${cp.date}</span><span class="mu">·</span>${pr(e)}<span class="mu">·</span>${cp.cond}${cp.foil?'<span class="pill">foil</span>':""}</div></div><span class="mu" style="font-size:12px">${cp.via==="scan"?"scan "+cp.conf+"%":cp.via}</span></div>`).join("")}</div>`:""}
  ${decksIn.length?`<div class="h">In decks</div><div class="chips" style="margin-top:0">${decksIn.map(x=>`<button class="chip" data-deck="${x.d.id}">${esc(x.d.name)} · ${x.n}</button>`).join("")}</div>`:""}
  <div class="btnrow" style="margin-top:auto;padding-top:16px"><button class="btn" id="scanone">Scan a copy</button><button class="btn pri" id="addone">+ Add copy</button></div>`;
  $("#bk").onclick=()=>{showAllPrints=false;back();};
  el.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{const [set,num]=b.dataset.inc.split("|");addCopy(S.col,card.id,set,num,{cond:"NM",foil:false,via:"typed",date:today()});save();rCard();toast(`${card.name} · ${set.toUpperCase()} ${num} · now ×${ownedPrint(card.id,set,num)}`);});
  el.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{const [set,num]=b.dataset.dec.split("|");const k=pk(card.id,set,num);const e=S.col[k];const removed=e.copies.pop();if(!e.copies.length)delete S.col[k];save();rCard();toast(`Removed 1 · ${set.toUpperCase()} ${num}`,()=>{addCopy(S.col,card.id,set,num,removed);save();if(view==="card")rCard();});});
  el.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>go("deck",{id:b.dataset.deck}));
  const ap=$("#allp");if(ap)ap.onclick=()=>{showAllPrints=!showAllPrints;rCard();};
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
let sheetReturn=null;
function openSheet(){const ov=$("#overlay");if(!ov.classList.contains("on")){sheetReturn=document.activeElement;try{history.pushState({sheet:true},"");}catch(e){}}ov.classList.add("on");
  requestAnimationFrame(()=>{const f=$("#sheet").querySelector("input,button:not([disabled])");if(f&&!/input/i.test(f.tagName))f.focus({preventScroll:true});else if(f)f.focus();});}
function closeSheet(fromHistory){const ov=$("#overlay");if(!ov.classList.contains("on"))return;ov.classList.remove("on");
  if(!fromHistory&&history.state&&history.state.sheet){try{history.back();}catch(e){}}
  if(sheetReturn&&sheetReturn.focus&&document.contains(sheetReturn))sheetReturn.focus({preventScroll:true});sheetReturn=null;}
$("#overlay").onclick=e=>{if(e.target===$("#overlay"))closeSheet();};

/* ========================= OCR =========================
   Tesseract.js runs in a worker from the page's own files (ocr/worker.min.js, the
   LSTM core, eng.traineddata.gz). The title band is read first; the bottom edge
   gives collector number and set code. Names are matched against the index with a
   trigram candidate pass and Dice similarity. */
let ocrWorker=null,ocrState="idle",ocrMsg="",ocrErr="";
function ocrLog(m){if(m&&m.status){ocrMsg=m.status+(m.progress!=null?" "+Math.round(m.progress*100)+"%":"");const t=document.getElementById("ocrmsg");if(t)t.textContent=ocrMsg;}}
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
    ocrWorker=w;ocrState="ready";return w;
  }catch(e){ocrState="failed";ocrErr=(e&&e.message)||String(e);return null;}
}
async function loadBitmap(file){
  try{return await createImageBitmap(file,{imageOrientation:"from-image"});}
  catch(e){return await new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>res(img);img.onerror=rej;img.src=u;});}
}
function crop(src,x,y,w,h,scale){const cv=document.createElement("canvas");cv.width=Math.round(w*scale);cv.height=Math.round(h*scale);const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(src,x,y,w,h,0,0,cv.width,cv.height);
  const id=ctx.getImageData(0,0,cv.width,cv.height),d=id.data;for(let i=0;i<d.length;i+=4){const g=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=d[i+1]=d[i+2]=g;}ctx.putImageData(id,0,0);return cv;}
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
async function recognize(file){
  const w=await getOCR();
  if(!w)return null;
  const bmp=await loadBitmap(file);
  const W=bmp.width,H=bmp.height;const scale=Math.min(1,1600/W);
  const band=crop(bmp,0,0,W,H*.3,scale*1.5);
  const foot=crop(bmp,0,H*.86,W,H*.14,scale*1.5);
  await w.setParameters({tessedit_pageseg_mode:"6"});
  const r1=await w.recognize(band);
  let cands=matchName(r1.data.text);
  if(!cands.length||cands[0].score<.6){
    await w.setParameters({tessedit_pageseg_mode:"11"});
    const r3=await w.recognize(crop(bmp,0,0,W,H,scale));
    const c2=matchName(r3.data.text);
    if(c2.length&&(!cands.length||c2[0].score>cands[0].score))cands=c2;
  }
  if(bmp.close)bmp.close();
  if(!cands.length)return {guess:null,text:r1.data.text};
  await w.setParameters({tessedit_pageseg_mode:"6"});
  const r2=await w.recognize(foot);
  const best=cands[0];const pm=matchPrint(best.card,r2.data.text);
  let conf=Math.round(Math.pow(best.score,.7)*100);
  if(pm.conf<1)conf=Math.min(conf,pm.conf>=.85?84:pm.conf>=.7?78:72);
  const alts=[];
  for(const p of best.card.prints.slice(0,6)){if(p!==pm.print)alts.push({id:best.card.id,set:p.set,num:p.num,conf:Math.max(10,conf-10-alts.length*4)});}
  for(const c of cands.slice(1,3)){const p=defaultPrint(c.card);alts.push({id:c.card.id,set:p.set,num:p.num,conf:Math.round(Math.pow(c.score,.7)*90)});}
  return {guess:best.card.id,print:{set:pm.print.set,num:pm.print.num},conf,alts:alts.sort((a,b)=>b.conf-a.conf),how:pm.how,text:r1.data.text};
}
/* Fallback when the OCR engine cannot start in this viewer: deterministic pick from the image bytes, so the flows still work. */
async function recognizeStub(file){
  const buf=file?new Uint8Array(await file.slice(0,65536).arrayBuffer()):crypto.getRandomValues(new Uint8Array(64));
  let h=2166136261;for(const b of buf){h^=b;h=Math.imul(h,16777619)>>>0;}
  const pool=INDEX.filter(x=>!x.sup.includes("Basic")&&x.prints.length>1);
  const card=pool[h%pool.length];const print=card.prints[(h>>8)%card.prints.length];const conf=55+((h>>16)%43);
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
function closeCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}camOn=false;}
async function captureFrame(){
  const v=$("#video"),g=$("#guide");if(!v||!v.videoWidth||scanning)return;
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
      <div class="z mono" id="ocrmsg" style="font-size:11px;text-align:center">${scanning?esc(ocrMsg):ocrState==="ready"?"OCR ready":ocrState==="loading"?"Starting OCR…":""}</div>
      ${scanning?'<div class="busy">Reading…</div>':""}
      <div class="ctl"><label class="btn"><input type="file" id="file" accept="image/*">Photo</label><button class="btn pri" id="capture" ${scanning?"disabled":""}>Capture</button><button class="btn" id="camoff">Close</button></div></div>`
  :`<div class="cam">${lastImg?`<img src="${lastImg}" alt="">`:""}<div class="guide" id="guide"></div>
    <div class="btnrow z" style="margin-top:0;width:100%;max-width:320px"><button class="btn pri" id="camon" ${scanning?"disabled":""}>${scanning?"Reading…":"Open camera"}</button><label class="btn" style="${scanning?"opacity:.5;pointer-events:none":""}"><input type="file" id="file" accept="image/*" capture="environment">Photo</label></div>
    <div class="z mono" id="ocrmsg" style="font-size:11px;color:var(--mu);min-height:14px">${scanning?esc(ocrMsg):ocrState==="ready"?"OCR ready":""}</div>
    ${camErr?`<div class="note z" style="margin:0;color:var(--wn)">${esc(camErr)}</div>`:""}
    <div class="note z" style="margin:0">Card upright inside the frame, title band sharp. At or above ${THRESHOLD}% it goes straight in; below that you confirm.</div>
    <button class="demo z" id="simulate" ${scanning?"disabled":""}>Try a demo scan</button>
  </div>`;
  el.innerHTML=`
  <div class="top"><div><h1>Scan</h1><div class="s">Session · ${ses.length} added${S.review.length?` · <span style="color:var(--wn)">${S.review.length} to review</span>`:""}</div></div><button class="btn sm" id="endses" ${ses.length?"":"disabled"}>End session</button></div>
  ${camBox}
  ${engine}
  <div class="h">Tray</div>
  ${ses.length?`<div class="tray">${[...ses].reverse().map(s=>{const card=BY_ID[s.id];const p=card.prints.find(x=>x.set===s.set&&x.num===s.num);return `<button data-card="${esc(card.id)}" title="${esc(card.name)}">${thumb(card,"md","",p)}</button>`;}).join("")}</div>
  <div class="lst">${[...ses].reverse().slice(0,8).map(s=>{const card=BY_ID[s.id];return `<button class="row" data-card="${esc(card.id)}">${stripe(card)}<div class="tx"><div class="n">${esc(card.name)}</div><div class="d">${s.set.toUpperCase()} ${esc(s.num)} · ${s.conf}%${s.conf>=THRESHOLD?"":" · confirmed"}</div></div><span class="q own">×${ownedOf(card.id)}</span></button>`;}).join("")}</div>`
  :`<div class="empty">Nothing scanned this session yet. Each card you capture lands here with its printing and confidence.</div>`}
  ${S.review.length?`<button class="btn" id="torev" style="margin-top:12px">Review ${S.review.length} uncertain scan${S.review.length>1?"s":""}</button>`:""}`;
  $("#file").onchange=e=>{const f=e.target.files[0];if(f)doScan(f);};
  const sim=$("#simulate");if(sim)sim.onclick=()=>doScan(null);
  const con=$("#camon");if(con)con.onclick=openCamera;
  const coff=$("#camoff");if(coff)coff.onclick=()=>{closeCamera();rScan();};
  const cap=$("#capture");if(cap)cap.onclick=captureFrame;
  const vid=$("#video");if(vid&&stream){vid.srcObject=stream;vid.play().catch(()=>{});}
  $("#endses").onclick=()=>{const n=S.session.length;S.session=[];save();rScan();toast(`Session closed · ${n} added`);};
  el.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>go("card",{id:b.dataset.card}));
  const tr=$("#torev");if(tr)tr.onclick=()=>go("review");
}
async function doScan(file){
  scanning=true;ocrMsg=file?"Preparing image…":"";
  lastImg=file?await thumbData(file):null;
  rScan();
  let r=null;
  try{
    if(file){r=await recognize(file);if(r===null)r=await recognizeStub(file);}
    else r=await recognizeStub(null);
  }catch(e){ocrErr=(e&&e.message)||String(e);ocrState="failed";r=await recognizeStub(file);}
  scanning=false;
  if(!r.guess){rScan();toast("Couldn't read a name. Try closer, or type it.");openTypeSheet(name=>{const c=BY_LOWER[name.toLowerCase()];if(c)openAddSheetScan(c,{conf:0,img:lastImg},false);});return;}
  if(r.conf>=THRESHOLD){commitScan(r);rScan();}
  else{rScan();openMatchSheet({...r,img:lastImg,at:today()});}
}
function thumbData(file){return new Promise(res=>{loadBitmap(file).then(img=>{const cv=document.createElement("canvas");const w=200,h=Math.round(200*img.height/img.width);cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);res(cv.toDataURL("image/jpeg",.7));}).catch(()=>res(null));});}
function commitScan(r,opts={}){
  const card=BY_ID[r.guess];
  addCopy(S.col,card.id,r.print.set,r.print.num,{cond:opts.cond||"NM",foil:!!opts.foil,via:"scan",date:today(),conf:r.conf});
  S.session.push({id:card.id,set:r.print.set,num:r.print.num,conf:r.conf});
  save();
  toast(`${card.name} · ${r.print.set.toUpperCase()} ${r.print.num} · now ×${ownedOf(card.id)}`,()=>{const k=pk(card.id,r.print.set,r.print.num);const e=S.col[k];if(e){e.copies.pop();if(!e.copies.length)delete S.col[k];}const i=S.session.map(s=>s.id+s.set+s.num).lastIndexOf(card.id+r.print.set+r.print.num);if(i>-1)S.session.splice(i,1);save();render();});
}
function openMatchSheet(r,fromReview){
  let pick={id:r.guess,set:r.print.set,num:r.print.num,conf:r.conf};
  const list=()=>[{id:r.guess,set:r.print.set,num:r.print.num,conf:r.conf},...(r.alts||[])];
  const draw=()=>{
    const pc=BY_ID[pick.id];
    $("#sheet").innerHTML=`<div class="grab"></div>
    <div class="compare"><div class="col"><div class="crop">${r.img?`<img src="${r.img}" alt="">`:""}</div>Your scan</div><span class="mu" style="align-self:center">→</span><div class="col">${thumb(pc,"lg","",pc.prints.find(p=>p.set===pick.set&&p.num===pick.num))}Best match</div></div>
    <div style="text-align:center;margin-top:10px"><div style="font-weight:700;font-size:18px">${esc(pc.name)}</div><div class="meter" style="justify-content:center;margin-top:6px"><span>${pick.conf}%</span><div class="conf ${pick.conf>=THRESHOLD?"":pick.conf>=40?"wn":"bad"}" style="max-width:120px"><i style="width:${pick.conf}%"></i></div><span class="mono">${pick.set.toUpperCase()} ${esc(pick.num)}</span></div>${r.how?`<div class="mu" style="font-size:11px;margin-top:4px">printing from ${esc(r.how)}</div>`:""}</div>
    <div class="h">Candidates</div>
    <div class="lst">${list().map((a,i)=>{const ac=BY_ID[a.id];if(!ac)return "";const on=a.id===pick.id&&a.set===pick.set&&a.num===pick.num;return `<button class="row ${on?"":"dim"}" data-alt="${i}" style="min-height:52px">${stripe(ac)}${thumb(ac,"sm","",ac.prints.find(p=>p.set===a.set&&p.num===a.num))}<div class="tx"><div class="n">${esc(ac.name)}</div><div class="d">${a.set.toUpperCase()} ${esc(a.num)} · ${esc(setName(a.set))}</div></div><span class="q ${on?"own":""}">${a.conf}%</span></button>`;}).join("")}</div>
    <div class="btnrow"><button class="btn ghost" id="typeit">Type the name</button><button class="btn pri" id="accept">Accept ${pick.set.toUpperCase()} ${esc(pick.num)}</button></div>
    ${fromReview?"":'<button class="btn sm ghost" id="later" style="width:100%;margin-top:8px">Decide later</button>'}`;
    $("#sheet").querySelectorAll("[data-alt]").forEach(b=>b.onclick=()=>{pick=list()[+b.dataset.alt];draw();});
    $("#accept").onclick=()=>{commitScan({guess:pick.id,print:{set:pick.set,num:pick.num},conf:pick.conf});if(fromReview)S.review=S.review.filter(x=>x.id!==r.id);save();closeSheet();render();};
    $("#typeit").onclick=()=>{closeSheet();openTypeSheet(name=>{const c=BY_LOWER[name.toLowerCase()];if(c)openAddSheetScan(c,r,fromReview);});};
    const l=$("#later");if(l)l.onclick=()=>{S.review.push({id:"r"+Date.now(),guess:r.guess,print:r.print,conf:r.conf,alts:r.alts||[],img:r.img,at:r.at});save();closeSheet();render();toast("Kept in review");};
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
  el.innerHTML=`<div class="top"><button class="back" id="bk">‹ Scan</button><div class="s">${items.length} uncertain · lowest first</div></div>
  ${items.length?`<div class="lst">${items.map(r=>{const card=BY_ID[r.guess];return `<button class="row" data-rv="${r.id}" style="min-height:60px"><div class="crop" style="width:34px;height:48px;border-radius:4px">${r.img?`<img src="${r.img}" alt="">`:""}</div><div class="tx"><div class="n">${esc(card.name)}?</div><div class="meter" style="margin-top:4px"><span>${r.conf}%</span><div class="conf ${r.conf>=40?"wn":"bad"}"><i style="width:${r.conf}%"></i></div><span class="mono">${r.print.set.toUpperCase()} ${esc(r.print.num)}</span></div></div><span class="mu">›</span></button>`;}).join("")}</div>
  <div class="note">Most of these are the right name with an uncertain printing; the sheet groups same-name candidates so set is the only decision.</div>
  <button class="btn" id="acceptall" style="margin-top:12px">Accept all ≥ 70%</button>`
  :`<div class="empty">Nothing to review. Scans below ${THRESHOLD}% confidence land here.</div>`}`;
  $("#bk").onclick=()=>go("scan");
  el.querySelectorAll("[data-rv]").forEach(b=>b.onclick=()=>{const r=S.review.find(x=>x.id===b.dataset.rv);openMatchSheet(r,true);});
  const aa=$("#acceptall");if(aa)aa.onclick=()=>{const ok=S.review.filter(r=>r.conf>=70);ok.forEach(r=>commitScan({guess:r.guess,print:r.print,conf:r.conf}));S.review=S.review.filter(r=>r.conf<70);save();render();toast(`Accepted ${ok.length}`);};
}

/* ========================= BINDER ========================= */
let binderTab="R",binderPage=0;
function rBinder(){
  const el=$("#v-binder");
  const entries=Object.values(S.col).filter(e=>{const k=ciClass(BY_ID[e.id]);return binderTab==="M"?k==="M":k===binderTab;}).sort((a,b)=>BY_ID[a.id].name.localeCompare(BY_ID[b.id].name)||a.set.localeCompare(b.set));
  const pages=Math.max(1,Math.ceil(entries.length/9));binderPage=Math.min(binderPage,pages-1);
  const slice=entries.slice(binderPage*9,binderPage*9+9);
  const names={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",M:"Multi",C:"Colourless"};
  el.innerHTML=`<div class="top"><div><h1>${names[binderTab]}</h1><div class="s">page ${binderPage+1} of ${pages} · ${entries.reduce((n,e)=>n+e.copies.length,0)} cards · ${totalOwned()} total</div></div></div>
  <div class="sidetabs">${["W","U","B","R","G","M","C"].map(x=>`<button class="${x===binderTab?"on":""}" data-bt="${x}">${x==="M"?'<span class="pips"><span class="pip R"></span><span class="pip W"></span></span>':x==="C"?'<span class="pip">C</span>':`<span class="pip ${x}"></span>`}</button>`).join("")}</div>
  <div class="grid3" id="bgrid">${slice.map(e=>{const card=BY_ID[e.id];const foil=e.copies.some(c=>c.foil);return `<button data-card="${esc(card.id)}" aria-label="${esc(card.name)}, ${pr(e)}, ${e.copies.length} owned">${thumb(card,"md",foil?'<span class="foil" title="foil"></span>':"")}<span class="lbl">${pr(e)} · <b>×${e.copies.length}</b></span></button>`;}).join("")}${Array.from({length:9-slice.length}).map(()=>'<div class="card md ph" aria-hidden="true"><div class="art"></div></div>').join("")}</div>
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
  el.querySelectorAll(".setrow").forEach(b=>b.onclick=()=>{q="e:"+b.dataset.set+" owned";colorF.clear();go("search");});
}

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
  <div class="lst">${S.decks.length?"":'<div class="empty">No decks yet. Paste a list from Arena, Moxfield or a text file and Binder checks every line against what you own.</div>'}${S.decks.map(d=>{const s=deckStats(d);return `<button class="row" data-deck="${d.id}" style="min-height:58px"><div class="tx"><div class="n">${esc(d.name)}</div><div class="d">${esc(d.format)} · ${s.need} cards</div></div><div style="text-align:right;min-width:70px"><div class="q ${s.have===s.need?"own":""}" style="color:${s.have===s.need?"var(--ok)":"var(--wn)"};font-weight:600">${s.have} / ${s.need}</div><div class="bar" style="margin-top:4px"><i style="width:${s.need?100*s.have/s.need:0}%"></i></div></div></button>`;}).join("")}</div>
  <div id="pastebox" hidden style="margin-top:12px">
    <div class="in" style="margin-bottom:8px"><input id="dname" placeholder="Deck name"></div>
    <textarea id="dtext" placeholder="1 Goblin Chieftain (MH2) 127&#10;1x Lightning Bolt&#10;Sol Ring"></textarea>
    <div class="note">Arena, Moxfield and plain lines all parse. Unknown names stay as text and count as missing.</div>
    <div class="btnrow"><button class="btn ghost" id="pcancel">Cancel</button><button class="btn pri" id="psave">Check against collection</button></div>
  </div>`;
  el.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>go("deck",{id:b.dataset.deck}));
  $("#paste").onclick=()=>{$("#pastebox").hidden=false;$("#dtext").focus();};
  $("#pcancel").onclick=()=>{$("#pastebox").hidden=true;};
  $("#psave").onclick=()=>{const text=$("#dtext").value;if(!text.trim())return;const d={id:"d"+Date.now(),name:$("#dname").value.trim()||"Pasted list",format:"Pasted",lines:parseDeck(text)};S.decks.unshift(d);save();go("deck",{id:d.id});};
}
function rDeck(){
  const d=S.decks.find(x=>x.id===curArg.id);if(!d){go("decks");return;}
  const el=$("#v-deck");const s=deckStats(d);
  const groups={};for(const l of d.lines){const card=l.cardId?BY_ID[l.cardId]:null;const g=card?(card.types.includes("Land")?"Lands":card.types.includes("Creature")?"Creatures":card.types[0]==="Sorcery"?"Sorceries":(card.types[0]||"Other")+"s"):"Unknown";(groups[g]=groups[g]||[]).push(l);}
  const order=["Creatures","Instants","Sorceries","Enchantments","Artifacts","Planeswalkers","Battles","Lands","Others","Unknown"];
  el.innerHTML=`<div class="top"><button class="back" id="bk">‹ Decks</button><button class="btn sm" id="del">Delete</button></div>
  <div style="font-weight:700;font-size:19px;line-height:1.15">${esc(d.name)}</div>
  <div class="mu" style="font-size:13px;margin:2px 0 8px">${esc(d.format)} · <span style="color:${s.have===s.need?"var(--ok)":"var(--wn)"};font-weight:600">${s.have} / ${s.need} owned</span>${s.need-s.have?` · ${s.need-s.have} missing`:""}</div>
  <div class="bar"><i style="width:${s.need?100*s.have/s.need:0}%"></i></div>
  ${order.filter(g=>groups[g]).map(g=>`<div class="h">${g} · ${groups[g].filter(l=>!l.cardId||ownedOf(l.cardId)<l.qty).length} of ${groups[g].length} missing</div>
    <div class="lst">${groups[g].map((l,i)=>({l,i})).sort((a,b)=>{const am=a.l.cardId?ownedOf(a.l.cardId)>=a.l.qty:false,bm=b.l.cardId?ownedOf(b.l.cardId)>=b.l.qty:false;return am-bm;}).map(({l,i})=>{const own=l.cardId?ownedOf(l.cardId):0;const ok=own>=l.qty;const card=l.cardId?BY_ID[l.cardId]:null;return `<button class="deckline ${ok?"ok":""}" data-line="${g}|${i}" ${card?"":"disabled"}><span class="qn">${l.qty}</span>${card?stripe(card,"min-height:26px;width:3px"):'<span class="stripe" style="min-height:26px;width:3px"></span>'}<span class="nm">${esc(l.name)}</span><span class="st">${card?(ok?"✓":own+" / "+l.qty):"not in index"}</span></button>`;}).join("")}</div>`).join("")}
  <div class="btnrow" style="margin-top:auto;padding-top:16px"><button class="btn" id="copymiss">Copy missing</button><button class="btn pri" id="scanfill">Scan to fill</button></div>`;
  $("#bk").onclick=()=>go("decks");
  $("#del").onclick=()=>{const idx=S.decks.indexOf(d);S.decks.splice(idx,1);save();go("decks");toast(`Deleted ${d.name}`,()=>{S.decks.splice(idx,0,d);save();render();});};
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
  $("#sheet").querySelectorAll("[data-swap]").forEach(b=>b.onclick=()=>{const sub=BY_ID[b.dataset.swap];line.name=sub.name;line.cardId=sub.id;save();closeSheet();render();toast(`Swapped in ${sub.name}`);});
  $("#keep").onclick=closeSheet;
  $("#addit").onclick=()=>{closeSheet();openAddSheet(card);};
  openSheet();
}

/* ========================= MORE ========================= */
let confirmReset=false;
function rMore(){
  const el=$("#v-more");
  el.innerHTML=`<div class="top"><h1>More</h1></div>
  <div class="sect"><div style="display:flex;justify-content:space-between"><span>Collection</span><span class="mono">${totalOwned()} cards</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Printings</span><span class="mono">${Object.keys(S.col).length}</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Index</span><span class="mono">${INDEX.length.toLocaleString()} cards · ${Object.keys(SETS).length} sets</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Index built</span><span class="mono">2026-10-17</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>OCR engine</span><span class="mono" id="ocrstate">${ocrState==="ready"?"ready":ocrState==="failed"?"unavailable":ocrState==="loading"?"starting…":"starts on first scan"}</span></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Auto-accept threshold</span><span class="mono">${THRESHOLD}%</span></div></div>
  ${ocrState==="idle"?'<button class="btn" id="warm" style="margin-top:10px">Start OCR engine now</button>':""}
  ${ocrState==="failed"?`<div class="sect warn" style="margin-top:10px;font-size:12.5px">${esc(ocrErr)}</div>`:""}
  <div class="h">Card images</div>
  <div class="sect"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div>Show card art</div><div class="note" style="margin-top:2px">Loaded from Scryfall as you browse; cards you've viewed stay cached for offline use.</div></div><button class="chip ${imagesOn()?"on":""}" id="imgtoggle" role="switch" aria-checked="${imagesOn()}">${imagesOn()?"On":"Off"}</button></div></div>
  <div class="h">Export</div>
  <button class="btn" id="csv">Copy collection as CSV</button>
  <div class="note">One row per printing: name, set, collector number, quantity, foil count, conditions. Paste into a sheet or Moxfield.</div>
  <div class="h">Data</div>
  <div class="note" style="margin-top:0">The collection lives in this browser's local storage. The card index (magic-search-engine build of 2026-10-17, every printing through the latest sets) and the OCR engine (Tesseract.js 5, English LSTM model) are cached by the service worker after first use, so the whole app works offline; card art is the one thing fetched on demand. Add it to your home screen for a full-screen install.</div>
  <div class="btnrow" style="margin-top:10px"><button class="btn" id="demo">Load demo collection</button><button class="btn" id="reset">Clear everything</button></div>`;
  $("#csv").onclick=()=>{const rows=[["name","set","number","qty","foil","conditions"]];for(const e of Object.values(S.col)){rows.push([BY_ID[e.id].name,e.set.toUpperCase(),e.num,e.copies.length,e.copies.filter(c=>c.foil).length,e.copies.map(c=>c.cond).join(" ")]);}copyText(rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(",")).join("\n"),"CSV copied");};
  $("#demo").onclick=()=>{S=seed();save();lastImg=null;go("search");toast("Demo collection loaded");};
  $("#reset").onclick=()=>{if(!confirmReset){confirmReset=true;$("#reset").textContent="Tap again to clear";setTimeout(()=>{confirmReset=false;const b=$("#reset");if(b)b.textContent="Clear everything";},4000);return;}confirmReset=false;S=empty();save();lastImg=null;go("search");toast("Collection cleared");};
  $("#imgtoggle").onclick=()=>{S.prefs=S.prefs||{};S.prefs.images=!imagesOn();save();rMore();};
  const wm=$("#warm");if(wm)wm.onclick=async()=>{wm.disabled=true;wm.textContent="Starting…";await getOCR();rMore();toast(ocrState==="ready"?"OCR ready":"OCR couldn't start");};
}
function copyText(txt,msg){
  const done=()=>toast(msg);
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done).catch(()=>fallback());}else fallback();
  function fallback(){const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done();}catch(e){toast("Select and copy manually");ta.style.left="16px";ta.style.top="16px";ta.style.zIndex="40";setTimeout(()=>ta.remove(),8000);return;}ta.remove();}
}

/* ========================= BOOT ========================= */
(async function boot(){
  try{await loadIndex();}
  catch(e){const t=document.getElementById("ldmsg");if(t)t.textContent="Couldn't load the card index ("+((e&&e.message)||e)+"). Reload to try again.";return;}
  load();
  /* URL hash: #scan opens a tab; #demo/binder loads the demo collection first; #demo/card/Lightning%20Bolt opens a card. */
  const h=decodeURIComponent((location.hash||"").slice(1));const parts=h.split("/");
  if(parts[0]==="demo"){if(!totalOwned()){S=seed();save();}parts.shift();}
  if(TABS.includes(parts[0]))view=parts[0];
  if(parts[0]==="card"&&BY_ID[parts.slice(1).join("/")]){view="card";curArg={id:parts.slice(1).join("/")};}
  if(parts[0]==="search"&&parts[1]){q=parts[1];}
  if(parts[0]==="review")view="review";
  if(parts[0]==="deck"&&S.decks[0]){view="deck";curArg={id:S.decks[0].id};}
  $("#tabbar").hidden=false;
  render();
  if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
})();
