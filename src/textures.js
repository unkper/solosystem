import * as THREE from "three";

const PX = 1024;
const PY = 512;
const TABLE = new Float32Array(PX * PY);

(function fillTable() {
  let a = 0x9e3779b9 ^ 1337;
  for (let i = 0; i < TABLE.length; i++) {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    TABLE[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
})();

function lattice(ix, iy) {
  return TABLE[(ix & (PX - 1)) * PY + (iy & (PY - 1))];
}

function fade(a) {
  return a * a * (3 - 2 * a);
}

export function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = lattice(ix, iy);
  const b = lattice(ix + 1, iy);
  const c = lattice(ix, iy + 1);
  const d = lattice(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function fbm(x, y, oct = 4) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * noise2(x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hex = (n) => [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

const nx = (u) => u * PX;
const nv = (v) => v * PY;

function newCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d"), img: c.getContext("2d").createImageData(w, h) };
}

function tex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function makeEarth(size = 1024) {
  const W = size;
  const H = size / 2;
  const base = newCanvas(W, H);
  const bump = newCanvas(W, H);
  const spec = newCanvas(W, H);
  const cloud = newCanvas(W, H);
  const sh = hex(0x3f89c0);
  const dp = hex(0x062a50);
  const iceC = hex(0xddeefa);
  const sand = hex(0xd8c79a);
  const tropical = hex(0x2f6b31);
  const desert = hex(0xb79b68);
  const boreal = hex(0x44613f);
  const rock = hex(0x8b8274);
  const snow = hex(0xf0f4f8);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const latA = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const wx = fbm(nx(u) * 2 + 100, nv(v) + 100, 4) - 0.5;
      const wy = fbm(nx(u) * 2 + 300, nv(v) + 300, 4) - 0.5;
      const e = fbm(nx(u) * 0.03 + wx * 30, nv(v) * 0.015 + wy * 30, 5);
      const idx = (y * W + x) * 4;
      const cap = smoothstep(0.72, 0.82, latA);
      let col;
      let bv;
      let sv;
      if (e < 0.5) {
        const depth = clamp01((0.5 - e) / 0.28);
        col = mix3(sh, dp, depth);
        bv = 0.12;
        sv = 0.85;
      } else {
        const t = clamp01((e - 0.5) / 0.3);
        if (t < 0.05) col = sand;
        else {
          let g = mix3(tropical, boreal, smoothstep(0.14, 0.5, latA));
          const dry = smoothstep(0.2, 0.3, latA) * (1 - smoothstep(0.45, 0.62, latA));
          g = mix3(g, desert, dry * (0.5 + 0.5 * fbm(nx(u) * 0.05 + 500, nv(v) * 0.02 + 500, 3)));
          col = mix3(g, rock, smoothstep(0.55, 0.9, t));
        }
        bv = 0.2 + t * 0.8;
        sv = 0.06;
      }
      col = mix3(col, mix3(iceC, snow, 0.3), cap);
      if (cap > 0.2) {
        sv = lerp(sv, 0.5, cap);
        bv = lerp(bv, 0.4, cap);
      }
      base.img.data[idx] = col[0] * 255;
      base.img.data[idx + 1] = col[1] * 255;
      base.img.data[idx + 2] = col[2] * 255;
      base.img.data[idx + 3] = 255;
      const gr = bv * 255;
      bump.img.data[idx] = bump.img.data[idx + 1] = bump.img.data[idx + 2] = gr;
      bump.img.data[idx + 3] = 255;
      const sp = sv * 255;
      spec.img.data[idx] = spec.img.data[idx + 1] = spec.img.data[idx + 2] = sp;
      spec.img.data[idx + 3] = 255;

      const cu = fbm(nx(u) * 0.04 + 900, nv(v) * 0.02 + 900, 4);
      const cw = (fbm(nx(u) + 1100, nv(v) * 0.5 + 1100, 3) - 0.5) * 40;
      const ca = smoothstep(0.48, 0.62, fbm(nx(u) * 0.03 + cw, nv(v) * 0.015 + cw * 0.5, 5) * (0.75 + 0.25 * Math.sin(latA * Math.PI * 2.2)));
      cloud.img.data[idx] = 255;
      cloud.img.data[idx + 1] = 255;
      cloud.img.data[idx + 2] = 255;
      cloud.img.data[idx + 3] = ca * 235;
    }
  }
  for (const k of [base, bump, spec, cloud]) k.ctx.putImageData(k.img, 0, 0);
  return { map: tex(base.c), bumpMap: tex(bump.c, false), specMap: tex(spec.c, false), cloudMap: tex(cloud.c) };
}

function stopsAt(palette, t) {
  const n = palette.length - 1;
  const s = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const f = fade(s - i);
  return mix3(palette[i], palette[i + 1], f);
}

export function makeBands({ W = 512, H = 256, palette, spots = [], swirl = 1, streak = 0.12, ox = 0, oy = 0 }) {
  const { c, ctx, img } = newCanvas(W, H);
  const cols = palette.map((h) => hex(h));
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp = (fbm(nx(u) * 0.012 + ox, nv(v) * 0.012 + oy, 4) - 0.5) * swirl;
      const bandT = clamp01(v + warp * 0.05);
      let col = stopsAt(cols, bandT);
      const st = fbm(nx(u) * 0.03 + ox + 700, nv(v) * 0.03 + oy + 700, 3) - 0.5;
      col = [col[0] * (1 + st * streak), col[1] * (1 + st * streak), col[2] * (1 + st * streak)];
      for (const sp of spots) {
        const du = (Math.abs(u - sp.u) > 0.5 ? u - sp.u > 0 ? u - sp.u - 1 : u - sp.u + 1 : u - sp.u) / sp.rx;
        const dv = (v - sp.v) / sp.ry;
        const d = du * du + dv * dv;
        if (d < 1) {
          const k = smoothstep(0, 1, (1 - d) * 1.6);
          col = mix3(col, hex(sp.color), k * 0.92);
        }
      }
      const i = (y * W + x) * 4;
      img.data[i] = clamp01(col[0]) * 255;
      img.data[i + 1] = clamp01(col[1]) * 255;
      img.data[i + 2] = clamp01(col[2]) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

export function makeRocky({ W = 512, H = 256, dark, mid, light, maria = true, craters = 150, caps = 0, ox = 0, oy = 0 }) {
  const { c, ctx, img } = newCanvas(W, H);
  const dC = hex(dark);
  const mC = hex(mid);
  const lC = hex(light);
  const capC = hex(0xeef4f8);
  const mMask = [];
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const latA = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let col = mix3(mC, lC, fbm(nx(u) * 0.05 + ox + 200, nv(v) * 0.025 + oy, 4));
      if (maria) {
        const m = fbm(nx(u) * 0.02 + ox + 50, nv(v) * 0.01 + oy, 3);
        if (m < 0.44) col = mix3(col, dC, clamp01(fbm(nx(u) * 0.1 + ox, nv(v) * 0.05 + oy, 3) * (0.44 - m) * 8));
      }
      if (caps > 0) {
        const cap = smoothstep(1 - caps, 1 - caps + 0.1, latA);
        col = mix3(col, capC, cap);
      }
      const i = (y * W + x) * 4;
      img.data[i] = clamp01(col[0]) * 255;
      img.data[i + 1] = clamp01(col[1]) * 255;
      img.data[i + 2] = clamp01(col[2]) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  let a = 4242 + ox * 131;
  const rand = () => {
    a = (a * 1664525 + 1013904223) & 0xffffff;
    return a / 0xffffff;
  };
  for (let k = 0; k < craters; k++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const r = 2 + Math.pow(rand(), 2.4) * W * 0.05;
    const inner = 0.12 + rand() * 0.14;
    const rim = 0.1 + rand() * 0.1;
    const draw = (px) => {
      const g = ctx.createRadialGradient(px, cy, r * 0.2, px, cy, r);
      g.addColorStop(0, `rgba(0,0,0,${inner})`);
      g.addColorStop(0.75, "rgba(0,0,0,0.06)");
      g.addColorStop(0.9, `rgba(255,255,255,${rim})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    draw(cx);
    if (cx < r) draw(cx + W);
    else if (cx > W - r) draw(cx - W);
  }
  return tex(c);
}

export function makeSun(size = 512) {
  const W = size;
  const H = size / 2;
  const { c, ctx, img } = newCanvas(W, H);
  const cool = hex(0xff7a1a);
  const warm = hex(0xffd36b);
  const hot = hex(0xfff2c8);
  const spot = hex(0x8f2f00);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const g = fbm(nx(u) * 0.09, nv(v) * 0.045, 4);
      let col = mix3(cool, warm, smoothstep(0.4, 0.62, g));
      col = mix3(col, hot, smoothstep(0.72, 0.85, g));
      const sm = fbm(nx(u) * 0.02 + 66, nv(v) * 0.01 + 66, 3);
      if (sm < 0.36) col = mix3(col, spot, (0.36 - sm) * 6);
      const i = (y * W + x) * 4;
      img.data[i] = col[0] * 255;
      img.data[i + 1] = col[1] * 255;
      img.data[i + 2] = col[2] * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

export function makeRing(size = 512) {
  const H = 8;
  const { c, ctx, img } = newCanvas(size, H);
  const a = hex(0xd8c8a0);
  const b = hex(0x9c8456);
  const crepe = hex(0x6f5c3c);
  for (let x = 0; x < size; x++) {
    const r = x / size;
    const n = fbm(x * 0.4, 21, 5);
    const n2 = fbm(x * 2.2, 7, 3);
    let alpha = 0.85;
    alpha *= smoothstep(0.0, 0.12, r);
    alpha *= 1 - smoothstep(0.94, 1.0, r);
    if (r > 0.56 && r < 0.63) alpha *= 0.15;
    if (r > 0.86 && r < 0.9) alpha *= 0.5;
    alpha *= 0.5 + n * 0.6;
    const t = n * 0.7 + n2 * 0.3;
    let col = mix3(b, a, t);
    if (r > 0.72 && r < 0.82) col = mix3(col, crepe, 0.5);
    for (let y = 0; y < H; y++) {
      const i = (y * size + x) * 4;
      img.data[i] = col[0] * 255;
      img.data[i + 1] = col[1] * 255;
      img.data[i + 2] = col[2] * 255;
      img.data[i + 3] = clamp01(alpha) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

export function makeGlow(size = 256) {
  const { c, ctx } = newCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,240,200,0.9)");
  g.addColorStop(0.25, "rgba(255,170,60,0.35)");
  g.addColorStop(0.6, "rgba(255,120,20,0.1)");
  g.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return tex(c);
}

export function makeStarDot(size = 32) {
  const { c, ctx } = newCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return tex(c);
}
