import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drainage,trace} from '../src/hydrology.js';
test('planar slope drains downhill and conserves contributing cells',()=>{
 const n=7,h=Array.from({length:n*n},(_,i)=>100-Math.floor(i/n)*2);
 const {next,filled,accumulation}=drainage(h,n,10);
 let total=0;for(let i=0;i<h.length;i++){if(next[i]<0)total+=accumulation[i];else assert.ok(filled[next[i]]<filled[i]);}
 assert.equal(total,h.length);assert.equal(trace(24,next).at(-1),45);
});
test('enclosed depression is conditioned and reaches a boundary without cycles',()=>{
 const n=5,h=Array(25).fill(10);h[12]=0;
 const {next,filled}=drainage(h,n,10);assert.ok(filled[12]>10);
 const path=trace(12,next);assert.equal(new Set(path).size,path.length);assert.ok(path.length<=25);
 const end=path.at(-1);assert.ok(end%5===0||end%5===4||end<5||end>=20);
});
test('real terrain routes every interior cell and preserves accumulation mass',()=>{
 const d=JSON.parse(readFileSync(new URL('../public/data/terrain.json',import.meta.url)));
 const {next,filled,accumulation}=drainage(d.heights,d.n,d.spacing);let outlets=0;
 for(let i=0;i<next.length;i++){if(next[i]<0){outlets+=accumulation[i];const x=i%d.n,y=Math.floor(i/d.n);assert.ok(!x||!y||x===d.n-1||y===d.n-1);}else assert.ok(filled[next[i]]<filled[i]);}
 assert.equal(outlets,d.n*d.n);assert.ok(d.heights.every(Number.isFinite));
 const path=trace(Math.floor(d.n*d.n/2),next);assert.equal(new Set(path).size,path.length);
});
