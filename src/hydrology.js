// Priority-flood depression conditioning, followed by steepest-descent D8 routing.
// Boundary cells are outlets. Epsilon resolves flats without routing cycles.
export function drainage(heights, n, spacing) {
  const filled=Float64Array.from(heights), seen=new Uint8Array(n*n), heap=[];
  const push=(i)=>{let k=heap.length;heap.push(i);while(k){const p=(k-1)>>1;if(filled[heap[p]]<=filled[i])break;heap[k]=heap[p];k=p;}heap[k]=i;};
  const pop=()=>{const result=heap[0],v=heap.pop();if(heap.length){let k=0;while(2*k+1<heap.length){let c=2*k+1;if(c+1<heap.length&&filled[heap[c+1]]<filled[heap[c]])c++;if(filled[v]<=filled[heap[c]])break;heap[k]=heap[c];k=c;}heap[k]=v;}return result;};
  const neighbors=(i,fn)=>{const x=i%n,y=Math.floor(i/n);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if((dx||dy)&&x+dx>=0&&x+dx<n&&y+dy>=0&&y+dy<n)fn(i+dy*n+dx,Math.hypot(dx,dy));}};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(x===0||y===0||x===n-1||y===n-1){const i=y*n+x;seen[i]=1;push(i);}
  while(heap.length){const i=pop();neighbors(i,j=>{if(seen[j])return;seen[j]=1;filled[j]=Math.max(filled[j],filled[i]+0.00001);push(j);});}
  const next=new Int32Array(n*n).fill(-1), accumulation=new Float64Array(n*n).fill(1);
  for(let i=0;i<next.length;i++){const x=i%n,y=Math.floor(i/n);if(!x||!y||x===n-1||y===n-1)continue;let best=0;neighbors(i,(j,d)=>{const slope=(filled[i]-filled[j])/d;if(slope>best){best=slope;next[i]=j;}});}
  const order=Array.from({length:n*n},(_,i)=>i).sort((a,b)=>filled[b]-filled[a]);
  for(const i of order)if(next[i]>=0)accumulation[next[i]]+=accumulation[i];
  return {next,accumulation,filled,cellArea:spacing*spacing};
}
export function trace(start,next){const path=[];for(let i=start;i>=0&&path.length<=next.length;i=next[i])path.push(i);return path;}
