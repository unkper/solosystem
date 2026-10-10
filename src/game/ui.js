import { SPECIES, TIERS, fmtPop, getRelation, milOf, nextCost, INTERSTELLAR_TIER } from "./sim.js";

const KIND_CLS = {
  tech: "k-tech",
  star: "k-star",
  trade: "k-trade",
  alliance: "k-ally",
  probe: "k-probe",
  conquer: "k-war",
  annex: "k-war",
  defrepel: "k-def",
  siege: "k-war",
  misc: "k-misc",
  gameover: "k-dead",
  launch: "k-launch",
};

const SPEEDS = [
  { v: 0, label: "⏸" },
  { v: 1, label: "×1" },
  { v: 4, label: "×4" },
  { v: 16, label: "×16" },
  { v: 64, label: "×64" },
];

export function createUI({ speed, onSpeed, onRestart, onFocus, onDiplo }) {
  const root = document.createElement("div");
  root.id = "civ-sidebar";
  root.innerHTML = `
    <div class="civ-card" id="civ-panel">
      <div class="civ-head">
        <span>🛰 文明演化</span>
        <span id="civ-clock">第 1 周</span>
      </div>
      <div class="civ-speed" id="civ-speed"></div>
      <div class="civ-restart">
        <label>扮演</label>
        <select id="civ-species"></select>
        <button id="civ-restart-btn">重开演化</button>
      </div>
      <div class="civ-chips" id="civ-chips"></div>
      <div id="civ-focus"></div>
      <div class="civ-diplo-title">外交 · 派遣远征</div>
      <div id="civ-diplo"></div>
    </div>
    <div class="civ-card" id="civ-log-card">
      <div class="civ-head"><span>📡 事件日志</span></div>
      <div id="civ-log"></div>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const speedBox = $("#civ-speed");
  const chips = $("#civ-chips");
  const focus = $("#civ-focus");
  const diplo = $("#civ-diplo");
  const log = $("#civ-log");
  const clock = $("#civ-clock");
  const sel = $("#civ-species");

  for (const k of Object.keys(SPECIES)) {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = `${SPECIES[k].icon} ${SPECIES[k].name}`;
    sel.appendChild(o);
  }

  let world = null;
  let followId = null;
  let curSpeed = speed ?? 4;

  function renderSpeed() {
    speedBox.innerHTML = "";
    for (const s of SPEEDS) {
      const b = document.createElement("button");
      b.textContent = s.label;
      if (s.v === curSpeed) b.classList.add("on");
      b.onclick = () => {
        curSpeed = s.v;
        renderSpeed();
        onSpeed?.(s.v);
      };
      speedBox.appendChild(b);
    }
  }
  renderSpeed();

  $("#civ-restart-btn").onclick = () => onRestart?.(sel.value);

  function relOfPlayer(c) {
    return getRelation(world, world.playerCivId, c.id);
  }

  function relColor(v) {
    if (v >= 60) return "#59d98c";
    if (v >= 20) return "#8fd0a0";
    if (v > -20) return "#c8c8d0";
    if (v > -60) return "#ff9d5c";
    return "#ff5c5c";
  }

  function render() {
    if (!world) return;
    clock.textContent = `第 ${world.week} 周 · 第 ${Math.floor(world.week / 52) + 1} 年`;
    const f = world.civs.find((c) => c.id === followId) ?? world.civs.find((c) => c.isPlayer);
    followId = f.id;
    chips.innerHTML = "";
    for (const c of world.civs) chips.appendChild(chip(c));
    renderFocus(f);
    renderDiplo(f);
  }

  function chip(c) {
    const sp = SPECIES[c.species];
    const btn = document.createElement("button");
    btn.className = "chip" + (c.id === followId ? " on" : "");
    if (!c.alive) btn.classList.add("dead");
    btn.innerHTML = `<i style="background:#${sp.color.toString(16).padStart(6, "0")}"></i>${sp.icon}${sp.name}<em>${TIERS[c.tier].tag}</em>`;
    btn.onclick = () => {
      followId = c.id;
      onFocus?.(c);
      render();
    };
    return btn;
  }

  function barPct(w, cls) {
    return `<div class="bar"><span style="width:${Math.round(w * 100)}%" class="${cls}"></span></div>`;
  }

  function renderFocus(c) {
    const sp = SPECIES[c.species];
    const cost = nextCost(c);
    const prog = cost ? Math.min(1, c.research / cost) : 1;
    const owned = c.ownedStars.map((s) => world.stars[s].name).join("、");
    focus.innerHTML = `
      <div class="f-head">${sp.icon} <b>${sp.name}</b> · ${TIERS[c.tier].tag} ${TIERS[c.tier].name} ${c.alive ? "" : "☠️已灭亡"}</div>
      <div class="f-sub">${sp.desc}</div>
      <div class="f-row"><span>科研 ${cost ? `→ ${TIERS[Math.min(c.tier + 1, 7)].name}` : "MAX"}</span>${barPct(prog, "fill-sci")}</div>
      <div class="f-grid">
        <div>人口<b>${fmtPop(c.pop)}</b></div>
        <div>军力<b>${Math.round(milOf(c))}</b></div>
        <div>疆域<b>${owned || "—"}</b></div>
        <div>星际<b>${c.tier >= INTERSTELLAR_TIER ? "✅" : "🔒"}</b></div>
      </div>
      <div class="f-traits">
        ${[["侵略", sp.aggression], ["商贸", sp.commerce], ["排斥", sp.xenophobia], ["好奇", sp.curiosity]]
          .map(([n, v]) => `<div class="tr"><span>${n}</span><span class="trv">${Math.round(v * 100)}</span>${barPct(v, "fill-trait")}</div>`)
          .join("")}
      </div>
    `;
  }

  function renderDiplo(followCiv) {
    diplo.innerHTML = "";
    const playerId = world.civs.find((x) => x.isPlayer)?.id;
    const list = world.civs.filter((c) => c.id !== playerId && c.alive);
    if (!list.length) {
      diplo.innerHTML = `<div class="f-sub">已无其他智慧文明 —— 银河归于寂静</div>`;
      return;
    }
    const player = world.civs.find((c) => c.id === playerId);
    for (const c of list) {
      const sp = SPECIES[c.species];
      const r = relOfPlayer(c);
      const canSend = player?.alive && player?.tier >= INTERSTELLAR_TIER;
      const row = document.createElement("div");
      row.className = "d-row";
      row.innerHTML = `
        <i style="background:#${sp.color.toString(16).padStart(6, "0")}"></i>
        <span class="d-name" title="点击飞行">${sp.icon} ${sp.name} · ${TIERS[c.tier].tag}${TIERS[c.tier].name}</span>
        <span class="d-rel" style="color:${relColor(r)}">${r > 0 ? "+" : ""}${r}</span>
        <button class="d-send" ${canSend ? "" : "disabled"}>派遣</button>`;
      row.querySelector(".d-name").onclick = () => onFocus?.(c);
      row.querySelector(".d-send").onclick = () => {
        if (onDiplo?.(c.id)) render();
      };
      diplo.appendChild(row);
    }
  }

  function pushLog(ev) {
    const d = document.createElement("div");
    d.className = "lg " + (KIND_CLS[ev.kind] ?? "k-misc");
    d.innerHTML = `<em>[W${ev.week}]</em> ${ev.text}`;
    log.prepend(d);
    while (log.children.length > 80) log.removeChild(log.lastChild);
    if (ev.kind === "gameover") {
      d.classList.add("flash-dead");
    }
  }

  function resetLog() {
    log.innerHTML = "";
  }

  return {
    setWorld(w) {
      world = w;
      followId = w.playerCivId;
    },
    render,
    pushLog,
    resetLog,
    get curSpeed() {
      return curSpeed;
    },
  };
}
