#!/usr/bin/env node
// Генерирует самодостаточный HTML-пикер для отбора картинок из папки.
// Миниатюры встроены как base64; полноэкранный просмотр грузит ОРИГИНАЛ по file://.
// Клик по картинке — увеличить; галочка в углу — выбрать; в просмотре S/пробел — выбрать, ←/→ листать.
// Использование: node scripts/make-picker.mjs <папка|путь>
// Короткое имя папки ищется внутри библиотеки ART_LIB (по умолчанию ~/Pictures).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const LIB = process.env.ART_LIB || path.join(os.homedir(), "Pictures");
const arg = process.argv[2];
if (!arg) { console.error("укажи папку или путь: node scripts/make-picker.mjs <папка|путь>"); process.exit(1); }

let dir;
if (path.isAbsolute(arg)) dir = arg;
else if (fs.existsSync(path.join(LIB, arg))) dir = path.join(LIB, arg);
else dir = path.resolve(arg);
if (!fs.existsSync(dir)) { console.error("нет папки:", dir); process.exit(1); }

const rel = path.relative(LIB, dir);
const insideLib = !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
const prefix = insideLib ? rel : dir;                 // префикс путей в экспорте (относительный, если внутри библиотеки)
const label = path.basename(dir.replace(/[/\\]+$/, "")) || "picker";

fs.mkdirSync("pickers", { recursive: true });
const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();
console.log(`${label} (${dir}): ${files.length} картинок, генерирую миниатюры…`);

const data = [];
let i = 0;
for (const f of files) {
  const buf = await sharp(path.join(dir, f))
    .rotate()
    .resize({ width: 360, height: 360, fit: "inside" })
    .webp({ quality: 46 })
    .toBuffer();
  data.push({ n: f, t: `data:image/webp;base64,${buf.toString("base64")}` });
  if (++i % 50 === 0) console.log(`  ${i}/${files.length}`);
}

const DIR = `file://${dir}/`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Picker — ${label}</title>
<style>
:root{--bg:#101012;--fg:#ececec;--mut:#8a8a90;--sel:#e6b13a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,-apple-system,sans-serif}
header{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:13px 20px;background:rgba(16,16,18,.93);backdrop-filter:blur(8px);border-bottom:1px solid #222}
h1{margin:0;font-size:17px;font-weight:600}h1 .sub{color:var(--mut);font-weight:400;font-size:13px;margin-left:8px}
.actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#count{color:var(--mut);margin-right:4px;font-variant-numeric:tabular-nums}
button{font:inherit;cursor:pointer;border:1px solid #333;background:#1b1b1e;color:var(--fg);padding:7px 12px;border-radius:8px}
button:hover{border-color:#666}button.primary{background:var(--sel);color:#101012;border-color:var(--sel);font-weight:600}
.hint{color:var(--mut);font-size:12px;padding:0 20px 8px}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;padding:14px 20px 90px}
.tile{position:relative;border-radius:10px;overflow:hidden;cursor:zoom-in;background:#000;aspect-ratio:1;border:2px solid transparent}
.tile img{width:100%;height:100%;object-fit:cover;display:block;opacity:.9;transition:opacity .15s}
.tile:hover img{opacity:1}.tile.sel{border-color:var(--sel)}
.tile .chk{position:absolute;top:7px;left:7px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.55);border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;cursor:pointer;opacity:0;transition:.15s;padding:0}
.tile:hover .chk{opacity:.95}.tile.sel .chk{opacity:1;background:var(--sel);border-color:var(--sel);color:#101012}
.tile .nm{position:absolute;left:0;right:0;bottom:0;padding:16px 8px 5px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.8));opacity:0;transition:.15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
.tile:hover .nm{opacity:1}
#lb{position:fixed;inset:0;background:rgba(8,8,9,.97);display:none;align-items:center;justify-content:center;z-index:20}
#lb.open{display:flex}
#lbimg{max-width:94vw;max-height:86vh;object-fit:contain;border-radius:4px;opacity:0;transition:opacity .2s}
#lbimg.ready{opacity:1}
.lbnav{position:fixed;top:0;height:100%;width:18vw;min-width:60px;border:0;background:transparent;color:#fff;font-size:2.6rem;opacity:.45;cursor:pointer}
.lbnav:hover{opacity:1}#lbprev{left:0}#lbnext{right:0}
#lbclose{position:fixed;top:14px;right:18px;font-size:1.3rem;background:transparent;border:0;color:#fff;cursor:pointer;opacity:.7;width:40px;height:40px}
#lbbar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:18px;padding:16px;background:linear-gradient(transparent,rgba(0,0,0,.6))}
#lbname{color:var(--mut);font-size:13px;font-variant-numeric:tabular-nums}
#lbsel{padding:9px 20px;border-radius:999px;border:1px solid #555;background:#1b1b1e;color:#fff;font-weight:600}
#lbsel.on{background:var(--sel);color:#101012;border-color:var(--sel)}
.toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:var(--sel);color:#101012;padding:10px 16px;border-radius:8px;font-weight:600;opacity:0;transition:.2s;pointer-events:none;z-index:30}
.toast.show{opacity:1}
</style></head><body>
<header>
  <h1>${label}<span class="sub">${files.length} photos</span></h1>
  <div class="actions">
    <span id="count">0 selected</span>
    <button id="all">Select all</button>
    <button id="none">Clear</button>
    <button id="copy" class="primary">Copy selected</button>
    <button id="dl">Download .txt</button>
  </div>
</header>
<div class="hint">Клик по фото — увеличить (полный кадр) · галочка в углу — выбрать · в просмотре: <b>S</b>/пробел — выбрать, ←/→ листать, Esc — закрыть</div>
<main id="grid"></main>
<div id="lb">
  <button class="lbnav" id="lbprev" title="prev">‹</button>
  <img id="lbimg" alt="">
  <button class="lbnav" id="lbnext" title="next">›</button>
  <button id="lbclose" title="close">✕</button>
  <div id="lbbar"><span id="lbname"></span><button id="lbsel">Select</button></div>
</div>
<div class="toast" id="toast"></div>
<script>
var DATA=${JSON.stringify(data)};
var PREFIX=${JSON.stringify(prefix)};
var DIR=${JSON.stringify(DIR)};
var KEY="picker:"+PREFIX;
var sel=new Set(JSON.parse(localStorage.getItem(KEY)||"[]"));
var grid=document.getElementById("grid");
var lb=document.getElementById("lb"), lbimg=document.getElementById("lbimg");
var lbi=0;
function isSel(n){return sel.has(n)}
function save(){localStorage.setItem(KEY,JSON.stringify(Array.from(sel)))}
function updateCount(){document.getElementById("count").textContent=sel.size+" / "+DATA.length+" selected"}
function render(){
  var h="";
  for(var i=0;i<DATA.length;i++){var d=DATA[i];
    h+='<div class="tile'+(isSel(d.n)?" sel":"")+'" data-i="'+i+'">'
      +'<img loading="lazy" src="'+d.t+'">'
      +'<button class="chk'+(isSel(d.n)?" on":"")+'" title="select">✓</button>'
      +'<span class="nm">'+d.n+'</span></div>';
  }
  grid.innerHTML=h;updateCount();
}
function reflect(i){var t=grid.querySelector('.tile[data-i="'+i+'"]');if(!t)return;var on=isSel(DATA[i].n);t.classList.toggle("sel",on);var c=t.querySelector(".chk");if(c)c.classList.toggle("on",on)}
function toggleI(i){var n=DATA[i].n;if(sel.has(n))sel.delete(n);else sel.add(n);save();reflect(i);updateCount();if(lb.classList.contains("open")&&lbi===i)lbSelState()}
grid.addEventListener("click",function(e){
  var tile=e.target.closest(".tile");if(!tile)return;
  var i=+tile.getAttribute("data-i");
  if(e.target.closest(".chk")){toggleI(i);return}
  openLb(i);
});
// lightbox
function lbSelState(){var on=isSel(DATA[lbi].n);var b=document.getElementById("lbsel");b.classList.toggle("on",on);b.textContent=on?"✓ Selected":"Select"}
function showLb(){var d=DATA[lbi];lbimg.classList.remove("ready");lbimg.onload=function(){lbimg.classList.add("ready")};lbimg.src=DIR+encodeURIComponent(d.n);document.getElementById("lbname").textContent=d.n+"   "+(lbi+1)+" / "+DATA.length;lbSelState();
  var p=DATA[lbi+1]||DATA[lbi-1];if(p){var im=new Image();im.src=DIR+encodeURIComponent(p.n)}}
function openLb(i){lbi=i;lb.classList.add("open");showLb()}
function closeLb(){lb.classList.remove("open");lbimg.src=""}
function lbGo(d){lbi=(lbi+d+DATA.length)%DATA.length;showLb()}
document.getElementById("lbnext").onclick=function(e){e.stopPropagation();lbGo(1)};
document.getElementById("lbprev").onclick=function(e){e.stopPropagation();lbGo(-1)};
document.getElementById("lbclose").onclick=closeLb;
document.getElementById("lbsel").onclick=function(e){e.stopPropagation();toggleI(lbi)};
lb.addEventListener("click",function(e){if(e.target===lb)closeLb()});
document.addEventListener("keydown",function(e){
  if(!lb.classList.contains("open"))return;
  if(e.key==="ArrowRight")lbGo(1);
  else if(e.key==="ArrowLeft")lbGo(-1);
  else if(e.key==="Escape")closeLb();
  else if(e.key===" "||e.key==="s"||e.key==="S"){e.preventDefault();toggleI(lbi)}
});
// header actions
document.getElementById("all").onclick=function(){DATA.forEach(function(d){sel.add(d.n)});save();render()};
document.getElementById("none").onclick=function(){sel.clear();save();render()};
function selectedList(){return DATA.filter(function(d){return sel.has(d.n)}).map(function(d){return PREFIX+"/"+d.n}).join("\\n")}
function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},1600)}
document.getElementById("copy").onclick=function(){var txt=selectedList();if(!txt){toast("ничего не выбрано");return}navigator.clipboard.writeText(txt).then(function(){toast(sel.size+" путей скопировано")},function(){toast("не вышло скопировать")})};
document.getElementById("dl").onclick=function(){var blob=new Blob([selectedList()],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=${JSON.stringify(label)}+"-selected.txt";a.click()};
render();
</script></body></html>`;

const out = `pickers/${label}.html`;
fs.writeFileSync(out, html);
console.log(`готово: ${out}  (${(fs.statSync(out).size / 1048576).toFixed(1)} МБ)`);
console.log(`открой: file://${path.resolve(out)}`);
