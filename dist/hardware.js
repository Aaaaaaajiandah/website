// Original laptop and chip models, dedicated to the public domain under CC0 1.0.
import * as T from 'three';

const metal = (color, metalness, roughness) => new T.MeshStandardMaterial({color, metalness, roughness});
const silver = metal(0xa5b1c0, .89, .26);
const black = metal(0x131922, .49, .33);
const keyFinish = metal(0x232935, .28, .42);
const copper = metal(0xc99560, .87, .32);
const laminate = metal(0x263b46, .53, .37);
const geometryCache = new Map();

function seededRandom(seed) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}

// A rounded cuboid with separate flat faces and smoothly curved machined edges.
function rounded(w, h, d, r) {
  const id = [w,h,d,r].join('/');
  if (geometryCache.has(id)) return geometryCache.get(id);
  const half = new T.Vector3(w,h,d).multiplyScalar(.5);
  const inside = half.clone().addScalar(-r);
  const segments = Math.max(w,h,d)>1 ? 13 : 5;
  const geometry = new T.BoxGeometry(2,2,2,segments,segments,segments);
  const position = geometry.attributes.position, normal = geometry.attributes.normal, uv=geometry.attributes.uv;
  const v = new T.Vector3(), n = new T.Vector3(), face=new T.Vector3();
  for (let i=0; i<position.count; i++) {
    v.fromBufferAttribute(position,i);
    // The middle pair of grid lines spans each flat face. The rest form the fillet.
    const flat=1/segments;
    for (const axis of ['x','y','z']) {
      n[axis]=Math.sign(v[axis])*Math.max(0,(Math.abs(v[axis])-flat)/(1-flat));
    }
    n.normalize();
    v.set(Math.sign(v.x)*inside.x+r*n.x,Math.sign(v.y)*inside.y+r*n.y,Math.sign(v.z)*inside.z+r*n.z);
    position.setXYZ(i,v.x,v.y,v.z);
    // Use the machined face dimensions for UVs, keeping the brushed finish uniform.
    face.fromBufferAttribute(normal,i);
    if(face.y) uv.setXY(i,.5+v.x/w,.5-face.y*v.z/d);
    else if(face.x) uv.setXY(i,.5-face.x*v.z/d,.5+v.y/h);
    else uv.setXY(i,.5+face.z*v.x/w,.5+v.y/h);
    normal.setXYZ(i,n.x,n.y,n.z);
  }
  geometryCache.set(id,geometry);
  return geometry;
}
function part(group,g,m,x=0,y=0,z=0) {
  const mesh = new T.Mesh(g,m);
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
}
function copies(parent,geometry,material,positions) {
  const mesh = new T.InstancedMesh(geometry,material,positions.length);
  const pose = new T.Object3D();
  positions.forEach(([x,y,z,angle=0],i)=>{
    pose.position.set(x,y,z);
    pose.rotation.y=angle;
    pose.updateMatrix();
    mesh.setMatrixAt(i,pose.matrix);
  });
  parent.add(mesh);
  return mesh;
}
export function canvasMap(w,h,paint) {
  const el=document.createElement('canvas');
  el.width=w; el.height=h;
  paint(el.getContext('2d'),w,h);
  const map=new T.CanvasTexture(el);
  map.colorSpace=T.SRGBColorSpace;
  map.anisotropy=4;
  return map;
}
function decal(group,map,w,h,x,y,z,flat=false) {
  const mat=new T.MeshBasicMaterial({map,transparent:true,toneMapped:false,depthWrite:false});
  const mesh=part(group,new T.PlaneGeometry(w,h),mat,x,y,z);
  if (flat) mesh.rotation.x=-Math.PI/2;
  return mesh;
}
export function studio(renderer,scene) {
  const room=new T.Scene();
  room.background=new T.Color(.13,.15,.19);
  for (const [w,h,x,y,z,intensity] of [[12,9,-7,6,4,5],[2,10,6,3,0,7],[10,2,0,6,-6,5],[8,3,0,-2,6,1.3]]) {
    const lamp=part(room,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity),side:T.DoubleSide}),x,y,z);
    lamp.lookAt(0,0,0);
  }
  const pmrem=new T.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(room,.03).texture;
  room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  pmrem.dispose();
  scene.environmentIntensity=.8;
}
export function createLaptop() {
  const group=new T.Group();
  // Sub-pixel linear grain breaks up the long softbox reflections on bare aluminium.
  const brushed=canvasMap(512,512,(ctx,w,h)=>{
    const random=seededRandom(78);
    ctx.fillStyle='#aaa';ctx.fillRect(0,0,w,h);
    for(let j=0;j<1800;j++){
      const tone=Math.floor(148+random()*34);
      ctx.fillStyle='rgb('+tone+','+tone+','+tone+')';
      ctx.fillRect(random()*w,random()*h,10+random()*100,.8);
    }
  });
  brushed.colorSpace=T.NoColorSpace;
  silver.roughness=.45;silver.roughnessMap=brushed;
  part(group,rounded(5.5,.17,3.55,.075),silver);
  part(group,rounded(5.4,.06,3.44,.026),black,0,-.09);
  part(group,rounded(4.51,.04,1.63,.018),black,0,.09,-.4);
  const rows=['1234567890-=','QWERTYUIOP[]','ASDFGHJKL;\'↵','ZXCVBNM,./↑↓'];
  const keys=[];
  rows.forEach((row,r)=>[...row].forEach((_,c)=>keys.push([(c-5.5)*.352,.14,-.99+r*.34])));
  const keycaps=copies(group,rounded(.312,.085,.275,.028),keyFinish,keys);
  const keyNames=rows.join('');
  const keyPose=new T.Matrix4();
  part(group,rounded(1.75,.08,.25,.025),keyFinish,0,.14,.34);
  for (const x of [-1.93,-1.53,-1.13,1.13,1.53,1.93]) part(group,rounded(.31,.08,.25,.025),keyFinish,x,.14,.34);
  const legends=canvasMap(1400,440,(ctx,w,h)=>{
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#dce2e9';ctx.font='32px monospace';
    rows.forEach((row,r)=>[...row].forEach((ch,c)=>ctx.fillText(ch,(c+.5)*w/12,(r+.5)*h/4)));
  });
  decal(group,legends,4.224,1.36,0,.184,-.48,true);
  part(group,rounded(1.77,.012,.92,.005),black,0,.085,1.09);
  part(group,rounded(1.755,.012,.905,.005),silver,0,.087,1.09);
  const perforations=[];
  for (const side of [-1,1]) for(let j=0;j<30;j++) for(let i=0;i<4;i++) perforations.push([side*(2.38+i*.045),.092,-1.15+j*.058]);
  copies(group,new T.CylinderGeometry(.013,.013,.004,8),black,perforations);
  for(const z of [-1.0,-.65,.35]) part(group,rounded(.016,.05,.22,.006),black,-2.751,-.002,z);
  const hinge=part(group,new T.CylinderGeometry(.095,.095,4.42,48),black,0,.105,-1.49);
  hinge.rotation.z=Math.PI/2;
  const lid=new T.Group();
  lid.position.set(0,.12,-1.52);lid.rotation.x=-.18;group.add(lid);
  part(lid,rounded(5.46,3.21,.105,.05),silver,0,1.605,0);
  part(lid,rounded(5.39,3.14,.036,.017),black,0,1.605,.049);
  const code=['extern "C" __global__ void vector_add(','    const float* a, const float* b,','    float* out, int n) {','  int i = blockIdx.x * blockDim.x','        + threadIdx.x;','  if (i < n) out[i] = a[i] + b[i];','}'].join('\n');
  const display=canvasMap(1536,864,()=>{});
  const screen=decal(lid,display,5.18,2.89,0,1.64,.07);
  screen.material.transparent=false;
  const lens=part(lid,new T.CircleGeometry(.028,32),new T.MeshBasicMaterial({color:0x486478}),0,3.12,.075);
  lens.renderOrder=1;
  let letters=-1,pressed=-1;
  function type(fraction) {
    const count=Math.round(fraction*code.length);
    if(count===letters) return;
    letters=count;
    const next=count<code.length?keyNames.indexOf(code.charAt(count-1).toUpperCase()):-1;
    if(pressed!==next){
      if(pressed>=0) keycaps.setMatrixAt(pressed,keyPose.makeTranslation(...keys[pressed]));
      if(next>=0){
        const [x,y,z]=keys[next];keycaps.setMatrixAt(next,keyPose.makeTranslation(x,y-.033,z));
      }
      keycaps.instanceMatrix.needsUpdate=true;pressed=next;
    }
    const ctx=display.image.getContext('2d');
    ctx.fillStyle='#0c1823';ctx.fillRect(0,0,1536,864);
    ctx.font='30px monospace';ctx.fillStyle='#adc4cd';ctx.fillText('vector_add.cu',85,92);
    ctx.fillStyle='#34464f';ctx.fillRect(85,134,1365,2);
    ctx.font='52px monospace';
    const lines=code.slice(0,count).split('\n');
    lines.forEach((line,i)=>{ctx.fillStyle=['#ade3cf','#dce9ec','#dce9ec','#eecbaa','#dce9ec','#ade3cf','#dce9ec'][i];ctx.fillText(line,85,235+i*75);});
    const last=lines.length-1;
    ctx.fillRect(87+ctx.measureText(lines[last]).width,193+last*75,4,49);
    display.needsUpdate=true;
  }
  return {group,type};
}
export function createLayer(name,y,signal) {
  const group=new T.Group();group.position.y=y;
  const shape=new T.Shape();
  const contour=(p,w,d,r)=>{p.moveTo(-w+r,-d);p.lineTo(w-r,-d);p.quadraticCurveTo(w,-d,w,-d+r);p.lineTo(w,d-r);p.quadraticCurveTo(w,d,w-r,d);p.lineTo(-w+r,d);p.quadraticCurveTo(-w,d,-w,d-r);p.lineTo(-w,-d+r);p.quadraticCurveTo(-w,-d,-w+r,-d);};
  contour(shape,2.65,1.4,.22);
  const hole=new T.Path();contour(hole,2.20,.98,.15);shape.holes.push(hole);
  const ring=new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:5,curveSegments:16});
  ring.rotateX(-Math.PI/2);
  part(group,ring,metal(0x454e68,.84,.27));
  const seam=part(group,ring,new T.MeshBasicMaterial({color:signal}),0,-.035);seam.scale.y=.16;
  const title=canvasMap(1024,160,(ctx,w,h)=>{ctx.fillStyle='#edf5fc';ctx.font='bold 79px monospace';ctx.textAlign='center';ctx.fillText(name,w/2,110);});
  decal(group,title,2.34,.32,0,.163,1.205,true);
  const marks=[];
  for (const side of [-1,1]) for (let i=0;i<25;i++){
    const x=(i-12)*.197;
    if(side<0||Math.abs(x)>1.22) marks.push([x,.16,side*1.21]);
  }
  copies(group,new T.BoxGeometry(.014,.008,.14),silver,marks);
  const fasteners=[];
  for(const x of [-2.45,2.45])for(const z of [-1.2,1.2])fasteners.push([x,.157,z]);
  copies(group,new T.CylinderGeometry(.055,.055,.015,24),black,fasteners);
  const glow=new T.MeshBasicMaterial({color:signal,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
  const veil=part(group,new T.PlaneGeometry(4.4,1.96),glow,0,.11);
  veil.rotation.x=-Math.PI/2;
  group.userData.glow=glow;
  const halo=canvasMap(256,64,(ctx,w,h)=>{
    ctx.scale(w/2,h/2);
    const falloff=ctx.createRadialGradient(1,1,0,1,1,1);
    falloff.addColorStop(0,'rgba(255,255,255,.7)');falloff.addColorStop(.35,'rgba(255,255,255,.34)');falloff.addColorStop(1,'transparent');
    ctx.fillStyle=falloff;ctx.fillRect(0,0,2,2);
  });
  const flare=new T.Sprite(new T.SpriteMaterial({map:halo,color:signal,blending:T.AdditiveBlending,depthWrite:false,opacity:0}));
  flare.scale.set(5.9,.63,1);flare.position.y=.15;group.add(flare);
  group.userData.flare=flare.material;
  return group;
}
export function createNativeBoundary(y) {
  const gate=createLayer('C  /  Native call',y,0xffc685);
  const plug=new T.Group();
  plug.position.x=-2.7;
  gate.add(plug);
  // Three contacts carry the caller's buffer addresses into the compiled entry.
  part(plug,rounded(.65,.17,1.96,.05),black,-.34,.08);
  for(const z of [-.66,0,.66]) {
    part(plug,rounded(.48,.085,.20,.025),copper,.06,.08,z);
    part(plug,rounded(.7,.07,.10,.022),copper,-.89,.075,z);
  }
  const pinout=canvasMap(256,640,ctx=>{
    ctx.fillStyle='#ffe1ac';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 70px monospace';
    ['a','b','out'].forEach((name,i)=>ctx.fillText(name,128,(i+.5)*640/3));
  });
  decal(plug,pinout,.53,1.95,-.34,.174,0,true);
  return {gate,plug};
}
export function createChip() {
  const group=new T.Group();
  const random=seededRandom(623);
  const surface=canvasMap(1024,768,(ctx,w,h)=>{
    ctx.fillStyle='#435950';ctx.fillRect(0,0,w,h);
    // Fibreglass weave, plated vias and contact shadow around the package.
    for(let i=0;i<19000;i++){
      ctx.fillStyle=random()>.52?'rgba(186,183,138,.10)':'rgba(6,26,29,.15)';
      ctx.fillRect(random()*w,random()*h,random()*5+.4,.8);
    }
    for(let j=0;j<18;j++)for(let i=0;i<30;i++){
      const x=28+i*33,y=29+j*41;
      if(random()>.62){ctx.fillStyle='#758781';ctx.beginPath();ctx.arc(x,y,1.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172f2c';ctx.fillRect(x-.75,y-.75,1.5,1.5);}
    }
    const ao=ctx.createRadialGradient(w*.50,h*.51,130,w*.50,h*.51,325);
    ao.addColorStop(0,'rgba(7,14,17,.85)');ao.addColorStop(.8,'rgba(6,19,18,.53)');ao.addColorStop(1,'transparent');
    ctx.fillStyle=ao;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#819a90';ctx.lineWidth=1.3;ctx.strokeRect(7,7,w-14,h-14);
    ctx.font='12px monospace';ctx.fillStyle='#bdc7ad';ctx.fillText('U1',235,166);ctx.fillText('J1',48,55);
    ctx.save();ctx.translate(w-44,h-130);ctx.rotate(-Math.PI/2);ctx.fillText('COMPUTE  /  TARGET BOARD',0,0);ctx.restore();
  });
  part(group,rounded(6.4,.12,4.8,.055),laminate,0,-.12);
  const solderMask=new T.MeshStandardMaterial({map:surface,roughness:.48,metalness:.39});
  const pcbSurface=part(group,new T.PlaneGeometry(6.38,4.78),solderMask,0,-.059);
  pcbSurface.rotation.x=-Math.PI/2;
  const pcb=canvasMap(1536,1152,(ctx,w,h)=>{
    ctx.lineJoin='round';
    for(let s=0;s<4;s++){
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(s*Math.PI/2);
      for(let i=0;i<37;i++){const x=(i-18)*12,offset=55+(i*43)%148,end=330+(i*137)%510;
        ctx.strokeStyle=i%6===0?'#b39463':'#728d75';ctx.lineWidth=i%6===0?2.7:1.6;
        ctx.beginPath();ctx.moveTo(x,180);ctx.lineTo(x,234+i%7*12);ctx.lineTo(x+offset,234+i%7*12+offset);ctx.lineTo(x+offset,end);ctx.stroke();
        ctx.beginPath();ctx.arc(x+offset,end,4,0,Math.PI*2);ctx.stroke();}
      ctx.restore();}
  });
  decal(group,pcb,6.29,4.71,0,-.053,0,true);
  const impact=new T.ShaderMaterial({
    uniforms:{traces:{value:pcb},radius:{value:-1}},
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'varying vec2 coord; void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D traces;uniform float radius;varying vec2 coord;void main(){float d=length((coord-.5)*vec2(6.29,4.71));float pulse=1.-smoothstep(.04,.57,abs(d-radius));gl_FragColor=vec4(.47,.89,1.,texture2D(traces,coord).a*pulse);}'
  });
  const pulse=part(group,new T.PlaneGeometry(6.29,4.71),impact,0,-.048);
  pulse.rotation.x=-Math.PI/2;pulse.renderOrder=3;
  part(group,rounded(2.99,.16,2.68,.064),black,0,.04);
  part(group,rounded(2.64,.11,2.32,.048),metal(0x6b7579,.91,.22),0,.155);
  const die=part(group,rounded(2.16,.065,1.78,.028),metal(0x163944,.6,.18),0,.24);
  const mask=canvasMap(1024,820,(ctx,w,h)=>{
    ctx.fillStyle='#1d2635';ctx.fillRect(0,0,w,h);
    const palette=['#92a5a3','#495e76','#7f6977','#537a7e','#847b70','#7b8393'];
    for(let j=0;j<8;j++)for(let i=0;i<10;i++){
      const x=11+i*101,y=11+j*100;
      ctx.fillStyle=palette[Math.floor(random()*palette.length)];ctx.fillRect(x,y,95,93);
      ctx.fillStyle='#273e48';
      const banks=2+Math.floor(random()*4),stride=88/banks;
      for(let k=0;k<banks;k++){
        ctx.fillRect(x+3+k*stride,y+3,stride-3,76);
        ctx.fillStyle='rgba(163,181,169,.7)';
        for(let line=0;line<23;line++)ctx.fillRect(x+4+k*stride,y+5+line*3,stride-6,1.1);
        ctx.fillStyle='#304251';
      }
      for(let bit=0;bit<28;bit++){ctx.fillStyle=palette[Math.floor(random()*palette.length)];ctx.fillRect(x+random()*92,y+80+random()*10,3,2);}
    }
    const sheen=ctx.createLinearGradient(0,h,w,0);sheen.addColorStop(0,'rgba(107,162,148,.36)');sheen.addColorStop(.55,'transparent');sheen.addColorStop(1,'rgba(203,137,185,.36)');
    ctx.fillStyle=sheen;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#1b2c39';ctx.fillRect(341,324,342,152);ctx.fillStyle='#e5edea';ctx.font='80px monospace';ctx.textAlign='center';ctx.fillText('NPU',512,426);
  });
  decal(group,mask,2.09,1.73,0,.275,0,true);
  const pads=[],caps=[];
  for (const side of [-1,1]) {
    for(let i=0;i<32;i++) pads.push([(i-15.5)*.085,.01,side*1.41],[side*1.56,.01,(i-15.5)*.077,Math.PI/2]);
    for(let row=0;row<8;row++)for(let col=0;col<3;col++){
      if((row+2*col)%5) caps.push([side*(1.78+col*.31),-.012,(row-3.5)*.34,0]);
    }
  }
  copies(group,new T.BoxGeometry(.04,.042,.20),copper,pads);
  copies(group,rounded(.16,.069,.073,.012),metal(0x7d674e,.27,.45),caps);
  const contacts=caps.flatMap(([x,y,z])=>[[x-.079,y,z],[x+.079,y,z]]);
  copies(group,new T.BoxGeometry(.04,.072,.076),silver,contacts);
  const pins=[];
  for (const x of [-1.94,1.94]) for(const z of [-1.73,1.73]){
    part(group,rounded(.64,.11,.34,.032),black,x,.004,z);
    for(let j=0;j<6;j++) for(const side of [-1,1]) pins.push([x+(j-2.5)*.085,-.015,z+side*.18]);
  }
  copies(group,new T.BoxGeometry(.046,.032,.08),silver,pins);
  for(const x of [-2.97,2.97])for(const z of [-2.12,2.12]){part(group,new T.CylinderGeometry(.10,.10,.028,48),copper,x,-.052,z);part(group,new T.CylinderGeometry(.061,.061,.03,48),black,x,-.048,z);}
  die.material.emissive.set(0x4acfae);
  return {group,die:die.material,impact:impact.uniforms.radius};
}
