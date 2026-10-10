import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  makeEarth,
  makeBands,
  makeRocky,
  makeSun,
  makeRing,
  makeGlow,
  makeStarDot,
} from "./textures.js";
import "./style.css";

const DEG = Math.PI / 180;
const app = document.getElementById("app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04040c);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.set(90, 50, 140);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
app.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 800;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.15,
  0.55,
  0.82
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

scene.add(new THREE.AmbientLight(0x30304a, 1.4));

const HUD = `
  <div id="hud">☀️ 太阳系 · 文明演化演示 Solar System · Civ Evolution</div>
  <div id="controls">
    <div class="title">控制面板</div>
    <div class="row">
      <span>速度</span>
      <input type="range" id="speed" min="0" max="10" step="0.1" value="1" />
      <span id="speed-val">1.0x</span>
    </div>
    <div class="row">
      <span>辉光</span>
      <input type="range" id="bloom" min="0" max="2" step="0.05" value="1.15" />
      <span id="bloom-val">1.15</span>
    </div>
    <label><input type="checkbox" id="show-orbits" checked /> 显示轨道</label>
    <label><input type="checkbox" id="show-labels" checked /> 显示名称</label>
    <label><input type="checkbox" id="auto-rotate" checked /> 自动旋转视角</label>
  </div>
  <div id="labels-hint">🖱 左键拖动旋转 · 滚轮缩放 · 点击任意恒星飞行 · 左侧面板控制文明演化</div>
`;
document.body.insertAdjacentHTML("beforeend", HUD);

let speed = 1;

document.getElementById("speed").addEventListener("input", (e) => {
  speed = parseFloat(e.target.value);
  document.getElementById("speed-val").textContent = `${speed.toFixed(1)}x`;
});

document.getElementById("bloom").addEventListener("input", (e) => {
  bloomPass.strength = parseFloat(e.target.value);
  document.getElementById("bloom-val").textContent = bloomPass.strength.toFixed(2);
});

document.getElementById("auto-rotate").addEventListener("change", (e) => {
  controls.autoRotate = e.target.checked;
});

const starGeo = new THREE.BufferGeometry();
const starCount = 4000;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    .normalize()
    .multiplyScalar(900 + Math.random() * 1300);
  starPos.set([v.x, v.y, v.z], i * 3);
  const tone = Math.random();
  const c =
    tone < 0.72 ? [0.92, 0.95, 1.0] : tone < 0.88 ? [1.0, 0.93, 0.78] : [0.75, 0.83, 1.0];
  const b = 0.5 + Math.random() * 0.5;
  starCol.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({
    map: makeStarDot(),
    size: 1.6,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
);
scene.add(stars);

const sunTex = makeSun();
const glowTex = makeGlow();

function buildSun() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(7, 64, 64),
    new THREE.MeshBasicMaterial({ map: sunTex, color: new THREE.Color(0xffffff).multiplyScalar(2.6) })
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(8.6, 48, 48),
    new THREE.MeshBasicMaterial({ map: sunTex, color: 0xff9a3c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex, color: 0xffaa55, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  corona.scale.set(34, 34, 1);
  g.add(core, glow, corona);
  return g;
}

const sunGroup = buildSun();
scene.add(sunGroup);
const sunLight = new THREE.PointLight(0xfff3d6, 2.4, 0, 0);
scene.add(sunLight);

function addLabel(text) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.color = "#fff";
  el.style.fontSize = "13px";
  el.style.fontFamily = "system-ui";
  el.style.textShadow = "0 0 6px rgba(0,0,0,0.9)";
  el.style.background = "rgba(0,0,0,0.35)";
  el.style.padding = "2px 8px";
  el.style.borderRadius = "999px";
  el.style.border = "1px solid rgba(255,255,255,0.25)";
  el.style.pointerEvents = "none";
  return new CSS2DObject(el);
}

function orbitLine(radius, color = 0x50709c, opacity = 0.32) {
  const pts = [];
  const segments = 180;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
}

const atmosphereVS = `
varying vec3 vNrm;
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNrm = normalize(mat3(modelMatrix) * normal);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const atmosphereFS = `
uniform vec3 uColor;
uniform float uPower;
uniform float uIntensity;
varying vec3 vNrm;
varying vec3 vWorld;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float rim = pow(1.0 - max(dot(normalize(vNrm), viewDir), 0.0), uPower);
  gl_FragColor = vec4(uColor, rim * uIntensity);
}`;

function makeAtmosphere(radius, color, intensity = 0.9) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.16, 48, 48),
    new THREE.ShaderMaterial({
      vertexShader: atmosphereVS,
      fragmentShader: atmosphereFS,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uPower: { value: 2.8 },
        uIntensity: { value: intensity },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

const earthTex = makeEarth();
const moonTex = makeRocky({ W: 256, H: 128, dark: 0x4f4f55, mid: 0x7c7c82, light: 0xbdbdc2, maria: true, craters: 120, ox: 31 });
const planetData = [
  {
    name: "水星",
    radius: 0.95,
    distance: 14,
    speed: 0.024,
    spin: 0.01,
    tilt: 0.03,
    incl: 7.0,
    tex: makeRocky({ dark: 0x5c5856, mid: 0x8d888a, light: 0xc2bcbb, craters: 300, ox: 11, oy: 5 }),
  },
  {
    name: "金星",
    radius: 1.3,
    distance: 20,
    speed: 0.018,
    spin: -0.004,
    tilt: 177.4,
    incl: 3.39,
    tex: makeBands({
      palette: [0xe8d09c, 0xd9b97f, 0xeeddab, 0xcdaa6e, 0xe4cb92, 0xd1ad70, 0xe8d09c],
      swirl: 2.6,
      streak: 0.18,
      ox: 60,
      oy: 20,
    }),
    atmo: { color: 0xf1d48a, intensity: 0.55 },
  },
  {
    name: "地球",
    radius: 1.4,
    distance: 27,
    speed: 0.015,
    spin: 0.14,
    tilt: 23.44,
    incl: 0.0,
    tex: earthTex,
    cloud: true,
    atmo: { color: 0x4c90ff, intensity: 0.95 },
  },
  {
    name: "火星",
    radius: 1.1,
    distance: 34,
    speed: 0.012,
    spin: 0.135,
    tilt: 25.19,
    incl: 1.85,
    tex: makeRocky({ dark: 0x5a2d1c, mid: 0xb0512b, light: 0xd98e5f, craters: 140, caps: 0.14, ox: 140, oy: 90 }),
    atmo: { color: 0xdca078, intensity: 0.28 },
  },
  {
    name: "木星",
    radius: 3.2,
    distance: 48,
    speed: 0.008,
    spin: 0.34,
    tilt: 3.13,
    incl: 1.3,
    tex: makeBands({
      palette: [0xb89a6e, 0xe7d6ae, 0xc98f5b, 0x9a6b42, 0xe3cfa2, 0xc9926b, 0x8a5a3b, 0xd9c39a, 0xb07a4e, 0xe8dcbc, 0xb89a6e],
      swirl: 1.4,
      streak: 0.16,
      spots: [
        { u: 0.3, v: 0.66, rx: 0.05, ry: 0.02, color: 0xb5432d },
        { u: 0.55, v: 0.6, rx: 0.025, ry: 0.011, color: 0xb5432d },
        { u: 0.15, v: 0.38, rx: 0.02, ry: 0.008, color: 0xf2ead8 },
        { u: 0.72, v: 0.34, rx: 0.017, ry: 0.007, color: 0xf2ead8 },
      ],
      ox: 200,
      oy: 55,
    }),
    atmo: { color: 0xe8c8a0, intensity: 0.22 },
  },
  {
    name: "土星",
    radius: 2.7,
    distance: 62,
    speed: 0.006,
    spin: 0.31,
    tilt: 26.73,
    incl: 2.49,
    tex: makeBands({
      palette: [0xd9bd85, 0xefdcb0, 0xe4cf9e, 0xf2e6c8, 0xdcc390, 0xefe0b6, 0xd3b883],
      swirl: 1.0,
      streak: 0.1,
      ox: 320,
      oy: 120,
    }),
    atmo: { color: 0xf0dcae, intensity: 0.18 },
    ring: true,
  },
];

const orbitLines = [];
const labelList = [];
const planets = [];

for (const data of planetData) {
  const planeGroup = new THREE.Group();
  planeGroup.rotation.x = data.incl * DEG;
  planeGroup.rotation.y = (data.distance * 7.3) % (Math.PI * 2);
  scene.add(planeGroup);

  const line = orbitLine(data.distance);
  planeGroup.add(line);
  orbitLines.push(line);

  const pivot = new THREE.Group();
  planeGroup.add(pivot);

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = data.tilt * DEG;
  pivot.add(tiltGroup);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 64, 64),
    data.name === "地球"
      ? new THREE.MeshPhongMaterial({
          map: data.tex.map,
          bumpMap: data.tex.bumpMap,
          bumpScale: 0.04,
          specularMap: data.tex.specMap,
          specular: new THREE.Color(0x5a7dab),
          shininess: 18,
        })
      : new THREE.MeshPhongMaterial({ map: data.tex, shininess: data.radius > 2 ? 4 : 30 })
  );
  tiltGroup.add(mesh);

  let cloudMesh = null;
  if (data.cloud) {
    cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(data.radius * 1.03, 64, 64),
      new THREE.MeshPhongMaterial({
        map: data.tex.cloudMap,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        shininess: 0,
      })
    );
    tiltGroup.add(cloudMesh);
  }

  if (data.atmo) {
    tiltGroup.add(makeAtmosphere(data.radius, data.atmo.color, data.atmo.intensity));
  }

  let moonGroup = null;
  if (data.ring) {
    const inner = data.radius * 1.4;
    const outer = data.radius * 2.5;
    const rg = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = rg.attributes.position;
    const uvAttr = rg.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uvAttr.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    const ring = new THREE.Mesh(
      rg,
      new THREE.MeshBasicMaterial({
        map: makeRing(),
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    tiltGroup.add(ring);
  }

  if (data.name === "地球") {
    moonGroup = new THREE.Group();
    moonGroup.rotation.x = 5.1 * DEG;
    pivot.add(moonGroup);
    const moonOrbit = orbitLine(2.6, 0x8899aa, 0.3);
    moonGroup.add(moonOrbit);
    orbitLines.push(moonOrbit);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 32, 32),
      new THREE.MeshPhongMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 0.02, shininess: 4 })
    );
    moonGroup.add(moon);
  }

  const label = addLabel(data.name);
  label.position.set(0, data.radius + 1.3, 0);
  pivot.add(label);
  labelList.push(label);

  const angle = Math.random() * Math.PI * 2;
  planets.push({ data, pivot, mesh, cloudMesh, moonGroup, moonAngle: Math.random() * Math.PI * 2, angle });
}

document.getElementById("show-orbits").addEventListener("change", (e) => {
  orbitLines.forEach((l) => (l.visible = e.target.checked));
});
document.getElementById("show-labels").addEventListener("change", (e) => {
  labelList.forEach((l) => (l.visible = e.target.checked));
});

import {
  createWorld,
  stepWorld,
  launchManual,
  SPECIES,
  STAR_POS,
  TIERS,
} from "./game/sim.js";
import { createUI } from "./game/ui.js";

const clock = new THREE.Clock();

let game = createWorld({ playerSpecies: "human" });
let gameSpeed = 4;
let simAcc = 0;
let uiAcc = 0;
let fly = null;

const playerCiv = () => game.civs.find((c) => c.id === game.playerCivId);

const solLabelObj = addLabel("☉ 太阳系");
solLabelObj.position.set(0, 10.5, 0);
sunGroup.add(solLabelObj);

const pickables = [];
sunGroup.children[0].userData.starIdx = 0;
pickables.push(sunGroup.children[0]);

const css6 = (n) => "#" + n.toString(16).padStart(6, "0");

const rivalStars = [1, 2, 3].map((idx) => {
  const group = new THREE.Group();
  group.position.set(STAR_POS[idx][0], STAR_POS[idx][1], STAR_POS[idx][2]);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  core.userData.starIdx = idx;
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x9fc4ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(24, 24, 1);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.45, 12, 72),
    new THREE.MeshBasicMaterial({
      color: 0x666677,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = Math.PI / 2 + 22 * DEG;
  const dotsPivot = new THREE.Group();
  const dots = [];
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dotsPivot.add(d);
    dots.push({ m: d, a: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.25, r: 14 + i * 2.2 });
  }
  const lbl = addLabel("✦");
  lbl.position.set(0, 9, 0);
  group.add(core, glow, ring, dotsPivot, lbl);
  scene.add(group);
  pickables.push(core);
  return { idx, group, core, glow, ring, dots, lbl };
});

function updateStarsVisual() {
  const pl = playerCiv();
  const plSp = SPECIES[pl.species];
  solLabelObj.element.textContent = pl.alive
    ? `☉ 太阳系 · ${plSp.icon}${plSp.name} Lv${pl.tier} ${TIERS[pl.tier].tag}`
    : "☉ 太阳系 · ✝ 文明已亡";
  for (const rs of rivalStars) {
    const cid = game.stars[rs.idx].ownerId;
    const civ = game.civs.find((c) => c.id === cid);
    if (!civ || !civ.alive) {
      coreDead(rs);
      continue;
    }
    const sp = SPECIES[civ.species];
    const col = sp.color;
    rs.core.material.color.setHex(col);
    rs.glow.material.color.setHex(col);
    rs.ring.material.color.setHex(civ.home === rs.idx ? col : 0xffcf70);
    rs.lbl.element.textContent = `✦ ${game.stars[rs.idx].name} · ${sp.name}${civ.home === rs.idx ? "" : "(殖)"} Lv${civ.tier} ${TIERS[civ.tier].tag}`;
    const n = civ.tier >= 4 ? Math.min(5, civ.tier - 2) : 0;
    rs.dots.forEach((d, i) => {
      d.m.visible = i < n;
      d.m.material.color.setHex(sp.color);
    });
  }
}

function coreDead(rs) {
  rs.core.material.color.setHex(0x3a3a44);
  rs.glow.material.color.setHex(0x333340);
  rs.ring.material.color.setHex(0x444450);
  rs.lbl.element.textContent = `✝ ${game.stars[rs.idx].name} · 死星`;
  rs.dots.forEach((d) => (d.m.visible = false));
}

const shipViz = new Map();
const tmpV = new THREE.Vector3();

function updateShips() {
  const live = new Set(game.expeditions.map((e) => e.id));
  for (const [id, obj] of shipViz) {
    if (!live.has(id)) {
      scene.remove(obj.s);
      obj.s.material.dispose();
      shipViz.delete(id);
    }
  }
  for (const e of game.expeditions) {
    const from = game.civs.find((c) => c.id === e.from);
    const to = game.civs.find((c) => c.id === e.to);
    if (!from?.alive || !to?.alive) continue;
    let obj = shipViz.get(e.id);
    if (!obj) {
      obj = {
        s: new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: SPECIES[from.species].color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        ),
      };
      obj.s.scale.set(4, 4, 1);
      scene.add(obj.s);
      shipViz.set(e.id, obj);
    }
    const p0 = STAR_POS[from.home];
    const p2 = STAR_POS[to.home];
    const t = e.t;
    const mt = 1 - t;
    const cx = (p0[0] + p2[0]) / 2;
    const cy = (p0[1] + p2[1]) / 2 + 70;
    const cz = (p0[2] + p2[2]) / 2;
    obj.s.position.set(
      mt * mt * p0[0] + 2 * mt * t * cx + t * t * p2[0],
      mt * mt * p0[1] + 2 * mt * t * cy + t * t * p2[1],
      mt * mt * p0[2] + 2 * mt * t * cz + t * t * p2[2]
    );
  }
}

const fxList = [];
const FX_COLORS = {
  war: 0xff4040,
  annex: 0xff5030,
  conquer: 0xff7030,
  siege: 0xff4040,
  trade: 0xffc34d,
  alliance: 0xb07aff,
  defrepel: 0x59d98c,
  probe: 0x66d0ff,
  star: 0x66d0ff,
  tech: 0x7ac8ff,
};
const FX_TAGS = {
  war: "⚔️",
  annex: "🔥",
  conquer: "🔥",
  siege: "💥",
  trade: "🤝",
  alliance: "✨",
  defrepel: "🛡",
  probe: "📡",
  star: "🚀",
  tech: "🔬",
};

function spawnFX(starIdx, kind) {
  const p = STAR_POS[starIdx] ?? [0, 0, 0];
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: FX_COLORS[kind] ?? 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  s.position.set(p[0], p[1], p[2]);
  scene.add(s);
  fxList.push({ s, t: 0 });
  const el = document.createElement("div");
  el.className = "fx-tag";
  el.textContent = (FX_TAGS[kind] ?? "🌟") + " " + (game.stars[starIdx]?.name ?? "");
  const obj = new CSS2DObject(el);
  obj.position.set(p[0], p[1] + 14, p[2]);
  scene.add(obj);
  fxList.push({ obj, t: 0, ttl: 2.6, tag: true });
}

function updateFX(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.t += dt;
    if (f.tag) {
      if (f.t > f.ttl) {
        scene.remove(f.obj);
        fxList.splice(i, 1);
      }
      continue;
    }
    const k = f.t / 1.1;
    if (k >= 1) {
      scene.remove(f.s);
      f.s.material.dispose();
      fxList.splice(i, 1);
    } else {
      const sc = 6 + k * 150;
      f.s.scale.set(sc, sc, 1);
      f.s.material.opacity = 0.85 * (1 - k * k);
    }
  }
}

let banner = null;

function handleEvents(evs) {
  for (const ev of evs) {
    ui.pushLog(ev);
    if (ev.at !== undefined && ["war", "annex", "conquer", "siege", "trade", "alliance", "defrepel", "probe"].includes(ev.kind)) {
      spawnFX(ev.at, ev.kind);
    }
    if (ev.kind === "star" && ev.by) {
      const c = game.civs.find((x) => x.id === ev.by);
      if (c) spawnFX(c.home, "star");
    }
    if (ev.kind === "gameover") {
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "game-banner";
        document.body.appendChild(banner);
      }
      banner.textContent = `☠️ 文明已灭亡 —— 左侧更换种族点击「重开演化」`;
      banner.classList.remove("hidden");
    }
  }
  updateStarsVisual();
}

function flyTo(starIdx) {
  const p = STAR_POS[starIdx];
  const toT = new THREE.Vector3(p[0], p[1], p[2]);
  const wanted = starIdx === 0 ? 160 : 70;
  const dir = new THREE.Vector3(0.5, 0.55, 0.9).normalize();
  fly = {
    fromC: camera.position.clone(),
    toC: toT.clone().add(dir.multiplyScalar(wanted)),
    fromT: controls.target.clone(),
    toT,
    t: 0,
    dur: 1.8,
  };
  controls.autoRotate = false;
  document.getElementById("auto-rotate").checked = false;
}

const ui = createUI({
  speed: 4,
  onSpeed: (v) => (gameSpeed = v),
  onRestart: (key) => {
    game = createWorld({ playerSpecies: key });
    ui.setWorld(game);
    ui.resetLog();
    if (banner) banner.classList.add("hidden");
    for (const [id, obj] of shipViz) {
      scene.remove(obj.s);
      obj.s.material.dispose();
    }
    shipViz.clear();
    handleEvents([]);
    ui.pushLog({ week: 1, kind: "star", text: `🌌 ${SPECIES[key].icon} ${SPECIES[key].name} 的演化史诗开始 —— 先发展科技，达到等级Ⅵ即可解锁星际航行` });
    ui.render();
  },
  onFocus: (civ) => flyTo(civ.home),
  onDiplo: (toId) => {
    const ok = launchManual(game, playerCiv().id, toId);
    if (!ok) ui.pushLog({ week: game.week, kind: "misc", text: "⏳ 无法派遣：需达到【星际航行】等级，或舰队仍在集结（8 周冷却）" });
    return ok;
  },
});
ui.setWorld(game);

let pointerDown = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  const quick = performance.now() - pointerDown.t < 350;
  pointerDown = null;
  if (moved > 6 || !quick) return;
  const ndc = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables, false);
  if (hits.length) flyTo(hits[0].object.userData.starIdx);
});

function updateGame(dt) {
  if (gameSpeed > 0) {
    simAcc += dt * gameSpeed;
    const n = Math.floor(simAcc);
    if (n > 0) {
      simAcc -= n;
      handleEvents(stepWorld(game, n));
    }
  }
  updateShips();
  updateFX(dt);
  uiAcc += dt;
  if (uiAcc > 0.15) {
    uiAcc = 0;
    ui.render();
  }
}

function updateFly(delta) {
  if (!fly) return;
  fly.t = Math.min(1, fly.t + delta / fly.dur);
  const k = fly.t * fly.t * (3 - 2 * fly.t);
  camera.position.lerpVectors(fly.fromC, fly.toC, k);
  controls.target.lerpVectors(fly.fromT, fly.toT, k);
  if (fly.t >= 1) fly = null;
}

let lastPump = performance.now();
function pumpGame() {
  const now = performance.now();
  const dt = Math.min(1, (now - lastPump) / 1000);
  lastPump = now;
  updateGame(dt);
}
setInterval(pumpGame, 120);

updateStarsVisual();
ui.pushLog({ week: 1, kind: "star", text: `🌌 人类文明演化开始 —— 提升科技等级至【星际航行】解锁远征（左侧面板控制时间）` });


function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = delta * speed;

  sunGroup.children[0].rotation.y += t * 0.05;
  sunGroup.children[1].rotation.y -= t * 0.08;
  const pulse = 0.8 + Math.sin(clock.elapsedTime * 2.4) * 0.08;
  sunGroup.children[2].scale.setScalar(34 * pulse);

  for (const p of planets) {
    p.angle += p.data.speed * t;
    p.pivot.position.set(Math.cos(p.angle) * p.data.distance, 0, Math.sin(p.angle) * p.data.distance);
    p.mesh.rotation.y += p.data.spin * t;
    if (p.cloudMesh) p.cloudMesh.rotation.y += p.data.spin * 1.15 * t;
    if (p.moonGroup) {
      p.moonAngle += 0.4 * t;
      p.moonGroup.children[1].position.set(Math.cos(p.moonAngle) * 2.6, 0, Math.sin(p.moonAngle) * 2.6);
      p.moonGroup.children[1].rotation.y = -p.moonAngle;
    }
  }

  stars.rotation.y += t * 0.002;
  updateFly(delta);
  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
