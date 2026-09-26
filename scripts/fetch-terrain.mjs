import { PNG } from 'pngjs';
import { writeFile } from 'node:fs/promises';
const lat = 40.920722, lon = 0.461112, size = 8000, n = 257, zoom = 12;
const earth = 6378137, cos = Math.cos(lat * Math.PI / 180), world = 256 * 2 ** zoom;
const cx = (lon + 180) / 360 * world;
const cy = (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * world;
const mpp = 2 * Math.PI * earth * cos / world;
const half = size / mpp / 2;
const tiles = new Map(), sources = [];
for (let ty = Math.floor((cy-half)/256); ty <= Math.floor((cy+half)/256); ty++) {
  for (let tx = Math.floor((cx-half)/256); tx <= Math.floor((cx+half)/256); tx++) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${tx}/${ty}.png`;
    const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}: ${url}`);
    tiles.set(`${tx},${ty}`, PNG.sync.read(Buffer.from(await res.arrayBuffer()))); sources.push(url);
  }
}
function sample(x,y) {
  const px=Math.floor(x), py=Math.floor(y), tile=tiles.get(`${Math.floor(px/256)},${Math.floor(py/256)}`);
  const i=((py%256)*256+px%256)*4; return tile.data[i]*256+tile.data[i+1]+tile.data[i+2]/256-32768;
}
const heights=[];
for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
 const px=cx-half+x/(n-1)*half*2, py=cy-half+y/(n-1)*half*2, fx=px%1, fy=py%1;
 const h=sample(px,py)*(1-fx)*(1-fy)+sample(px+1,py)*fx*(1-fy)+sample(px,py+1)*(1-fx)*fy+sample(px+1,py+1)*fx*fy;
 heights.push(Math.round(h*10)/10);
}
await writeFile('public/data/terrain.json',JSON.stringify({lat,lon,size,n,zoom,spacing:size/(n-1),fetched:new Date().toISOString(),sources,heights}));
console.log(`Saved ${n}×${n} terrain, ${Math.min(...heights)}–${Math.max(...heights)} m; ${sources.length} tiles.`);
