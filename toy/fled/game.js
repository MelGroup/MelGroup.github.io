
const CW=7,CH=7;
const MW=4*CW+1,MH=4*CH+1;
const map=[];
function genMap(){
map.length=0;
for(let y=0;y<MH;y++){const r=new Array(MW).fill(1);map.push(r);}
for(let ci=0;ci<CW;ci++)for(let cj=0;cj<CH;cj++){
map[4*cj+1][4*ci+1]=0;map[4*cj+1][4*ci+2]=0;
map[4*cj+2][4*ci+1]=0;map[4*cj+2][4*ci+2]=0;
}
const linked=[];
for(let i=0;i<CW;i++)linked.push(new Uint8Array(CH));
const frontier=[];
const startC=[Math.floor(Math.random()*CW),Math.floor(Math.random()*CH)];
linked[startC[0]][startC[1]]=1;
frontier.push(startC);
function addNeighbors(c){
const ci=c[0],cj=c[1];
if(ci>0&&!linked[ci-1][cj])frontier.push([ci-1,cj]);
if(ci<CW-1&&!linked[ci+1][cj])frontier.push([ci+1,cj]);
if(cj>0&&!linked[ci][cj-1])frontier.push([ci,cj-1]);
if(cj<CH-1&&!linked[ci][cj+1])frontier.push([ci,cj+1]);
}
function carve(a,b){
const ci=a[0],cj=a[1];
if(b[0]===ci-1){for(let k=0;k<2;k++){map[4*cj+1+k][4*ci-1]=0;map[4*cj+1+k][4*ci]=0;}}
else if(b[0]===ci+1){for(let k=0;k<2;k++){map[4*cj+1+k][4*ci+3]=0;map[4*cj+1+k][4*ci+4]=0;}}
else if(b[1]===cj-1){for(let k=0;k<2;k++){map[4*cj-1][4*ci+1+k]=0;map[4*cj][4*ci+1+k]=0;}}
else{for(let k=0;k<2;k++){map[4*cj+3][4*ci+1+k]=0;map[4*cj+4][4*ci+1+k]=0;}}
}
addNeighbors(startC);
while(frontier.length){
const idx=Math.floor(Math.random()*frontier.length);
const c=frontier.splice(idx,1)[0];
if(linked[c[0]][c[1]])continue;
linked[c[0]][c[1]]=1;
const ci=c[0],cj=c[1];
const cand=[];
if(ci>0&&linked[ci-1][cj])cand.push([ci-1,cj]);
if(ci<CW-1&&linked[ci+1][cj])cand.push([ci+1,cj]);
if(cj>0&&linked[ci][cj-1])cand.push([ci,cj-1]);
if(cj<CH-1&&linked[ci][cj+1])cand.push([ci,cj+1]);
if(cand.length)carve(cand[Math.floor(Math.random()*cand.length)],c);
addNeighbors(c);
}
for(let ci=0;ci<CW;ci++)for(let cj=0;cj<CH;cj++){
if(ci<CW-1&&Math.random()<0.4&&map[4*cj+1][4*ci+3]===1&&map[4*cj+1][4*ci+4]===1){
carve([ci,cj],[ci+1,cj]);
}
if(cj<CH-1&&Math.random()<0.4&&map[4*cj+3][4*ci+1]===1&&map[4*cj+4][4*ci+1]===1){
carve([ci,cj],[ci,cj+1]);
}
}
}
genMap();
const FOV=Math.PI/3;
const HALF_FOV=FOV/2;
const PLAYER_R=0.3;
const MONSTER_R=0.35;
const MOVE_SPEED=3.0;
const TURN_SPEED=1.6;
const MONSTER_SPEED=2.4;
const PROX=6.5;
var turnSens=1;
var pSpeedMult=1;
var mSpeedMult=1;
const CAPTURE=0.8;
const MAP_R=5;
const START_CELLS=[[0,0],[CW-1,0],[0,CH-1],[CW-1,CH-1]];
const viewCanvas=document.getElementById('view');
const viewCtx=viewCanvas.getContext('2d');
const mapCanvas=document.getElementById('map');
const mapCtx=mapCanvas.getContext('2d');
let W,H;
const lightCv=document.createElement('canvas');
const warnEl=document.getElementById('warn');
const bloodEl=document.getElementById('blood');
let snowInten=0;
const mosaicCv=document.createElement('canvas');
let ac=null,noiseGain=null;
function ensureAudio(){
if(!ac){
try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(err){return;}
const rate=ac.sampleRate;
const buf=ac.createBuffer(1,Math.max(2,rate*2),rate);
const d=buf.getChannelData(0);
for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.5;
const src=ac.createBufferSource();
src.buffer=buf;src.loop=true;
noiseGain=ac.createGain();noiseGain.gain.value=0;
const f=ac.createBiquadFilter();
f.type='highpass';f.frequency.value=1800;f.Q.value=0.7;
const f2=ac.createBiquadFilter();
f2.type='bandpass';f2.frequency.value=2600;f2.Q.value=1.2;
src.connect(f);f.connect(f2);f2.connect(noiseGain);noiseGain.connect(ac.destination);
src.start();
}
if(ac.state==='suspended')ac.resume();
}
const timeEl=document.getElementById('time');
const staminaBar=document.getElementById('staminaBar');
const mapToggle=document.getElementById('mapToggle');
let mapOn=true;
mapToggle.addEventListener('click',()=>{
mapOn=!mapOn;
document.getElementById('mapbox').classList.toggle('off',!mapOn);
});
let lastHue=-1;
let mPath=[],mPathIdx=0,planT=0;
const zbuf=new Float32Array(1024);
function buildLight(){
lightCv.width=Math.max(2,Math.floor(W*0.4));
lightCv.height=Math.max(2,Math.floor(H*0.4));
const lc=lightCv.getContext('2d');
const g=lc.createRadialGradient(lightCv.width*0.5,lightCv.height*0.45,0,lightCv.width*0.5,lightCv.height*0.45,Math.max(lightCv.width,lightCv.height)*0.5);
g.addColorStop(0,'rgba(255,238,205,0.09)');
g.addColorStop(0.5,'rgba(255,230,180,0.045)');
g.addColorStop(1,'rgba(255,230,180,0)');
lc.fillStyle=g;
lc.fillRect(0,0,lightCv.width,lightCv.height);
}
function playStep(v){
if(!ac)return;
if(ac.state==='suspended')ac.resume();
const t0=ac.currentTime;
const dur=0.09;
const buf=ac.createBuffer(1,Math.max(2,Math.floor(ac.sampleRate*dur)),ac.sampleRate);
const d=buf.getChannelData(0);
for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
const s=ac.createBufferSource();s.buffer=buf;
const g=ac.createGain();
g.gain.setValueAtTime(v,t0);
g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=600;
s.connect(f);f.connect(g);g.connect(ac.destination);
s.start(t0);
}
function findPath(){
const sy0=Math.floor(state.my),sx0=Math.floor(state.mx);
const gy=Math.floor(state.py),gx=Math.floor(state.px);
if(sx0===gx&&sy0===gy)return [];
const dist=new Uint8Array(MW*MH);
dist.fill(255);
const q=[sx0+sy0*MW];
dist[sx0+sy0*MW]=0;
const qx=[1,-1,0,0],qy=[0,0,1,-1];
let head=0;
while(head<q.length){
const cur=q[head++];
const cx=cur%MW,cy=(cur/MW)|0;
if(cx===gx&&cy===gy)break;
for(let d=0;d<4;d++){
const nx=cx+qx[d],ny=cy+qy[d];
if(nx<0||nx>=MW||ny<0||ny>=MH)continue;
if(map[ny][nx]===1)continue;
const ni=nx+ny*MW;
if(dist[ni]>dist[cur]+1){dist[ni]=dist[cur]+1;q.push(ni);}
}
}
const path=[];
if(dist[gx+gy*MW]<255){
let cx=gx,cy=gy;
while(!(cx===sx0&&cy===sy0)){
path.unshift([cx,cy]);
let best=255,bx=cx,by=cy;
for(let d=0;d<4;d++){
const nx=cx+qx[d],ny=cy+qy[d];
if(nx<0||nx>=MW||ny<0||ny>=MH)continue;
if(map[ny][nx]===1)continue;
const nd=dist[nx+ny*MW];
if(nd<best){best=nd;bx=nx;by=ny;}
}
cx=bx;cy=by;
}
}
return path;
}
const imgFloor=new Image();
const imgWall=new Image();
const imgMelon=new Image();
imgFloor.src='./assets/MetalBlockTile.png';
imgWall.src='./assets/acid_wall_background.png';
imgMelon.src='./assets/melon icon.png';
const texFloor=document.createElement('canvas');
texFloor.width=128;texFloor.height=128;
const texWall=document.createElement('canvas');
texWall.width=64;texWall.height=256;
const texMelon=document.createElement('canvas');
texMelon.width=128;texMelon.height=128;
let wallReady=false,floorReady=false,melonReady=false;
function buildFloor(){
const f=texFloor.getContext('2d');
f.fillStyle='#1f1f22';f.fillRect(0,0,128,128);
if(imgFloor.width>1)f.drawImage(imgFloor,0,0,128,128);
f.fillStyle='rgba(0,0,0,0.5)';f.fillRect(0,0,128,128);
floorReady=true;
}
function buildWall(){
const t=texWall.getContext('2d');
t.fillStyle='#18181c';t.fillRect(0,0,64,256);
if(imgWall.width>1){for(let r=0;r<4;r++)t.drawImage(imgWall,0,r*64,64,64);}
const g=t.createLinearGradient(0,0,0,256);
g.addColorStop(0,'rgba(0,0,0,0.5)');g.addColorStop(0.5,'rgba(0,0,0,0.05)');g.addColorStop(1,'rgba(0,0,0,0.5)');
t.fillStyle=g;t.fillRect(0,0,64,256);
wallReady=true;
}
function buildMelon(){
const m=texMelon.getContext('2d');
m.fillStyle='rgba(0,0,0,0)';m.clearRect(0,0,128,128);
if(imgMelon.width>1)m.drawImage(imgMelon,0,0,128,128);
else{m.fillStyle='#c00';m.beginPath();m.arc(64,64,60,0,Math.PI*2);m.fill();}
m.fillStyle='rgba(0,0,0,0.35)';m.fillRect(0,0,128,128);
melonReady=true;
}
imgFloor.onload=buildFloor;
imgWall.onload=buildWall;
imgMelon.onload=buildMelon;
imgFloor.onerror=buildFloor;
imgWall.onerror=buildWall;
imgMelon.onerror=buildMelon;
buildFloor();buildWall();buildMelon();
const state={
running:false,startTime:0,elapsed:0,
px:0,py:0,pDir:0,walkT:0,stepAcc:0,stamina:100,exhaustT:0,mx:0,my:0,
keys:{},
joy:{active:false,dx:0,dy:0},
turnTouch:null,joyTouch:null,turnOn:false,lastTX:0,
lockOn:false
};
function resize(){
const dpr=Math.min(window.devicePixelRatio||1,1.25);
W=window.innerWidth;H=window.innerHeight;
viewCanvas.width=W*dpr;viewCanvas.height=H*dpr;
viewCtx.setTransform(dpr,0,0,dpr,0,0);
mapCanvas.width=264;mapCanvas.height=264;
mapCtx.setTransform(2,0,0,2,0,0);
buildLight();
}
window.addEventListener('resize',resize);
resize();
function inWall(x,y){
const ix=Math.floor(x),iy=Math.floor(y);
if(ix<0||ix>=MW||iy<0||iy>=MH)return true;
return map[iy][ix]===1;
}
function cornersOk(x,y,r){
return !inWall(x-r,y-r)&&!inWall(x+r,y-r)&&!inWall(x-r,y+r)&&!inWall(x+r,y+r);
}
function startGame(){
ensureAudio();
genMap();
mPath=[];mPathIdx=0;planT=0;
const s=START_CELLS[Math.floor(Math.random()*START_CELLS.length)];
state.px=4*s[0]+1.5;state.py=4*s[1]+1.5;
state.pDir=Math.random()*Math.PI*2;
const em=START_CELLS.filter(c=>!(c[0]===s[0]&&c[1]===s[1]));
const m=em[Math.floor(Math.random()*em.length)];
state.mx=4*m[0]+1.5;state.my=4*m[1]+1.5;
state.stamina=100;
state.running=true;
state.startTime=performance.now();
state.elapsed=0;
document.getElementById('start').classList.add('hidden');
document.getElementById('over').classList.add('hidden');
}
function endGame(){
state.running=false;
if(noiseGain)noiseGain.gain.setTargetAtTime(0,ac.currentTime,0.08);
document.getElementById('survived').textContent=Math.floor(state.elapsed);
document.getElementById('over').classList.remove('hidden');
}
function isMobile(){return 'ontouchstart' in window||navigator.maxTouchPoints>0;}
function jbRect(){
const r=document.getElementById('jbase').getBoundingClientRect();
return {cx:r.left+r.width/2,cy:r.top+r.height/2};
}
const jknob=document.getElementById('jknob');
function moveKnob(cx,cy){
const b=jbRect();
let dx=cx-b.cx,dy=cy-b.cy;
const d=Math.hypot(dx,dy),max=35;
if(d>max){dx=dx/d*max;dy=dy/d*max;}
state.joy.active=true;state.joy.dx=dx/35;state.joy.dy=dy/35;
jknob.style.left=(40+dx)+'px';jknob.style.top=(40+dy)+'px';
}
function resetKnob(){
state.joy.active=false;state.joy.dx=0;state.joy.dy=0;
state.joyTouch=null;
jknob.style.left='40px';jknob.style.top='40px';
}
document.addEventListener('touchstart',e=>{
if(!state.running)return;
for(const t of e.changedTouches){
const mt=document.getElementById('mapToggle').getBoundingClientRect();
if(t.clientX>=mt.left&&t.clientX<=mt.right&&t.clientY>=mt.top&&t.clientY<=mt.bottom)continue;
const b=jbRect();
if(t.clientX<b.cx+90&&t.clientX>b.cx-90&&t.clientY<b.cy+90&&t.clientY>b.cy-90&&!state.joyTouch){
state.joyTouch=t.identifier;moveKnob(t.clientX,t.clientY);
}else if(!state.turnTouch){
state.turnTouch=t.identifier;state.turnOn=true;state.lastTX=t.clientX;state.lastTY=t.clientY;
}
}
},{passive:false});
document.addEventListener('touchmove',e=>{
if(!state.running)return;
for(const t of e.changedTouches){
if(t.identifier===state.joyTouch){moveKnob(t.clientX,t.clientY);}
else if(t.identifier===state.turnTouch){
state.pDir+=(t.clientX-state.lastTX)*0.010*turnSens;
state.lastTX=t.clientX;state.lastTY=t.clientY;
}
}
},{passive:false});
document.addEventListener('touchend',e=>{
for(const t of e.changedTouches){
if(t.identifier===state.joyTouch)resetKnob();
if(t.identifier===state.turnTouch){state.turnTouch=null;state.turnOn=false;}
}
});
window.addEventListener('keydown',e=>{
state.keys[e.key.toLowerCase()]=true;
if(e.key==='Tab'){
e.preventDefault();
mapOn=!mapOn;
document.getElementById('mapbox').classList.toggle('off',!mapOn);
}
if(e.key.startsWith('Arrow'))e.preventDefault();
});
window.addEventListener('keyup',e=>{state.keys[e.key.toLowerCase()]=false;});
viewCanvas.addEventListener('click',()=>{
if(state.running&&!isMobile())try{viewCanvas.requestPointerLock();}catch(err){}
});
document.addEventListener('mousemove',e=>{
if(state.lockOn&&state.running){
state.pDir+=e.movementX*0.0025*turnSens;
}
else if(state.turnOn&&state.running){
state.pDir+=(e.clientX-state.lastTX)*0.010*turnSens;
state.lastTX=e.clientX;state.lastTY=e.clientY;
}
});
viewCanvas.addEventListener('mousedown',e=>{
if(state.running&&!state.turnOn){state.turnOn=true;state.lastTX=e.clientX;state.lastTY=e.clientY;}
});
window.addEventListener('mouseup',()=>{state.turnOn=false;});
document.addEventListener('pointerlockchange',()=>{state.lockOn=document.pointerLockElement===viewCanvas;});
function castRay(ox,oy,angle){
const rx=Math.cos(angle),ry=Math.sin(angle);
let mapX=Math.floor(ox),mapY=Math.floor(oy);
const ddx=Math.abs(1/rx)||1e30,ddY=Math.abs(1/ry)||1e30;
let sdx,sdy,sdxStep,sdyStep,sdX,sdY;
if(rx<0){sdxStep=-1;sdX=(ox-mapX)*ddx;}
else{sdxStep=1;sdX=(mapX+1-ox)*ddx;}
if(ry<0){sdyStep=-1;sdY=(oy-mapY)*ddY;}
else{sdyStep=1;sdY=(mapY+1-oy)*ddY;}
let hit=0,side=0,steps=0,wallX=0;
while(!hit&&steps<100){
if(sdX<sdY){sdX+=ddx;mapX+=sdxStep;side=0;}
else{sdY+=ddY;mapY+=sdyStep;side=1;}
if(mapX>=0&&mapX<MW&&mapY>=0&&mapY<MH&&map[mapY][mapX]===1){hit=1;}
steps++;
}
let perp=0;
if(side===0){perp=sdX-ddx;wallX=oy+perp*ry;}
else{perp=sdY-ddY;wallX=ox+perp*rx;}
wallX-=Math.floor(wallX);
return {perp,side,wallX};
}
function update(dt){
if(!state.running)return;
state.elapsed=(performance.now()-state.startTime)/1000;
let mx=0,my=0;
const fx=Math.cos(state.pDir),fy=Math.sin(state.pDir);
const rx=-fy,ry=fx;
if(state.keys.w||state.keys['arrowup'])my+=1;
if(state.keys.s||state.keys['arrowdown'])my-=1;
if(state.keys.a||state.keys['arrowleft'])mx-=1;
if(state.keys.d||state.keys['arrowright'])mx+=1;
if(state.joy.active){
mx+=state.joy.dx;my+=-state.joy.dy;
}
const len=Math.hypot(mx,my);
const il=len>0.01?1/len:0;
const joyLen=Math.hypot(state.joy.dx,state.joy.dy);
if(state.exhaustT>0)state.exhaustT-=dt;
const wantRun=isMobile()?joyLen>0.6:!!state.keys.shift;
const running=wantRun&&state.stamina>0&&state.exhaustT<=0&&len>0.01;
if(running)state.stamina=Math.max(0,state.stamina-17*dt);
else state.stamina=Math.min(100,state.stamina+8*dt);
if(state.stamina<=0&&state.exhaustT<=0)state.exhaustT=2.1;
const ramp=0.7+0.3*(isMobile()?joyLen:1);
const speed=(MOVE_SPEED*pSpeedMult*(running?1.2:1)*ramp);
const moved=speed*dt;
const mvx=(fx*my+rx*mx)*il*moved;
const mvy=(fy*my+ry*mx)*il*moved;
let didMove=false;
if(cornersOk(state.px+mvx,state.py,PLAYER_R)){state.px+=mvx;didMove=true;}
if(cornersOk(state.px,state.py+mvy,PLAYER_R)){state.py+=mvy;didMove=true;}
if(state.keys.arrowleft)state.pDir-=TURN_SPEED*dt*turnSens;
if(state.keys.arrowright)state.pDir+=TURN_SPEED*dt*turnSens;
const pct=Math.round(state.stamina);
if(pct!==lastHue){
lastHue=pct;
staminaBar.style.width=pct+'%';
staminaBar.style.background='hsl('+Math.round(pct*1.3)+',85%,48%)';
}
if(didMove&&il>0.01){
state.walkT+=speed*dt*4.5;
state.stepAcc+=speed*dt;
if(state.stepAcc>0.65){
state.stepAcc=0;
playStep(running?0.9:0.55);
}
}else{
state.walkT+=(1-Math.min(1,state.walkT))*dt*4;
state.stepAcc=0;
}
const ddx=state.px-state.mx,ddy=state.py-state.my;
const dist=Math.hypot(ddx,ddy);
if(dist<CAPTURE){endGame();return;}
const step=MONSTER_SPEED*mSpeedMult*dt;
let vis=true;
const visSteps=Math.max(2,Math.ceil(dist*4));
for(let i=1;i<visSteps;i++){
const px=state.mx+ddx*i/visSteps,py=state.my+ddy*i/visSteps;
if(inWall(px,py)){vis=false;break;}
}
if(vis){
const n1=state.mx+ddx/dist*step,n2=state.my+ddy/dist*step;
if(cornersOk(n1,n2,MONSTER_R)){state.mx=n1;state.my=n2;}
else if(cornersOk(n1,state.my,MONSTER_R))state.mx=n1;
else if(cornersOk(state.mx,n2,MONSTER_R))state.my=n2;
}else{
planT-=dt;
if(planT<=0||mPathIdx>=mPath.length){
const path=findPath();
if(path.length>1)mPath=path;
mPathIdx=0;
planT=0.35;
}
if(mPathIdx<mPath.length){
const cx=mPath[mPathIdx][0],cy=mPath[mPathIdx][1];
const tx=cx+0.5,ty=cy+0.5;
const ax=tx-state.mx,ay=ty-state.my;
const ad=Math.hypot(ax,ay);
if(ad<0.3){mPathIdx++;if(mPathIdx>=mPath.length)mPath=[];}
else{
const n1=state.mx+ax/ad*step,n2=state.my+ay/ad*step;
if(cornersOk(n1,n2,MONSTER_R)){state.mx=n1;state.my=n2;}
else if(cornersOk(n1,state.my,MONSTER_R))state.mx=n1;
else if(cornersOk(state.mx,n2,MONSTER_R))state.my=n2;
}
}
}
const pd=Math.hypot(state.px-state.mx,state.py-state.my);
const inten=Math.max(0,Math.min(1,(6.5-pd)/4.5));
const msn=Math.max(0,Math.min(1,(12-pd)/10));
snowInten=msn*msn;
bloodEl.style.opacity=(inten*inten*0.92).toFixed(2);
if(noiseGain&&ac)noiseGain.gain.setTargetAtTime(inten*inten*0.6,ac.currentTime,0.12);
if(pd<PROX){
warnEl.style.display='block';
warnEl.style.filter='blur('+(0.4+Math.random()*1.6).toFixed(2)+'px)';
const jx=((Math.random()-0.5)*12).toFixed(1),jy=((Math.random()-0.5)*12).toFixed(1);
warnEl.style.transform='translate('+jx+'px,'+jy+'px)';
}else{warnEl.style.display='none';}
const t=Math.floor(state.elapsed);
timeEl.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}
function render(){
viewCtx.fillStyle='#000';viewCtx.fillRect(0,0,W,H);
if(!state.running)return;
const cols=Math.max(30,Math.floor(W/4));
const stripW=W/cols;
zbuf.fill(0);
for(let i=0;i<cols;i++){
const sx=i*stripW;
const rayA=state.pDir-HALF_FOV+FOV*i/cols;
const r=castRay(state.px,state.py,rayA);
const perp=r.perp;
let lineH=H/perp;
if(lineH>H)lineH=H;
const bob=Math.sin(state.walkT)*H*0.008;
const horizon=H/2+bob;
let top=horizon-lineH/2,bot=horizon+lineH/2;
if(top<0)top=0;
if(bot>H)bot=H;
const aOff=Math.abs(i/cols-0.5)*2;
const cone=Math.pow(Math.max(0,1-aOff*0.85),2);
const dF=Math.max(0,Math.min(1,1/(1+perp*0.4)));
let b=cone*dF;
viewCtx.fillStyle='#000';
viewCtx.fillRect(sx,0,stripW,top);
viewCtx.fillRect(sx,bot,stripW,H-bot);
if(b>0.02){
viewCtx.fillStyle='rgb('+Math.round(26*b)+','+Math.round(23*b)+','+Math.round(19*b)+')';
viewCtx.globalAlpha=0.5;
viewCtx.fillRect(sx,0,stripW,top);
viewCtx.globalAlpha=1;
}
if(wallReady&&b>0.02){
const texU=Math.floor(r.wallX*texWall.width);
const sliceH=lineH/4;
for(let y=0;y<4;y++){
const y0=Math.max(0,Math.floor(top+y*sliceH));
const y1=Math.min(H,Math.ceil(top+(y+1)*sliceH));
if(y1<=y0)continue;
viewCtx.globalAlpha=b*0.9*(r.side===0?0.62:1);
viewCtx.drawImage(texWall,texU,y*64,1,64,sx,y0,stripW,y1-y0);
}
viewCtx.globalAlpha=1;
}
zbuf[i]=perp;
if(floorReady&&b>0.02){
const bob=Math.sin(state.walkT)*H*0.008;
const horizon=H/2+bob;
for(let y=Math.max(0,Math.ceil(horizon+lineH/2));y<H;y+=4){
const cDist=H/(2*(y-horizon))||1;
const viewX=(2*y/W-1)*Math.tan(HALF_FOV)*cDist;
const ftX=state.px+Math.cos(rayA)*perp+Math.cos(rayA+Math.PI/2)*viewX;
const ftY=state.py+Math.sin(rayA)*perp+Math.sin(rayA+Math.PI/2)*viewX;
if(cDist>10)continue;
const dF2=Math.max(0,1-cDist/10)*b*0.6;
if(dF2<0.03)continue;
viewCtx.globalAlpha=dF2;
viewCtx.drawImage(texFloor,Math.floor((((ftX%1)+1)%1)*128),Math.floor((((ftY%1)+1)%1)*128),1,1,sx,y,stripW,4);
}
viewCtx.globalAlpha=1;
}
}
if(melonReady){
const dx=state.mx-state.px,dy=state.my-state.py;
const proj=dx*Math.cos(state.pDir)+dy*Math.sin(state.pDir);
const rightX=dx*(-Math.sin(state.pDir))+dy*Math.cos(state.pDir);
if(proj>0.2){
const screenX=W/2+(rightX/proj)*(W/(2*Math.tan(HALF_FOV)));
const aOff=Math.abs(screenX/W-0.5)*2;
const cone=Math.pow(Math.max(0,1-aOff*0.9),2);
const dF=Math.max(0,Math.min(1,1/(1+proj*0.5)));
const b=cone*dF;
const sc=H/proj;
const col=Math.floor(screenX/stripW);
if(screenX>-sc&&screenX<W+sc&&col>=0&&col<cols&&zbuf[col]>proj-0.2&&b>0.03){
const sz=sc*1.6;
const bob=Math.sin(state.walkT)*H*0.008;
const horizon=H/2+bob;
viewCtx.globalAlpha=Math.min(1,b*1.3);
viewCtx.drawImage(texMelon,screenX-sz/2,horizon-sz/2,sz,sz);
viewCtx.globalAlpha=1;
}
}
}
viewCtx.globalAlpha=0.9+Math.random()*0.1;
viewCtx.drawImage(lightCv,0,0,W,H);
viewCtx.globalAlpha=1;
if(snowInten>0.05){
const bs=3+Math.floor(snowInten*30);
mosaicCv.width=Math.max(2,Math.floor(W/bs));
mosaicCv.height=Math.max(2,Math.floor(H/bs));
const mc=mosaicCv.getContext('2d');
mc.imageSmoothingEnabled=false;
mc.drawImage(viewCanvas,0,0,mosaicCv.width,mosaicCv.height);
viewCtx.imageSmoothingEnabled=false;
viewCtx.drawImage(mosaicCv,0,0,W,H);
viewCtx.imageSmoothingEnabled=true;
}
renderMap();
}
function renderMap(){
const size=132;
mapCtx.fillStyle='#07090d';mapCtx.fillRect(0,0,size,size);
const cw=size/(MAP_R*2+1);
const pcx=(MAP_R+0.5)*cw,pcy=(MAP_R+0.5)*cw;
for(let dy=-MAP_R;dy<=MAP_R;dy++){
for(let dx=-MAP_R;dx<=MAP_R;dx++){
const mxg=Math.floor(state.px)+dx,myg=Math.floor(state.py)+dy;
if(mxg<0||mxg>=MW||myg<0||myg>=MH)continue;
const px0=(dx+MAP_R)*cw,py0=(dy+MAP_R)*cw;
if(map[myg][mxg]===1){
mapCtx.fillStyle='#1b202b';
mapCtx.fillRect(px0,py0,cw,cw);
}else{
mapCtx.fillStyle='#3d4450';
mapCtx.fillRect(px0,py0,cw,cw);
}
}
}
const psz=PLAYER_R*cw;
const pxx=pcx+((state.px%1)-0.5)*cw;
const pyy=pcy+((state.py%1)-0.5)*cw;
mapCtx.fillStyle='#22e06a';
mapCtx.beginPath();mapCtx.arc(pxx,pyy,psz,0,Math.PI*2);mapCtx.fill();
const aLen=psz*2.4,headLen=psz*1.2;
const ex=pxx+Math.cos(state.pDir)*aLen,ey=pyy+Math.sin(state.pDir)*aLen;
mapCtx.fillStyle='#7dffa8';
mapCtx.beginPath();
mapCtx.moveTo(ex,ey);
mapCtx.lineTo(ex-Math.cos(state.pDir-0.45)*headLen,ey-Math.sin(state.pDir-0.45)*headLen);
mapCtx.lineTo(ex-Math.cos(state.pDir+0.45)*headLen,ey-Math.sin(state.pDir+0.45)*headLen);
mapCtx.closePath();
mapCtx.fill();
const mxg=pcx+(state.mx-state.px)*cw,myg=pcy+(state.my-state.py)*cw;
if(mxg>-8&&mxg<size+8&&myg>-8&&myg<size+8){
mapCtx.fillStyle='#ff4655';
mapCtx.beginPath();mapCtx.arc(mxg,myg,MONSTER_R*cw,0,Math.PI*2);mapCtx.fill();
}
}
let lastT=performance.now();
function loop(t){
const dt=Math.min(0.05,(t-lastT)/1000);
lastT=t;
update(dt);render();
requestAnimationFrame(loop);
}
requestAnimationFrame(loop);