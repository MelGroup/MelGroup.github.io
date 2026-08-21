const sensEl=document.getElementById('sens');
const sensVal=document.getElementById('sensVal');
var turnSens=1;
sensEl.value=turnSens;
sensVal.textContent=turnSens.toFixed(1)+'x';
sensEl.addEventListener('input',function(){
turnSens=parseFloat(sensEl.value)||1;
sensVal.textContent=turnSens.toFixed(1)+'x';
});
const psEl=document.getElementById('pspeed');
const psVal=document.getElementById('pspeedVal');
var pSpeedMult=1;
psEl.value=pSpeedMult;
psVal.textContent=pSpeedMult.toFixed(1)+'x';
psEl.addEventListener('input',function(){
pSpeedMult=parseFloat(psEl.value)||1;
psVal.textContent=pSpeedMult.toFixed(1)+'x';
});
const msEl=document.getElementById('mspeed');
const msVal=document.getElementById('mspeedVal');
var mSpeedMult=1;
msEl.value=mSpeedMult;
msVal.textContent=mSpeedMult.toFixed(1)+'x';
msEl.addEventListener('input',function(){
mSpeedMult=parseFloat(msEl.value)||1;
msVal.textContent=mSpeedMult.toFixed(1)+'x';
});
document.getElementById('startBtn').onclick=startGame;
document.getElementById('restartBtn').onclick=startGame;
document.getElementById('homeBtn').onclick=function(){
state.running=false;
if(noiseGain)noiseGain.gain.setTargetAtTime(0,ac.currentTime,0.06);
document.getElementById('over').classList.add('hidden');
document.getElementById('start').classList.remove('hidden');
};