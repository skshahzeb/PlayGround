import * as THREE from '../vendor/three.module.js';

const $ = s => document.querySelector(s);
const stage = $('#stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#173d35');
scene.fog = new THREE.FogExp2('#173d35', 0.017);
const camera = new THREE.PerspectiveCamera(43, 1, .1, 120);
camera.position.set(0, 5.2, 13.8);
camera.lookAt(0, 1.2, -2.2);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
stage.appendChild(renderer.domElement);

const mat = (color, roughness=.8, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const grassMat = mat('#2d6948'), turfDark = mat('#245b40'), pitchMat = mat('#aa9c72'), lineMat = mat('#f3e8c9'), leather = mat('#d94b32', .45), batMat = mat('#c8a265'), dark = mat('#172b2a'), skin = mat('#986348'), white = mat('#ece7d8'), blue = mat('#326b8d'), gold = mat('#c6aa69');
const hemi = new THREE.HemisphereLight('#b9d1c4', '#163625', 2.0); scene.add(hemi);
const moon = new THREE.DirectionalLight('#fff0cb', 3.2); moon.position.set(-5, 11, 6); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048); moon.shadow.camera.left=-15; moon.shadow.camera.right=15; moon.shadow.camera.top=15; moon.shadow.camera.bottom=-15; scene.add(moon);
const rim = new THREE.DirectionalLight('#a5d9c9', 1.35); rim.position.set(8,7,-9); scene.add(rim);
const fill = new THREE.PointLight('#f6c577', 90, 32, 2); fill.position.set(-8, 8, 2); scene.add(fill);
const stadiumFill = new THREE.PointLight('#b4e9dc', 100, 42, 2); stadiumFill.position.set(7, 9, -8); scene.add(stadiumFill);

function box(parent, size, material, pos, cast=true) { const m=new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...pos); m.castShadow=cast; m.receiveShadow=true; parent.add(m); return m; }
function sphere(parent, radius, material, pos, scale=[1,1,1], segments=18) { const m=new THREE.Mesh(new THREE.SphereGeometry(radius,segments,Math.max(10,Math.floor(segments*.7))), material); m.position.set(...pos); m.scale.set(...scale); m.castShadow=true; parent.add(m); return m; }
function cylinder(parent, rt, rb, h, material, pos, segments=12) { const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material); m.position.set(...pos); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m; }
function rod(parent, a, b, radius, material, radial=9) { const p1=new THREE.Vector3(...a),p2=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(p2,p1); const m=new THREE.Mesh(new THREE.CylinderGeometry(radius*.76,radius,d.length(),radial),material); m.position.copy(p1).add(p2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m; }

// A deep oval of clipped turf and a finely striped playing surface.
const ground = new THREE.Mesh(new THREE.CircleGeometry(54, 100), grassMat); ground.rotation.x=-Math.PI/2; ground.position.y=-.12; ground.receiveShadow=true; scene.add(ground);
for(let i=0;i<16;i++){
  const r=9.0+i*.52; const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.52,100),i%2?turfDark:grassMat);
  ring.rotation.x=-Math.PI/2; ring.position.set(0,-.105+i*.0001,-2); ring.receiveShadow=true; scene.add(ring);
}
const boundary=new THREE.Mesh(new THREE.TorusGeometry(11.25,.055,8,140),mat('#d6ddad',.7)); boundary.rotation.x=Math.PI/2; boundary.position.set(0,.01,-2); scene.add(boundary);
// Soft round grandstand terraces.
for(let row=0;row<5;row++){
  const inner=13.1+row*1.25, outer=inner+1.3;
  const band=new THREE.Mesh(new THREE.RingGeometry(inner,outer,120),mat(['#243d39','#304943','#344843','#283d39','#1c3230'][row]));
  band.rotation.x=-Math.PI/2; band.position.y=.12+row*.43; band.position.z=-2; band.receiveShadow=true; scene.add(band);
  const rail=new THREE.Mesh(new THREE.TorusGeometry(outer,.035,6,120),mat('#85937a',.6,.3));rail.rotation.x=Math.PI/2;rail.position.set(0,.18+row*.43,-2);scene.add(rail);
}
// Tiny amber seat lights around the far-side stands create scale and a night-match atmosphere.
for(let row=0;row<5;row++) for(let i=0;i<66;i++){
  const a=Math.PI+(i/65)*Math.PI, r=13.8+row*1.25, x=Math.cos(a)*r, z=-2+Math.sin(a)*r*.77;
  if(Math.abs(x)<4.9&&z>3)continue;
  const lightDot=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),mat((i+row)%5===0?'#d8dc9c':'#b98254',.55,.1));
  lightDot.position.set(x,.31+row*.43,z);scene.add(lightDot);
}
// Floodlight masts and glowing rectangular heads.
for(const x of [-10.5,10.5]) for(const z of [-8.3,1]){
  cylinder(scene,.065,.09,9,mat('#647973',.45,.65),[x,4.4,z],10);
  const lamp=box(scene,[.95,.28,.25],mat('#f9efcb',.26,.15),[x,9,z]);
  const glow=new THREE.PointLight('#fff1ce',95,20,2);glow.position.set(x,8.7,z);scene.add(glow);
  for(let n=-2;n<=2;n++)sphere(scene,.07,mat('#fff6d8',.22),[x+n*.16,9,z+.14],[1,.55,.5],8);
}
// The close, warm wicket strip, creases, and mown pitch lines.
const pitch=new THREE.Mesh(new THREE.BoxGeometry(3.2,.12,17.4),pitchMat);pitch.position.set(0,-.015,-3.15);pitch.receiveShadow=true;pitch.castShadow=true;scene.add(pitch);
for(let i=0;i<18;i++){
 const stripe=box(scene,[3.12,.012,.35],mat(i%2?'#b4a57b':'#a1936e'),[0,.05,-11.35+i*.93],false);stripe.material.transparent=true;stripe.material.opacity=.24;
}
function crease(z){const g=new THREE.Group();box(g,[3.15,.016,.07],lineMat,[0,.065,0],false);for(const x of [-1.45,1.45])box(g,[.06,.016,.55],lineMat,[x,.065,-.19],false);g.position.z=z;scene.add(g)}
crease(1.48);crease(-7.8);
// Far end stumps and striker stumps.
function makeWicket(z){const g=new THREE.Group();for(let x=-.22;x<=.23;x+=.22)cylinder(g,.037,.04,.75,mat('#e4d6ae'),[x,.42,0],10);for(let x=-.16;x<=.16;x+=.32)cylinder(g,.022,.022,.11,mat('#e4d6ae'),[x,.82,0],8);g.position.z=z;scene.add(g);return g}
const batterWicket=makeWicket(1.88), bowlerWicket=makeWicket(-7.82);

function person({x,z,shirt,cap=false,batter=false}){
 const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
 const torso=cylinder(root,.29,.39,.79,mat(shirt),[0,1.38,0],14);torso.rotation.z=-.08;
 sphere(root,.37,mat(shirt),[0,1.73,0],[.83,.56,.63],16);
 // padded trousers, shins, shoes
 for(const side of [-1,1]){
   const hip=[side*.18,.95,0], knee=[side*.2,.54,-.015], foot=[side*.22,.13,.06];
   rod(root,hip,knee,.14,white);rod(root,knee,foot,.12,white);sphere(root,.14,dark,[side*.22,.09,.13],[1.3,.55,1.5],12);
   const pad=box(root,[.21,.47,.12],mat('#dcd8c8'),[side*.2,.58,.12]);pad.rotation.x=-.13;
 }
 sphere(root,.235,skin,[0,2.1,0],[.86,1,.82],16);
 if(cap){
   const helmet=cylinder(root,.24,.25,.19,blue,[0,2.28,0],16);sphere(root,.245,blue,[0,2.31,-.015],[1,.64,.98],16);
   rod(root,[-.2,2.13,.14],[.2,2.13,.14],.018,mat('#b9c9c4',.4,.65));rod(root,[-.2,2.13,.14],[-.18,1.98,.14],.018,mat('#b9c9c4',.4,.65));rod(root,[.2,2.13,.14],[.18,1.98,.14],.018,mat('#b9c9c4',.4,.65));
 }else{sphere(root,.24,mat('#24362f'),[0,2.25,0],[1,.55,1],14);}
 // Arms set in a ready position.
 rod(root,[-.25,1.72,0],[-.43,1.36,-.05],.105,mat(shirt));sphere(root,.085,skin,[-.43,1.36,-.05]);
 rod(root,[.25,1.72,0],[.4,1.38,-.1],.105,mat(shirt));sphere(root,.085,skin,[.4,1.38,-.1]);
 if(batter){
   const pivot=new THREE.Group();pivot.position.set(-.42,1.15,.05);root.add(pivot);
   // bat handle up to blade; slightly closed stance toward bowler
   cylinder(pivot,.055,.07,.8,batMat,[.02,.16,-.25],10).rotation.x=.12;
   const blade=box(pivot,[.19,.82,.13],batMat,[.03,.82,-.27]);blade.rotation.x=-.13;
   box(pivot,[.2,.08,.14],mat('#e1cf9f'),[.03,.43,-.27]).rotation.x=-.13;
   pivot.rotation.x=-.2;pivot.rotation.z=-.16;
   return {root,bat:pivot};
 }
 return {root};
}
const striker=person({x:-.68,z:.94,shirt:'#d4d0c0',cap:true,batter:true});
const bowler=person({x:.25,z:-7.18,shirt:'#b6c3b5'});
// A subtle field ring and four distant fielders give the ground playable scale.
const fielders=[];
for(const [x,z,c] of [[-5,-3,'#c4c6b7'],[5,-4,'#c4c6b7'],[-7,-9,'#b8c2b5'],[7,-9,'#b8c2b5']])fielders.push(person({x,z,shirt:c}));

// Ball, ball trail, and stadium atmosphere.
const ball=sphere(scene,.115,leather,[0,.7,-8],[1,1,1],20);ball.visible=false;
const ballSeam=new THREE.Mesh(new THREE.TorusGeometry(.079,.009,5,20),mat('#ead8c1',.55));ball.add(ballSeam);ballSeam.rotation.set(.7,.5,.5);
const trailMat=new THREE.MeshBasicMaterial({color:'#f18b62',transparent:true,opacity:.22});
const trail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.12,1.2,8,1,true),trailMat);trail.visible=false;scene.add(trail);
const specks=new THREE.Group();scene.add(specks);
for(let i=0;i<65;i++){const dot=sphere(specks,.012,mat('#d5dcae'),[(Math.random()-.5)*35,4+Math.random()*12,-15-Math.random()*12],[1,1,1],5);dot.material.emissive=new THREE.Color('#59715c');}

let audioCtx=null, muted=true;
function sound(freq=180,duration=.08,type='sine',volume=.045){if(muted)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}

let playing=false, state='menu', runs=0,wickets=0,balls=0,target=24,delivery=null,swingUntil=0, swingAt=0, shotType='drive', resultTimer=0, animTime=0, lastTime=performance.now(), countdown=0, waiting=0, hitReported=false;
const random=(a,b)=>a+Math.random()*(b-a);
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();

function updateScore(){
 $('#score').textContent=runs;$('#wickets').textContent=wickets;$('#overs').textContent=`${Math.floor(balls/6)}.${balls%6}`;
 const left=Math.max(0,18-balls),need=Math.max(0,target-runs);$('#required').textContent=`${need} OFF ${left}`;
 $('#targetLabel').textContent=runs>=target?'TARGET REACHED':`TARGET ${target}`;
}
function showMessage(title,sub=''){const el=$('#resultBanner');$('#resultText').textContent=title;$('#resultSub').textContent=sub;el.classList.add('show');resultTimer=1.55;}
function setShot(name,hint){$('#shotName').textContent=name;$('#shotHint').textContent=hint;}
function resetMatch(){runs=0;wickets=0;balls=0;delivery=null;state='ready';playing=true;$('#endScreen').classList.add('hidden');$('#startScreen').classList.add('hidden');$('#scoreboard').style.opacity=1;$('#callout').style.opacity=1;updateScore();$('#calloutText').textContent='WATCH THE BOWLER';$('#deliveryText').textContent='GET SET';countdown=.75;setShot('—','WATCH THE BALL');sound(520,.12,'triangle',.03);}
function finish(){state='ended';playing=false;ball.visible=false;$('#finalRuns').textContent=runs;const won=runs>=target;$('#endTitle').textContent=won?'CHASE COMPLETE.':'THAT’S THE GAME.';$('#endCopy').textContent=won?'A perfect finish. The crowd is on its feet.':'The next innings is yours to write.';$('#endScreen').classList.remove('hidden');$('#callout').style.opacity=0;$('#deliveryText').textContent='INNINGS COMPLETE';sound(won?760:160,.35,'triangle',.04);}
function bowl(){
 if(!playing||state==='ended')return;
 if(balls>=18||wickets>=5||runs>=target){finish();return;}
 state='bowling';hitReported=false;swingUntil=0;
 const x=random(-.72,.72), speed=random(6.5,7.7), flight=random(.07,.13);
 delivery={x,z:-8.15,y:1.55,speed,vy:0,bounceZ:-2.3,done:false,line:Math.random()<.23?'wide':'good',start:performance.now()/1000,hit:false,launch:null,flight, loft:0};
 ball.position.set(x,1.5,-8.15);ball.visible=true;ball.rotation.set(0,0,0);$('#deliveryText').textContent='BOWLER IN';$('#calloutText').textContent='READ THE RELEASE';$('#callout').style.opacity=1;
 // Bowler action
 bowler.root.rotation.x=-.13;
}
function swing(){
 if(!playing||state==='ended'||state==='menu')return;
 if(state==='ready'){return;}
 const now=performance.now()/1000;
 if(now<swingUntil)return;
 swingAt=now;swingUntil=now+.34;striker.bat.rotation.z=-.16;$('#deliveryText').textContent='PLAY YOUR SHOT';sound(340,.055,'triangle',.015);
 if(state==='bowling'&&delivery&&!delivery.hit){
  const z=delivery.z;
  if(z> -1.65 && z<.62 && delivery.line==='good'){
    const sweet=-.52, diff=Math.abs(z-sweet), quality=Math.max(0,1-diff/1.82);
    hitBall(quality,z);
  }
 }
}
function hitBall(q,z){
 if(!delivery||delivery.hit)return;
 delivery.hit=true;state='shot';hitReported=true;
 const quality=Math.min(1,q+random(-.09,.08));
 const loft=shotType==='loft'?1:shotType==='cut'?.34:.53;
 const angle=shotType==='cut'?random(.72,1.2):random(-.75,.8);
 const speed=7.1+quality*8.6;const vx=Math.sin(angle)*speed, vz=-Math.cos(angle)*speed;
 delivery.launch={x:delivery.x,y:Math.max(.35,delivery.y),z, vx,vy:4.7+loft*4.4+quality*1.8,vz,quality,loft,grounded:false,bounce:false};
 ball.position.set(delivery.x,delivery.y,z);ball.material=leather;
 const label=quality>.88?'PURE TIMING':quality>.62?'GOOD CONTACT':'EDGED AWAY';
 $('#deliveryText').textContent=label;$('#calloutText').textContent=label;$('#shotHint').textContent=quality>.84?'MIDDLE OF THE BAT':'NICE CONNECTION';$('#shotName').textContent=shotType==='loft'?'LOFTED DRIVE':shotType==='cut'?'LATE CUT':'STRAIGHT DRIVE';
 striker.bat.rotation.z=1.05;striker.bat.rotation.x=-.62;
 sound(quality>.7?110:260,.13,quality>.7?'triangle':'sawtooth',quality>.7?.08:.04);
}
function completeShot(){
 if(!delivery)return;
 const q=delivery.launch.quality, loft=delivery.launch.loft, vx=delivery.launch.vx;
 const dist=5+q*9+random(-1,1.5), airborne=loft>.69||q>.94;
 let scored=0, wicket=false, label='DOT BALL',sub='GOOD LINE FROM THE BOWLER';
 if(dist>10.9){scored=airborne&&dist>12.5?6:4;label=scored===6?'SIX!':'FOUR!';sub=scored===6?'OUT OF THE GROUND':'BEAUTIFULLY PLACED';}
 else if(dist>8){scored=Math.random()<.35?3:2;label=`${scored} RUNS`;sub='QUICK BETWEEN THE WICKETS';}
 else if(dist>5.5){scored=1;label='ONE RUN';sub='KEPT IT MOVING';}
 else if(airborne&&q<.62&&Math.random()<.3){wicket=true;label='CAUGHT!';sub='STRAIGHT INTO THE HANDS';}
 runs+=scored;if(wicket)wickets++;
 if(scored){setShot(label,sub);$('#calloutText').textContent=`${scored} ${scored===1?'RUN':'RUNS'} ADDED`;}
 else if(wicket){setShot('WICKET','CAUGHT IN THE DEEP');$('#calloutText').textContent='THE FIELDSMAN TAKES IT';}
 else {setShot('DOT BALL','THE BOWLER WINS THIS ONE');$('#calloutText').textContent='BACK TO THE MARK';}
 showMessage(label,sub);balls++;updateScore();
 $('#deliveryText').textContent=wicket?'WICKET':scored?`${scored} RUN${scored===1?'':'S'}`:'DOT BALL';
 delivery=null;ball.visible=false;state='ready';waiting=1.5;
 if(balls>=18||wickets>=5||runs>=target)waiting=1.8;
}
function missBall(){
 if(!delivery||delivery.hit)return;
 delivery.missed=true;state='miss';delivery.endTime=performance.now()/1000;
 ball.visible=false;
 let wicket=false;
 if(delivery.line==='good'&&Math.abs(delivery.x)<.38&&Math.random()<.52){wicket=true;wickets++;}
 balls++;updateScore();
 if(wicket){showMessage('BOWLED!','THE STUMPS ARE SHATTERED');setShot('WICKET','BEATEN ALL ENDS UP');$('#deliveryText').textContent='WICKET';}
 else {showMessage(delivery.line==='wide'?'WIDE BALL':'MISSED!','THE BALL ZIPS THROUGH');setShot(delivery.line==='wide'?'WIDE':'BEATEN','GOOD BALL FROM THE BOWLER');$('#deliveryText').textContent=delivery.line==='wide'?'WIDE':'MISSED';if(delivery.line==='wide'){runs++;balls--;updateScore();}}
 $('#calloutText').textContent=wicket?'THAT’S THE WICKET':'BACK TO THE MARK';delivery=null;state='ready';waiting=1.7;
 sound(wicket?95:170,.16,wicket?'sawtooth':'sine',.04);
}

function startFromButton(){resetMatch();}
$('#playButton').addEventListener('click',startFromButton);
$('#againButton').addEventListener('click',resetMatch);
$('#swingControl').addEventListener('pointerdown',e=>{e.preventDefault();swing();});
stage.addEventListener('pointerdown',e=>{if(playing&&e.clientY>innerHeight*.42)swing();});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(!playing&&state==='menu')startFromButton();else swing();}
 if(e.code==='Enter'&&state==='menu')startFromButton();
 if(e.key==='1')shotType='drive';if(e.key==='2')shotType='loft';if(e.key==='3')shotType='cut';
});
$('#soundToggle').addEventListener('click',()=>{muted=!muted;$('#soundIcon').textContent=muted?'♫':'♪';$('#soundToggle').style.color=muted?'':'var(--acid)';if(!muted)sound(600,.08,'sine',.025);});

function animate(now){
 requestAnimationFrame(animate);const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;animTime+=dt;
 // Pitch-side players idle with a small life-like weight shift.
 striker.root.rotation.z=Math.sin(animTime*1.1)*.025;
 striker.bat.rotation.z+=(animTime<swingUntil?1.05:-.16-striker.bat.rotation.z)*Math.min(1,dt*12);
 striker.bat.rotation.x+=(animTime<swingUntil?-.62:-.2-striker.bat.rotation.x)*Math.min(1,dt*9);
 bowler.root.rotation.x+=(state==='bowling'&&delivery?-.05:0-bowler.root.rotation.x)*Math.min(1,dt*3);
 for(const p of fielders)p.root.rotation.y=Math.sin(animTime*.45+p.root.position.x)*.035;
 if(resultTimer>0){resultTimer-=dt;if(resultTimer<=0)$('#resultBanner').classList.remove('show');}
 if(playing&&state==='ready'){
  if(countdown>0)countdown-=dt;
  else if(waiting>0)waiting-=dt;
  else if(balls===0||delivery===null){if(balls>=18||wickets>=5||runs>=target)finish();else bowl();}
 }
 if(delivery&&!delivery.hit&&!delivery.missed&&state==='bowling'){
   const tick=dt*delivery.speed;delivery.z+=tick;delivery.x+=(0-delivery.x)*dt*.12;
   // One realistic pitch bounce as it approaches the batter.
   const progress=(delivery.z+8.15)/8.15;
   delivery.y=1.5-.85*progress+Math.sin(progress*Math.PI)*.44;
   ball.position.set(delivery.x,delivery.y,delivery.z);ball.rotation.x+=dt*8;ball.rotation.z+=dt*5;
   trail.visible=true;trail.position.set(delivery.x,delivery.y+.08,delivery.z-.47);trail.scale.y=.5+progress*.5;trail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(.05,.4,-1).normalize());
   if(animTime<swingUntil&&!delivery.hit&&delivery.z> -1.65&&delivery.z<.62&&delivery.line==='good')hitBall(Math.max(0,1-Math.abs(delivery.z+.52)/1.82),delivery.z);
   if(delivery.z>.75&&!delivery.hit)missBall();
 }else if(delivery?.hit&&delivery.launch){
   const p=delivery.launch;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=9.8*dt;
   if(p.y<.12){p.y=.12;if(!p.bounce){p.vy=Math.abs(p.vy)*.38;p.vx*=.83;p.vz*=.83;p.bounce=true;}else{p.vy=0;p.vx*=.95;p.vz*=.95;p.grounded=true;}}
   ball.position.set(p.x,p.y,p.z);ball.rotation.x+=dt*9;ball.rotation.z+=dt*7;
   trail.visible=true;trail.position.set(p.x-p.vx*.045,p.y,p.z-p.vz*.045);trail.scale.y=.8;trail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(p.vx,p.vy,p.vz).normalize());
   const radial=Math.hypot(p.x,p.z+2);
   if(radial>11.25||p.grounded||now/1000-delivery.start>4.5)completeShot();
 }else trail.visible=false;
 camera.position.x=Math.sin(animTime*.13)*.11;camera.lookAt(0,1.18,-2.2);
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
