// Single-image subroutine detector. Usage:
//   node scripts/subvis/detect.js <image.bmp> [with BASE/TEXT_END/THR/IX0/IX1/RUNLEN/IMAXSTART/JOIN env tuning]
// Prints text-line bands, icon lines, and proposed `visual y/h` per subroutine.
// BMP input only; audit.js converts images/*.jpg via `sips` (macOS).
const fs = require('fs');
function readBMP(path){
  const b = fs.readFileSync(path);
  const off = b.readInt32LE(10);
  const w = b.readInt32LE(18);
  const h = b.readInt32LE(22);
  const bpp = b.readUInt16LE(28);
  const bottomUp = h > 0; const H = Math.abs(h);
  const rowSize = Math.floor((bpp*w+31)/32)*4;
  const px = (x,y)=>{
    const yy = bottomUp ? H-1-y : y;
    const i = off + yy*rowSize + x*(bpp/8);
    return [b[i+2], b[i+1], b[i]];
  };
  return {w, H, px};
}
function luma(c){ return 0.299*c[0]+0.587*c[1]+0.114*c[2]; }
// longest dark run in [x0,x1]; also its start x
function runInfo(px, y, x0, x1, thr){
  let best=0, bestStart=-1, cur=0, start=-1;
  for(let x=x0;x<=x1;x++){
    if(luma(px(x,y))<thr){
      if(cur===0) start=x;
      cur++;
      if(cur>best){ best=cur; bestStart=start; }
    } else cur=0;
  }
  return {len:best, start:bestStart};
}
function darkCount(px, y, x0, x1, thr){
  let n=0;
  for(let x=x0;x<=x1;x++) if(luma(px(x,y))<thr) n++;
  return n;
}
function bands(rows, minH, maxH, mergeGap){
  const out=[]; let s=-1, gap=0;
  for(let i=0;i<rows.length;i++){
    if(rows[i]){ if(s<0){s=i;} gap=0; }
    else if(s>=0){ gap++; if(gap>mergeGap){ out.push([s, i-gap]); s=-1; gap=0; } }
  }
  if(s>=0) out.push([s, rows.length-1]);
  return out.filter(b=> (b[1]-b[0]+1)>=minH && (b[1]-b[0]+1)<=maxH);
}
const file = process.argv[2];
const BASE = +(process.env.BASE || 44);
const TEXT_END = +(process.env.TEXT_END || 214);
const THR = +(process.env.THR || 110);
const IX0 = +(process.env.IX0 || 54);
const IX1 = +(process.env.IX1 || 68);
const RUNLEN = +(process.env.RUNLEN || 10);
const IMAXSTART = +(process.env.IMAXSTART || 60);
const JOIN = +(process.env.JOIN || 17.5);
const info = readBMP(file);
const px = info.px;
const textRows=[];
for(let y=BASE;y<=TEXT_END;y++) textRows.push(darkCount(px,y,56,265,THR) >= 4);
const textIdx = bands(textRows, 6, 16, 2).map(b=>[b[0]+BASE, b[1]+BASE]);
// subroutine icon: solid dark bar (>=10px) starting in the icon gutter x54..60
function bandHasIcon(b){
  for(let y=b[0];y<=b[1];y++){
    const r = runInfo(px, y, IX0, IX1, THR);
    if(r.len>=RUNLEN && r.start>=IX0 && r.start<=IMAXSTART) return true;
  }
  return false;
}
if (process.env.DEBUG){
  for(let y=BASE;y<=BASE+30;y++){
    const r=runInfo(px,y,54,68,THR);
    console.error('row '+y+' run len='+r.len+' start='+r.start);
  }
}
console.log('== '+file);
const subs=[]; let cur=null;
for(const b of textIdx){
  const centre=(b[0]+b[1])/2;
  const icon=bandHasIcon(b);
  if(icon){
    if(cur) subs.push(cur);
    cur={lines:[b], centres:[centre]};
  } else if(cur && centre-cur.centres[cur.centres.length-1] <= JOIN){
    cur.lines.push(b); cur.centres.push(centre);
  } else {
    if(cur){ subs.push(cur); cur=null; }
  }
}
if(cur) subs.push(cur);
for(const b of textIdx){
  let xmin=999,xmax=-1;
  for(let y=b[0];y<=b[1];y++) for(let x=40;x<=280;x++){
    const c=px(x,y);
    const l=0.299*c[0]+0.587*c[1]+0.114*c[2];
    if(l<THR){ if(x<xmin)xmin=x; if(x>xmax)xmax=x; }
  }
  console.log('  band '+b[0]+'-'+b[1]+' centre='+((b[0]+b[1])/2).toFixed(1)+' x='+xmin+'-'+xmax+(bandHasIcon(b)?'  <== ICON LINE':''));
}
subs.forEach((s,i)=>{
  const first=s.centres[0], last=s.centres[s.centres.length-1];
  console.log('  sub'+(i+1)+': lines='+s.lines.map(l=>l[0]+'-'+l[1]).join(', ')+' => visual y='+Math.round((first+last)/2)+', h='+(16*s.lines.length));
});
