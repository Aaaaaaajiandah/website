import * as T from 'three';
import { canvasMap, nativeCallColor } from './hardware.js';
import { opticalGlass } from './optics.js';

// Physical heights are shared by the apertures, fragment clipping, and captions.
export const levels = { rust:-4.8, llvm:-10.5, native:-16.2, call:-21.5, die:-30.6 };
const colors = ['#99efbc','#ffc697','#c1beff','#92daf3','#b2f4fc',nativeCallColor];
const code = [
  ['int i = blockIdx.x * blockDim.x','      + threadIdx.x;','if (i < n)','  out[i] = a[i] + b[i];'],
  ['Operation::Add {','  lhs: BufferId(0),','  rhs: BufferId(1),','  output: BufferId(2), len,','}'],
  ['%av = load float, ptr %ap, align 4','%bv = load float, ptr %bp, align 4','%sum = fadd float %av, %bv','store float %sum, ptr %op, align 4'],
  ['{ r3 = sfadd(r3,r4)','  r4 = memw(r1++#4)','  memw(r2++#4) = r3.new }'],
  ['03 44 03 eb','24 40 81 9b','08 d4 a2 ab'],
];

function glyphAtlas() {
  const alphabets=[
    'abcdifnxyzw()+-=;*[]{}<>_012345789',
    'OperationAddBufferIdlhsoutput::{}(),012',
    'faddfloatptrsumstoreav%b=,0123456789',
    '0123456789abcdef0123456789abcdef'
  ];
  return canvasMap(1024,512,(ctx)=>{
    ctx.font='bold 45px Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='white';
    alphabets.forEach((alphabet,row)=>{
      for(let i=0;i<32;i++){
        ctx.fillText(alphabet[i%alphabet.length],(i%16+.5)*64,(row*2+Math.floor(i/16)+.5)*64);
      }
    });
  });
}
function randomSource(){
  let state=1987;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}

// Each instance is one character. World height determines its language even
// when a single trail straddles two sides of a compiler stage.
export function createRain() {
  const uniforms={
    atlas:{value:glyphAtlas()},head:{value:1.65},progress:{value:0},reveal:{value:0},time:{value:0},
    callHeight:{value:levels.call},callTint:{value:new T.Color(nativeCallColor).convertLinearToSRGB()},
    heights:{value:new T.Vector4(levels.rust,levels.llvm,levels.native,levels.die)},
  };
  const rnd=randomSource(),streams=[];
  // Separate the stream into filaments, leaving negative space around the code.
  for(let i=0;i<64;i++) {
    const angle=i%8*Math.PI/4;
    const x=Math.cos(angle)*1.72+(rnd()-.5)*.46;
    const z=Math.sin(angle)*.66+(rnd()-.5)*.23,seed=rnd();
    for(let slot=0;slot<23;slot++) streams.push(x,z,seed,slot);
  }
  const quad=new T.PlaneGeometry(1,1);
  const geometry=new T.InstancedBufferGeometry();
  geometry.index=quad.index;
  geometry.setAttribute('position',quad.attributes.position);
  geometry.setAttribute('uv',quad.attributes.uv);
  geometry.setAttribute('stream',new T.InstancedBufferAttribute(new Float32Array(streams),4));
  const material=new T.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,
    vertexShader:[
      'attribute vec4 stream; uniform float head,progress,reveal,time; uniform vec4 heights; uniform float callHeight; uniform vec3 callTint;',
      'varying vec2 glyphUV,localUV; varying vec3 tint; varying float opacity;',
      'void main(){',
      ' float seed=stream.z, slot=stream.w;',
      ' float spacing=.122+seed*.083;',
      ' float drift=fract(seed*5.73-progress*(17.+seed*8.)-time*(2.+seed*2.8));',
      ' float y=head+(slot+drift)*spacing+seed*2.-1.;',
      ' float phase=step(y,heights.x)+step(y,heights.y)+step(y,heights.z);',
      ' float funnel=mix(.19,1.,smoothstep(heights.w,heights.w+4.2,y));',
      ' float turn=.33*sin(y*.48+progress*5.);',
      ' vec2 path=mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*stream.xy;',
      ' float x=(path.x+.065*sin(y*1.3+seed*4.))*funnel;',
      ' float z=(path.y+.05*cos(y+seed*4.))*funnel;',
      ' vec4 eye=viewMatrix*vec4(x,y,z,1.);',
      ' float size=(.115+.067*seed)*mix(.72,1.,funnel);',
      ' eye.xy+=position.xy*size*vec2(1.,1.28);',
      ' gl_Position=projectionMatrix*eye;',
      ' float glyph=mod(floor(seed*128.)+slot*7.+floor(progress*(65.+seed*90.)+time*(2.+seed)),32.);',
      ' glyphUV=(vec2(mod(glyph,16.),7.-phase*2.-floor(glyph/16.))+uv)/vec2(16.,8.);',
      ' localUV=uv;',
      ' tint=mix(vec3(.52,.83,.74),vec3(.97,.70,.49),step(.5,phase));',
      ' tint=mix(tint,vec3(.72,.69,.98),step(1.5,phase));',
      ' tint=mix(tint,vec3(.54,.79,.94),step(2.5,phase));',
      ' tint=mix(tint,callTint,step(y,callHeight));',
      ' float highlight=1.-smoothstep(0.,2.8,mod(slot+time*(3.+seed*6.)+seed*25.,25.));',
      ' tint=mix(tint,vec3(.92,1.,.97),.73*max(highlight,1.-smoothstep(0.,3.,slot)));',
      ' float front=1.-smoothstep(0.,24.,slot);',
      ' opacity=reveal*(.16+.66*front+.23*highlight)*(.55+.45*seed)*smoothstep(heights.w,heights.w+.19,y);',
      ' opacity*=1.-smoothstep(2.65,3.4,y);',
      '}'
    ].join('\n'),
    fragmentShader:[
      'uniform sampler2D atlas; varying vec2 glyphUV,localUV; varying vec3 tint; varying float opacity;',
      'void main(){',
      ' float glyph=texture2D(atlas,glyphUV).a;',
      ' vec2 d=(localUV-.5)*vec2(2.2,1.5);',
      ' float halo=max(0.,1.-dot(d,d)*3.);',
      ' float alpha=opacity*(glyph+.055*halo);',
      ' if(alpha<.009) discard;',
      ' gl_FragColor=vec4(tint,min(alpha,1.));',
      '}'
    ].join('\n')
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.frustumCulled=false;mesh.renderOrder=2;
  return {mesh,uniforms};
}

export function createPacket() {
  const group=new T.Group();
  const outline=new T.Shape();
  const halfWidth=2.04,halfHeight=.79,corner=.12;
  outline.moveTo(-halfWidth+corner,-halfHeight);
  outline.lineTo(halfWidth-corner,-halfHeight);
  outline.quadraticCurveTo(halfWidth,-halfHeight,halfWidth,-halfHeight+corner);
  outline.lineTo(halfWidth,halfHeight-corner);
  outline.quadraticCurveTo(halfWidth,halfHeight,halfWidth-corner,halfHeight);
  outline.lineTo(-halfWidth+corner,halfHeight);
  outline.quadraticCurveTo(-halfWidth,halfHeight,-halfWidth,halfHeight-corner);
  outline.lineTo(-halfWidth,-halfHeight+corner);
  outline.quadraticCurveTo(-halfWidth,-halfHeight,-halfWidth+corner,-halfHeight);
  const glass=opticalGlass(0x172d46,{opacity:.70,edgeOpacity:.8,roughness:.14,envMapIntensity:.8});
  const geometry=new T.ExtrudeGeometry(outline,{
    depth:.063,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:5,curveSegments:16,
  });
  const plate=new T.Mesh(geometry,glass);
  plate.renderOrder=3;
  group.add(plate);

  const rimMaterial=new T.LineBasicMaterial({color:0xaacbdf,transparent:true,opacity:.63,depthWrite:false});
  const rimGeometry=new T.BufferGeometry().setFromPoints(outline.getPoints(16));
  const rim=new T.LineLoop(rimGeometry,rimMaterial);
  rim.position.z=.1;rim.renderOrder=4;group.add(rim);
  const packets=[...code,code[code.length-1]];
  const boundaries=[50,levels.rust,levels.llvm,levels.native,levels.call+1.8,levels.call,levels.die];
  const faces=[];
  packets.forEach((lines,i)=>{
    const map=canvasMap(1280,480,(ctx,w,h)=>{
      const coating=ctx.createLinearGradient(0,h,w,0);
      coating.addColorStop(0,'rgba(11,24,39,.81)');
      coating.addColorStop(.66,'rgba(17,30,46,.73)');
      coating.addColorStop(1,'rgba(42,60,81,.49)');
      ctx.fillStyle=coating;ctx.beginPath();ctx.roundRect(0,0,w,h,29);ctx.fill();
      ctx.fillStyle=colors[i];ctx.fillRect(35,40,5,44);
      ctx.font='500 48px Consolas, monospace';ctx.textBaseline='middle';
      const left=83, spacing=68;
      lines.forEach((line,j)=>{
        ctx.fillStyle=j===Math.floor(lines.length/2)?'#f4fcfc':colors[i];
        ctx.fillText(line,left,(h-(lines.length-1)*spacing)/2+j*spacing,w-left-60);
      });
    });
    const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,
      clippingPlanes:[new T.Plane(new T.Vector3(0,-1,0),boundaries[i]),new T.Plane(new T.Vector3(0,1,0),-boundaries[i+1])]});
    const mesh=new T.Mesh(new T.PlaneGeometry(4.04,1.55),material);
    mesh.position.z=.103;mesh.renderOrder=5;group.add(mesh);faces.push(mesh);
  });
  function reveal(amount,head) {
    glass.opacity=.70*amount;rimMaterial.opacity=.63*amount;
    // Only two representations can ever straddle a gate in the same frame.
    faces.forEach((face,i)=>{
      face.visible=head<boundaries[i]+2 && head>boundaries[i+1]-2;
      face.material.opacity=amount;
    });
  }
  return {group,reveal};
}
