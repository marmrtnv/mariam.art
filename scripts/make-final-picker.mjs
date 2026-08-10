#!/usr/bin/env node
// Финальный пикер по УЖЕ добавленному каталогу сайта.
// Отсев фото + правка тегов (+ избранное) перед деплоем.
// Генерит самодостаточный pickers/final.html (миниатюры base64, фуллскрин — мастер через file://).
// Решения экспортируются в JSON → scripts/apply-final.mjs применяет (удаляет/перетегирует).
// Использование: node scripts/make-final-picker.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CONTENT = "src/content/photos";
const ASSETS = "src/assets/photos";
const OUT = "pickers/final.html";
const THUMB = 320;

// Темы — единый источник src/themes.json (тот же список, что в галерее).
const LABELS = JSON.parse(fs.readFileSync("src/themes.json", "utf8"));
const ORDER = Object.keys(LABELS);

// мини-парсер нужных полей YAML
function parseYaml(text) {
  const get = (n) => (text.match(new RegExp(`^${n}:\\s*"?(.*?)"?\\s*$`, "m")) || [])[1] || "";
  const tags = [];
  const m = text.match(/^tags:\s*$([\s\S]*?)(?=^\w)/m);
  if (m) for (const l of m[1].split("\n")) {
    const t = l.match(/^\s*-\s*(.+?)\s*$/);
    if (t) tags.push(t[1].replace(/^["']|["']$/g, ""));
  }
  return {
    src: get("src"),
    date: get("date"),
    favorite: /^favorite:\s*true/m.test(text),
    tags,
  };
}

const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith(".yaml"));
const photos = [];
let n = 0;
for (const f of files) {
  const slug = f.replace(/\.yaml$/, "");
  const jpg = `${ASSETS}/${slug}.jpg`;
  if (!fs.existsSync(jpg)) { console.log("нет картинки:", slug); continue; }
  const y = parseYaml(fs.readFileSync(`${CONTENT}/${f}`, "utf8"));
  const buf = await sharp(jpg).resize(THUMB, null, { withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true }).toBuffer();
  photos.push({
    slug,
    date: y.date,
    year: (y.date || "").slice(0, 4),
    tags: y.tags.filter((t) => ORDER.includes(t)),
    favorite: y.favorite,
    full: "file://" + path.resolve(jpg),
    thumb: "data:image/jpeg;base64," + buf.toString("base64"),
  });
  if (++n % 100 === 0) console.log(`  ${n}/${files.length}`);
}
photos.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1));

const THEMES = ORDER.map((k) => ({ k, label: LABELS[k] }));

const HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Final filter — mariam.art</title>
<style>
:root{--bg:#fafafa;--card:#fff;--line:#e6e6e6;--ink:#1a1a1a;--mut:#8a8a8a;--accent:#2b6cb0;--danger:#d64545}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;z-index:5;background:rgba(250,250,250,.95);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
header h1{font-size:15px;margin:0 8px 0 0;font-weight:600}
.stat{color:var(--mut);font-size:13px}
.stat b{color:var(--ink)}
.stat .rm{color:var(--danger)}
.spacer{flex:1}
.seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.seg button{border:0;background:var(--card);padding:6px 11px;cursor:pointer;font:inherit;color:var(--mut)}
.seg button.on{background:var(--ink);color:#fff}
.btn{border:1px solid var(--line);background:var(--card);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit}
.btn:hover{border-color:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;padding:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;
  display:flex;flex-direction:column;transition:opacity .15s,box-shadow .15s}
.card.rm{opacity:.42;box-shadow:inset 0 0 0 2px var(--danger)}
.thumbwrap{position:relative;cursor:zoom-in;background:#eee;aspect-ratio:1/1;overflow:hidden}
.thumbwrap img{width:100%;height:100%;object-fit:cover;display:block}
.corner{position:absolute;top:6px;display:flex;gap:6px;align-items:center}
.corner.r{right:6px}.corner.l{left:6px}
.ico{width:30px;height:30px;border-radius:50%;border:0;cursor:pointer;font-size:15px;line-height:30px;
  text-align:center;background:rgba(255,255,255,.92);box-shadow:0 1px 4px rgba(0,0,0,.25)}
.ico.rm-on{background:var(--danger);color:#fff}
.ico.fav-on{background:#f6c343}
.meta{display:flex;justify-content:space-between;align-items:center;padding:6px 9px 2px;color:var(--mut);font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:4px;padding:4px 8px 9px}
.chip{border:1px solid var(--line);background:#f3f3f3;color:var(--mut);border-radius:999px;
  padding:2px 9px;font-size:11.5px;cursor:pointer;user-select:none;white-space:nowrap}
.chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.empty{padding:60px;text-align:center;color:var(--mut)}
/* lightbox */
#lb{position:fixed;inset:0;z-index:30;background:rgba(15,15,15,.96);display:none;flex-direction:column}
#lb.open{display:flex}
#lb .stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;position:relative}
#lb img{max-width:100%;max-height:100%;object-fit:contain}
#lb .nav{position:absolute;top:0;bottom:0;width:22%;border:0;background:transparent;color:#fff;font-size:34px;cursor:pointer;opacity:.55}
#lb .nav:hover{opacity:1}#lb .nav:focus{outline:none}
#lb .prev{left:0}#lb .next{right:0;justify-content:flex-end}
#lb .nav span{padding:0 18px}
#lb .x{position:absolute;top:12px;right:16px;color:#fff;font-size:26px;background:0;border:0;cursor:pointer;opacity:.7;z-index:2}
#lb .x:hover{opacity:1}
#lb .bar{background:rgba(20,20,20,.92);padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
#lb .bar .chips{padding:0}
#lb .bar .chip{font-size:12.5px;padding:3px 11px}
#lb .lbinfo{color:#bbb;font-size:12px;margin-right:auto}
#lb .lbrm{border:1px solid #555;background:0;color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer}
#lb .lbrm.on{background:var(--danger);border-color:var(--danger)}
#lb .lbfav{border:1px solid #555;background:0;color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer}
#lb .lbfav.on{background:#f6c343;border-color:#f6c343;color:#1a1a1a}
</style></head><body>
<header>
  <h1>Final filter</h1>
  <div class="stat">всего <b id="s-total">0</b> · к удалению <b class="rm" id="s-rm">0</b> · правок тегов <b id="s-chg">0</b> · ★ <b id="s-fav">0</b></div>
  <div class="spacer"></div>
  <div class="seg" id="view">
    <button data-v="all" class="on">Все</button>
    <button data-v="keep">Останутся</button>
    <button data-v="rm">К удалению</button>
    <button data-v="fav">★ Избранные</button>
    <button data-v="untag">Без тегов</button>
    <button data-v="chg">Изменённые</button>
  </div>
  <button class="btn" id="copy">Copy JSON</button>
  <button class="btn" id="dl">Download</button>
</header>
<div class="grid" id="grid"></div>
<div class="empty" id="empty" style="display:none">Пусто в этом фильтре.</div>

<div id="lb">
  <button class="x" id="lbx">✕</button>
  <div class="stage">
    <button class="nav prev" id="lbprev"><span>‹</span></button>
    <img id="lbimg" alt="">
    <button class="nav next" id="lbnext"><span>›</span></button>
  </div>
  <div class="bar">
    <span class="lbinfo" id="lbinfo"></span>
    <div class="chips" id="lbchips"></div>
    <button class="lbfav" id="lbfav" title="Pick (P)">★ Favorite</button>
    <button class="lbrm" id="lbrm" title="Reject (X)">🗑 Remove</button>
  </div>
</div>

<script>
var PHOTOS = __DATA__;
var THEMES = __THEMES__;
var KEY = "mariam-final-v1";
var state = JSON.parse(localStorage.getItem(KEY) || "{}");

function eff(p){
  var s = state[p.slug];
  if(!s) return {remove:false, tags:p.tags.slice(), favorite:p.favorite};
  return {remove:!!s.remove, tags:(s.tags||p.tags).slice(), favorite:!!s.favorite};
}
function setS(p, s){ state[p.slug]=s; localStorage.setItem(KEY, JSON.stringify(state)); }
function sameTags(a,b){ if(a.length!==b.length) return false; var x=a.slice().sort(),y=b.slice().sort();
  for(var i=0;i<x.length;i++) if(x[i]!==y[i]) return false; return true; }
function changed(p){ var e=eff(p); return !sameTags(e.tags,p.tags) || e.favorite!==p.favorite; }

var view = "all";
function visible(){
  return PHOTOS.filter(function(p){ var e=eff(p);
    if(view==="rm") return e.remove;
    if(view==="fav") return e.favorite && !e.remove;
    if(view==="keep") return !e.remove;
    if(view==="untag") return !e.remove && e.tags.length===0;
    if(view==="chg") return changed(p);
    return true; });
}

function stats(){
  var rm=0,chg=0,fav=0;
  PHOTOS.forEach(function(p){var e=eff(p); if(e.remove)rm++; if(changed(p))chg++; if(e.favorite&&!e.remove)fav++;});
  document.getElementById("s-total").textContent=PHOTOS.length;
  document.getElementById("s-rm").textContent=rm;
  document.getElementById("s-chg").textContent=chg;
  document.getElementById("s-fav").textContent=fav;
}

var grid=document.getElementById("grid");
function render(){
  var list=visible();
  grid.innerHTML="";
  document.getElementById("empty").style.display=list.length?"none":"block";
  var frag=document.createDocumentFragment();
  list.forEach(function(p){
    var e=eff(p);
    var card=document.createElement("div");
    card.className="card"+(e.remove?" rm":"");
    card.dataset.slug=p.slug;
    var chips=THEMES.map(function(t){
      var on=e.tags.indexOf(t.k)>=0;
      return '<span class="chip'+(on?" on":"")+'" data-k="'+t.k+'">'+t.label+'</span>';
    }).join("");
    card.innerHTML=
      '<div class="thumbwrap"><img loading="lazy" decoding="async" src="'+p.thumb+'">'+
        '<div class="corner l"><button class="ico fav'+(e.favorite?" fav-on":"")+'" title="Favorite">★</button></div>'+
        '<div class="corner r"><button class="ico rm'+(e.remove?" rm-on":"")+'" title="Remove">🗑</button></div>'+
      '</div>'+
      '<div class="meta"><span>'+p.date+'</span><span>'+p.year+'</span></div>'+
      '<div class="chips">'+chips+'</div>';
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  stats();
}

// делегирование кликов по сетке
grid.addEventListener("click", function(ev){
  var card=ev.target.closest(".card"); if(!card) return;
  var p=bySlug(card.dataset.slug), e=eff(p);
  if(ev.target.classList.contains("rm")){ e.remove=!e.remove; setS(p,e); render(); return; }
  if(ev.target.classList.contains("fav")){ e.favorite=!e.favorite; setS(p,e); render(); return; }
  if(ev.target.classList.contains("chip")){ toggleTag(p, ev.target.dataset.k); render(); return; }
  if(ev.target.closest(".thumbwrap")){ openLB(p.slug); }
});
function bySlug(s){ for(var i=0;i<PHOTOS.length;i++) if(PHOTOS[i].slug===s) return PHOTOS[i]; }
function toggleTag(p,k){ var e=eff(p); var i=e.tags.indexOf(k);
  if(i>=0) e.tags.splice(i,1); else e.tags.push(k); setS(p,e); }

// фильтры вида
document.getElementById("view").addEventListener("click", function(ev){
  if(ev.target.tagName!=="BUTTON") return;
  view=ev.target.dataset.v;
  [].forEach.call(this.children, function(b){ b.classList.toggle("on", b===ev.target); });
  render();
});

// экспорт
function exportData(){
  return PHOTOS.map(function(p){ var e=eff(p);
    return {slug:p.slug, remove:e.remove, tags:e.tags, favorite:e.favorite}; });
}
document.getElementById("dl").addEventListener("click", function(){
  var blob=new Blob([JSON.stringify(exportData(),null,0)],{type:"application/json"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="final-decisions.json"; a.click();
});
document.getElementById("copy").addEventListener("click", function(){
  navigator.clipboard.writeText(JSON.stringify(exportData())).then(function(){
    var b=document.getElementById("copy"); var t=b.textContent; b.textContent="✓ copied";
    setTimeout(function(){b.textContent=t;},1200);
  });
});

// lightbox
var lb=document.getElementById("lb"), lbimg=document.getElementById("lbimg");
var lbList=[], lbIdx=0;
function openLB(slug){ lbList=visible(); lbIdx=lbList.findIndex(function(p){return p.slug===slug;});
  if(lbIdx<0)lbIdx=0; lb.classList.add("open"); showLB(); }
function closeLB(){ lb.classList.remove("open"); render(); }
function showLB(){
  var p=lbList[lbIdx]; if(!p)return; var e=eff(p);
  lbimg.src=p.full;
  document.getElementById("lbinfo").textContent=(lbIdx+1)+"/"+lbList.length+"  ·  "+p.date+"  ·  "+p.slug;
  document.getElementById("lbchips").innerHTML=THEMES.map(function(t){
    var on=e.tags.indexOf(t.k)>=0; return '<span class="chip'+(on?" on":"")+'" data-k="'+t.k+'">'+t.label+'</span>';
  }).join("");
  document.getElementById("lbrm").classList.toggle("on", e.remove);
  document.getElementById("lbfav").classList.toggle("on", e.favorite);
}
function lbStep(d){ lbIdx=(lbIdx+d+lbList.length)%lbList.length; showLB(); }
document.getElementById("lbprev").onclick=function(){lbStep(-1);};
document.getElementById("lbnext").onclick=function(){lbStep(1);};
document.getElementById("lbx").onclick=closeLB;
document.getElementById("lbchips").addEventListener("click", function(ev){
  if(!ev.target.classList.contains("chip"))return;
  toggleTag(lbList[lbIdx], ev.target.dataset.k); showLB();
});
document.getElementById("lbrm").onclick=function(){ var p=lbList[lbIdx],e=eff(p); e.remove=!e.remove; setS(p,e); showLB(); };
document.getElementById("lbfav").onclick=function(){ var p=lbList[lbIdx],e=eff(p); e.favorite=!e.favorite; setS(p,e); showLB(); };
document.addEventListener("keydown", function(ev){
  if(!lb.classList.contains("open"))return;
  if(ev.key==="Escape")closeLB();
  else if(ev.key==="ArrowLeft")lbStep(-1);
  else if(ev.key==="ArrowRight")lbStep(1);
  else if(ev.key==="x"||ev.key==="X"){ var p=lbList[lbIdx],e=eff(p); e.remove=!e.remove; setS(p,e); showLB(); }       // Reject
  else if(ev.key==="p"||ev.key==="P"){ var p2=lbList[lbIdx],e2=eff(p2); e2.favorite=!e2.favorite; setS(p2,e2); showLB(); } // Pick
  else if(ev.key==="u"||ev.key==="U"){ var p3=lbList[lbIdx],e3=eff(p3); e3.remove=false; e3.favorite=false; setS(p3,e3); showLB(); } // Unflag
});

render();
</script>
</body></html>`;

fs.mkdirSync("pickers", { recursive: true });
fs.writeFileSync(OUT, HTML.replace("__DATA__", () => JSON.stringify(photos)).replace("__THEMES__", () => JSON.stringify(THEMES)));
const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
console.log(`готово: ${OUT} (${photos.length} фото, ${mb} МБ)`);
console.log(`открой двойным кликом. Решения: Download → scripts/apply-final.mjs final-decisions.json`);
