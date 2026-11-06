import * as T from 'three';
import { canvasMap } from './hardware.js';

// Physical heights are shared by the apertures, fragment clipping, and captions.
export const levels = { rust:-4.8, llvm:-10.5, native:-16.2, call:-21.5, die:-30.6 };
const colors = ['#99efbc','#ffc697','#c1beff','#92daf3','#b2f4fc'];
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
    heights:{value:new T.Vector4(levels.rust,levels.llvm,levels.native,levels.die)},
  };
  const rnd=randomSource(),streams=[];
  for(let i=0;i<94;i++) {
    const x=(rnd()-.5)*3.9,z=(rnd()-.5)*1.59,seed=rnd();
    for(let slot=0;slot<25;slot++) streams.push(x,z,seed,slot);
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
      'attribute vec4 stream; uniform float head,progress,reveal,time; uniform vec4 heights;',
      'varying vec2 glyphUV,localUV; varying vec3 tint; varying float opacity;',
      'void main(){',
      ' float seed=stream.z, slot=stream.w;',
      ' float spacing=.122+seed*.083;',
      ' float drift=fract(seed*5.73-progress*(17.+seed*8.)-time*(2.+seed*2.8));',
      ' float y=head+(slot+drift)*spacing+seed*2.-1.;',
      ' float phase=step(y,heights.x)+step(y,heights.y)+step(y,heights.z);',
      ' float funnel=mix(.19,1.,smoothstep(heights.w,heights.w+4.2,y));',
      ' float x=(stream.x+.11*sin(y*1.3+seed*9.))*funnel;',
      ' float z=(stream.y+.09*cos(y+seed*7.))*funnel;',
      ' vec4 eye=viewMatrix*vec4(x,y,z,1.);',
      ' float size=(.115+.067*seed)*mix(.72,1.,funnel);',
      ' eye.xy+=position.xy*size*vec2(1.,1.28);',
      ' gl_Position=projectionMatrix*eye;',
      ' float glyph=mod(floor(seed*128.)+slot*7.+floor(progress*(65.+seed*90.)+time*(2.+seed)),32.);',
      ' glyphUV=(vec2(mod(glyph,16.),7.-phase*2.-floor(glyph/16.))+uv)/vec2(16.,8.);',
      ' localUV=uv;',
      ' tint=mix(vec3(.29,.91,.57),vec3(1.,.60,.31),step(.5,phase));',
      ' tint=mix(tint,vec3(.66,.62,1.),step(1.5,phase));',
      ' tint=mix(tint,vec3(.42,.84,1.),step(2.5,phase));',
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
  const boundaries=[50,levels.rust,levels.llvm,levels.native,levels.call+1.8,levels.die];
  code.forEach((lines,i)=>{
    const map=canvasMap(1536,562,(ctx,w,h)=>{
      ctx.save();ctx.scale(w/2,h/2);
      const shade=ctx.createRadialGradient(1,1,0,1,1,1);
      shade.addColorStop(0,'rgba(8,14,23,.90)');shade.addColorStop(.64,'rgba(8,14,23,.65)');shade.addColorStop(1,'rgba(8,14,23,0)');
      ctx.fillStyle=shade;ctx.fillRect(0,0,2,2);ctx.restore();
      ctx.font='bold 56px Consolas, monospace';ctx.textBaseline='middle';
      const left=(w-Math.max(...lines.map(line=>ctx.measureText(line).width)))/2;
      lines.forEach((line,j)=>{
        ctx.fillStyle=j===Math.floor(lines.length/2)?'#f4fcfc':colors[i];
        ctx.shadowColor=colors[i];ctx.shadowBlur=3;
        ctx.fillText(line,left,(h-(lines.length-1)*77)/2+j*77);
      });
    });
    const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,
      clippingPlanes:[new T.Plane(new T.Vector3(0,-1,0),boundaries[i]),new T.Plane(new T.Vector3(0,1,0),-boundaries[i+1])]});
    const mesh=new T.Mesh(new T.PlaneGeometry(4.25,1.56),material);
    mesh.renderOrder=4;group.add(mesh);
  });
  return group;
}
