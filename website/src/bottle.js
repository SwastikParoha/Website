// The Blue PDRN Face Serum, modelled in code: cobalt glass body, white print,
// a ribbed silver collar and a tall silver dropper cap. Built 2 units tall,
// centered on x/z and standing on y = 0, so the stage needs no normalization.
import * as THREE from "three";

const H = 2 / 1.9;   // profile below is drawn 1.9 tall; scale it to 2
const R = 0.37, S = 1.0;   // body radius, height where the shoulder starts
const lathe = (pts, segs = 96) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * H, y * H)), segs);

// rounded rectangle-ish side profile of a Boston round bottle
function bodyProfile() {
  const p = [[0, 0], [R - 0.07, 0], [R - 0.03, 0.008], [R - 0.008, 0.03], [R, 0.07], [R, S]];
  for (let i = 1; i <= 12; i++) {          // shoulder: a squared-off quarter ellipse into the neck
    const a = (i / 12) * Math.PI / 2;
    p.push([0.17 + (R - 0.17) * Math.pow(Math.cos(a), 0.6), S + 0.15 * Math.pow(Math.sin(a), 0.8)]);
  }
  p.push([0.165, S + 0.22], [0, S + 0.22]);
  return p;
}

function collarProfile() {
  const p = [[0, 1.16], [0.2, 1.16], [0.215, 1.17]];
  for (let i = 0; i < 9; i++) {            // fine grip ribs
    const y = 1.18 + i * 0.026;
    p.push([0.218, y], [0.211, y + 0.013]);
  }
  p.push([0.218, 1.42], [0.214, 1.435], [0.15, 1.44], [0, 1.44]);
  return p;
}

function capProfile() {
  const p = [[0, 1.43], [0.128, 1.43], [0.132, 1.44], [0.132, 1.82]];
  for (let i = 1; i <= 8; i++) {           // domed top
    const a = (i / 8) * Math.PI / 2;
    p.push([0.132 * Math.cos(a), 1.82 + 0.08 * Math.sin(a)]);
  }
  return p;
}

// white print on the glass: the brand's C-ring mark and a few fine rules, no text
function printTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 790;   // matches the print area's aspect on the glass
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  const cx = 512;
  g.lineWidth = 30;
  g.beginPath();
  g.arc(cx, 230, 74, Math.PI * 0.28, Math.PI * 1.72);
  g.stroke();
  g.beginPath();
  g.arc(cx + 26, 244, 24, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 3;
  [[380, 380], [414, 310], [440, 250]].forEach(([y, w]) => {
    g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx + w / 2, y); g.stroke();
  });
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx - 170, 640); g.lineTo(cx + 170, 640); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildBottle({ lite = false } = {}) {
  const group = new THREE.Group();
  group.name = "serum";

  const glass = new THREE.MeshPhysicalMaterial({
    color: "#3443d8", roughness: 0.05, metalness: 0,
    transmission: lite ? 0 : 0.6, thickness: 0.9, ior: 1.5,
    attenuationColor: "#1f2cc0", attenuationDistance: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4,
  });
  const body = new THREE.Mesh(lathe(bodyProfile()), glass);
  body.name = "glass";

  const liquid = new THREE.Mesh(
    lathe([[0, 0.07], [R - 0.03, 0.07], [R - 0.03, S - 0.02], [0, S - 0.02]], 64),
    new THREE.MeshStandardMaterial({ color: "#2533c7", roughness: 0.3, emissive: "#101a8a", emissiveIntensity: 0.25 })
  );

  const print = new THREE.Mesh(
    new THREE.CylinderGeometry((R + 0.0035) * H, (R + 0.0035) * H, 0.72 * H, 96, 1, true, -Math.PI * 0.4, Math.PI * 0.8),
    new THREE.MeshStandardMaterial({ map: printTexture(), transparent: true, roughness: 0.4, depthWrite: false })
  );
  print.position.y = 0.52 * H;
  print.rotation.y = 0;   // print faces +z, the hero side

  const metal = new THREE.MeshPhysicalMaterial({
    color: "#dfe3ea", metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.3,
  });
  const collar = new THREE.Mesh(lathe(collarProfile()), metal);
  collar.name = "collar";
  const cap = new THREE.Mesh(lathe(capProfile()), metal);
  cap.name = "cap";

  group.add(liquid, body, print, collar, cap);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = !lite; } });
  print.castShadow = false;
  return group;
}

// A glossy serum drop: point up, round belly.
export function buildDrop(size = 0.12) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = t * Math.PI;
    const r = Math.sin(a) * (0.55 + 0.45 * (1 - t)) * Math.pow(1 - t, 0.35);
    pts.push(new THREE.Vector2(Math.max(0, r) * size, -Math.cos(a) * size * 1.25));
  }
  const geo = new THREE.LatheGeometry(pts, 48);
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#eef0ff", roughness: 0.0, metalness: 0, transmission: 1, thickness: 0.35, ior: 1.36,
    attenuationColor: "#7d8bff", attenuationDistance: 0.9, clearcoat: 1, envMapIntensity: 2.2, specularIntensity: 1,
  });
  return new THREE.Mesh(geo, mat);
}
