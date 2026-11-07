import * as T from 'three';

// The transparent canvas composites over the page. Sample the studio environment
// for the polished surface and let the actual objects behind it show through.
export function opticalGlass(tint, {opacity=.10, edgeOpacity=.62, roughness=.085, envMapIntensity=1.25}={}) {
  const material=new T.MeshPhysicalMaterial({
    color:tint, metalness:.18, roughness, clearcoat:1, clearcoatRoughness:.045,
    ior:1.52, specularIntensity:1, envMapIntensity,
    transparent:true, opacity, depthWrite:false,
  });
  material.onBeforeCompile=shader=>{
    shader.uniforms.paneEdgeOpacity={value:edgeOpacity};
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float paneEdgeOpacity;')
      .replace('#include <opaque_fragment>', `
        float grazing = pow(1.0 - saturate(dot(normal, geometryViewDir)), 2.5);
        float highlight = dot(totalSpecular, vec3(.2126,.7152,.0722));
        diffuseColor.a = clamp(opacity + paneEdgeOpacity * grazing + min(.22,highlight*.43),0.,1.);
        #include <opaque_fragment>
      `);
  };
  return material;
}
