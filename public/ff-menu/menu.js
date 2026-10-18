
let authToken=null,currentKeyId=null,keyExpiry=null,spoofColor='00FF00';
let menuPolicy={maintenance:false,disabled:[],features:[]};
let toastTimer=null;
let currentKeyInfo=null,keyInfoReceivedAt=0,keyInfoServerTime=0,applyingConfig=false;
let sessionGeneration=0;
const gameLaunchTargets={freefire:{name:'Free Fire',url:'freefire://'},freefiremax:{name:'Free Fire MAX',url:'freefiremax://'}};
function selectedLaunchGame(){
  const id=document.getElementById('launch-game').value;
  return Object.hasOwn(gameLaunchTargets,id)?gameLaunchTargets[id]:gameLaunchTargets.freefire;
}
function rememberLaunchGame(){
  const select=document.getElementById('launch-game');
  if(!Object.hasOwn(gameLaunchTargets,select.value))select.value='freefire';
  try{localStorage.setItem('phtrunghieu_menu_launch_game',select.value);}catch(e){}
  const game=selectedLaunchGame(),link=document.getElementById('open-game-link');
  link.href=game.url;link.textContent='Mở '+game.name;
}
function launchSelectedGame(game){
  const link=document.getElementById('open-game-link');
  link.href=game.url;link.textContent='Mở '+game.name;link.classList.remove('hidden');
  // Keep a direct, gesture-driven link available if async navigation is blocked.
  try{window.location.assign(game.url);}catch(e){}
}
// Never place the complete key in text, title, aria or data attributes.
function maskMenuKey(value){
  const key=String(value||'');
  if(!key)return '—';
  const characters=Array.from(key);
  if(characters.length<=4)return '••••';
  const edge=Math.min(4,Math.floor((characters.length-1)/2));
  return characters.slice(0,edge).join('')+'••••••'+characters.slice(-edge).join('');
}
function formatKeyDate(value){
  if(!value)return '—';
  const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('vi-VN',{hour12:false}):'—';
}
function formatKeyDuration(seconds){
  if(seconds==null)return 'Không giới hạn';
  const value=Math.max(0,Math.floor(Number(seconds)||0)),days=Math.floor(value/86400);
  const clock=[Math.floor(value%86400/3600),Math.floor(value%3600/60),value%60].map(v=>String(v).padStart(2,'0')).join(':');
  return (days?days+' ngày ':'')+clock;
}
function updateKeyCountdown(){
  if(!currentKeyInfo)return;
  const info=currentKeyInfo;
  const now=keyInfoServerTime+(Date.now()-keyInfoReceivedAt);
  const expiry=info.expiresAt?Date.parse(info.expiresAt):null;
  const remaining=expiry==null?null:Math.max(0,Math.floor((expiry-now)/1000));
  document.getElementById('timer').textContent=formatKeyDuration(remaining);
  const start=info.activatedAt?Date.parse(info.activatedAt):NaN;
  const duration=expiry!=null&&Number.isFinite(start)&&expiry>start?(expiry-start)/1000:Number(info.durationSeconds);
  const percent=remaining==null?100:duration>0?Math.min(100,Math.max(0,remaining/duration*100)):0;
  document.getElementById('key-progress').style.width=percent+'%';
  document.getElementById('t-percent').textContent=remaining==null?'Vĩnh viễn':Math.round(percent)+'%';
}
function renderKeyInfo(info,serverTime){
  if(!info)return;
  const {key,...metadata}=info;
  currentKeyInfo=metadata;keyInfoReceivedAt=Date.now();
  keyInfoServerTime=Date.parse(serverTime)||keyInfoReceivedAt;
  const plan={free:'Miễn phí',trial:'Dùng thử',daily:'Ngày',weekly:'Tuần',monthly:'Tháng',lifetime:'Vĩnh viễn'}[info.plan]||info.plan||'—';
  const text=(id,value)=>{document.getElementById(id).textContent=value;};
  if(key!==undefined)text('key-code',maskMenuKey(key));
  text('t-plan',plan);
  text('key-activated',formatKeyDate(info.activatedAt));
  text('key-expiry',info.expiresAt?formatKeyDate(info.expiresAt):'Không giới hạn');
  text('t-expiry',info.expiresAt?new Date(info.expiresAt).toLocaleDateString('vi-VN'):'Vĩnh viễn');
  updateKeyCountdown();
}
try{
  const stored=localStorage.getItem('phtrunghieu_menu_launch_game');
  if(Object.hasOwn(gameLaunchTargets,stored))document.getElementById('launch-game').value=stored;
}catch(e){}
rememberLaunchGame();
setInterval(updateKeyCountdown,1000);

const featureElements={espBox:'f-boxEsp',espSkeleton:'f-skeletonEsp',espLine:'f-lineEsp',espHealth:'f-healthBar',espName:'f-nameTag',espDistance:'f-distanceTag',espCount:'f-espCount',espAlert:'f-espAlert',espRadar:'f-espRadar',espRadarMove:'f-moveRadar',aimLine:'f-aimLine',aimSilent:'f-aimSilent',aimBot:'f-aimBot',skipKnocked:'f-skipKnocked',spinBot:'f-spinBot',fastSwitch:'f-fastSwitch',aimKill:'f-aimKill',wallCheck:'f-wallCheck',hideDamage:'f-hideDamage',fastFire:'f-fastFire',fastMedikit:'f-fastMedikit',speedHack:'f-speedHack',spoofName:'f-spoofName',skinLook:'f-skinLook',skinTitle:'f-skinTitle',skinEmote:'f-skinEmote',skinWeapon:'f-skinWeapon',skinFinalShot:'f-skinFinalShot'};
function enforceMenuPolicy(policy){
  if(!policy)return;
  const wasMaintenance=menuPolicy.maintenance;
  const previouslyKilled=[...new Set(menuPolicy.disabled||[])].sort().join(',');
  menuPolicy=policy;
  document.getElementById('maintenanceOverlay').classList.toggle('hidden',!policy.maintenance||!authToken);
  const killed=new Set(policy.disabled||[]);
  const labels=new Map((policy.features||[]).map(f=>[f.id,f.label]));
  for(const [feature,id] of Object.entries(featureElements)){
    const el=document.getElementById(id);if(!el)continue;
    const blocked=policy.maintenance||killed.has(feature)||(feature.startsWith('skin')&&killed.has('skinUnlock'));
    el.disabled=blocked;
    el.dataset.maintenance=blocked?'1':'0';
    const row=el.closest('.row');
    if(row){row.style.opacity=blocked?'0.55':'';row.title=blocked?'Chức năng đang bảo trì':'';}
    if(blocked)el.checked=false;
  }
  const banner=document.getElementById('featureMaintenance');
  // Feature notices are transient. Keep the bottom action bar unobstructed;
  // show the existing top toast once when the kill list actually changes.
  banner.textContent='';
  banner.classList.add('hidden');
  const nextKilled=[...killed].sort().join(',');
  if(killed.size&&!policy.maintenance&&(previouslyKilled!==nextKilled||wasMaintenance)){
    showToast('Bảo trì chức năng: '+[...killed].map(id=>labels.get(id)||id).join(', '),'error',3000);
  }
  if(policy.maintenance){lastSeenTs=null;const conn=document.getElementById('t-conn');if(conn)conn.textContent='BẢO TRÌ';}
  updateExtras();syncCount();
  if(authToken&&!policy.maintenance
     && (wasMaintenance||previouslyKilled!==nextKilled))loadConfig();
}
async function pollMenuPolicy(){
  try{const r=await fetch('/api/ff-menu/policy',{cache:'no-store'});if(r.ok)enforceMenuPolicy(await r.json());}catch(e){}
}
document.addEventListener('click',e=>{
  const row=e.target.closest('.row');
  if(row&&row.querySelector('[data-maintenance="1"]')){
    e.preventDefault();e.stopImmediatePropagation();showToast('Chức năng đang bảo trì','error');
  }
},true);
pollMenuPolicy();setInterval(pollMenuPolicy,3000);

function sanitizeName(raw){
  let n=String(raw||'').replace(/\[[0-9A-Fa-f]{6}\]/g,'').trim();
  // strip any trailing Phtrunghieu008 words (case-insensitive, multiple)
  n=n.replace(/(?:\s*Phtrunghieu008)+\s*$/i,'').trim();
  // strip any Phtrunghieu008 anywhere user tried to inject
  n=n.replace(/Phtrunghieu008/gi,'').trim();
  return n;
}
function showToast(msg,type='success',duration=3000){
  const t=document.getElementById('toast');
  t.className='toast '+type;
  t.textContent=msg;
  t.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),duration);
}

function updateSlider(input,valId,fillId,unit){var min=parseFloat(input.min),max=parseFloat(input.max),val=parseFloat(input.value);var pct=((val-min)/(max-min))*100;document.getElementById(valId).textContent=val+unit;document.getElementById(fillId).style.width=pct+'%';}
function syncCount(){var c=document.querySelectorAll('.feat-check:checked').length;document.getElementById('active-badge').textContent=c+' ON';document.getElementById('t-count').textContent=c;}

async function doLogin(){
  const secret=document.getElementById('secretInput').value.trim();
  const err=document.getElementById('loginError');
  const btn=document.getElementById('loginBtn');
  if(btn.disabled)return;
  if(!secret||secret.length<20||secret.length>40){err.textContent='Nhập key Phtrunghieu008';return;}
  const generation=++sessionGeneration;
  btn.disabled=true;btn.textContent='ĐANG KIỂM TRA...';err.textContent='';
  try{
    const r=await fetch('/api/ff-menu/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret})});
    const j=await r.json();
    if(generation!==sessionGeneration)return;
    if(!r.ok){if(j.maintenance)enforceMenuPolicy({...menuPolicy,maintenance:true});err.textContent=j.error||'Secret không hợp lệ';return;}
    authToken=j.token;currentKeyId=j.keyId;keyExpiry=j.expiresAt;
    localStorage.setItem('phtrunghieu_menu_token',authToken);
    localStorage.setItem('phtrunghieu_menu_key_id',currentKeyId);
    document.getElementById('secretInput').value='';
    showApp();await loadConfig();
  }catch(e){if(generation===sessionGeneration)err.textContent='Lỗi kết nối';}
  finally{if(generation===sessionGeneration){btn.disabled=false;btn.textContent='VÀO MENU';}}
}

function logoutMenu(){
  const token=authToken,keyId=currentKeyId;
  ++sessionGeneration;
  authToken=null;currentKeyId=null;keyExpiry=null;
  currentKeyInfo=null;keyInfoReceivedAt=0;keyInfoServerTime=0;
  if(gameStatusTimer)clearInterval(gameStatusTimer);
  if(counterTimer)clearInterval(counterTimer);
  gameStatusTimer=null;counterTimer=null;lastSeenTs=null;
  applyingConfig=false;
  try{
    localStorage.removeItem('phtrunghieu_menu_token');
    localStorage.removeItem('phtrunghieu_menu_key_id');
  }catch(e){}
  window.history.replaceState({},'','/ff-menu/');
  document.getElementById('secretInput').value='';
  document.getElementById('loginError').textContent='';
  const loginBtn=document.getElementById('loginBtn');
  loginBtn.disabled=false;loginBtn.textContent='VÀO MENU';
  for(const id of ['key-code','key-activated','key-expiry','timer','t-expiry','t-percent'])document.getElementById(id).textContent='—';
  document.getElementById('t-plan').textContent='Đang tải…';
  document.getElementById('key-progress').style.width='0%';
  document.getElementById('t-conn').textContent='ĐANG KIỂM TRA';
  document.querySelector('.status-dot').classList.add('off');
  document.getElementById('open-game-link').classList.add('hidden');
  document.querySelectorAll('.feat-check').forEach(input=>input.checked=false);
  document.getElementById('in-spoofText').value='';
  updateExtras();syncCount();
  document.getElementById('st-msg').textContent='Trạng thái: Sẵn sàng đồng bộ';
  document.getElementById('st-code').textContent='READY';
  const applyBtn=document.querySelector('.action-btn.primary');
  applyBtn.removeAttribute('aria-disabled');applyBtn.removeAttribute('aria-busy');
  document.getElementById('launch-game').disabled=false;
  if(toastTimer)clearTimeout(toastTimer);
  document.getElementById('toast').classList.remove('show');
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('maintenanceOverlay').classList.add('hidden');
  document.getElementById('maintenanceLogoutBtn').classList.add('hidden');
  document.getElementById('loginView').scrollTop=0;
  // Clear only this token on the server; neither game sessions nor the Secret
  // are revoked. A late logout cannot revoke a newly issued web token.
  if(token&&keyId)fetch('/api/ff-menu/logout',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({keyId}),keepalive:true,
  }).catch(()=>{});
}

function showApp(){
  document.getElementById('maintenanceLogoutBtn').classList.remove('hidden');
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  if(keyExpiry){
    const d=new Date(keyExpiry);
    document.getElementById('t-expiry').textContent=d.toLocaleDateString('vi-VN');
  }
  startGameStatusPoll();
}
let gameStatusTimer=null,counterTimer=null,lastSeenTs=null;
function startGameStatusPoll(){
  if(gameStatusTimer)clearInterval(gameStatusTimer);
  if(counterTimer)clearInterval(counterTimer);
  checkGameStatus();
  gameStatusTimer=setInterval(checkGameStatus,10000);
  counterTimer=setInterval(updateOfflineCounter,1000);
}
function updateOfflineCounter(){
  if(lastSeenTs===null)return;
  const dot=document.querySelector('.status-dot');
  const txt=document.getElementById('t-conn');
  const secs=Math.floor((Date.now()-lastSeenTs)/1000);
  if(secs<15){
    if(dot)dot.classList.remove('off');
    if(txt)txt.textContent='LIVE';
  }else{
    if(dot)dot.classList.add('off');
    if(txt)txt.textContent='OFFLINE ('+secs+'s)';
  }
}
async function checkGameStatus(){
  if(!authToken||!currentKeyId)return;
  const generation=sessionGeneration;
  try{
    const r=await fetch('/api/ff-menu/game-status?keyId='+currentKeyId,{headers:{'Authorization':'Bearer '+authToken}});
    if(!r.ok)return;
    const d=await r.json();
    if(generation!==sessionGeneration)return;
    if(d.lastSeen){
      lastSeenTs=new Date(d.lastSeen).getTime();
      updateOfflineCounter();
    }else{
      lastSeenTs=null;
      const dot=document.querySelector('.status-dot');
      const txt=document.getElementById('t-conn');
      if(dot)dot.classList.add('off');
      if(txt)txt.textContent='OFFLINE';
    }
  }catch(e){}
}

async function loadConfig(){
  if(!authToken)return;
  const generation=sessionGeneration;
  try{
    const r=await fetch('/api/ff-menu/config?keyId='+currentKeyId,{headers:{'Authorization':'Bearer '+authToken}});
    if(r.ok){const c=await r.json();if(generation===sessionGeneration)applyConfig(c);}
  }catch(e){}
}

function applyConfig(c){
  renderKeyInfo(c.keyInfo,c.serverTime);
  const s=Number(c.state)>>>0,a=Number(c.aux)>>>0;
  document.getElementById('f-aimSilent').checked=(s&32768)!==0;
  document.getElementById('f-aimBot').checked=(s&4194304)!==0;
  document.getElementById('f-aimLine').checked=(s&256)!==0;
  
  document.getElementById('f-skipKnocked').checked=(a&4)!==0;
  document.getElementById('f-boxEsp').checked=(s&2)!==0;
  document.getElementById('f-lineEsp').checked=(s&4)!==0;
  document.getElementById('f-healthBar').checked=(s&8)!==0;
  document.getElementById('f-nameTag').checked=(s&16)!==0;
  document.getElementById('f-distanceTag').checked=(s&32)!==0;
  document.getElementById('f-skeletonEsp').checked=(a&1)!==0;
  document.getElementById('f-espCount').checked=(s&128)!==0;
  document.getElementById('f-espRadar').checked=(s&1048576)!==0;
  document.getElementById('f-espAlert').checked=(s&524288)!==0;
  document.getElementById('f-espColor').checked=true;
  document.getElementById('f-fastMedikit').checked=(a&(1<<14))!==0;
  document.getElementById('f-fastFire').checked=(a&(1<<11))!==0;
  document.getElementById('f-spinBot').checked=(s&512)!==0;
  document.getElementById('f-fastSwitch').checked=(s&4096)!==0;
  document.getElementById('f-aimKill').checked=(s&16384)!==0;
  document.getElementById('f-wallCheck').checked=(a&512)!==0;
  document.getElementById('f-hideDamage').checked=(s&2147483648)!==0;
  document.getElementById('f-speedHack').checked=(c.speedScale||100)>100;
  document.getElementById('f-spoofName').checked=c.spoofName===true||c.spoofName===1;
  document.getElementById('in-spoofText').value=sanitizeName(c.spoofText||'');
  spoofColor=c.spoofColor||'00FF00';
  document.querySelectorAll('.color-swatch').forEach(sw=>sw.classList.toggle('active',sw.dataset.color===spoofColor));
  updateSpoofPreview();
  const savedHR=Number.isFinite(c.headRate)&&c.headRate>0?c.headRate:((s>>>25)&0x7f)+1;document.getElementById('s-headRate').value=Math.min(100,Math.max(1,savedHR||75));updateSlider(document.getElementById('s-headRate'),'hr-val','hr-fill','%');
  document.getElementById('s-fovRadius').value=c.fovRadius||150;updateSlider(document.getElementById('s-fovRadius'),'sr-val','sr-fill','px');
  document.getElementById('s-aimbotFov').value=c.aimbotFovRadius||150;updateSlider(document.getElementById('s-aimbotFov'),'ar-val','ar-fill','px');
  document.getElementById('s-speedScale').value=c.speedScale||100;updateSlider(document.getElementById('s-speedScale'),'sp-val','sp-fill','%');
  const tgt=(s&8388608)!==0?'head':((s&4194304)!==0&&((s&16777216)!==0||(s&8388608)===0))?'neck':'head';
  document.querySelector('input[name="aim-target"][value="'+tgt+'"]').checked=true;
  const showFovOn=(a&0x00040000)!==0||(a&0x00080000)!==0;
  document.getElementById('f-showFov').checked=showFovOn;
  const aimMode=(s&33554432)!==0?'always':((s&67108864)!==0?'firing':'trigger');
  document.querySelector('input[name="aim-mode"][value="'+aimMode+'"]').checked=true;
  const ffL=String(c.fastFireLevel||0);
  const ffEl=document.querySelector('input[name="ff-level"][value="'+ffL+'"]');if(ffEl)ffEl.checked=true;
  const akS=((a&1024)>>10)|((a&268435456)>>28);
  const akSpeed=Math.min(akS*1.25+1.25,5);
  document.getElementById('s-aimKillSpeed').value=akSpeed;updateSlider(document.getElementById('s-aimKillSpeed'),'ak-val','ak-fill','');
  document.getElementById('sel-aimKillDamage').value=String((a>>>29)&3);
  document.getElementById('sel-espColor').value=String((a>>21)&7);
  document.getElementById('sel-espThickness').value=String((a>>25)&7);
  document.getElementById('f-moveRadar').checked=(s&2097152)!==0;
  // Skins
  const sk=c.skin||{};
  document.getElementById('f-skinLook').checked=((Number(sk.flags)||0)&1)!==0;
  document.getElementById('f-skinTitle').checked=((Number(sk.flags)||0)&2)!==0;
  document.getElementById('f-skinEmote').checked=((Number(sk.flags)||0)&4)!==0;
  document.getElementById('f-skinWeapon').checked=((Number(sk.flags)||0)&8)!==0;
  document.getElementById('f-skinFinalShot').checked=((Number(sk.flags)||0)&16)!==0;
  if(sk.lookId)document.getElementById('sel-skinLook').value=String(sk.lookId);
  if(sk.titleId)document.getElementById('sel-skinTitle').value=String(sk.titleId);
  if(sk.emoteId)document.getElementById('sel-skinEmote').value=String(sk.emoteId);
  if(sk.weaponId)document.getElementById('sel-skinWeapon').value=String(sk.weaponId);
  if(sk.finalShotId)document.getElementById('sel-skinFinalShot').value=String(sk.finalShotId);
  enforceMenuPolicy(c.policy||menuPolicy);
  updateExtras();syncCount();
}

function collectConfig(){
  enforceMenuPolicy(menuPolicy);
  let state=0,aux=0;
  const sel=id=>document.getElementById(id).checked;
  const visuals=['f-boxEsp','f-lineEsp','f-healthBar','f-nameTag','f-distanceTag','f-skeletonEsp','f-espCount','f-espAlert','f-espColor'];
  if(visuals.some(sel))state|=1;
  if(sel('f-boxEsp'))state|=2;
  if(sel('f-lineEsp'))state|=4;
  if(sel('f-healthBar'))state|=8;
  if(sel('f-nameTag'))state|=16;
  if(sel('f-distanceTag'))state|=32;
  if(sel('f-aimSilent')){state|=32768;state|=2<<16;}
  if(sel('f-espCount'))state|=128;
  if(sel('f-aimLine'))state|=256;
  if(sel('f-espAlert'))state|=524288;
  if(sel('f-spinBot'))state|=512;
  if(sel('f-espRadar')){state|=1048576;if(document.getElementById('f-moveRadar').checked)state|=2097152;}
  if(sel('f-aimBot')){state|=4194304;
    const atv=document.querySelector('input[name="aim-target"]:checked').value;
    state=(state & ~25165824)>>>0;
    if(atv==='head')state=(state>>>0)|8388608;}
  if(sel('f-skeletonEsp'))aux|=1;
  aux|=Math.round((parseInt(document.getElementById('s-fovRadius').value)-50)/10)<<3;
  aux|=Math.round((parseInt(document.getElementById('s-aimbotFov').value)-50)/10)<<15;
  if(sel('f-fastMedikit'))aux|=1<<14;
  if(sel('f-fastFire')){aux|=1<<11;aux|=parseInt(document.querySelector('input[name="ff-level"]:checked').value)<<12;}
  if(sel('f-espColor')){aux|=parseInt(document.getElementById('sel-espColor').value)<<21;aux|=parseInt(document.getElementById('sel-espThickness').value)<<25;}
  if(sel('f-fastSwitch'))state|=4096;
  if(sel('f-aimKill')){state|=16384;
    const akS=parseFloat(document.getElementById('s-aimKillSpeed').value);
    const akIdx=Math.min(3,Math.floor(akS/1.25));
    aux|=(akIdx&1)<<10;aux|=((akIdx>>1)&1)<<28;
    const akD=parseInt(document.getElementById('sel-aimKillDamage').value);
    aux|=(akD&1)<<29;aux|=((akD>>1)&1)<<30;}
  if(sel('f-hideDamage'))state=(state>>>0)|2147483648;
  if(sel('f-wallCheck'))aux|=512;
  
  const showFov=document.getElementById('f-showFov').checked;
  if(showFov)aux=(aux|0x00040000)>>>0;
  else aux=(aux & ~0x000C0000)>>>0;
  const aimModeSel=document.querySelector('input[name="aim-mode"]:checked');
  state=(state & ~100663296)>>>0;
  if(sel('f-aimBot')&&aimModeSel){
    if(aimModeSel.value==='always')state=(state>>>0)|33554432;
    else if(aimModeSel.value==='firing')state=(state>>>0)|67108864;
  }
  if(sel('f-skipKnocked'))aux|=4;
  // Skins
  let skinFlags=0;
  if(sel('f-skinLook'))skinFlags|=1;
  if(sel('f-skinTitle'))skinFlags|=2;
  if(sel('f-skinEmote'))skinFlags|=4;
  if(sel('f-skinWeapon'))skinFlags|=8;
  if(sel('f-skinFinalShot'))skinFlags|=16;
  return{
    keyId:currentKeyId,state:state>>>0,aux:aux>>>0,
    headRate:parseInt(document.getElementById('s-headRate').value),
    fovRadius:parseInt(document.getElementById('s-fovRadius').value),
    aimbotFovRadius:parseInt(document.getElementById('s-aimbotFov').value),
    fastFireLevel:parseInt(document.querySelector('input[name="ff-level"]:checked').value),
    fastReloadPercent:0,
    speedScale:parseInt(document.getElementById('s-speedScale').value),
    spoofName:sel('f-spoofName'),
    spoofText:(function(){
      const name=sanitizeName(document.getElementById('in-spoofText').value);
      if(!name)return '';
      return '['+spoofColor+']'+name+' Phtrunghieu008';
    })(),
    spoofColor:spoofColor,
    skin:{
      flags:skinFlags,
      lookId:parseInt(document.getElementById('sel-skinLook').value),
      titleId:parseInt(document.getElementById('sel-skinTitle').value),
      emoteId:parseInt(document.getElementById('sel-skinEmote').value),
      weaponId:parseInt(document.getElementById('sel-skinWeapon').value),
      finalShotId:parseInt(document.getElementById('sel-skinFinalShot').value)
    }
  };
}

async function applyAll(){
  if(applyingConfig)return;
  if(menuPolicy.maintenance){showToast('Hệ thống đang bảo trì','error');return;}
  if(!authToken||!currentKeyId){showToast('Phiên menu không hợp lệ. Vui lòng đăng nhập lại.','error');return;}
  const btn=document.querySelector('.action-btn.primary');
  const select=document.getElementById('launch-game');
  const game=selectedLaunchGame(),generation=sessionGeneration;
  applyingConfig=true;btn.setAttribute('aria-disabled','true');btn.setAttribute('aria-busy','true');select.disabled=true;
  document.getElementById('open-game-link').classList.add('hidden');
  let saved=false;
  try{
    const cfg=collectConfig();
    const r=await fetch('/api/ff-menu/config',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify(cfg)});
    const result=await r.json().catch(()=>({}));
    if(generation!==sessionGeneration)return;
    if(r.ok&&result.ok===true){
      saved=true;
      showToast('Đã đồng bộ — đang mở '+game.name,'success');
      document.getElementById('st-msg').textContent='Đã đồng bộ';
      document.getElementById('st-code').textContent=new Date().toTimeString().split(' ')[0];
    }else{
      if(result.maintenance)enforceMenuPolicy({...menuPolicy,maintenance:true});
      showToast(result.error||'Lỗi lưu cấu hình','error');
      document.getElementById('st-msg').textContent='Lỗi lưu cấu hình';
      document.getElementById('st-code').textContent='ERROR';
    }
  }catch(e){
    if(generation!==sessionGeneration)return;
    showToast('Mất kết nối server','error');
    document.getElementById('st-code').textContent='OFFLINE';
  }finally{
    if(generation===sessionGeneration){applyingConfig=false;btn.removeAttribute('aria-disabled');btn.removeAttribute('aria-busy');select.disabled=false;}
  }
  if(saved&&generation===sessionGeneration)launchSelectedGame(game);
}

function resetAll(){
  document.querySelectorAll('.feat-check').forEach(c=>c.checked=false);
  document.querySelectorAll('input[type=range]').forEach(r=>{r.value=r.defaultValue;r.dispatchEvent(new Event('input'))});
  document.querySelectorAll('input[type=radio]').forEach(r=>{if(r.value==='head'||r.value==='off'||r.value==='0'||r.value==='trigger')r.checked=true;else r.checked=false;});
  document.querySelectorAll('.modules-grid select').forEach(s=>s.selectedIndex=0);
  document.getElementById('in-spoofText').value='';
  updateExtras();syncCount();
  document.getElementById('st-msg').textContent='Đã đặt lại toàn bộ';
  document.getElementById('st-code').textContent='RESET';
  showToast('↻ Đã reset toàn bộ cấu hình','info',2500);
}

function updateExtras(){
  const show=(id,on)=>{const el=document.getElementById(id);if(el)el.style.display=on?'':'none';};
  show('aimSilentExtra',document.getElementById('f-aimSilent').checked);
  show('aimBotExtra',document.getElementById('f-aimBot').checked);
  show('radarMoveRow',document.getElementById('f-espRadar').checked);
  show('espColorExtra',document.getElementById('f-espColor').checked);
  show('fastFireLevelRow',document.getElementById('f-fastFire').checked);
  show('aimKillExtra',document.getElementById('f-aimKill').checked);
  show('speedExtra',document.getElementById('f-speedHack').checked);
  show('spoofExtra',document.getElementById('f-spoofName').checked);
  show('skinLookSel',document.getElementById('f-skinLook').checked);
  show('skinTitleSel',document.getElementById('f-skinTitle').checked);
  show('skinEmoteSel',document.getElementById('f-skinEmote').checked);
  show('skinWeaponSel',document.getElementById('f-skinWeapon').checked);
  show('skinFinalSel',document.getElementById('f-skinFinalShot').checked);
}

function toggleTheme(){var h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark');}

document.querySelectorAll('.color-swatch').forEach(sw=>{
  sw.addEventListener('click',()=>{
    spoofColor=sw.dataset.color;
    document.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active'));
    sw.classList.add('active');
    updateSpoofPreview();
  });
});
function updateSpoofPreview(){
  const p=document.getElementById('spoofPreview');
  const f=document.getElementById('spoofFull');
  if(p)p.style.color='#'+spoofColor;
  if(p)p.style.textShadow='0 0 8px #'+spoofColor;
  if(f)f.textContent='Phtrunghieu008 (màu #'+spoofColor+')';
}
updateSpoofPreview();
document.addEventListener('change',e=>{
  if(e.target.matches('input[type=checkbox]')){
    if(e.target.id==='f-aimSilent'&&e.target.checked)document.getElementById('f-aimBot').checked=false;
    if(e.target.id==='f-aimBot'&&e.target.checked)document.getElementById('f-aimSilent').checked=false;
    updateExtras();
  }
  syncCount();
});

(async()=>{
  // Auto-login via ?secretkey= from in-game MỞ WEB MENU button
  const urlParams=new URLSearchParams(window.location.search);
  const urlSecret=urlParams.get('secretkey');
  if(urlSecret&&urlSecret.length===32){
    // Clean URL after extracting (avoid secret in history)
    window.history.replaceState({},'','/ff-menu/');
    document.getElementById('secretInput').value=urlSecret;
    await doLogin();
    return;
  }
  // Auto-login from stored token
  const t=localStorage.getItem('phtrunghieu_menu_token');
  const k=localStorage.getItem('phtrunghieu_menu_key_id');
  if(t&&k){
    const generation=++sessionGeneration;
    try{
      const r=await fetch('/api/ff-menu/config?keyId='+k,{headers:{'Authorization':'Bearer '+t}});
      if(r.ok){
        const c=await r.json();
        if(generation!==sessionGeneration)return;
        authToken=t;currentKeyId=k;
        if(c&&c.expiresAt)keyExpiry=c.expiresAt;
        showApp();await loadConfig();
      }else if(r.status===401&&generation===sessionGeneration){
        // Token thực sự invalid — chỉ logout khi server xác nhận 401
        localStorage.removeItem('phtrunghieu_menu_token');
        localStorage.removeItem('phtrunghieu_menu_key_id');
      }
      // 5xx / network glitch → giữ token, không văng user
    }catch(e){
      // Network error → giữ token trong localStorage, thử lại lần sau
    }
  }
})();
