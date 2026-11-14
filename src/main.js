import * as THREE from '../vendor/three.module.js';

// Lot Legends: a small, self-contained dealership and driving simulator.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (n) => '$' + Math.max(0, Math.round(n)).toLocaleString('en-US');
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const COLORS = ['#d88758','#7eaa91','#8d9fbd','#d5d0ba','#aa7770','#7797a6','#a2a760','#c0c3bc'];
const CATALOG = [
  {name:'Comet S',type:'HATCHBACK',base:9800,icon:'◧'}, {name:'Regent LX',type:'SEDAN',base:17600,icon:'▰'},
  {name:'Ranger 4x4',type:'PICKUP',base:25200,icon:'▱'}, {name:'Vulcan GT',type:'SPORTS',base:36400,icon:'◈'},
  {name:'Terra X',type:'SUV',base:28900,icon:'▰'}, {name:'Metro Mini',type:'COMPACT',base:7600,icon:'◧'},
  {name:'Baron Classic',type:'CLASSIC',base:22600,icon:'◈'}, {name:'Nova Touring',type:'WAGON',base:19400,icon:'▰'},
  {name:'Falcon RS',type:'SPORTS',base:41800,icon:'◈'}, {name:'Atlas Crew',type:'PICKUP',base:32600,icon:'▱'}
];
const state = {cash:12500,day:1,time:8.5,rep:1,inventory:[],market:[],player:null,started:false,activePanel:'',sound:true,expansions:0,profit:0,saved:false};
let scene,camera,renderer,carGroup,carBody,clock,last=performance.now(),worldTime=0;
let speed=0,steer=0,heading=0,position=new THREE.Vector3(0,0,9),nearby='',toastTimer=0,toastEl, keys={},touch={};

function box(w,h,d,color,x,y,z, parent=scene, opts={}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color,roughness:opts.roughness ?? .86, metalness:opts.metalness ?? 0}));
  mesh.position.set(x,y,z); if (opts.cast) mesh.castShadow=true; if(opts.receive) mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function flat(w,d,color,x,z,parent=scene) { return box(w,.08,d,color,x,-.06,z,parent,{receive:true}); }
function makeTree(x,z,scale=1) {
  const group=new THREE.Group(); group.position.set(x,0,z); group.scale.setScalar(scale); scene.add(group);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.21,1.35,6),new THREE.MeshStandardMaterial({color:'#695044'})); trunk.position.y=.65; group.add(trunk);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.95,1),new THREE.MeshStandardMaterial({color:['#71866b','#647c65','#829276'][Math.floor(Math.abs(x*13+z*7))%3],roughness:1})); crown.position.y=1.75; crown.scale.set(1,1.13,.94); crown.castShadow=true; group.add(crown);
}
function makeBuilding(x,z,w,d,color,height=4,label='') {
  const group=new THREE.Group(); group.position.set(x,0,z); scene.add(group);
  box(w,height,d,color,0,height/2,0,group,{cast:true,receive:true});
  box(w+.22,.24,d+.22,'#303a37',0,height+.12,0,group);
  const count=Math.max(2,Math.floor(w/2.5));
  for(let i=0;i<count;i++){
    const wx=-w/2+(i+.5)*w/count;
    box(.82,1.05,.08,'#9fb5a9',wx,height*.57,d/2+.055,group,{metalness:.18});
    box(.88,.09,.13,'#44524b',wx,height*.57,d/2+.12,group);
  }
  box(Math.min(2.4,w*.35),1.25,.12,'#273632',0,.65,d/2+.08,group);
  if(label){ box(w*.68,.45,.12,'#d7e88b',0,height+.5,d/2+.16,group); }
  return group;
}
function makeCar(color='#789a85', scale=1) {
  const g=new THREE.Group(); g.scale.setScalar(scale);
  const paint=new THREE.MeshStandardMaterial({color,roughness:.36,metalness:.25});
  const glass=new THREE.MeshStandardMaterial({color:'#a9c8c8',roughness:.17,metalness:.18});
  const dark=new THREE.MeshStandardMaterial({color:'#1c2525',roughness:.7});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.95,.62,3.8),paint); body.position.y=.8; body.castShadow=true; g.add(body);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(1.8,.28,1.05),paint); hood.position.set(0,1.02,-1.23); hood.castShadow=true; g.add(hood);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.48,.75,1.8),glass); cabin.position.set(0,1.33,.12); cabin.castShadow=true; g.add(cabin);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.47,.1,1.35),paint); roof.position.set(0,1.72,.13); g.add(roof);
  const bumper1=new THREE.Mesh(new THREE.BoxGeometry(2,.18,.18),dark); bumper1.position.set(0,.52,-1.9); g.add(bumper1);
  const bumper2=bumper1.clone(); bumper2.position.z=1.9; g.add(bumper2);
  for(const z of [-1.25,1.25]) for(const x of [-.99,.99]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.25,12),dark); wheel.rotation.z=Math.PI/2; wheel.position.set(x,.47,z); wheel.castShadow=true; g.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.27,12),new THREE.MeshStandardMaterial({color:'#bbc3b6',metalness:.7,roughness:.25})); hub.rotation.z=Math.PI/2; hub.position.set(x,.47,z); g.add(hub);
  }
  for(const x of [-.65,.65]){ const lamp=new THREE.Mesh(new THREE.BoxGeometry(.4,.15,.06),new THREE.MeshStandardMaterial({color:'#f9e8ab',emissive:'#ab8b54',emissiveIntensity:.3})); lamp.position.set(x,.83,-1.94); g.add(lamp); }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); return g;
}
function initWorld() {
  scene=new THREE.Scene(); scene.background=new THREE.Color('#a9c2c2'); scene.fog=new THREE.Fog('#a9c2c2',72,190);
  camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,280);
  renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.17;
  scene.add(new THREE.HemisphereLight('#e4f2e7','#718076',2));
  const sun=new THREE.DirectionalLight('#fff0d6',2.4); sun.position.set(-35,58,-20); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;scene.add(sun);
  flat(240,230,'#8da188',0,0);
  // Streets meet at Riverside's little town square.
  flat(13,220,'#444c49',0,-24); flat(13,220,'#444c49',40,-24); flat(160,13,'#444c49',20,-22); flat(160,13,'#444c49',20,32);
  for(let z=-118;z<80;z+=9){flat(.12,3.4,'#d1caa6',0,z);flat(.12,3.4,'#d1caa6',40,z);}
  for(let x=-60;x<100;x+=9){flat(3.4,.12,'#d1caa6',x,-22);flat(3.4,.12,'#d1caa6',x,32);}
  // Dealership lot, service bay, and welcoming roadside signage.
  flat(34,28,'#b1aa91',0,10); flat(31,2,'#303b37',0,-4); flat(1,22,'#303b37',-16,9);flat(1,22,'#303b37',16,9);
  for(let x=-12;x<=12;x+=6){box(.12,.02,17,'#d1c7ad',x,.01,10);}
  makeBuilding(-23,2,12,16,'#a27e5e',5,''); makeBuilding(22,0,11,14,'#738078',5,'');
  const sign=box(5,.45,.25,'#d9ef78',0,4.6,-4); sign.rotation.z=-.1;
  makeBuilding(0,-34,17,11,'#bd8a61',5,'');
  flat(27,20,'#b7b09a',40,-40); makeBuilding(54,-45,15,12,'#697c73',6,'');
  // Distant neighborhood storefronts and homes frame the drivable streets.
  makeBuilding(-20,-26,13,12,'#b27b64',4,''); makeBuilding(8,-48,13,13,'#c5a77c',4,''); makeBuilding(23,-51,12,13,'#8e9a80',4,'');
  makeBuilding(59,-21,14,12,'#b28b70',5,'');makeBuilding(73,-19,12,14,'#7f9788',4,'');makeBuilding(-18,43,12,13,'#c19c75',4,'');makeBuilding(13,46,16,12,'#88957d',5,'');makeBuilding(57,42,13,12,'#ae826e',4,'');
  // Tree lines and street furniture.
  for(let z=-65;z<64;z+=10){makeTree(-32,z,.8);makeTree(68,z,.82);}
  for(let x=-40;x<78;x+=11){makeTree(x,-59,.8);makeTree(x,55,.86);}
  // Lamp posts along the road.
  for(const [x,z] of [[-8,-22],[8,-22],[32,-22],[48,-22],[-8,32],[8,32],[32,32],[48,32]]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,4.2,6),new THREE.MeshStandardMaterial({color:'#45534c'}));pole.position.set(x,2.1,z);scene.add(pole);box(.6,.11,.14,'#e5e4bd',x,4.2,z,scene,{metalness:.1});
  }
  // Market landmark and local cars add scale to the town.
  const marketSign=box(5,1.2,.25,'#e6a56c',40,4.8,-47); marketSign.rotation.z=.06;
  const parked=[[ -6,8,'#d88758'],[8,11,'#758ca0'],[35,-25,'#6e9a83'],[45,-25,'#bd8063'],[-3,-21,'#c2bb9d'],[31,35,'#9a9e80']];
  for(const [x,z,c] of parked){const car=makeCar(c,.78);car.position.set(x,0,z);car.rotation.y=x>25?Math.PI/2:Math.PI;scene.add(car);}
  carGroup=makeCar('#72967b',1); carGroup.position.copy(position); scene.add(carGroup);
  // A soft translucent market beacon.
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.22,.4,6,12),new THREE.MeshBasicMaterial({color:'#f2a366',transparent:true,opacity:.22}));beacon.position.set(40,3,-31);scene.add(beacon);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.07,6,32),new THREE.MeshBasicMaterial({color:'#f2a366',transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.set(40,.12,-31);scene.add(ring);
  clock=new THREE.Clock(); window.addEventListener('resize',resizeWorld);
}
function resizeWorld(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));}

function newCar(index, asking=0) {
  const model=CATALOG[index], quality=Math.floor(35+Math.random()*53);
  return {id:Math.random().toString(36).slice(2,9),model:index,color:COLORS[Math.floor(Math.random()*COLORS.length)],body:clamp(quality+Math.floor(Math.random()*18-8),22,97),engine:clamp(quality+Math.floor(Math.random()*16-8),20,98),clean:clamp(quality+Math.floor(Math.random()*20-10),20,98),mileage:Math.floor(23000+Math.random()*146000),asking,appraised:false,scam:Math.random()<.17};
}
function carValue(car) {
  const m=CATALOG[car.model], quality=(car.body+car.engine+car.clean)/3;
  return Math.round(m.base*(.51+quality*.0049)*(1+state.rep*.012));
}
function seedMarket(){
  state.market=[
    Object.assign(newCar(0,0),{body:67,engine:71,clean:62,mileage:94300,asking:5800,scam:false}),
    Object.assign(newCar(1,0),{body:51,engine:64,clean:77,mileage:128000,asking:7600,scam:false}),
    Object.assign(newCar(5,0),{body:82,engine:74,clean:69,mileage:61800,asking:5400,scam:false})
  ];
}
function initGame() {
  toastEl=$('#toast'); seedMarket();
  const saved=localStorage.getItem('lot-legends-save');
  if(saved){try{const data=JSON.parse(saved);if(data.version===1){Object.assign(state,data.state);if(!Array.isArray(state.inventory))state.inventory=[];if(!Array.isArray(state.market))seedMarket();state.started=false;}}catch(e){console.warn('Save could not be loaded',e);}}
  updateHUD();
  $('#startButton').addEventListener('click',()=>{state.started=true;$('#startScreen').classList.add('hidden');toast('Welcome to Riverside. Your first deal is waiting.');});
  $('#saveButton').addEventListener('click',saveGame);
  $('#soundButton').addEventListener('click',()=>{state.sound=!state.sound;$('#soundButton').classList.toggle('muted',!state.sound);toast(state.sound?'Sound cues on':'Sound cues off');});
  $('#closePanel').addEventListener('click',closePanel);$('#panelScrim').addEventListener('click',closePanel);
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>{ $$('.nav-item').forEach(b=>b.classList.toggle('active',b===button)); openPanel(button.dataset.panel); }));
  $('#modalLayer').addEventListener('click',e=>{if(e.target.id==='modalLayer')hideModal();});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase(); if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault(); keys[k]=true;
    if(k==='e'&&!e.repeat) interact(); if(k==='escape'){hideModal();closePanel();}
  });
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  $$('.drive-controls button').forEach(b=>{
    const key=b.dataset.drive; const down=e=>{e.preventDefault();touch[key]=true;}; const up=e=>{e.preventDefault();touch[key]=false;};
    b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
  });
  window.addEventListener('beforeunload',saveGame);
  tick(performance.now());
}
function saveGame(){
  const safe={cash:state.cash,day:state.day,time:state.time,rep:state.rep,inventory:state.inventory,market:state.market,expansions:state.expansions,profit:state.profit};
  try{localStorage.setItem('lot-legends-save',JSON.stringify({version:1,state:safe}));state.saved=true;$('#saveButton').textContent='✓';setTimeout(()=>$('#saveButton').textContent='↧',900);toast('Progress saved to this device.');}catch(e){toast('Save unavailable in this browser.');}
}
function updateHUD(){
  $('#moneyLabel').textContent=money(state.cash);$('#dayLabel').textContent='DAY '+String(state.day).padStart(2,'0');
  $('#timeLabel').textContent=String(Math.floor(state.time)).padStart(2,'0')+':'+String(Math.floor((state.time%1)*60)).padStart(2,'0');
  $('#repLabel').textContent='★ '+state.rep.toFixed(1);$('#repBar').style.width=(Math.min(100,(state.rep%5)*20+10))+'%';
  $('#inventoryCount').textContent=state.inventory.length+' / '+(3+state.expansions*2)+' CARS';
  $('#profitLabel').textContent=state.profit>0?money(state.profit)+' earned to date':'Ready to make a deal';
  const remaining=Math.max(0,3-state.market.length);$$('.nav-badge').forEach(b=>{b.textContent=state.market.length;b.style.display=state.market.length?'block':'none';});
  if(state.inventory.length){$('#objectiveTitle').textContent='Get your cars road-ready';$('#objectiveText').textContent='Tune up a car, then find a buyer.';}
  if(state.market.length===0){$('#objectiveTitle').textContent='Restock the market';$('#objectiveText').textContent='A new day brings fresh listings.';}
}
function openPanel(name){
  if(name==='home')name='garage';
  state.activePanel=name;const panel=$('#sidePanel');panel.classList.add('open');panel.setAttribute('aria-hidden','false');$('#panelScrim').classList.add('open');
  const labels={market:['RIVERSIDE AUTO EXCHANGE','Find your next deal'],garage:['YOUR DEALERSHIP','The lot'],office:['BUSINESS MANAGEMENT','Dealer office']};
  const pair=labels[name]||labels.garage;$('#panelKicker').textContent=pair[0];$('#panelTitle').textContent=pair[1];makePanel(name);
}
function closePanel(){state.activePanel='';$('#sidePanel').classList.remove('open');$('#sidePanel').setAttribute('aria-hidden','true');$('#panelScrim').classList.remove('open');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.panel==='home'));}
function toast(text){if(!toastEl)return;toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2300);if(state.sound)beep();}
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=620;g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.1);o.onended=()=>ctx.close();}catch(e){}}

function makePanel(name) {
  const content=$('#panelContent');
  if(name==='market'){
    const intro=`<p class="section-label">${state.market.length} CARS AVAILABLE · INSPECTION IS FREE</p>`;
    if(!state.market.length){content.innerHTML=intro+`<div class="empty-state"><div class="empty-icon">⌕</div><strong>Market's gone quiet</strong><p>Take a drive, then open the office to start a new day and refresh local listings.</p></div><button class="action-btn" data-action="end-day" style="width:100%;margin-top:12px">OPEN A NEW DAY · ${money(0)}</button>`;}
    else content.innerHTML=intro+state.market.map(car=>{
      const model=CATALOG[car.model],value=carValue(car),avg=Math.round((car.body+car.engine+car.clean)/3);
      return `<article class="listing-card"><div class="listing-visual" style="--car-color:${car.color}"><span class="condition-chip">${avg}% CONDITION</span><span class="listing-tag">${model.type}</span><div class="mini-car"></div></div><div class="listing-info"><div class="listing-title-row"><h3>${model.name}</h3><span class="listing-price">${money(car.asking)}</span></div><div class="listing-meta">${car.mileage.toLocaleString()} KM &nbsp;·&nbsp; ${car.engine}% ENGINE</div><div class="listing-price-row"><div class="market-value">EST. RESALE VALUE<b>${money(value)}</b></div><button class="small-btn" data-action="inspect" data-id="${car.id}">INSPECT ↗</button></div></div></article>`;
    }).join('');
  } else if(name==='garage'){
    const intro=`<p class="section-label">${state.inventory.length} / ${3+state.expansions*2} INVENTORY SLOTS</p>`;
    if(!state.inventory.length){content.innerHTML=intro+`<div class="empty-state"><div class="empty-icon">⌂</div><strong>Your lot is ready</strong><p>Buy a car at the Riverside Auto Exchange, get it looking sharp, then sell for a profit.</p><button class="action-btn" data-action="goto-market" style="margin-top:9px">BROWSE THE MARKET ↗</button></div>`;}
    else content.innerHTML=intro+state.inventory.map(car=>{
      const model=CATALOG[car.model],value=carValue(car);
      return `<article class="inventory-card"><div class="inventory-top"><h3>${model.name}</h3><span class="inventory-price">${money(value)}</span></div><div class="car-stats"><span>${model.type}</span><span>${car.mileage.toLocaleString()} KM</span><span>LOT VALUE</span></div><div class="car-stats"><span>BODY ${car.body}%</span><span>ENGINE ${car.engine}%</span><span>CLEAN ${car.clean}%</span></div><div class="stat-line"><i style="width:${Math.round((car.body+car.engine+car.clean)/3)}%"></i></div><div class="card-actions" style="margin-top:13px"><button class="action-btn" data-action="repair" data-id="${car.id}" data-kind="engine">ENGINE +20</button><button class="action-btn" data-action="repair" data-id="${car.id}" data-kind="body">BODY +20</button><button class="action-btn secondary" data-action="clean" data-id="${car.id}">CLEAN</button></div><div class="card-actions" style="margin-top:6px"><button class="action-btn secondary" data-action="paint" data-id="${car.id}">CHANGE PAINT</button><button class="action-btn" data-action="sell" data-id="${car.id}">FIND A BUYER ↗</button></div></article>`;
    }).join('');
  } else {
    const nextCost=18000+state.expansions*18000;
    content.innerHTML=`<p class="section-label">A SMARTER DEALER IS A RICHER DEALER</p><article class="office-card"><h3>Dealership expansion</h3><p>More showroom space means room for more inventory. Build your reputation one deal at a time.</p><div class="upgrade-row"><span>+2 INVENTORY SLOTS<br><small style="color:#96a49b">${state.expansions} expansions owned</small></span><strong>${money(nextCost)}</strong></div><button class="action-btn" data-action="expand" style="width:100%;margin-top:12px">${state.expansions>=3?'MAXIMUM EXPANSION':'EXPAND YOUR LOT'}</button></article><article class="office-card"><h3>Dealer standing</h3><p>Good cars and honest deals build trust. Higher reputation improves resale value and unlocks better customers.</p><div class="upgrade-row"><span>CURRENT RATING</span><strong>★ ${state.rep.toFixed(1)} / 5.0</strong></div><div class="upgrade-row"><span>CAREER PROFIT</span><strong>${money(state.profit)}</strong></div></article><article class="office-card"><h3>Close up for the day</h3><p>Market listings refresh overnight. Daily running costs are $300, but a fresh morning can bring a rare find.</p><button class="action-btn" data-action="end-day" style="width:100%;margin-top:12px">END DAY & REFRESH MARKET →</button></article><p class="section-label" style="margin-top:18px">TIP · INSPECT BEFORE YOU BUY</p><p style="font-size:10px;line-height:1.6;color:#a6b1a8">A $150 appraisal reveals hidden mechanical faults. A great deal is only great if it runs.</p>`;
  }
  content.onclick=(event)=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const {action,id,kind}=button.dataset;
    if(action==='inspect'){const car=state.market.find(c=>c.id===id);if(car)showInspect(car);}
    if(action==='repair')repairCar(id,kind);
    if(action==='clean')repairCar(id,'clean');
    if(action==='paint')paintCar(id);
    if(action==='sell')sellCar(id);
    if(action==='expand')expandLot();
    if(action==='end-day')endDay();
    if(action==='goto-market')openPanel('market');
  };
}

function showModal(html){const layer=$('#modalLayer');$('#modalCard').innerHTML=html;layer.classList.add('open');layer.setAttribute('aria-hidden','false');$('#modalCard').onclick=modalAction;$('#modalCard').oninput=e=>{if(e.target.matches('[data-price-slider]')){const out=$('#offerValue');if(out)out.textContent=money(+e.target.value);}};}
function hideModal(){const layer=$('#modalLayer');layer.classList.remove('open');layer.setAttribute('aria-hidden','true');}
function carArt(car){return `<div class="modal-car-art" style="--car-color:${car.color}"><div class="mini-car"></div></div>`;}
function showInspect(car){
  const model=CATALOG[car.model],avg=Math.round((car.body+car.engine+car.clean)/3),engine=car.appraised?(car.scam?Math.max(12,car.engine-24):car.engine):null;
  showModal(`<div class="modal-top"><div><span class="eyebrow">RIVERSIDE AUTO EXCHANGE · LISTING</span><h2>${model.name}</h2></div><button class="modal-close" data-action="dismiss">×</button></div>${carArt(car)}<div class="detail-grid"><div class="detail-stat"><span>BODY</span><b>${car.body}%</b></div><div class="detail-stat"><span>ENGINE</span><b>${engine===null?'UNVERIFIED':engine+'%'}</b></div><div class="detail-stat"><span>CONDITION</span><b>${avg}%</b></div><div class="detail-stat"><span>MILEAGE</span><b>${Math.round(car.mileage/1000)}K KM</b></div><div class="detail-stat"><span>MARKET VALUE</span><b>${money(carValue(car))}</b></div><div class="detail-stat"><span>SELLER ASK</span><b>${money(car.asking)}</b></div></div>${car.appraised&&car.scam?'<p class="modal-copy" style="color:#f5a45d">⚠ APPRAISAL ALERT · Undisclosed engine wear found. Repair may be needed.</p>':'<p class="modal-copy">A promising listing. Check it over, then make an offer. The seller may counter — or walk away.</p>'}<div class="modal-actions">${!car.appraised?'<button class="ghost-btn" data-action="appraise" data-id="'+car.id+'">APPRAISE · $150</button>':''}<button class="primary-btn" data-action="negotiate" data-id="${car.id}">MAKE AN OFFER ↗</button></div>`);
}
function showNegotiation(car){
  const low=Math.max(500,Math.round(car.asking*.62/100)*100),high=Math.min(Math.floor(state.cash/100)*100,car.asking),initial=Math.min(high,Math.round(car.asking*.82/100)*100);
  showModal(`<div class="modal-top"><div><span class="eyebrow">THE ART OF THE DEAL</span><h2>Make an offer</h2></div><button class="modal-close" data-action="dismiss">×</button></div><p class="modal-copy">The seller wants <b style="color:#fff">${money(car.asking)}</b> for the ${CATALOG[car.model].name}. Start fair and keep your cash in mind.</p><div class="slider-wrap"><div class="slider-head"><span>YOUR OFFER</span><b id="offerValue">${money(initial)}</b></div><input data-price-slider type="range" min="${low}" max="${Math.max(low,high)}" step="100" value="${initial}" /></div><div class="modal-actions"><button class="ghost-btn" data-action="inspect-again" data-id="${car.id}">BACK</button><button class="primary-btn" data-action="offer" data-id="${car.id}">SUBMIT OFFER →</button></div>`);
}
function showSell(car){
  const value=carValue(car),offer=Math.max(500,Math.round(value*(.83+Math.random()*.1)/100)*100);
  showModal(`<div class="modal-top"><div><span class="eyebrow">A CUSTOMER IS INTERESTED</span><h2>${CATALOG[car.model].name}</h2></div><button class="modal-close" data-action="dismiss">×</button></div>${carArt(car)}<div class="price-box"><span>CUSTOMER'S OFFER</span><strong>${money(offer)}</strong></div><p class="modal-copy">Your estimated retail value is ${money(value)}. Accept now for a sure sale, or counter higher — the buyer might walk.</p><div class="slider-wrap"><div class="slider-head"><span>COUNTER OFFER</span><b id="offerValue">${money(Math.round(value*1.05/100)*100)}</b></div><input data-price-slider type="range" min="${offer}" max="${Math.round(value*1.2/100)*100}" step="100" value="${Math.round(value*1.05/100)*100}" /></div><div class="modal-actions"><button class="ghost-btn" data-action="counter" data-id="${car.id}">COUNTER OFFER</button><button class="primary-btn" data-action="accept-sale" data-id="${car.id}" data-price="${offer}">ACCEPT ${money(offer)}</button></div>`);
}
function modalAction(event){
  const button=event.target.closest('[data-action]');if(!button)return;const {action,id}=button.dataset;
  if(action==='dismiss'){hideModal();return;}
  if(action==='appraise'){
    const car=state.market.find(c=>c.id===id);if(!car)return;
    if(state.cash<150){toast('Not enough cash for an appraisal.');return;}
    state.cash-=150;car.appraised=true;updateHUD();showInspect(car);toast(car.scam?'Appraisal found undisclosed engine wear.':'Inspection report is clean.');return;
  }
  if(action==='negotiate'){const car=state.market.find(c=>c.id===id);if(car)showNegotiation(car);return;}
  if(action==='inspect-again'){const car=state.market.find(c=>c.id===id);if(car)showInspect(car);return;}
  if(action==='offer'){
    const car=state.market.find(c=>c.id===id);if(!car)return;const offer=+$('#modalCard [data-price-slider]').value;
    if(offer>state.cash){toast('You do not have enough cash for that offer.');return;}
    if(offer>=car.asking*.79||Math.random()<(offer/car.asking-.47)*.95){buyCar(car,offer);return;}
    if(offer>=car.asking*.64&&Math.random()<.78){showModal(`<div class="modal-top"><div><span class="eyebrow">A COUNTER FROM THE SELLER</span><h2>Meet me halfway.</h2></div></div><p class="modal-copy">“I can't let it go for that. How about ${money(Math.round(car.asking*.91/100)*100)}?”</p><div class="modal-actions"><button class="ghost-btn" data-action="inspect-again" data-id="${id}">WALK AWAY</button><button class="primary-btn" data-action="counter-buy" data-id="${id}" data-price="${Math.round(car.asking*.91/100)*100}">ACCEPT COUNTER</button></div>`);return;}
    showModal(`<div class="modal-top"><div><span class="eyebrow">DEAL DECLINED</span><h2>Seller walks away.</h2></div></div><p class="modal-copy">That offer was too low. You can try again, or look at another car.</p><div class="modal-actions"><button class="ghost-btn" data-action="dismiss">CLOSE</button><button class="primary-btn" data-action="inspect-again" data-id="${id}">TRY AGAIN</button></div>`);return;
  }
  if(action==='counter-buy'){const car=state.market.find(c=>c.id===id);if(car)buyCar(car,+button.dataset.price);return;}
  if(action==='counter'){
    const car=state.inventory.find(c=>c.id===id);if(!car)return;const price=+$('#modalCard [data-price-slider]').value,value=carValue(car);
    if(price<=value*1.07||Math.random()<.42){completeSale(car,price);hideModal();toast('Deal closed at '+money(price)+'.');}
    else{hideModal();toast('Buyer passed on your counter. Try another customer later.');}return;
  }
  if(action==='accept-sale'){const car=state.inventory.find(c=>c.id===id);if(car)completeSale(car,+button.dataset.price);hideModal();return;}
}
function buyCar(car,price){
  if(state.inventory.length>=3+state.expansions*2){toast('Your lot is full. Expand at the dealer office.');return;}
  if(price>state.cash){toast('Not enough cash to close this deal.');return;}
  state.cash-=price;state.market=state.market.filter(c=>c.id!==car.id);
  const owned={...car,asking:0};if(owned.scam)owned.engine=Math.max(12,owned.engine-24);state.inventory.push(owned);state.rep=clamp(state.rep+.1,1,5);updateHUD();hideModal();makePanel('market');
  toast(`${CATALOG[car.model].name} is yours. Get it ready to sell!`);sfxSuccess();
}
function repairCar(id,kind){
  const car=state.inventory.find(c=>c.id===id);if(!car)return;const key=kind==='clean'?'clean':kind,cost=kind==='clean'?220:Math.round(CATALOG[car.model].base*(kind==='engine'?.026:.019));
  if(car[key]>=98){toast('This car is already in top shape.');return;}if(state.cash<cost){toast('Not enough cash for that service.');return;}
  state.cash-=cost;car[key]=clamp(car[key]+(kind==='clean'?27:20),0,100);updateHUD();makePanel('garage');toast(`${kind==='clean'?'Detailing complete':kind.toUpperCase()+' repaired'} · ${money(cost)}`);sfxSuccess();
}
function paintCar(id){const car=state.inventory.find(c=>c.id===id);if(!car)return;if(state.cash<220){toast('A fresh coat costs $220.');return;}state.cash-=220;let i=COLORS.indexOf(car.color);car.color=COLORS[(i+1+COLORS.length)%COLORS.length];updateHUD();makePanel('garage');toast('Fresh paint. Looking sharp.');}
function sellCar(id){const car=state.inventory.find(c=>c.id===id);if(car)showSell(car);}
function completeSale(car,price){state.inventory=state.inventory.filter(c=>c.id!==car.id);state.cash+=price;state.profit+=price;state.rep=clamp(state.rep+.25,1,5);updateHUD();makePanel('garage');toast(`SOLD · ${money(price)} added to your cash.`);sfxSuccess();}
function expandLot(){const cost=18000+state.expansions*18000;if(state.expansions>=3){toast('Your lot is fully expanded.');return;}if(state.cash<cost){toast(`You need ${money(cost)} to expand.`);return;}state.cash-=cost;state.expansions++;updateHUD();makePanel('office');toast('Expansion complete. Two new inventory spaces unlocked.');sfxSuccess();}
function endDay(){state.cash-=300;state.day++;state.time=8.5;if(state.cash<0){state.cash=0;toast('Running costs paid. Cash balance is low.');}state.market=[];const pool=CATALOG.map((_,i)=>i).filter(i=>CATALOG[i].base<16000+state.rep*7800);for(let n=0;n<3;n++){const idx=pool[Math.floor(Math.random()*pool.length)]??0,c=newCar(idx);const condition=(c.body+c.engine+c.clean)/3;c.asking=Math.round(CATALOG[idx].base*(.31+condition*.0032)*(0.88+Math.random()*.25)/100)*100;state.market.push(c);}updateHUD();makePanel('market');toast(`Day ${state.day}. Fresh cars just arrived.`);}
function sfxSuccess(){if(!state.sound)return;beep();setTimeout(beep,110);}

function interact(){
  if(!nearby)return;
  if(nearby==='market'){openPanel('market');$('#locationLabel').textContent='RIVERSIDE · AUTO EXCHANGE';}
  else if(nearby==='garage'){openPanel('garage');$('#locationLabel').textContent='RIVERSIDE · DEALERSHIP';}
  else if(nearby==='office'){openPanel('office');$('#locationLabel').textContent='RIVERSIDE · DEALER OFFICE';}
}

function tick(now){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  const driving=state.started&&!state.activePanel&&!$('#modalLayer').classList.contains('open');
  const forward=keys.w||keys.arrowup||touch.gas;
  const reverse=keys.s||keys.arrowdown||touch.brake;
  const left=keys.a||keys.arrowleft||touch.left;
  const right=keys.d||keys.arrowright||touch.right;

  if(driving){
    if(forward)speed=Math.min(13,speed+dt*7.2);
    else if(reverse)speed=Math.max(-4.2,speed-dt*8.5);
    else speed*=Math.max(0,1-dt*.72);
    if(Math.abs(speed)<.035)speed=0;
    const steering=(right?1:0)-(left?1:0);
    if(steering)heading+=steering*dt*(.65+Math.min(1,Math.abs(speed)/7)*1.05)*(speed<-.1?-1:1);
    position.x+=-Math.sin(heading)*speed*dt;
    position.z+=-Math.cos(heading)*speed*dt;
    position.x=clamp(position.x,-105,105);position.z=clamp(position.z,-105,83);
    state.time+=dt*.025;
    if(state.time>=24){state.time-=24;state.day++;}
  }else{
    speed*=Math.max(0,1-dt*5);
    if(Math.abs(speed)<.035)speed=0;
  }

  carGroup.position.copy(position);carGroup.rotation.y=heading;
  const behindX=Math.sin(heading)*9.2,behindZ=Math.cos(heading)*9.2;
  const desired=new THREE.Vector3(position.x+behindX,position.y+5.4,position.z+behindZ);
  camera.position.lerp(desired,1-Math.pow(.001,dt));
  camera.lookAt(position.x,position.y+1.05,position.z- Math.cos(heading)*1.8);
  renderer.render(scene,camera);

  const kmh=Math.round(Math.abs(speed)*7.2);
  $('#speedLabel').textContent=kmh;$('#speedMeter').style.height=Math.min(100,kmh/95*100)+'%';
  $('#gearLabel').textContent=speed===0?'P':speed<0?'R':'D';
  const mapX=clamp((position.x+80)/170*100,2,98),mapY=clamp((position.z+65)/130*100,2,98);
  $('#mapPlayer').style.left=mapX+'%';$('#mapPlayer').style.top=mapY+'%';
  const marketDist=Math.hypot(position.x-40,position.z+31);
  const garageDist=Math.hypot(position.x,position.z-10);
  const officeDist=Math.hypot(position.x-22,position.z);
  let next='';
  if(marketDist<7)next='market';
  else if(garageDist<7)next='garage';
  else if(officeDist<6)next='office';
  nearby=next;
  const interaction=$('#interaction');
  interaction.classList.toggle('visible',Boolean(next)&&state.started&&!state.activePanel);
  const prompts={market:'Browse Riverside Auto Exchange',garage:'Manage your dealership lot',office:'Open dealer office'};
  $('#interactionText').textContent=prompts[next]||'Interact';

  const timeMinute=Math.floor(state.time*60);
  if(timeMinute!==tick.lastMinute){
    tick.lastMinute=timeMinute;
    $('#timeLabel').textContent=String(Math.floor(state.time)).padStart(2,'0')+':'+String(Math.floor((state.time%1)*60)).padStart(2,'0');
  }
  const rank=state.rep>=4?'RIVERSIDE LEGEND':state.rep>=3?'TRUSTED DEALER':state.rep>=2?'LOCAL REGULAR':'ROOKIE DEALER';
  $('#rankLabel').textContent=rank;
}
tick.lastMinute=-1;

initWorld();
initGame();
