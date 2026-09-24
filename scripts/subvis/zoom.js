// ASCII-art pixel dump for manual verification. Usage:
//   node scripts/subvis/zoom.js <image.bmp> <y0> <y1> <x0> <x1> [threshold]
// '#' = ink below threshold, '+' = mid grey, '.' = paper.
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
// usage: node zoom.js file y0 y1 x0 x1 [thresh]
const a=process.argv.slice(2);
const f=a[0], y0=+a[1], y1=+a[2], x0=+a[3], x1=+a[4];
const thr = a[5]!==undefined ? +a[5] : 110;
const info=readBMP(f);
let hdr='    ';
for(let x=x0;x<=x1;x++) hdr += (x%10===0? String(Math.floor(x/10)%10) : (x%5===0?'|':' '));
console.log(hdr);
for(let y=y0;y<=y1;y++){
  let line=String(y).padStart(4,' ');
  for(let x=x0;x<=x1;x++){
    const c=info.px(x,y);
    const luma=0.299*c[0]+0.587*c[1]+0.114*c[2];
    line += luma<thr ? '#' : (luma<160 ? '+' : '.');
  }
  console.log(line);
}
