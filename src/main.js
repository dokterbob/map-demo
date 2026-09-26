import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { drainage, trace } from './hydrology.js';
import { createWaterLayers } from './water-layers.js';
import './style.css';
const $=id=>document.getElementById(id);
async function main(){
 const response=await fetch(`${import.meta.env.BASE_URL}data/terrain.json`);if(!response.ok)throw new Error('Elevation data could not be loaded. Please reload.');
 const data=await response.json(),{n,size,heights,spacing}=data;
 const hydro=drainage(heights,n,spacing),min=Math.min(...heights),max=Math.max(...heights);
 const host=$('map'),scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);host.prepend(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Interactive 3D terrain. Drag to orbit, scroll to zoom, or use Drop water to select a drainage path.');renderer.domElement.tabIndex=0;
 const camera=new THREE.PerspectiveCamera(40,1,1,60000),controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.04;controls.minDistance=1400;controls.maxDistance=22000;controls.target.set(0,350,0);
 const ambient=new THREE.HemisphereLight(0xeaf7ee,0x52614c,2.1);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffecd1,2.5);sun.position.set(-4000,8000,-3000);scene.add(sun);
 const terrainGroup=new THREE.Group();scene.add(terrainGroup);terrainGroup.scale.y=1.5;
 const positions=new Float32Array(n*n*3),colors=new Float32Array(n*n*3),indices=[];
 const stops=[new THREE.Color('#405c49'),new THREE.Color('#7c8a58'),new THREE.Color('#b4a37c'),new THREE.Color('#deceb0')];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,h=heights[i];positions.set([(x/(n-1)-.5)*size,h,(y/(n-1)-.5)*size],i*3);
  const t=Math.max(0,Math.min(2.999,(h-min)/(max-min)*3)),c=stops[Math.floor(t)].clone().lerp(stops[Math.floor(t)+1],t%1);colors.set([c.r,c.g,c.b],i*3);
  if(x<n-1&&y<n-1){const a=i,b=i+1,c=i+n,d=c+1;indices.push(a,c,b,b,c,d);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
 const contourUniform={value:1};
 material.onBeforeCompile=shader=>{shader.uniforms.showContours=contourUniform;shader.vertexShader='varying float vHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHeight = position.y;');shader.fragmentShader='varying float vHeight;\nuniform float showContours;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat contour = abs(fract(vHeight / 50.0 - 0.5) - 0.5);\nfloat width = max(fwidth(vHeight / 50.0), 0.001);\nfloat line = 1.0 - smoothstep(0.0, width * 0.85, contour);\ndiffuseColor.rgb *= 1.0 - line * 0.22 * showContours;');};
 const terrain=new THREE.Mesh(geometry,material);terrainGroup.add(terrain);
 // Exposed earth along the map edge gives the landscape a readable physical extent.
 const edge=[];for(let x=0;x<n;x++)edge.push(x);for(let y=1;y<n;y++)edge.push(y*n+n-1);for(let x=n-2;x>=0;x--)edge.push((n-1)*n+x);for(let y=n-2;y>0;y--)edge.push(y*n);
 const skirt=[];const base=min-130;
 for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length],ax=positions[a*3],az=positions[a*3+2],bx=positions[b*3],bz=positions[b*3+2];skirt.push(ax,heights[a],az,ax,base,az,bx,base,bz,ax,heights[a],az,bx,base,bz,bx,heights[b],bz);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(skirt,3));sg.computeVertexNormals();terrainGroup.add(new THREE.Mesh(sg,new THREE.MeshStandardMaterial({color:0x34433a,roughness:1,side:THREE.DoubleSide})));
 const point=(i,lift=9)=>new THREE.Vector3(positions[i*3],heights[i]+lift,positions[i*3+2]);
 const networkPoints=[];const flowSegments=[];
 for(let i=0;i<heights.length;i++)if(hydro.accumulation[i]>=65&&hydro.next[i]>=0){const j=hydro.next[i];networkPoints.push(...point(i),...point(j));flowSegments.push([i,j]);}
 const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.Float32BufferAttribute(networkPoints,3));
 const network=new THREE.LineSegments(ng,new THREE.LineBasicMaterial({color:0x6dcbe3,transparent:true,opacity:.7}));terrainGroup.add(network);
 const particleCount=Math.min(650,flowSegments.length),particlePositions=new Float32Array(particleCount*3),particleGeom=new THREE.BufferGeometry();particleGeom.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
 const particles=new THREE.Points(particleGeom,new THREE.PointsMaterial({color:0xd5fbff,size:15,transparent:true,opacity:.95,depthWrite:false}));terrainGroup.add(particles);
 const centerIndex=Math.floor(n/2)*n+Math.floor(n/2);
 const pin=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(3,3,130,8),new THREE.MeshBasicMaterial({color:0xdaf2af}));stem.position.y=65;pin.add(stem);const bead=new THREE.Mesh(new THREE.SphereGeometry(16,16,12),new THREE.MeshBasicMaterial({color:0xe2f5b9}));bead.position.y=130;pin.add(bead);const ring=new THREE.Mesh(new THREE.RingGeometry(24,32,40),new THREE.MeshBasicMaterial({color:0xc4e49b,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=6;pin.add(ring);pin.position.copy(point(centerIndex));terrainGroup.add(pin);
 let selectedPath,selectedLine,selectedStart=centerIndex,selecting=false,topDown=false;
 const dropMarker=new THREE.Mesh(new THREE.SphereGeometry(20,14,10),new THREE.MeshBasicMaterial({color:0xffe3a3}));terrainGroup.add(dropMarker);
 const movingDrop=new THREE.Mesh(new THREE.SphereGeometry(13,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));terrainGroup.add(movingDrop);
 const waterLayers=createWaterLayers({data,hydro,geometry,terrainGroup,centerIndex,onPickSource:()=>setSelecting(selecting==='flood'?false:'flood'),onCancelSource:()=>{if(selecting==='flood')setSelecting(false);}});
 function select(i){
  waterLayers.selectPoint(i);
  selectedStart=i;selectedPath=trace(i,hydro.next);
  if(selectedLine){terrainGroup.remove(selectedLine);selectedLine.geometry.dispose();selectedLine.material.dispose();}
  selectedLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(selectedPath.map(j=>point(j,17))),new THREE.LineBasicMaterial({color:0xffdfa1}));terrainGroup.add(selectedLine);dropMarker.position.copy(point(i,20));
  let distance=0;for(let k=1;k<selectedPath.length;k++){const a=selectedPath[k-1],b=selectedPath[k];distance+=spacing*Math.hypot(a%n-b%n,Math.floor(a/n)-Math.floor(b/n));}
  const last=selectedPath.at(-1);$('distance').textContent=distance>=1000?`${(distance/1000).toFixed(2)} km`:`${Math.round(distance)} m`;$('descent').textContent=`${Math.round(heights[i]-heights[last])} m`;
  $('trace-title').textContent=i===centerIndex?'PATH FROM YOUR LOCATION':'PATH FROM SELECTED POINT';
  const filled=selectedPath.some(j=>hydro.filled[j]-heights[j]>.1);
  $('path-note').textContent=selectedPath.length===1?'This point is already at the study boundary.':`Ends at study boundary${filled?' · crosses filled depressions':''}.`;
  const hs=selectedPath.map(j=>heights[j]),lo=Math.min(...hs),hi=Math.max(...hs);let dist=0;const points=hs.map((h,k)=>{if(k){const a=selectedPath[k-1],b=selectedPath[k];dist+=spacing*Math.hypot(a%n-b%n,Math.floor(a/n)-Math.floor(b/n));}return `${distance?dist/distance*280:0},${5+(hi-h)/Math.max(1,hi-lo)*45}`;}).join(' ');
  $('profile').innerHTML=`<path d="M0 56 L${points.replaceAll(' ',' L')} L280 56 Z" fill="#bada9530"/><polyline points="${points}" fill="none" stroke="#c4dc9f" stroke-width="1.5"/>`;
 }
 select(centerIndex);

 function setView(top){topDown=top;controls.target.set(0,400,0);camera.position.set(top?0:6800,top?14000:9400,top?1:10400);controls.update();$('view3d').classList.toggle('active',!top);$('view2d').classList.toggle('active',top);$('view3d').setAttribute('aria-pressed',!top);$('view2d').setAttribute('aria-pressed',top);}
 setView(false);
 $('view3d').onclick=()=>setView(false);$('view2d').onclick=()=>setView(true);$('reset').onclick=()=>{setView(false);select(centerIndex);};
 $('north').onclick=()=>{const r=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(0,topDown?r:r*.7,topDown?1:r*.714));controls.update();};
 const zoom=f=>{const delta=camera.position.clone().sub(controls.target);delta.setLength(THREE.MathUtils.clamp(delta.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(delta);controls.update();};$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);
 $('network').onchange=e=>network.visible=e.target.checked;$('contours').onchange=e=>contourUniform.value=+e.target.checked;
 $('exaggeration').oninput=e=>{terrainGroup.scale.y=Number(e.target.value);$('exaggeration-value').textContent=`${Number(e.target.value).toFixed(1)}×`;};
 function setSelecting(value){
  selecting=value;
  $('drop').classList.toggle('selecting',value==='flow');
  $('drop').innerHTML=value==='flow'?'⌖ &nbsp; Select a point · Esc to cancel':'⌖ &nbsp; Drop water on the map <span>↗</span>';
  $('flood-source').classList.toggle('selecting',value==='flood');
  $('flood-source').innerHTML=value==='flood'?'⌖ &nbsp; Select source · Esc to cancel':'⌖ &nbsp; Choose water source <span>↗</span>';
  $('hint').textContent=value==='flood'?'Click or tap the terrain to choose a water source':value==='flow'?'Click or tap the terrain to trace water flow':'Drag to orbit · Scroll to zoom · Right-drag to pan';
  renderer.domElement.style.cursor=value?'crosshair':'grab';
  if(value&&matchMedia('(max-width: 600px)').matches)host.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 }
 $('drop').disabled=false;$('drop').onclick=()=>setSelecting(selecting==='flow'?false:'flow');
 window.addEventListener('keydown',e=>{if(e.key==='Escape')setSelecting(false);});
 const raycaster=new THREE.Raycaster();let down;
 renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 renderer.domElement.addEventListener('pointerup',e=>{if(!selecting||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObject(terrain);if(!hits.length)return;const p=terrain.worldToLocal(hits[0].point.clone());const x=Math.max(0,Math.min(n-1,Math.round((p.x/size+.5)*(n-1)))),y=Math.max(0,Math.min(n-1,Math.round((p.z/size+.5)*(n-1))));if(selecting==='flood')waterLayers.selectFloodSource(y*n+x);else select(y*n+x);setSelecting(false);});
 renderer.domElement.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);if(e.key==='Home')setView(false);});
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1,camera.aspect/1.1);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 $('loading').remove();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)$('animation').checked=false;
 let flowTime=0,lastTime=0;const v=new THREE.Vector3();
 renderer.setAnimationLoop(time=>{const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;const animate=$('animation').checked;if(animate)flowTime+=dt;controls.update();
  particles.visible=animate&&network.visible;movingDrop.visible=animate&&selectedPath.length>1;
  for(let k=0;k<particleCount;k++){const offset=(k*53.71+flowTime*2)%flowSegments.length,seg=flowSegments[Math.floor(offset)],a=point(seg[0],15),b=point(seg[1],15);v.lerpVectors(a,b,offset%1);particlePositions.set([v.x,v.y,v.z],k*3);}particleGeom.attributes.position.needsUpdate=true;
  const step=flowTime*9%Math.max(1,selectedPath.length-1),idx=Math.floor(step);movingDrop.position.lerpVectors(point(selectedPath[idx],24),point(selectedPath[Math.min(idx+1,selectedPath.length-1)],24),step%1);
  const labelPosition=pin.localToWorld(new THREE.Vector3(0,160,0)).project(camera);const label=$('point-label');label.style.display=labelPosition.z<1&&Math.abs(labelPosition.x)<.9&&Math.abs(labelPosition.y)<.85?'block':'none';label.style.left=`${(labelPosition.x*.5+.5)*host.clientWidth+12}px`;label.style.top=`${(-labelPosition.y*.5+.5)*host.clientHeight-24}px`;
  $('north-arrow').style.transform=`rotate(${-controls.getAzimuthalAngle()}rad)`;renderer.render(scene,camera);
 });
 window.__watershed={data,hydro,getSelected:()=>selectedStart,getPath:()=>selectedPath,waterLayers,renderer};
}
main().catch(error=>{console.error(error);const loading=$('loading');loading.innerHTML='<h2>Unable to load the landscape</h2><p></p><button class="primary" style="width:auto">Try again</button>';loading.querySelector('p').textContent=error.message;loading.querySelector('button').onclick=()=>location.reload();});
