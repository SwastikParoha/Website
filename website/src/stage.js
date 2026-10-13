// The live 3D stage: one fixed full-screen WebGL canvas behind the whole page.
// The serum bottle is built in code (bottle.js), so there is nothing to download.
// Scroll flies the camera through the story beats, the cursor moves a light,
// the Explore section lets visitors drag to spin the bottle.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildBottle, buildDrop } from "./bottle.js";
import { makeDew, radialTexture } from "./particles.js";

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const LITE = matchMedia("(max-width: 768px), (hover: none)").matches;      // phones and tablets
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initStage({ beats, hotspots = [], lightModes, modelYaw = 0, lenis }) {
  const canvas = document.getElementById("stage");
  const fail = () => document.body.classList.add("stage-failed");       // CSS keeps the poster

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch { fail(); return null; }
  let dpr = Math.min(devicePixelRatio, LITE ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);              // the sky gradient behind is CSS (.stage-bg)
  renderer.toneMapping = THREE.NeutralToneMapping;  // keeps the light palette clean, no grey cast
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fail(); });

  // ---- scene, fog, reflections (no HDR file needed) ----
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(css("--fog")), 9, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 60);

  // ---- lights: soft daylight key, a cobalt rim and an apricot rim, a cursor light ----
  const hemi = new THREE.HemisphereLight(0xf4f8ff, 0xc9d8ec, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  const rimA = new THREE.SpotLight(css("--accent"), 70, 20, 0.6, 0.9);
  rimA.position.set(-3.6, 2.6, -2.6);
  const rimB = new THREE.SpotLight(css("--accent-2"), 50, 20, 0.6, 0.9);
  rimB.position.set(3.6, 1.8, -2.4);
  const cursorLight = new THREE.PointLight(0xffffff, 0, 6, 1.6);
  scene.add(hemi, key, rimA, rimB, cursorLight);

  // ---- floor: a sheet of still water that catches the shadow and the glow ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.ShadowMaterial({ color: 0x1b2a6b, opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const glow = new THREE.Mesh(      // soft cobalt pool under the bottle, as if light passed through the glass
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: radialTexture(css("--accent")), transparent: true, opacity: 0.32, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.003;
  scene.add(glow);

  // ripples: thin rings that spread out from the bottle and fade
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.992, 1, 128),
      new THREE.MeshBasicMaterial({ color: css("--sky"), transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.004;
    r.userData.phase = i / 4;
    scene.add(r);
    ripples.push(r);
  }

  // ---- the product ----
  const rig = new THREE.Group();          // scroll + drag rotate the rig
  scene.add(rig);
  const model = buildBottle({ lite: LITE });
  model.rotation.y = modelYaw;
  rig.add(model);
  key.target = rig;
  rimA.target = rig;
  rimB.target = rig;

  // ---- serum drops that hang in the air around the bottle ----
  const drops = [
    { p: [-0.85, 1.6, 0.3], s: 0.075, sp: 0.9 },
    { p: [0.85, 1.05, -0.45], s: 0.05, sp: 1.2 },
    { p: [-0.6, 0.6, -0.9], s: 0.04, sp: 1.5 },
    { p: [0.55, 2.0, 0.6], s: 0.055, sp: 0.8 },
  ].map((d) => {
    const m = buildDrop(d.s);
    m.position.set(...d.p);
    m.userData = { base: new THREE.Vector3(...d.p), sp: d.sp, off: Math.random() * 6 };
    m.castShadow = !LITE;
    scene.add(m);
    return m;
  });

  // ---- atmosphere: dew and light motes rising slowly, like bubbles in serum ----
  const dew = makeDew(LITE ? 260 : 700, css("--sky"), renderer.getPixelRatio());
  if (!REDUCED) scene.add(dew);

  // ---- scroll story: one camera keyframe per beat, scrubbed across #story ----
  const fit = () => (camera.aspect < 1 ? 1.75 : camera.aspect < 1.3 ? 1.2 : 1);   // pull back on tall screens
  const st = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, yaw: 0 };
  const setBeat = (b) => Object.assign(st, { px: b.pos[0], py: b.pos[1], pz: b.pos[2], lx: b.look[0], ly: b.look[1], lz: b.look[2], yaw: b.yaw });
  setBeat(beats[0]);
  if (!REDUCED) {
    const tl = gsap.timeline({ defaults: { ease: "power1.inOut", duration: 1 } });
    beats.slice(1).forEach((b) => tl.to(st, { px: b.pos[0], py: b.pos[1], pz: b.pos[2], lx: b.look[0], ly: b.look[1], lz: b.look[2], yaw: b.yaw }));
    ScrollTrigger.create({ trigger: "#story", start: "top top", end: "bottom bottom", scrub: 1, animation: tl });
  }

  // ---- after the story the stage fades back behind the content sections ----
  gsap.to(".stage-dim", { opacity: 0.94, ease: "none",
    scrollTrigger: { trigger: "#story", start: "bottom 80%", end: "bottom 30%", scrub: true } });

  // ---- Explore: stage clears, drag to spin, hotspots show ----
  let exploring = false, dragYaw = 0, dragVel = 0, dragging = false, lastX = 0;
  const exploreCam = { pos: [0, 1.25, 6.4], look: [0, 1.0, 0] };
  let exploreMix = 0;
  ScrollTrigger.create({ trigger: "#explore", start: "top 60%", end: "bottom 40%",
    onToggle: (self) => {
      exploring = self.isActive;
      document.body.classList.toggle("exploring", exploring);   // CSS undims; never tween .stage-dim here (it would kill the scrub)
    } });
  const dragZone = document.querySelector("#explore .explore__drag");
  dragZone?.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; dragZone.setPointerCapture?.(e.pointerId); });
  dragZone?.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragVel = (e.clientX - lastX) * 0.008;
    dragYaw += dragVel;
    lastX = e.clientX;
  });
  const endDrag = () => { dragging = false; };
  dragZone?.addEventListener("pointerup", endDrag);
  dragZone?.addEventListener("pointercancel", endDrag);

  // ---- light modes: the CSS sky behind changes too (body[data-light]) ----
  function setLightMode(name) {
    const m = lightModes[name];
    if (!m) return;
    document.body.dataset.light = name;
    gsap.to(renderer, { toneMappingExposure: m.exposure, duration: 0.8 });
    gsap.to(key, { intensity: m.key, duration: 0.8 });
    gsap.to(rimA, { intensity: m.rim, duration: 0.8 });
    gsap.to(rimB, { intensity: m.warm, duration: 0.8 });
    const k = new THREE.Color(m.keyColor);
    gsap.to(key.color, { r: k.r, g: k.g, b: k.b, duration: 0.8 });
    const c = new THREE.Color(m.fog);
    gsap.to(scene.fog.color, { r: c.r, g: c.g, b: c.b, duration: 0.8 });
    document.querySelectorAll("button[data-light]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.light === name)));
  }
  document.querySelectorAll("button[data-light]").forEach((b) => b.addEventListener("click", () => setLightMode(b.dataset.light)));

  // ---- hotspots: points on the bottle, projected to HTML labels every frame ----
  const hs = hotspots.map((h) => ({ ...h, el: document.querySelector(`[data-hotspot="${h.id}"]`),
    p: new THREE.Vector3(...h.at), n: new THREE.Vector3(...h.normal).normalize() }));
  const tmp = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3();

  // ---- cursor ----
  const pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });

  // ---- resize ----
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    // tall screens: shift the whole view down so the bottle sits in the lower part, under the copy
    if (camera.aspect < 1) camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * 0.26, innerWidth, innerHeight);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }
  addEventListener("resize", resize);
  resize();

  // ---- render loop with adaptive quality and pause when hidden or covered ----
  let frames = 0, acc = 0, last = performance.now(), fps = 60;
  const cover = document.querySelector(".stage-cover");     // the solid footer: stop drawing once it fills the screen
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function tick() {
    const now = performance.now(), dt = now - last;
    last = now;
    if (document.hidden || (cover && cover.getBoundingClientRect().top <= 0)) return;
    timer.update();
    const t = timer.getElapsed();

    // adaptive DPR: measure 90 frames, step down if slow
    acc += dt; frames++;
    if (frames === 90) {
      fps = 1000 / (acc / frames);
      if (fps < 42 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
      frames = 0; acc = 0;
    }

    // portrait screens: bottle centered and low, copy above it; landscape: the beat's side offset
    const k = fit(), portrait = camera.aspect < 1;
    camPos.set(st.px * k, st.py, st.pz * k);
    camLook.set(portrait ? 0 : st.lx, st.ly, portrait ? 0 : st.lz);
    // in Explore the camera eases to a calm front view with room for the hotspot labels
    exploreMix += ((exploring ? 1 : 0) - exploreMix) * (1 - Math.exp(-dt / 280));   // frame-rate independent ease
    if (exploreMix > 0.001) {
      camPos.lerp(tmp.set(exploreCam.pos[0], exploreCam.pos[1], exploreCam.pos[2] * k), exploreMix);
      camLook.lerp(tmp.set(portrait ? 0 : -0.55, exploreCam.look[1], 0), exploreMix);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // drag inertia + scroll yaw + a slow idle turn + cursor tilt
    if (!dragging) { dragVel *= 0.94; dragYaw += dragVel; }
    const idle = REDUCED ? 0 : Math.sin(t * 0.25) * 0.08;
    const frontYaw = Math.round(st.yaw / (Math.PI * 2)) * Math.PI * 2;   // nearest full turn, so entering Explore never spins the bottle around
    rig.rotation.y = st.yaw + (frontYaw - st.yaw) * exploreMix + dragYaw + idle;
    rig.rotation.x += ((REDUCED ? 0 : pointer.y * 0.04) - rig.rotation.x) * 0.05;
    rig.updateMatrixWorld();

    // cursor light rides in front of the bottle, on desktop only
    if (!LITE) {
      cursorLight.intensity += ((exploring ? 6 : 3) - cursorLight.intensity) * 0.05;
      cursorLight.position.set(pointer.x * 2.2, 1.2 + pointer.y * 1.2, 2.4);
    }

    const boost = Math.min(2, Math.abs(lenis?.velocity || 0) * 0.02);
    dew.material.uniforms.uTime.value = t;
    dew.material.uniforms.uBoost.value = boost;
    if (!REDUCED) {
      for (const d of drops) {
        const u = d.userData;
        d.position.set(u.base.x + Math.sin(t * 0.4 * u.sp + u.off) * 0.06,
          u.base.y + Math.sin(t * 0.7 * u.sp + u.off) * 0.09 + boost * 0.05,
          u.base.z + Math.cos(t * 0.35 * u.sp + u.off) * 0.06);
        d.rotation.z = Math.sin(t * 0.5 + u.off) * 0.15;
      }
      for (const r of ripples) {
        const p = (t * 0.12 + r.userData.phase) % 1;
        const s = 0.6 + p * 1.9;
        r.scale.set(s, s, 1);
        r.material.opacity = Math.sin(p * Math.PI) * (1 - p) * 0.38;
      }
    }

    for (const h of hs) {
      if (!h.el) continue;
      tmp.copy(h.p).applyMatrix4(rig.matrixWorld);
      nW.copy(h.n).transformDirection(rig.matrixWorld);
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = nW.dot(toCam) > 0.15;
      tmp.project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * innerWidth;
      h.el.style.transform = `translate(${sx}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px)`;
      h.el.classList.toggle("hotspot--flip", sx > innerWidth * (portrait ? 0.5 : 0.72));   // label goes left of the dot near the right edge
      h.el.classList.toggle("is-hidden", !exploring || exploreMix < 0.6 || !facing);
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(tick);
  tick();
  document.body.classList.add("stage-ready");
  const api = { renderer, scene, camera, rig, model, setLightMode, get fps() { return fps; }, get dpr() { return dpr; }, get dragYaw() { return dragYaw; } };
  if (import.meta.env.DEV) window.__stage = api;
  return api;
}
