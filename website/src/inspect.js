// Dev-only review page: the coded bottle, four angles, neutral light. /inspect.html?bg=light
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildBottle } from "./bottle.js";

const q = new URLSearchParams(location.search);
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.setScissorTest(true);
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(q.get("bg") === "light" ? 0xeef3f9 : 0x2a2d33);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.DirectionalLight(0xffffff, 1.2).translateX(3).translateY(5).translateZ(4));
const model = buildBottle();
model.rotation.y = parseFloat(q.get("yaw") || "0");
scene.add(model);

let tris = 0;
model.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
document.getElementById("label").textContent = `coded serum bottle · ${Math.round(tris).toLocaleString()} triangles · front / right / back / three-quarter from above`;

const views = [[0, 1, 5.2], [5.2, 1, 0], [0, 1, -5.2], [3.4, 3.4, 3.4]];
const w = innerWidth / 2, h = innerHeight / 2;
const cam = new THREE.PerspectiveCamera(30, w / h, 0.05, 50);
views.forEach((p, i) => {
  const x = (i % 2) * w, y = (i < 2 ? 1 : 0) * h;
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);
  cam.position.set(...p);
  cam.lookAt(0, 1, 0);
  renderer.render(scene, cam);
});
document.body.dataset.ready = "1";
