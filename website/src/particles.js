// Shared 3D helpers: rising dew in the sky color, and a soft radial glow texture.
import * as THREE from "three";

export function radialTexture(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft round motes that drift upward and sway, like bubbles rising in serum.
// Normal blending (not additive) so they read on a light background: a sky-blue
// rim with a bright white core, like a droplet catching light.
export function makeDew(count, color, pixelRatio, size = 26, opacity = 0.7) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), speed = new Float32Array(count), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = Math.random() * 7 - 1;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    speed[i] = 0.4 + Math.random();
    seed[i] = Math.random() * 6.28;
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uBoost: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size * pixelRatio }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      attribute float aSpeed, aSeed;
      uniform float uTime, uBoost, uSize;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * aSpeed * (0.12 + uBoost * 0.5), 7.0) - 1.0;   // rise, wrap
        p.x += sin(uTime * 0.5 * aSpeed + aSeed) * 0.15;                      // sway
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.35 + aSpeed * 0.5) / -mv.z;
        vAlpha = smoothstep(11.0, 2.0, -mv.z) * smoothstep(-1.0, 0.0, p.y) * smoothstep(6.0, 4.5, p.y);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float body = smoothstep(0.5, 0.36, d);
        float core = smoothstep(0.22, 0.0, length(gl_PointCoord - vec2(0.38, 0.36)));   // highlight
        vec3 col = mix(uColor, vec3(1.0), core * 0.9);
        gl_FragColor = vec4(col, body * vAlpha * uOpacity);
      }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}
