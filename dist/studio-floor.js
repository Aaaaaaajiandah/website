import * as T from 'three';

// Only the large pieces of hardware need to register in the soft reflection.
// Small pins, key legends and the falling glyphs stay in the main camera pass.
export function createStudioFloor(renderer, scene, subjects) {
  const mirrorLayer = 1;
  for (const subject of subjects) {
    subject.traverse(object => {
      if (!object.isMesh || object.isInstancedMesh) return;
      object.geometry.computeBoundingSphere();
      if (object.geometry.boundingSphere.radius > .95) object.layers.enable(mirrorLayer);
    });
  }
  scene.traverse(object => {
    if (object.isLight) object.layers.enable(mirrorLayer);
  });

  const capture = new T.WebGLRenderTarget(1, 1);
  const virtual = new T.PerspectiveCamera();
  virtual.layers.set(mirrorLayer);
  virtual.up.set(0, -1, 0);
  const aim = new T.Vector3();
  const uniforms = {
    reflection: {value: capture.texture},
    reflectedView: {value: new T.Matrix4()},
    texel: {value: new T.Vector2()},
    strength: {value: 0},
  };
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      uniform mat4 reflectedView;
      varying vec4 projected;
      varying vec2 floorPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.);
        floorPosition = position.xy;
        projected = reflectedView * world;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform sampler2D reflection;
      uniform vec2 texel;
      uniform float strength;
      varying vec4 projected;
      varying vec2 floorPosition;
      void main() {
        vec2 uv = projected.xy / projected.w * .5 + .5;
        if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) discard;
        float radius = length(floorPosition / vec2(5.6, 4.6));
        float fade = (1. - smoothstep(.28, 1., radius)) * strength;
        vec2 blur = texel * vec2(1.3, 3.2) * (.6 + radius);
        vec4 sampleColor = texture2D(reflection, uv) * .4;
        sampleColor += .15 * (texture2D(reflection, uv + blur) + texture2D(reflection, uv - blur));
        sampleColor += .15 * (texture2D(reflection, uv + vec2(blur.x,-blur.y)) +
                                texture2D(reflection, uv + vec2(-blur.x,blur.y)));
        float contact = .24 * exp(-dot(floorPosition * vec2(.43,.66), floorPosition * vec2(.43,.66)));
        float reflected = sampleColor.a * .32;
        vec3 color = mix(vec3(.003,.006,.012), sampleColor.rgb / max(sampleColor.a,.01),
                         reflected / max(contact + reflected,.001));
        gl_FragColor = vec4(color, (reflected + contact) * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const floor = new T.Mesh(new T.PlaneGeometry(12, 10), material);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -2;
  scene.add(floor);
  let previousProgress = -1;
  let previousAspect = 0;

  return function reflect(camera, focus, height, strength, progress) {
    floor.visible = strength > .005;
    if (!floor.visible) return;
    floor.position.y = height;
    uniforms.strength.value = strength;
    if (progress === previousProgress && camera.aspect === previousAspect) return;
    previousProgress = progress;
    previousAspect = camera.aspect;

    const width = Math.round(320 * Math.min(1, camera.aspect));
    const heightPx = Math.round(width / camera.aspect);
    capture.setSize(width, heightPx);
    uniforms.texel.value.set(1 / width, 1 / heightPx);
    virtual.projectionMatrix.copy(camera.projectionMatrix);
    virtual.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    virtual.position.copy(camera.position);
    virtual.position.y = 2 * height - camera.position.y;
    aim.copy(focus);
    aim.y = 2 * height - focus.y;
    virtual.lookAt(aim);
    virtual.updateMatrixWorld();
    uniforms.reflectedView.value.multiplyMatrices(virtual.projectionMatrix, virtual.matrixWorldInverse);
    renderer.setRenderTarget(capture);
    renderer.render(scene, virtual);
    renderer.setRenderTarget(null);
  };
}
