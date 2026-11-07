// Original laptop and chip models, dedicated to the public domain under CC0 1.0.
import * as T from 'three';
import { opticalGlass } from './optics.js';

const metal = (color, metalness, roughness) => new T.MeshStandardMaterial({color, metalness, roughness});
const silver = metal(0xa5b1c0, .89, .26);
const black = metal(0x131922, .49, .33);
const keyFinish = metal(0x232a36, .18, .35);
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

// Machine the shell in plan view, so broad corner radii are independent of
// the thin edge profile. Rings share analytic normals around each fillet.
function milledShell(width,height,depth,radius,bevel) {
  const positions=[],normals=[],uvs=[],indices=[];
  const corners=18, bevelSteps=5, ringSize=4*(corners+1);
  function ring(y,inset,radial,vertical) {
    const start=positions.length/3;
    for(let quadrant=0;quadrant<4;quadrant++){
      const centerX=(quadrant===0||quadrant===3?1:-1)*(width/2-radius);
      const centerZ=(quadrant<2?1:-1)*(depth/2-radius);
      for(let j=0;j<=corners;j++){
        const angle=(quadrant+j/corners)*Math.PI/2, nx=Math.cos(angle), nz=Math.sin(angle);
        const x=centerX+(radius-inset)*nx,z=centerZ+(radius-inset)*nz;
        positions.push(x,y,z);normals.push(radial*nx,vertical,radial*nz);
        uvs.push(.5+x/width,.5-z/depth);
      }
    }
    if(start>0) for(let j=0;j<ringSize;j++){
      const a=start-ringSize+j,b=start-ringSize+(j+1)%ringSize;
      indices.push(a,a+ringSize,b,b,a+ringSize,b+ringSize);
    }
  }
  for(const side of [-1,1]) for(let j=0;j<=bevelSteps;j++){
    const angle=(side<0?j/bevelSteps-1:j/bevelSteps)*Math.PI/2;
    ring(side*(height/2-bevel)+bevel*Math.sin(angle),bevel*(1-Math.cos(angle)),Math.cos(angle),Math.sin(angle));
  }
  const top=positions.length/3-ringSize;
  for(let j=1;j<ringSize-1;j++) indices.push(0,j,j+1,top,top+j+1,top+j);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
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
  room.background=new T.Color(.045,.06,.095);
  // Asymmetric strip boxes read as long ribbons in glass and on metal. All
  // intensities are linear and stay HDR through the single startup convolution.
  const lighting=[
    [8.5,5.0,-5,8,-3,0xffe6cb,3.7],
    [1.1,9.2,-6,2,4,0xffc997,7.2],
    [2.1,11,6.4,2,3,0xb3d5ff,6.5],
    [.38,9.5,7.2,2,2,0xe7f8ff,9],
    [9,.6,0,2,-7,0xaab5ff,7],
    [7,3,1,-3,7,0xb3cadc,1.6],
    [8,2,-1,6,6,0xfff5ea,1.4],
  ];
  for (const [w,h,x,y,z,tint,intensity] of lighting) {
    const color=new T.Color(tint).multiplyScalar(intensity);
    const lamp=part(room,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}),x,y,z);
    lamp.lookAt(0,0,0);
  }
  const pmrem=new T.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(room,0,.1,50,{size:128}).texture;
  room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  pmrem.dispose();
  scene.environmentIntensity=1;
}
// Ray-project the keybed into the editor glass. As the lid tilts, the
// reflection moves across the display in the same coordinate system as the keys.
function reflectKeyboard(screen, chassis, keys) {
  const keybed=canvasMap(1024,640,(ctx,w,h)=>{
    ctx.scale(w/5.5,h/3.55);
    ctx.translate(2.75,1.775);
    ctx.fillStyle='#85909f';ctx.fillRect(-2.75,-1.775,5.5,3.55);
    ctx.fillStyle='#242b36';ctx.fillRect(-2.25,-1.23,4.5,1.66);
    for(const [x,,z] of keys){
      ctx.fillStyle='#515767';ctx.fillRect(x-.15,z-.13,.30,.26);
      ctx.fillStyle='#8c949e';ctx.fillRect(x-.024,z-.02,.048,.028);
    }
    ctx.fillStyle='#424854';ctx.fillRect(-.875,.215,1.75,.25);
    ctx.fillStyle='#647385';ctx.fillRect(-.95,.625,1.90,.93);
  });
  const inverseChassis=new T.Matrix4();
  screen.onBeforeRender=()=>inverseChassis.copy(chassis.matrixWorld).invert();
  screen.material.onBeforeCompile=shader=>{
    shader.uniforms.deckTransform={value:inverseChassis};
    shader.uniforms.deckMap={value:keybed};
    const varyings='varying vec3 vDeckPoint, vDeckNormal, vViewer;';
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nuniform mat4 deckTransform;\n'+varyings)
      .replace('#include <project_vertex>',`#include <project_vertex>
        mat4 screenToDeck=deckTransform*modelMatrix;
        vDeckPoint=(screenToDeck*vec4(position,1.)).xyz;
        vDeckNormal=mat3(screenToDeck)*normal;
        vViewer=(deckTransform*vec4(cameraPosition,1.)).xyz;`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform sampler2D deckMap;\n'+varyings)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec3 ray=reflect(normalize(vDeckPoint-vViewer),normalize(vDeckNormal));
        float t=(.18-vDeckPoint.y)/min(-.0001,ray.y);
        vec2 deckUV=(vDeckPoint.xz+t*ray.xz)/vec2(5.5,3.55);
        float edge=max(abs(deckUV.x),abs(deckUV.y));
        float amount=(1.-smoothstep(.455,.5,edge))*step(ray.y,-.001)*step(0.,t);
        vec3 reflected=texture2D(deckMap,vec2(.5+deckUV.x,.5-deckUV.y)).rgb;
        diffuseColor.rgb+=reflected*amount*.15;
        // Project the studio's long strip box onto the face of the display.
        // The soft outer penumbra and narrow silver edge move with the viewer.
        vec3 wall=vDeckPoint+ray*(5.5-vDeckPoint.z)/max(.15,ray.z);
        float strip=wall.x-.48*wall.y+4.9;
        float softbox=smoothstep(-.29,.19,strip)*(1.-smoothstep(.33,2.05,strip));
        float lip=.12*exp(-28.*abs(strip+.07));
        diffuseColor.rgb+=vec3(.47,.66,.91)*(.105*softbox+.15*lip);`);
  };
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
  const titanium=new T.MeshPhysicalMaterial({color:0x68717e,metalness:.91,roughness:.48,
    roughnessMap:brushed,clearcoat:.28,clearcoatRoughness:.24});
  const polished=metal(0xc5ccce,.98,.125);
  const glassPad=new T.MeshPhysicalMaterial({color:0x525965,metalness:.4,roughness:.22,
    clearcoat:.88,clearcoatRoughness:.095});
  part(group,milledShell(5.5,.142,3.55,.185,.038),titanium,0,.013);
  part(group,milledShell(5.475,.024,3.525,.18,.009),polished,0,-.063);
  part(group,milledShell(5.42,.071,3.47,.172,.029),titanium,0,-.099);
  part(group,milledShell(5.08,.024,3.1,.17,.011),black,0,-.14);
  part(group,milledShell(4.51,.034,1.66,.086,.014),polished,0,.09,-.39);
  part(group,milledShell(4.47,.036,1.62,.074,.013),black,0,.097,-.39);
  const rows=['1234567890-=','QWERTYUIOP[]','ASDFGHJKL;\'↵','ZXCVBNM,./↑↓'];
  const keys=[];
  rows.forEach((row,r)=>[...row].forEach((_,c)=>keys.push([(c-5.5)*.352,.14,-.99+r*.34])));
  const keycaps=copies(group,rounded(.312,.073,.275,.031),keyFinish,keys);
  const keyNames=rows.join('');
  const keyPose=new T.Matrix4();
  part(group,rounded(1.75,.08,.25,.025),keyFinish,0,.14,.34);
  for (const x of [-1.93,-1.53,-1.13,1.13,1.53,1.93]) part(group,rounded(.31,.08,.25,.025),keyFinish,x,.14,.34);
  const legends=canvasMap(1400,440,(ctx,w,h)=>{
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#dce2e9';ctx.font='32px monospace';
    rows.forEach((row,r)=>[...row].forEach((ch,c)=>ctx.fillText(ch,(c+.5)*w/12,(r+.5)*h/4)));
  });
  decal(group,legends,4.224,1.36,0,.178,-.48,true);
  part(group,milledShell(1.93,.014,.96,.105,.005),polished,0,.085,1.09);
  part(group,milledShell(1.90,.017,.93,.09,.007),glassPad,0,.089,1.09);
  const perforations=[];
  for (const side of [-1,1]) for(let j=0;j<30;j++) for(let i=0;i<4;i++) perforations.push([side*(2.38+i*.045),.092,-1.15+j*.058]);
  copies(group,new T.CylinderGeometry(.013,.013,.004,8),black,perforations);
  for(const side of [-1,1]) for(const z of [-1.07,-.70]){
    part(group,rounded(.016,.061,.241,.007),polished,side*2.75,-.007,z);
    part(group,rounded(.019,.044,.211,.008),black,side*2.753,-.007,z);
  }
  const hinge=part(group,new T.CylinderGeometry(.099,.099,4.59,72),black,0,.11,-1.50);
  hinge.rotation.z=Math.PI/2;
  for(const x of [-2.21,2.21]){
    const sleeve=part(group,new T.CylinderGeometry(.106,.106,.17,72),polished,x,.11,-1.50);
    sleeve.rotation.z=Math.PI/2;
  }
  const lid=new T.Group();
  lid.position.set(0,.12,-1.52);lid.rotation.x=-.18;group.add(lid);
  function cover(w,h,thickness,radius,bevel,material,z){
    const panel=part(lid,milledShell(w,thickness,h,radius,bevel),material,0,1.605,z);
    panel.rotation.x=Math.PI/2;
    return panel;
  }
  cover(5.46,3.21,.11,.126,.028,titanium,0);
  cover(5.446,3.196,.022,.123,.008,polished,.047);
  cover(5.407,3.157,.032,.112,.012,black,.058);
  const code=['extern "C" __global__ void vector_add(','    const float* a, const float* b,','    float* out, int n) {','  int i = blockIdx.x * blockDim.x','        + threadIdx.x;','  if (i < n) out[i] = a[i] + b[i];','}'].join('\n');
  const display=canvasMap(1536,864,()=>{});
  const screen=decal(lid,display,5.18,2.89,0,1.64,.077);
  screen.material.transparent=false;screen.material.depthWrite=true;
  reflectKeyboard(screen,group,keys);
  const pane=cover(5.384,3.134,.022,.106,.009,
    opticalGlass(0x182d40,{opacity:.04,edgeOpacity:.62,roughness:.065}),.071);
  pane.renderOrder=1;
  const lens=part(lid,new T.CircleGeometry(.034,48),polished,0,3.129,.085);
  part(lid,new T.CircleGeometry(.024,40),metal(0x1a364a,.66,.095),0,3.129,.087);
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
    const base=ctx.createLinearGradient(0,864,1536,0);
    base.addColorStop(0,'#09141d');base.addColorStop(.57,'#111d2c');base.addColorStop(1,'#273043');
    ctx.fillStyle=base;ctx.fillRect(0,0,1536,864);
    ctx.fillStyle='#9cbfc3';ctx.fillRect(64,71,9,29);
    ctx.font='32px Consolas,monospace';ctx.fillStyle='#d1e0e4';ctx.fillText('vector_add.cu',101,97);
    ctx.fillStyle='#3a4756';ctx.fillRect(64,144,1408,2);
    ctx.fillStyle='#2a3747';ctx.fillRect(110,187,2,558);
    const lines=code.slice(0,count).split('\n');
    lines.forEach((line,i)=>{
      ctx.font='29px Consolas,monospace';ctx.fillStyle='#758b9f';ctx.fillText(String(i+1).padStart(2,'0'),56,240+i*77);
      ctx.font='51px Consolas,monospace';
      ctx.fillStyle=['#c4f2dc','#dce9ec','#dce9ec','#f7ccb0','#dce9ec','#a9e9d3','#dce9ec'][i];
      ctx.fillText(line,144,241+i*77);
    });
    const last=lines.length-1;
    ctx.fillRect(146+ctx.measureText(lines[last]).width,200+last*77,4,48);
    display.needsUpdate=true;
  }
  function pose(release,progress){
    // The display rocks back on its hinge as the code comes free.
    lid.rotation.x=-.13-.075*T.MathUtils.smootherstep(progress,0,.135)-.18*release;
  }
  return {group,type,pose,screen};
}
// Half-dimensions keep the optical frame, metal ferrule and engraved lines concentric.
function gateFrame(width,depth,radius,holeWidth,holeDepth,holeRadius,height,bevel) {
  const key=['gate',width,depth,radius,holeWidth,holeDepth,holeRadius,height,bevel].join('/');
  if(geometryCache.has(key)) return geometryCache.get(key);
  function outline(path,w,d,r) {
    path.moveTo(-w+r,-d);
    path.lineTo(w-r,-d);path.absarc(w-r,-d+r,r,-Math.PI/2,0);
    path.lineTo(w,d-r);path.absarc(w-r,d-r,r,0,Math.PI/2);
    path.lineTo(-w+r,d);path.absarc(-w+r,d-r,r,Math.PI/2,Math.PI);
    path.lineTo(-w,-d+r);path.absarc(-w+r,-d+r,r,Math.PI,Math.PI*1.5);
    path.closePath();
  }
  const shape=new T.Shape(),hole=new T.Path();
  outline(shape,width,depth,radius);
  outline(hole,holeWidth,holeDepth,holeRadius);shape.holes.push(hole);
  const geometry=new T.ExtrudeGeometry(shape,{
    depth:height,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,
    curveSegments:9,bevelSegments:4,
  });
  geometry.rotateX(-Math.PI/2);
  geometryCache.set(key,geometry);
  return geometry;
}

export function createLayer(name,y,signal) {
  const group=new T.Group();group.position.y=y;
  const sapphire=opticalGlass(0x4878a4,{opacity:.38,edgeOpacity:.91,roughness:.115,envMapIntensity:1.27});
  const champagne=metal(0xceaf8a,.89,.21);
  const titanium=metal(0x36445d,.82,.28);

  // The narrow metal carrier can be seen through the thicker sapphire rim.
  // Its inset footprint leaves a free glass edge beyond the metal on both sides.
  part(group,gateFrame(2.48,1.23,.28,2.29,1.035,.20,.10,.027),titanium,0,-.146);
  part(group,gateFrame(2.48,1.23,.28,2.45,1.20,.25,.018,.006),champagne,0,-.059);
  part(group,gateFrame(2.61,1.36,.33,2.18,.967,.17,.163,.047),sapphire,0,.005);
  part(group,gateFrame(2.225,1.012,.213,2.198,.985,.186,.017,.008),champagne,0,.046);

  const mounts=[];
  for(const x of [-2.42,2.42]) for(const z of [-1.15,1.15]) mounts.push([x,-.033,z]);
  copies(group,new T.CylinderGeometry(.082,.095,.23,40),champagne,mounts);
  copies(group,new T.CylinderGeometry(.056,.056,.018,32),titanium,mounts.map(([x,,z])=>[x,.091,z]));

  // Laser etching on one thin surface. At the crossing, the pulse expands out
  // from the code to the calibration lines in the glass in either scroll direction.
  const distance={value:8};
  const etching=new T.ShaderMaterial({
    uniforms:{signal:{value:new T.Color(signal)},distanceToSource:distance},
    transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`
      varying vec2 location;
      void main() {
        location=position.xy;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader:`
      uniform vec3 signal;
      uniform float distanceToSource;
      varying vec2 location;
      float outline(vec2 p,vec2 size,float radius){
        vec2 q=abs(p)-size+radius;
        return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
      }
      float stroke(float d,float width){
        return 1.-smoothstep(width,width+max(fwidth(d),.002),abs(d));
      }
      void main() {
        vec2 p=location;
        float outer=outline(p,vec2(2.57,1.32),.30);
        float inner=outline(p,vec2(2.226,1.013),.204);
        if(outer>.015) discard;
        float rim=stroke(outer,.0045);
        float rails=max(stroke(inner-.012,.007),.48*stroke(inner-.063,.005));
        float pitch=.14;
        float tickX=abs(fract((p.x+.5*pitch)/pitch)-.5)*pitch;
        float ticks=stroke(tickX,.007)*smoothstep(1.10,1.115,abs(p.y))
          *(1.-smoothstep(1.19,1.205,abs(p.y)))*step(abs(p.x),2.13);
        float radius=length(p*vec2(1.,.88));
        float wave=1.-smoothstep(.035,.38,abs(radius-(.32-distanceToSource)*1.53));
        float pattern=max(rim,max(rails,ticks*.74));
        float alpha=pattern*(.32+.68*wave)+wave*(inner>0.?.17:.055);
        if(alpha<.007) discard;
        vec3 neutral=mix(vec3(.45,.66,.84),vec3(.89,.78,.65),smoothstep(-2.,2.,p.x));
        gl_FragColor=vec4(mix(neutral,mix(signal,vec3(1.),.48),wave),min(1.,alpha));
        #include <colorspace_fragment>
      }`,
  });
  const marks=part(group,new T.PlaneGeometry(5.28,2.77),etching,0,.217);
  marks.rotation.x=-Math.PI/2;marks.renderOrder=1;

  // A tilted front facet holds the inscription above the normal line of sight.
  const nameplate=new T.Group();group.add(nameplate);
  nameplate.position.set(0,.068,1.348);nameplate.rotation.x=-.34;
  part(nameplate,rounded(2.51,.239,.056,.023),titanium);
  const title=canvasMap(768,96,(ctx,w,h)=>{
    ctx.font='600 60px Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#f3f6ff';ctx.fillText(name.replaceAll('  /  ','  ·  '),w/2,h/2+2);
  });
  decal(nameplate,title,2.37,.23,0,0,.030);
  group.userData.cross=offset=>{distance.value=offset;};
  return group;
}
export const nativeCallColor = '#ffc685';
export function createNativeBoundary(y) {
  const gate=createLayer('C  /  Native call',y,nativeCallColor);
  const plug=new T.Group();
  plug.position.x=-2.7;
  gate.add(plug);
  // A glass-backed three-pole connector slides into the gilt contacts.
  const gold=metal(0xe5bb85,.93,.21);
  part(plug,rounded(.79,.115,2.02,.054),black,-.37,-.005);
  part(plug,rounded(.67,.14,1.94,.066),opticalGlass(0x58839b,{opacity:.51,edgeOpacity:.9}),-.37,.12);
  const contacts=[-.64,0,.64];
  copies(plug,rounded(.64,.082,.18,.026),gold,contacts.map(z=>[.055,.064,z]));
  copies(plug,rounded(.49,.071,.135,.031),gold,contacts.map(z=>[-.885,.018,z]));
  const pinout=canvasMap(256,640,ctx=>{
    ctx.fillStyle='#fff0d4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 64px Consolas, monospace';
    ['a','b','out'].forEach((name,i)=>ctx.fillText(name,128,(i+.5)*640/3));
  });
  decal(plug,pinout,.59,1.92,-.38,.194,0,true);
  return {gate,plug};
}
export function createChip() {
  const group=new T.Group();
  const random=seededRandom(623);
  const champagne=metal(0xc6ad83,.94,.22);
  const titanium=metal(0x515b69,.89,.21);
  const boardWidth=6.4,boardDepth=4.8;
  const halfWidth=boardWidth/2,halfDepth=boardDepth/2,cut=.26;
  const outline=new T.Shape();
  const corners=[
    [-halfWidth+cut,-halfDepth],[halfWidth-cut,-halfDepth],[halfWidth,-halfDepth+cut],
    [halfWidth,halfDepth-cut],[halfWidth-cut,halfDepth],[-halfWidth+cut,halfDepth],
    [-halfWidth,halfDepth-cut],[-halfWidth,-halfDepth+cut]
  ];
  corners.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
  outline.closePath();
  const carrier=new T.ExtrudeGeometry(outline,{
    depth:.14,bevelEnabled:true,bevelThickness:.025,bevelSize:.027,bevelSegments:5,curveSegments:8
  });
  carrier.rotateX(-Math.PI/2);
  part(group,carrier,titanium,0,-.232,0);
  const surface=canvasMap(1024,768,(ctx,w,h)=>{
    ctx.fillStyle='#152c3b';ctx.fillRect(0,0,w,h);
    // Fibreglass weave, plated vias and contact shadow around the package.
    for(let i=0;i<19000;i++){
      ctx.fillStyle=random()>.52?'rgba(143,175,191,.10)':'rgba(3,16,33,.16)';
      ctx.fillRect(random()*w,random()*h,random()*5+.4,.8);
    }
    for(let j=0;j<18;j++)for(let i=0;i<30;i++){
      const x=28+i*33,y=29+j*41;
      if(random()>.62){ctx.fillStyle='#769296';ctx.beginPath();ctx.arc(x,y,1.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#142632';ctx.fillRect(x-.75,y-.75,1.5,1.5);}
    }
    const ao=ctx.createRadialGradient(w*.50,h*.51,130,w*.50,h*.51,325);
    ao.addColorStop(0,'rgba(7,14,17,.85)');ao.addColorStop(.8,'rgba(6,19,18,.53)');ao.addColorStop(1,'transparent');
    ctx.fillStyle=ao;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#667e86';ctx.lineWidth=1.4;ctx.beginPath();
    corners.forEach(([x,y],i)=>{
      const px=w/2+x/boardWidth*(w-14),py=h/2+y/boardDepth*(h-14);
      if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    });
    ctx.closePath();ctx.stroke();
    ctx.font='12px monospace';ctx.fillStyle='#a5b7c2';ctx.fillText('U1',235,166);ctx.fillText('J1',72,55);
    ctx.save();ctx.translate(w-44,h-130);ctx.rotate(-Math.PI/2);ctx.fillText('COMPUTE  /  TARGET BOARD',0,0);ctx.restore();
  });
  const boardFace=new T.ShapeGeometry(outline);
  const positions=boardFace.attributes.position;
  for(let i=0;i<positions.count;i++){
    boardFace.attributes.uv.setXY(i,.5+positions.getX(i)/boardWidth,.5+positions.getY(i)/boardDepth);
  }
  const solderMask=new T.MeshPhysicalMaterial({map:surface,roughness:.43,metalness:.33,clearcoat:.6,clearcoatRoughness:.31});
  const pcbSurface=part(group,boardFace,solderMask,0,-.066);
  pcbSurface.rotation.x=-Math.PI/2;
  const pcb=canvasMap(1536,1152,(ctx,w,h)=>{
    ctx.lineJoin='round';
    for(let s=0;s<4;s++){
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(s*Math.PI/2);
      for(let i=0;i<37;i++){const x=(i-18)*12,offset=55+(i*43)%148,end=330+(i*137)%510;
        ctx.strokeStyle=i%6===0?'#a8936b':'#527583';ctx.lineWidth=i%6===0?2.7:1.6;
        ctx.beginPath();ctx.moveTo(x,180);ctx.lineTo(x,234+i%7*12);ctx.lineTo(x+offset,234+i%7*12+offset);ctx.lineTo(x+offset,end);ctx.stroke();
        ctx.beginPath();ctx.arc(x+offset,end,4,0,Math.PI*2);ctx.stroke();}
      ctx.restore();}
  });
  decal(group,pcb,6.29,4.71,0,-.053,0,true);
  const impact=new T.ShaderMaterial({
    uniforms:{traces:{value:pcb},radius:{value:-1}},
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'varying vec2 coord; void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      uniform sampler2D traces;
      uniform float radius;
      varying vec2 coord;
      void main() {
        float distanceFromDie=length((coord-.5)*vec2(6.29,4.71));
        float front=radius-distanceFromDie;
        float crest=1.-smoothstep(.03,.40,abs(front));
        float wake=.28*smoothstep(0.,.30,front)*(.38+.62*exp(-max(front,0.)));
        float signal=texture2D(traces,coord).a*(crest+wake);
        gl_FragColor=vec4(mix(vec3(.18,.58,.85),vec3(.70,.96,1.),crest),signal);
      }`
  });
  const pulse=part(group,new T.PlaneGeometry(6.29,4.71),impact,0,-.048);
  pulse.rotation.x=-Math.PI/2;pulse.renderOrder=3;
  part(group,rounded(3.05,.20,2.72,.082),black,0,.044);
  part(group,rounded(2.91,.044,2.57,.018),champagne,0,.142);
  part(group,rounded(2.85,.075,2.51,.034),titanium,0,.193);
  const cartridge=new T.Group();
  group.add(cartridge);
  part(cartridge,rounded(2.70,.087,2.36,.038),metal(0x25384c,.76,.22),0,.252);
  const die=part(cartridge,rounded(2.29,.081,1.95,.037),metal(0x19445a,.73,.15),0,.304);
  const mask=canvasMap(1024,820,(ctx,w,h)=>{
    ctx.fillStyle='#172e41';ctx.fillRect(0,0,w,h);
    const palette=['#628d9e','#405978','#6e738b','#4f8791','#9c9179','#546c88'];
    // Long parallel memory banks surround a mirror-finished central logic block.
    for(let row=0;row<8;row++)for(let col=0;col<6;col++){
      const x=13+col*167,y=12+row*100;
      ctx.fillStyle=palette[Math.floor(random()*palette.length)];ctx.fillRect(x,y,160,93);
      const banks=col%3===2?6:3,stride=151/banks;
      for(let k=0;k<banks;k++){
        ctx.fillStyle='#293e58';ctx.fillRect(x+4+k*stride,y+4,stride-3,73);
        ctx.fillStyle=row%3===0?'#bcac86':'#92b8c1';
        for(let line=0;line<22;line++)ctx.fillRect(x+5+k*stride,y+6+line*3,stride-6,1.1);
      }
      for(let bit=0;bit<32;bit++){
        ctx.fillStyle=palette[Math.floor(random()*palette.length)];
        ctx.fillRect(x+random()*154,y+81+random()*7,3,2);
      }
    }
    const sheen=ctx.createLinearGradient(0,h,w,0);
    sheen.addColorStop(0,'rgba(125,204,205,.24)');sheen.addColorStop(.53,'transparent');sheen.addColorStop(1,'rgba(144,118,208,.31)');
    ctx.fillStyle=sheen;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#101e30';ctx.fillRect(248,291,528,238);
    ctx.strokeStyle='#82acb7';ctx.lineWidth=3;ctx.strokeRect(254,297,516,226);
    ctx.fillStyle='#eff8fb';ctx.font='600 147px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('NPU',512,401);
  });
  const dieFace=new T.MeshStandardMaterial({
    map:mask,metalness:.37,roughness:.27,emissive:0xa3cbdd,emissiveMap:mask,emissiveIntensity:.23
  });
  part(cartridge,new T.PlaneGeometry(2.22,1.88),dieFace,0,.346).rotation.x=-Math.PI/2;
  // Each fine bond arches from a pad on the die to the ceramic carrier.
  // One batched mesh represents all four rows of gold wires.
  const wirePath=new T.CatmullRomCurve3([
    new T.Vector3(0,.30,0),new T.Vector3(.005,.359,.06),new T.Vector3(0,.367,.13),new T.Vector3(0,.299,.19)
  ]);
  const bonds=[];
  for(const side of [-1,1])for(let i=0;i<30;i++){
    bonds.push([(i-14.5)*.071,0,side*.971,side<0?Math.PI:0],
               [side*1.144,0,(i-14.5)*.061,side*Math.PI/2]);
  }
  copies(cartridge,new T.TubeGeometry(wirePath,9,.009,6,false),champagne,bonds);

  const lid=new T.Group();
  group.add(lid);
  const cover=part(lid,rounded(2.78,.151,2.44,.072),opticalGlass(0x7bbedc,{
    opacity:.13,edgeOpacity:.63,roughness:.07,envMapIntensity:1.12
  }));
  cover.renderOrder=2;
  // Diamond-cut alignment corners catch the light on the underside of the glass.
  const fiducials=[];
  for(const x of [-1.31,1.31])for(const z of [-1.14,1.14]){
    fiducials.push([x-Math.sign(x)*.085,-.060,z,0],[x,-.060,z-Math.sign(z)*.085,Math.PI/2]);
  }
  copies(lid,new T.BoxGeometry(.17,.012,.013),champagne,fiducials);
  const pads=[],caps=[];
  for (const side of [-1,1]) {
    for(let i=0;i<32;i++) pads.push([(i-15.5)*.085,.01,side*1.41],[side*1.56,.01,(i-15.5)*.077,Math.PI/2]);
    for(let row=0;row<8;row++)for(let col=0;col<3;col++){
      if((row+2*col)%5) caps.push([side*(1.78+col*.31),-.012,(row-3.5)*.34,0]);
    }
  }
  copies(group,new T.BoxGeometry(.04,.042,.20),champagne,pads);
  copies(group,rounded(.16,.069,.073,.012),metal(0x514e4a,.29,.40),caps);
  const contacts=caps.flatMap(([x,y,z])=>[[x-.079,y,z],[x+.079,y,z]]);
  copies(group,new T.BoxGeometry(.04,.072,.076),silver,contacts);
  const pins=[];
  for (const x of [-1.94,1.94]) for(const z of [-1.73,1.73]){
    part(group,rounded(.64,.11,.34,.032),black,x,.004,z);
    for(let j=0;j<6;j++) for(const side of [-1,1]) pins.push([x+(j-2.5)*.085,-.015,z+side*.18]);
  }
  copies(group,new T.BoxGeometry(.046,.032,.08),silver,pins);
  const mounts=[];
  for(const x of [-2.94,2.94])for(const z of [-2.12,2.12])mounts.push([x,-.052,z]);
  copies(group,new T.CylinderGeometry(.122,.142,.039,48),titanium,mounts);
  copies(group,new T.CylinderGeometry(.090,.109,.058,48),champagne,mounts);
  copies(group,new T.CylinderGeometry(.048,.048,.065,6),black,mounts);
  die.material.emissive.set(0x4db7d5);
  function land(progress){
    const seatDie=T.MathUtils.smootherstep(progress,.06,.59);
    const seatLid=T.MathUtils.smootherstep(progress,.25,.89);
    cartridge.position.y=.23*(1-seatDie);
    lid.position.y=.438+.89*(1-seatLid);
    lid.rotation.z=-.047*(1-seatLid);
    dieFace.emissiveIntensity=.18+.23*T.MathUtils.smoothstep(progress,.57,.95);
  }
  land(0);
  return {group,die:die.material,impact:impact.uniforms.radius,land};
}
