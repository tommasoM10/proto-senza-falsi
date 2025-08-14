import {bearingToText} from './utils.js';

const video=document.getElementById('video');
const canvas=document.getElementById('overlay'); const ctx=canvas.getContext('2d');
const menuToggle=document.getElementById('menuToggle'); const dropdown=document.getElementById('dropdown');
const fsBtn=document.getElementById('fsBtn'); const fsBtn2=document.getElementById('fsBtn2');
const guide=document.getElementById('guide'); const guideMeta=document.getElementById('guideMeta'); const gpsMeta=document.getElementById('gpsMeta'); const guideClose=document.getElementById('guideClose'); const arrow=document.getElementById('arrow');
const hud=document.getElementById('hud');
const mapCanvas=document.getElementById('mapCanvas'); const mctx=mapCanvas.getContext('2d');
const mapToggle=document.getElementById('mapToggle');

const sourceSelect=document.getElementById('sourceSelect'); const cameraSelect=document.getElementById('cameraSelect');
const startBtn=document.getElementById('startBtn'); const stopBtn=document.getElementById('stopBtn'); const simulateBtn=document.getElementById('simulateBtn');
const horizonPct=document.getElementById('horizonPct'); const minConf=document.getElementById('minConf'); const minAreaPct=document.getElementById('minAreaPct'); const hitK=document.getElementById('hitK'); const missM=document.getElementById('missM'); const cooldownSec=document.getElementById('cooldownSec');

const meteoInfo=document.getElementById('meteoInfo'); const refreshMeteoBtn=document.getElementById('refreshMeteoBtn');
const gpsStatus=document.getElementById('gpsStatus'); const compStatus=document.getElementById('compStatus');

menuToggle.onclick=()=> dropdown.classList.toggle('open'); fsBtn.onclick=toggleFS; fsBtn2.onclick=toggleFS;
function toggleFS(){ try{ if(document.fullscreenElement){ document.exitFullscreen(); } else { document.documentElement.requestFullscreen(); } }catch{} }
function fit(){ canvas.width=canvas.clientWidth; canvas.height=canvas.clientHeight; } addEventListener('resize', fit); fit();

let currentGPS={lat:null,lon:null,accuracy:null}; let compassDeg=null;
function startGPS(){ if(!navigator.geolocation){ gpsStatus.textContent='GPS non disponibile'; return; } navigator.geolocation.watchPosition(p=>{ currentGPS.lat=p.coords.latitude; currentGPS.lon=p.coords.longitude; currentGPS.accuracy=p.coords.accuracy; gpsStatus.textContent=`GPS: ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`; },()=>{ gpsStatus.textContent='GPS negato o non disponibile'; }, {enableHighAccuracy:true}); }
function startCompass(){ const handler=(e)=>{ compassDeg = e.webkitCompassHeading ?? (360-(e.alpha||0)); compStatus.textContent = 'Bussola: '+(compassDeg!=null?`${Math.round(compassDeg)}°`:'—'); };
  if(window.DeviceOrientationEvent?.requestPermission){ DeviceOrientationEvent.requestPermission().then(s=>{ if(s==='granted') addEventListener('deviceorientation', handler); else compStatus.textContent='Bussola: negata'; }).catch(()=>{ compStatus.textContent='Bussola: non disponibile'; }); } else { addEventListener('deviceorientation', handler); } }

async function refreshMeteo(){ if(!currentGPS.lat){ meteoInfo.textContent='Concedi posizione e riprova.'; return; }
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', currentGPS.lat.toFixed(5)); url.searchParams.set('longitude', currentGPS.lon.toFixed(5));
  url.searchParams.set('timezone','auto'); url.searchParams.set('hourly','ocean_current_velocity,ocean_current_direction');
  try{ const r=await fetch(url); const d=await r.json(); const i=d.hourly.time.findIndex(t=>t.startsWith(new Date().toISOString().slice(0,13))); const k=i>=0?i:0;
    meteoInfo.textContent=`Corrente ${d.hourly.ocean_current_velocity?.[k]?.toFixed?.(2)||'?'} km/h → ${Math.round(d.hourly.ocean_current_direction?.[k]||0)}°`; meteo={v:d.hourly.ocean_current_velocity?.[k]||0, dir:d.hourly.ocean_current_direction?.[k]||0}; }catch{ meteoInfo.textContent='Meteo non disponibile'; meteo=null; } }
refreshMeteoBtn.onclick=refreshMeteo; let meteo=null;

// Audio + Vibrate
let audioCtx=null, osc=null, gain=null;
function startAlarm(){ try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(osc) return; osc=audioCtx.createOscillator(); gain=audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); osc.type='square'; osc.frequency.value=880; gain.gain.value=0.0001; osc.start(); const loop=()=>{ if(!osc) return; const t=audioCtx.currentTime; gain.gain.cancelScheduledValues(t); for(let i=0;i<4;i++){ const on=t+i*0.25; gain.gain.exponentialRampToValueAtTime(0.2,on+0.02); gain.gain.exponentialRampToValueAtTime(0.0001,on+0.15);} setTimeout(loop,1000); }; loop(); }catch(e){} }
function stopAlarm(){ if(osc){ try{osc.stop();}catch{} osc.disconnect(); gain.disconnect(); osc=null; gain=null; } }
function vibrate(){ if(navigator.vibrate) navigator.vibrate([200,100,200,400,200,100,200]); }
function HUD(msg,bg){ hud.textContent=msg; hud.style.display='flex'; hud.style.background=bg||'#0b3357'; clearTimeout(hud._t); hud._t=setTimeout(()=>hud.style.display='none',3000); }

// Camera & Demo
let stream=null, running=false, detector=null, lastAlert=null, lastAlertClearedAt=0; let missCount=0, hitCount=0;
async function startCamera(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  const val=cameraSelect.value; const cons={audio:false, video:{facingMode:(val==='env'?'environment':'user'), width:{ideal:1280}, height:{ideal:720}}}; stream=await navigator.mediaDevices.getUserMedia(cons); video.srcObject=stream; await video.play(); }
function startDemo(){ const c=document.createElement('canvas'); c.width=1280; c.height=720; const g=c.getContext('2d'); let t=0, hide=false, hideStart=0;
  function step(){ if(!running) return; t+=1/30; g.fillStyle='#00304d'; g.fillRect(0,0,c.width,c.height); for(let i=0;i<50;i++){ const y=(i*16+Math.sin((t+i)*0.8)*12)%c.height; g.fillStyle='rgba(255,255,255,0.02)'; g.fillRect(0,y,c.width,2); }
    const bob=Math.sin(t*2)*6; if(!hide){ g.fillStyle='#ffeeaa'; g.beginPath(); g.arc(640,420+bob-26,10,0,Math.PI*2); g.fill(); g.fillStyle='#c0d8ff'; g.fillRect(640-13,420+bob-26+12,26,40); }
    if(Math.floor(t)%12===0 && !hide){ hide=true; hideStart=t; } if(hide && t-hideStart>8){ hide=false; }
    requestAnimationFrame(step);} video.srcObject=c.captureStream(30); video.play(); step(); }

async function ensureModel(){ if(detector) return; try{ detector=await cocoSsd.load({base:'lite_mobilenet_v2'}); }catch{ detector=null; } }
function nms(boxes, iouThresh=0.45){ const out=[]; boxes.sort((a,b)=>b.score-a.score); const used=new Array(boxes.length).fill(false); function IoU(a,b){ const x1=Math.max(a.x,b.x), y1=Math.max(a.y,b.y), x2=Math.min(a.x+a.w,b.x+b.w), y2=Math.min(a.y+a.h,b.y+b.h); const inter=Math.max(0,x2-x1)*Math.max(0,y2-y1); const ua=a.w*a.h+b.w*b.h-inter; return ua>0?inter/ua:0; } for(let i=0;i<boxes.length;i++){ if(used[i]) continue; out.push(boxes[i]); for(let j=i+1;j<boxes.length;j++){ if(IoU(boxes[i],boxes[j])>iouThresh) used[j]=true; } } return out; }
function withinWaterMask(bb,vw,vh){ const hPct=parseFloat(horizonPct.value)/100; const horizonY=vh*hPct; const cy=bb.y+bb.h/2; if(cy<horizonY) return false; const minArea=parseFloat(minAreaPct.value)*1280*720; if(bb.w*bb.h<minArea) return false; const ar=bb.h/(bb.w+1e-3); if(ar<0.5||ar>5) return false; return true; }

function openGuide(lastPoint){ lastAlert={t:performance.now()/1000, last:lastPoint}; document.getElementById('stage').classList.add('flash'); guide.style.display='flex'; startAlarm(); vibrate(); mapCanvas.style.display='block'; }
function closeGuide(){ guide.style.display='none'; document.getElementById('stage').classList.remove('flash'); stopAlarm(); lastAlert=null; lastAlertClearedAt=performance.now()/1000; }
guideClose.onclick=closeGuide; mapToggle.onclick=()=>{ mapCanvas.style.display = (mapCanvas.style.display==='none'||!mapCanvas.style.display) ? 'block':'none'; };

function draw(vw,vh,people){ fit(); ctx.clearRect(0,0,canvas.width,canvas.height); const w=canvas.width, h=canvas.height; const hPct=parseFloat(horizonPct.value)/100; const hy=h*hPct; ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(0,hy); ctx.lineTo(w,hy); ctx.stroke();
  for(const p of people){ const x=p.x/vw*w, y=p.y/vh*h, wd=p.w/vw*w, ht=p.h/vh*h; ctx.lineWidth=2; ctx.strokeStyle='rgba(46,213,115,0.95)'; ctx.strokeRect(x,y,wd,ht); }
  const mx=mapCanvas.clientWidth||220, my=mapCanvas.clientHeight||150; mapCanvas.width=mx; mapCanvas.height=my; mctx.fillStyle='#02253b'; mctx.fillRect(0,0,mx,my);
  if(lastAlert){ const age=performance.now()/1000 - lastAlert.t; let vx=0,vy=0; if(meteo){ const sp=(meteo.v/3.6)*30; const ang=meteo.dir*Math.PI/180; vx=Math.cos(ang)*sp; vy=Math.sin(ang)*sp; }
    const est={x:lastAlert.last.cx + vx*age, y:lastAlert.last.cy + vy*age};
    mctx.fillStyle='#fff'; mctx.beginPath(); mctx.arc(lastAlert.last.cx/vw*mx,lastAlert.last.cy/vh*my,4,0,Math.PI*2); mctx.fill(); mctx.fillStyle='#ff4757'; mctx.beginPath(); mctx.arc(est.x/vw*mx, est.y/vh*my,4,0,Math.PI*2); mctx.fill(); mctx.strokeStyle='rgba(255,255,255,0.6)'; mctx.beginPath(); mctx.moveTo(lastAlert.last.cx/vw*mx,lastAlert.last.cy/vh*my); mctx.lineTo(est.x/vw*mx, est.y/vh*my); mctx.stroke();
    const ang=Math.atan2(vy,vx); arrow.setAttribute('transform', `rotate(${ang*180/Math.PI},100,100)`); guideMeta.textContent=`${age.toFixed(1)} s · corrente ${(meteo?.v??0).toFixed(2)} km/h`; const compText=compassDeg==null?'--':bearingToText(compassDeg); gpsMeta.textContent=currentGPS.lat?`GPS: ${currentGPS.lat.toFixed(5)}, ${currentGPS.lon.toFixed(5)} (±${currentGPS.accuracy?Math.round(currentGPS.accuracy):'--'} m) · Bussola: ${compText}`:'GPS: --'; } }

let lastDetT=0;
async function detectLoop(){ if(!running) return; const nowt=performance.now()/1000; if(nowt-lastDetT<0.2){ requestAnimationFrame(detectLoop); return; } lastDetT=nowt;
  await ensureModel(); const vw=video.videoWidth||1280, vh=video.videoHeight||720; let dets=[];
  if(detector){ try{ const conf=parseFloat(minConf.value); const preds=await detector.detect(video); dets=preds.filter(p=>p.class==='person' && p.score>=conf).map(p=>({x:p.bbox[0],y:p.bbox[1],w:p.bbox[2],h:p.bbox[3],score:p.score})); }catch(e){} }
  dets=dets.filter(bb=> withinWaterMask(bb,vw,vh)); dets=nms(dets,0.45);
  if(dets.length>0){ hitCount++; missCount=0; } else { missCount++; }
  draw(vw,vh,dets);
  const K=parseInt(hitK.value,10), M=parseInt(missM.value,10), cd=parseFloat(cooldownSec.value);
  const eligible=(nowt-lastAlertClearedAt)>cd;
  if(hitCount>=K){ const bb=dets[0]; window._lastSeen={cx:bb?bb.x+bb.w/2:vw*0.5, cy:bb?bb.y+bb.h/2:vh*0.6}; }
  if(hitCount>=K && missCount>=M && !lastAlert && eligible){ openGuide({cx:(window._lastSeen?.cx||vw*0.5), cy:(window._lastSeen?.cy||vh*0.6)}); HUD('ALLERTA','#ff4757'); }
  requestAnimationFrame(detectLoop);
}

simulateBtn.onclick=()=>{ const vw=video.videoWidth||1280, vh=video.videoHeight||720; openGuide({cx:vw*0.5, cy:vh*0.6}); };

startBtn.onclick=async ()=>{ try{ dropdown.classList.remove('open'); running=true; fit(); startGPS(); startCompass(); if(sourceSelect.value==='camera'){ await startCamera(); } else { startDemo(); } detectLoop(); HUD('Sessione avviata','#0b3357'); }catch(e){ alert('Errore: '+e.message); running=false; } };
stopBtn.onclick=()=>{ running=false; if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } closeGuide(); HUD('Sessione terminata','#0b3357'); };

canvas.addEventListener('click',(e)=>{ const r=canvas.getBoundingClientRect(); const cx=(e.clientX-r.left)/r.width*canvas.width; const cy=(e.clientY-r.top)/r.height*canvas.height; window._lastSeen={cx,cy}; HUD('Ultimo punto impostato','#0b3357'); });

