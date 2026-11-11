import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

// Boundary: a small, self-contained arcade cricket match built around real shot timing.
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c5c6');
scene.fog = new THREE.Fog('#a9c5c6', 45, 115);
const camera = new THREE.PerspectiveCamera(49, window.innerWidth / window.innerHeight, .1, 180);
camera.position.set(0, 7.6, 18.5);
camera.lookAt(0, 1.2, -3.4);

const clock = new THREE.Clock();
const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mats = {
  grass: mat('#3d7441'), grass2: mat('#468347'), pitch: mat('#bca778'), line: mat('#f4edce'),
  white: mat('#f8f2de'), red: mat('#d74832'), dark: mat('#17251c'), cream: mat('#f2f0dc'),
  bat: mat('#d3aa5e'), blue: mat('#264e8b'), green: mat('#d8ff55'), skin: mat('#bd8665'),
  stand: mat('#253c32'), stand2: mat('#345044'), board: mat('#e9e9d8'),
};
scene.add(new THREE.HemisphereLight('#e4f0e2', '#243c28', 2.0));
const sun = new THREE.DirectionalLight('#fff0d3', 3.1);
sun.position.set(-14, 23, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -35; sun.shadow.bias = -.00025;
scene.add(sun);
scene.add(new THREE.AmbientLight('#a9c8d8', .28));

function box(parent, size, material, pos, cast = false, receive = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
}
function sphere(parent, radius, material, pos, scale = [1,1,1], segments = 14) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, 10), material);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, rt, rb, h, material, pos, rot = [0,0,0], segments=10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.castShadow = true; parent.add(mesh); return mesh;
}

// The Oval: soft green outfield, striped wicket, boundary rope and packed stands.
const field = new THREE.Mesh(new THREE.CircleGeometry(54, 96), mats.grass);
field.rotation.x = -Math.PI / 2; field.position.y = -.12; field.receiveShadow = true; scene.add(field);
for (let i=0;i<14;i++) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(24 + i*2.15, 26 + i*2.15, 96), mat(i%2 ? '#477d43' : '#3f7540'));
  ring.rotation.x = -Math.PI/2; ring.position.y = -.105 + i*.0004; scene.add(ring);
}
const boundaryGeo = new THREE.TorusGeometry(31, .12, 6, 160);
const boundary = new THREE.Mesh(boundaryGeo, mat('#e8e4c8')); boundary.rotation.x = Math.PI/2; boundary.position.y=.04; scene.add(boundary);
// Alternating mowing bands in the outfield.
for(let i=0;i<9;i++){
  const band=new THREE.Mesh(new THREE.RingGeometry(13+i*2,15+i*2,96),mat(i%2?'#4b8044':'#43793f'));
  band.rotation.x=-Math.PI/2; band.position.y=-.09+i*.0003; scene.add(band);
}
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 20), mats.pitch);
pitch.rotation.x=-Math.PI/2; pitch.position.set(0,.015,-4.5); pitch.receiveShadow=true; scene.add(pitch);
for(let i=0;i<12;i++){
  const stripe=new THREE.Mesh(new THREE.PlaneGeometry(3.15,.09),mat(i%2?'#c9b486':'#b59e70'));
  stripe.rotation.x=-Math.PI/2; stripe.position.set(0,.026,-13.6+i*1.65); scene.add(stripe);
}
for(const z of [-12.5,3.5]){
  box(scene,[3.2,.045,.08],mats.line,[0,.06,z]);
  for(const x of [-1.22,0,1.22]) cylinder(scene,.045,.045,1.04,mats.cream,[x,.54,z],[0,0,0],8);
  for(const x of [-1.22,0]) cylinder(scene,.035,.035,.15,mats.red,[x+.61,1.08,z],[Math.PI/2,0,0],8);
}
for(const x of [-1.4,1.4]){
  box(scene,[.035,.035,17],mats.line,[x,.04,-4.5]);
}
// Tiered curved stand segments with colorful crowd instancing.
for(let tier=0;tier<3;tier++){
  const radius=36+tier*4.5, height=2.2+tier*1.35;
  for(let side=0;side<2;side++){
    const start=side===0?-.92*Math.PI:.08*Math.PI;
    const arc=new THREE.Mesh(new THREE.CylinderGeometry(radius+1,radius,height,50,1,true,start,Math.PI*.84),tier===1?mats.stand2:mats.stand);
    arc.position.y=2.2+tier*height; arc.castShadow=true; scene.add(arc);
    const rowCount=520;
    const crowdGeo=new THREE.BoxGeometry(.23,.36,.19);
    const crowdMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1});
    const crowd=new THREE.InstancedMesh(crowdGeo,crowdMat,rowCount); crowd.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const colors=['#d4d7c6','#c66c4e','#6486a1','#d8bc70','#465c4a','#bcb7a5','#829a83','#a85a50'];
    const dummy=new THREE.Object3D(); const color=new THREE.Color();
    for(let i=0;i<rowCount;i++){
      const a=start+Math.random()*Math.PI*.84, rr=radius+Math.random()*1.8;
      dummy.position.set(Math.sin(a)*rr,2.4+tier*height+Math.random()*.95,Math.cos(a)*rr-2);
      dummy.rotation.y=a+Math.PI/2; const s=.62+Math.random()*.65; dummy.scale.set(s,s,s); dummy.updateMatrix(); crowd.setMatrixAt(i,dummy.matrix);
      color.set(colors[(Math.random()*colors.length)|0]); crowd.setColorAt(i,color);
    }
    scene.add(crowd);
  }
}
// Boundary advertising boards and pavilion-style scoreboard.
for(let i=0;i<18;i++){
  const a=i/18*Math.PI*2, r=31.6;
  const sign=box(scene,[4.1,.62,.22],mat(i%3===0?'#d8ff55':i%3===1?'#e7e5d6':'#183b2c'),[Math.sin(a)*r,.48,Math.cos(a)*r-2]);
  sign.rotation.y=a; sign.castShadow=false;
}
// Floodlight masts add a recognizable stadium silhouette.
for(const [x,z] of [[-25,-18],[25,-18],[-25,12],[25,12]]){
  cylinder(scene,.12,.19,15,mat('#728477'),[x,7.5,z]);
  box(scene,[2.8,.22,.35],mat('#d7decf'),[x,15.1,z]);
  for(let n=0;n<5;n++) sphere(scene,.09,mat('#fff6d8'),[x-1+n*.5,15,z], [1,1,.5],8);
}
// A small pavilion and scoreboard at the far end.
box(scene,[16,6,2],mat('#e5dfc6'),[0,4.2,-37],false);
box(scene,[12,3,.3],mat('#152d22'),[0,5,-35.85]);

// Player rigs use simple articulated geometry, deliberately bold at the broadcast camera distance.
function makePlayer(teamColor, x, z, isBatter=false){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const shirt=mat(teamColor), trousers=mat('#202d27'), skin=mat('#b98260');
  sphere(g,.27,skin,[0,1.72,0],[.82,1, .84],12);
  // helmet
  const helmet=sphere(g,.31,mat(isBatter?'#263c31':'#233c83'),[0,1.91,0],[1,.55,1],12);
  box(g,[.34,.045,.23],mat('#c6d3be'),[0,1.8,-.19]);
  const torso=cylinder(g,.25,.32,.72,shirt,[0,1.14,0],[0,0,0],12);
  const legL=cylinder(g,.105,.13,.75,trousers,[-.14,.42,0],[0,0,.06],9);
  const legR=cylinder(g,.105,.13,.75,trousers,[.14,.42,0],[0,0,-.06],9);
  const armL=cylinder(g,.075,.09,.63,shirt,[-.36,1.26,0],[0,0,-.42],8);
  const armR=cylinder(g,.075,.09,.63,shirt,[.36,1.26,0],[0,0,.42],8);
  for(const x0 of [-.14,.14]) cylinder(g,.1,.11,.14,mat('#ece8d5'),[x0,.08,-.03]);
  let bat=null;
  if(isBatter){
    bat=box(g,[.14,.92,.11],mats.bat,[.48,.93,-.35],true);
    bat.rotation.z=-.42; box(g,[.17,.23,.12],mat('#e7dbc0'),[.48,1.4,-.23]);
  }
  g.userData={torso,legL,legR,armL,armR,bat,helmet,homeX:x,homeZ:z};
  return g;
}
const batter=makePlayer('#e4e6d9',0,3.8,true);
const bowler=makePlayer('#d3e2d3',0,-13,false); bowler.scale.set(.85,.85,.85);
const fielders=[];
for(const [x,z] of [[-11,-9],[11,-8],[-14,0],[14,2],[-8,-19],[9,-22]]){
  const p=makePlayer('#233e82',x,z,false); p.scale.set(.72,.72,.72); fielders.push(p);
}
const ball=sphere(scene,.17,mats.red,[0,1,-13],[1,1,1],14); ball.material=mat('#f2e9d8',.36);
const shadowBall=new THREE.Mesh(new THREE.CircleGeometry(.22,16),new THREE.MeshBasicMaterial({color:'#142515',transparent:true,opacity:.32}));
shadowBall.rotation.x=-Math.PI/2; shadowBall.position.y=.035; scene.add(shadowBall);

const $=s=>document.querySelector(s);
const ui={scoreboard:$('#scoreboard'),runs:$('#runs'),wickets:$('#wickets'),overs:$('#overs'),ballsLeft:$('#ballsLeft'),crr:$('#crr'),targetText:$('#targetText'),opponent:$('#opponentScore'),teamName:$('#teamName'),inningsTag:$('#inningsTag'),center:$('#centerMessage'),title:$('#messageTitle'),kicker:$('#messageKicker'),copy:$('#messageCopy'),start:$('#startBtn'),menuOptions:$('#menuOptions'),modeBtn:$('#modeBtn'),onlinePanel:$('#onlinePanel'),room:$('#roomInput'),onlineStatus:$('#onlineStatus'),hostBtn:$('#hostBtn'),status:$('#statusLabel'),toast:$('#toast'),track:$('#ballTrack'),hit:$('#hitBtn'),hitHint:$('#hitHint'),bowl:$('#bowlingIndicator'),bowlText:$('#bowlingText'),modal:$('#resultModal'),resultTitle:$('#resultTitle'),resultCopy:$('#resultCopy'),resultScore:$('#resultScore'),resultKicker:$('#resultKicker')};
const state={mode:'offline',phase:'menu',runs:0,wickets:0,balls:0,target:20,opponent:0,direction:'straight',deliveryTime:2.08,idealTime:1.88,ballClock:0,shotClock:0,shotDuration:1.1,result:null,canHit:false,runUsed:false,peer:null,conn:null,room:'',remote:{runs:0,wickets:0,balls:0,done:false,name:'FRIEND'},localDone:false,sound:true,matchOver:false};
for(let i=0;i<12;i++){const dot=document.createElement('i');ui.track.append(dot)}
function setSelected(direction){state.direction=direction;document.querySelectorAll('.direction').forEach(b=>b.classList.toggle('selected',b.dataset.direction===direction))}
setSelected('straight');
function makeSound(freq=180,duration=.13,type='triangle',volume=.06){if(!state.sound)return;try{const ac=makeSound.ac||(makeSound.ac=new AudioContext());const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+duration)}catch{}}
function toast(text,style=''){ui.toast.textContent=text;ui.toast.className=`toast show ${style}`;setTimeout(()=>ui.toast.className='toast',1200)}
function updateScore(){
  ui.runs.textContent=state.runs;ui.wickets.textContent=state.wickets;ui.overs.textContent=`${Math.floor(state.balls/6)}.${state.balls%6}`;
  ui.ballsLeft.textContent=`${Math.max(0,12-state.balls)} BALL${12-state.balls===1?'':'S'} LEFT`;
  ui.crr.textContent=state.balls?(state.runs/(state.balls/6)).toFixed(2):'0.00';
  ui.targetText.innerHTML=state.mode==='offline'?`TARGET <b>${state.target}</b>`:'CHALLENGE <b>2 OVERS</b>';
  ui.opponent.textContent=state.mode==='online'?`${state.remote.runs}/${state.remote.wickets}`:`${state.opponent}/2`;
  ui.teamName.textContent=state.mode==='online'?(state.localName||'YOUR XI'):'YOUR XI';
  const dots=ui.track.querySelectorAll('i');dots.forEach((d,i)=>{d.classList.toggle('done',i<state.balls);d.classList.toggle('wicket',i<state.balls&&state.ballOutcomes?.[i]==='W')});
}
function sendNet(type,extra={}){if(state.conn?.open)state.conn.send({type,...extra})}
function publishScore(){sendNet('score',{score:{runs:state.runs,wickets:state.wickets,balls:state.balls,done:state.localDone,name:state.localName||'FRIEND'}})}
function hideMenu(){ui.center.classList.add('hidden');ui.scoreboard.classList.remove('hidden')}
function showMenu(){state.phase='menu';state.matchOver=false;ui.modal.classList.add('hidden');ui.center.classList.remove('hidden');ui.onlinePanel.classList.add('hidden');ui.menuOptions.classList.remove('hidden');ui.start.classList.remove('hidden');ui.start.textContent='STEP UP TO BAT';ui.title.innerHTML='OWN THE<br/><em>CREASE.</em>';ui.kicker.textContent='READY WHEN YOU ARE';ui.copy.textContent='Read the ball. Find the gap. Make it count.';ui.status.textContent='MATCH DAY';ui.scoreboard.classList.add('hidden');ui.hit.disabled=true}
function startMatch(mode='offline'){
  state.mode=mode;state.phase='ready';state.runs=0;state.wickets=0;state.balls=0;state.ballOutcomes=[];state.localDone=false;state.matchOver=false;state.remote={runs:0,wickets:0,balls:0,done:false,name:state.remote.name||'FRIEND'};
  state.opponent=mode==='offline'?18:0;state.target=state.opponent+1;state.canHit=false;state.result=null;
  ui.modal.classList.add('hidden');hideMenu();ui.status.textContent=mode==='online'?'ONLINE 1V1':'OFFLINE MATCH';ui.inningsTag.textContent='1ST INNINGS';ui.hit.disabled=false;
  batter.position.set(0,0,3.8);batter.rotation.set(0,0,0);batter.userData.bat.rotation.z=-.42;
  ball.visible=false;shadowBall.visible=false;updateScore();setTimeout(startDelivery,700);
}
function startDelivery(){
  if(state.phase==='menu'||state.matchOver||state.localDone)return;
  state.phase='delivery';state.ballClock=0;state.canHit=true;state.deliveryTime=2.12;state.idealTime=1.82+Math.random()*.12;state.result=null;state.runUsed=false;
  ball.visible=true;ball.position.set((Math.random()-.5)*.24,1.4,-13);shadowBall.visible=true;
  bowler.userData.armR.rotation.x=-.8;bowler.userData.armR.rotation.z=.8;
  ui.hit.disabled=false;ui.hitHint.textContent='TAP AT THE CREASE';ui.bowl.classList.add('active');ui.bowlText.textContent=`BALL ${state.balls+1} · ${state.balls<6?'OVER 1':'OVER 2'}`;
  makeSound(120,.08,'sine',.018);
}
function swing(){
  if(!state.canHit||state.phase!=='delivery')return;
  state.canHit=false;const diff=Math.abs(state.ballClock-state.idealTime);
  let quality=diff<.12?'PERFECT':diff<.27?'GOOD':diff<.46?'OKAY':'POOR';
  let outcome;
  if(diff>.68){outcome=Math.random()<.66?'W':0;quality='MISSED'}
  else if(quality==='PERFECT')outcome=weighted([[0,.025],[1,.15],[2,.19],[4,.38],[6,state.direction==='straight'?.26:.20]]);
  else if(quality==='GOOD')outcome=weighted([[0,.08],[1,.3],[2,.2],[4,.32],[6,state.direction==='straight'?.1:.07]]);
  else if(quality==='OKAY')outcome=weighted([[0,.25],[1,.41],[2,.18],[4,.13],[6,.03]]);
  else outcome=weighted([[0,.64],[1,.27],[2,.06],['W',.03]]);
  // A little risk from the field, but clean timing keeps the strike sweet.
  if(typeof outcome==='number'&&outcome>=4&&quality!=='PERFECT'&&Math.random()<.13)outcome=weighted([[1,.65],[2,.35]]);
  state.phase='shot';state.shotClock=0;state.shotDuration=outcome===6?1.55:1.15;state.result=outcome;state.quality=quality;state.shotStart=ball.position.clone();
  const lane=state.direction==='left'?-1:state.direction==='right'?1:0;
  state.shotEnd=new THREE.Vector3(lane*(outcome===6?24:outcome===4?18:11),.18,-31+Math.random()*5);
  if(outcome==='W')state.shotEnd=new THREE.Vector3(lane*2,.18,-9);
  batter.userData.bat.rotation.z=-1.38;batter.userData.bat.rotation.x=-.3;
  makeSound(quality==='PERFECT'?540:quality==='GOOD'?370:250,.18,'triangle',.1);
  ui.hit.disabled=true;ui.hitHint.textContent=`${quality} TIMING`;ui.bowl.classList.remove('active');
  if(quality==='PERFECT')toast('PURE TIMING','boundary');else if(quality==='GOOD')toast('MIDDLE OF THE BAT');
}
function weighted(choices){let n=Math.random(),sum=0;for(const [v,p]of choices){sum+=p;if(n<=sum)return v}return choices[choices.length-1][0]}
function requestRun(){if(state.phase==='shot'&&!state.runUsed&&typeof state.result==='number'&&state.result<4){state.runUsed=true;if(Math.random()<.12){state.result='W';toast('RUN OUT!')}else{state.result=Math.min(3,state.result+1);toast('GOOD RUN')}}}
function finishBall(){
  const result=state.result;state.phase='ready';state.canHit=false;state.balls++;state.ballOutcomes.push(result==='W'?'W':'R');
  if(result==='W'){state.wickets++;toast('BOWLED!');makeSound(100,.22,'sawtooth',.06)}
  else if(result>0){state.runs+=result;toast(result===6?'SIX!':result===4?'FOUR!':`+${result} RUN${result>1?'S':''}`,result>=4?'boundary':'');makeSound(result>=4?660:330,.2,'sine',.07)}else toast('DOT BALL');
  updateScore();publishScore();
  if(state.runs>=state.target){finishMatch(true);return}
  if(state.balls>=12||state.wickets>=2){finishMatch(false);return}
  ui.hit.disabled=false;setTimeout(startDelivery,850);
}
function finishMatch(won){
  state.localDone=true;state.matchOver=true;state.phase='done';state.canHit=false;ui.hit.disabled=true;publishScore();
  if(state.mode==='online'&&!state.remote.done){ui.bowl.classList.remove('active');ui.kicker.textContent='INNINGS COMPLETE';ui.title.innerHTML='WAITING ON<br/><em>YOUR RIVAL.</em>';ui.copy.textContent=`You made ${state.runs}/${state.wickets}. Your score is in — waiting for your friend to finish.`;ui.center.classList.remove('hidden');return}
  showResult(won);
}
function showResult(won){
  ui.modal.classList.remove('hidden');ui.resultScore.textContent=`${state.runs}/${state.wickets}`;
  if(state.mode==='online'){
    const draw=state.runs===state.remote.runs;ui.resultKicker.textContent=draw?'MATCH TIED':'ONLINE · MATCH COMPLETE';
    ui.resultTitle.innerHTML=draw?'EVEN<br/><em>STEVENS.</em>':state.runs>state.remote.runs?'YOU<br/><em>WIN.</em>':'THEY<br/><em>GOT YOU.</em>';
    ui.resultCopy.textContent=`You: ${state.runs}/${state.wickets} · Friend: ${state.remote.runs}/${state.remote.wickets}`;
  }else{
    ui.resultKicker.textContent=won?'TARGET REACHED':'INNINGS COMPLETE';
    ui.resultTitle.innerHTML=won?'WHAT A<br/><em>CHASE.</em>':'BACK TO<br/><em>THE NETS.</em>';
    ui.resultCopy.textContent=won?`You chased down ${state.target} with ${Math.max(0,12-state.balls)} ball${12-state.balls===1?'':'s'} to spare.`:`The target was ${state.target}. Every ball tells a story — fancy another over?`;
  }
}
function receiveNet(data){
  if(!data)return;
  if(data.type==='start'){state.remote.name=data.name||'FRIEND';state.localName='YOUR XI';startMatch('online');ui.status.textContent=`VS ${state.remote.name.toUpperCase()}`;}
  if(data.type==='score'){
    state.remote={...state.remote,...data.score};updateScore();
    if(state.localDone&&state.remote.done)showResult(state.runs>=state.remote.runs);
    else if(state.localDone&&state.remote.done===false){ui.title.innerHTML='WAITING ON<br/><em>YOUR RIVAL.</em>';}
  }
  if(data.type==='hello')state.remote.name=data.name||'FRIEND';
}
function loadPeer(){return new Promise((resolve,reject)=>{
  if(window.Peer)return resolve(window.Peer);
  const s=document.createElement('script');s.src='https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';s.onload=()=>resolve(window.Peer);s.onerror=()=>reject(new Error('Could not load online connection. Check your internet and try again.'));document.head.appendChild(s);
})}
async function hostOnline(){ui.onlineStatus.textContent='Creating a private room…';ui.hostBtn.disabled=true;try{
  const Peer=await loadPeer();const code=Math.random().toString(36).slice(2,8).toUpperCase();state.room=code;
  const peer=new Peer(`boundary-${code.toLowerCase()}`);state.peer=peer;
  peer.on('open',()=>{ui.onlineStatus.innerHTML=`ROOM CODE <strong class="room-code">${code}</strong> · Share this code with your friend.`;ui.status.textContent='ROOM READY';});
  peer.on('connection',conn=>{state.conn=conn;conn.on('open',()=>{state.localName='HOST XI';sendNet('hello',{name:'HOST XI'});sendNet('start',{name:'HOST XI'});startMatch('online');ui.status.textContent='ONLINE 1V1';});conn.on('data',receiveNet);conn.on('close',()=>toast('FRIEND DISCONNECTED'));});
  peer.on('error',e=>{ui.onlineStatus.textContent=e.type==='unavailable-id'?'Room code collision — create a new room.':`Connection issue: ${e.type}. Try again.`;ui.hostBtn.disabled=false;});
}catch(e){ui.onlineStatus.textContent=e.message;ui.hostBtn.disabled=false}}
async function joinOnline(){const code=ui.room.value.trim().toUpperCase();if(code.length<4){ui.onlineStatus.textContent='Enter the room code your friend shared.';return}ui.onlineStatus.textContent='Connecting to the Oval…';try{
  const Peer=await loadPeer();const peer=new Peer();state.peer=peer;
  peer.on('open',()=>{const conn=peer.connect(`boundary-${code.toLowerCase()}`,{reliable:true});state.conn=conn;conn.on('open',()=>{state.localName='CHALLENGER XI';sendNet('hello',{name:'CHALLENGER XI'});startMatch('online');ui.status.textContent='ONLINE 1V1';});conn.on('data',receiveNet);conn.on('error',()=>ui.onlineStatus.textContent='Could not connect. Check the code and try again.');});
  peer.on('error',e=>ui.onlineStatus.textContent=e.type==='peer-unavailable'?'Room not found. Check the room code and try again.':`Connection issue: ${e.type}.`);
}catch(e){ui.onlineStatus.textContent=e.message}}

// UI controls: keyboard, touch and mouse share the same shot mechanic.
ui.start.addEventListener('click',()=>startMatch('offline'));
ui.modeBtn.addEventListener('click',()=>{ui.menuOptions.classList.add('hidden');ui.start.classList.add('hidden');ui.onlinePanel.classList.remove('hidden')});
$('#backBtn').addEventListener('click',()=>{ui.onlinePanel.classList.add('hidden');ui.menuOptions.classList.remove('hidden');ui.start.classList.remove('hidden')});
$('#hostBtn').addEventListener('click',hostOnline);$('#joinBtn').addEventListener('click',joinOnline);
$('#playAgainBtn').addEventListener('click',()=>{if(state.mode==='online'&&state.conn?.open){state.conn.close();state.peer?.destroy()}showMenu();});
$('#menuBtn').addEventListener('click',()=>{if(state.conn?.open)state.conn.close();state.peer?.destroy();showMenu()});
$('#rulesBtn').addEventListener('click',()=>{ui.kicker.textContent='READ THE RELEASE';ui.title.innerHTML='PICK YOUR<br/><em>MOMENT.</em>';ui.copy.innerHTML='Wait for the ball to reach the crease, then tap <b>HIT IT</b> at the perfect moment. Aim with the side buttons or arrow keys. <b>SPACE</b> swings · <b>R</b> risks an extra run.';ui.start.textContent='GOT IT — LET’S PLAY';ui.start.onclick=()=>{ui.start.onclick=null;ui.start.textContent='STEP UP TO BAT';ui.kicker.textContent='READY WHEN YOU ARE';ui.title.innerHTML='OWN THE<br/><em>CREASE.</em>';ui.copy.textContent='Read the ball. Find the gap. Make it count.';startMatch('offline')}});
document.querySelectorAll('.direction').forEach(btn=>btn.addEventListener('click',()=>setSelected(btn.dataset.direction)));
ui.hit.addEventListener('click',swing);
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();swing()}
  if(e.key==='ArrowLeft')setSelected('left');if(e.key==='ArrowRight')setSelected('right');if(e.key==='ArrowUp')setSelected('straight');if(e.key.toLowerCase()==='r')requestRun();
});
$('#soundBtn').addEventListener('click',e=>{state.sound=!state.sound;e.currentTarget.innerHTML=state.sound?'♫ <span>SOUND ON</span>':'♫ <span>SOUND OFF</span>'});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7))});

// Frame loop: ball flight is continuous and the bounce is visible before the contact window.
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);
  if(state.phase==='delivery'){
    state.ballClock+=dt;const t=Math.min(state.ballClock/state.deliveryTime,1),e=t*t*(3-2*t);
    const z=-13+16.8*e;let y=1.35+Math.sin(t*Math.PI)*1.75;
    if(t>.72)y=Math.max(.22,1.35+Math.sin(t*Math.PI)*1.75-(t-.72)*4.8);
    ball.position.set(Math.sin(t*5)*.08,y,z);shadowBall.position.set(ball.position.x,.035,z);shadowBall.scale.setScalar(1+Math.max(0,y-.2)*.2);
    if(state.ballClock>state.deliveryTime){state.canHit=false;state.result=Math.random()<.7?'W':0;state.phase='shot';state.shotClock=0;state.shotDuration=.65;state.shotStart=ball.position.clone();state.shotEnd=new THREE.Vector3(0,.17,4);ui.bowl.classList.remove('active');toast(state.result==='W'?'BOWLED!':'BEATEN');}
  }else if(state.phase==='shot'){
    state.shotClock+=dt;const t=Math.min(state.shotClock/state.shotDuration,1);
    const p=state.shotStart.clone().lerp(state.shotEnd,t);p.y+=Math.sin(t*Math.PI)*Math.max(0,state.result===6?8:state.result===4?5:2.2);
    ball.position.copy(p);shadowBall.position.set(p.x,.035,p.z);
    if(t>=1)finishBall();
  }else if(state.phase==='menu'||state.phase==='ready'||state.phase==='done'){
    if(state.phase!=='delivery'&&state.phase!=='shot'){ball.visible=false;shadowBall.visible=false}
  }
  const sway=Math.sin(performance.now()*.002)*.025;
  if(state.phase==='delivery'){
    bowler.position.x=Math.sin(state.ballClock*4)*.06;
    bowler.userData.legL.rotation.x=Math.sin(state.ballClock*8)*.16;
    bowler.userData.armR.rotation.z=.8+Math.sin(state.ballClock*6)*.12;
  }else {bowler.position.x+=(0-bowler.position.x)*dt*3;bowler.userData.armR.rotation.z+=(.42-bowler.userData.armR.rotation.z)*dt*2}
  if(state.phase==='shot'){
    batter.userData.bat.rotation.z+=(.2-batter.userData.bat.rotation.z)*dt*8;
    batter.rotation.y+=(state.direction==='left'?.2:state.direction==='right'?-.2:0-batter.rotation.y)*dt*3;
  }else{batter.userData.bat.rotation.z+=(-.42-batter.userData.bat.rotation.z)*dt*4;batter.rotation.y+=(0-batter.rotation.y)*dt*2}
  batter.position.x=sway;
  renderer.render(scene,camera);
}
showMenu();ui.scoreboard.classList.add('hidden');ui.hit.disabled=true;animate();
