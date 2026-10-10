export const SPECIES = {
  human: {
    name: "人类",
    icon: "🧬",
    color: 0x5aa7ff,
    desc: "好奇心旺盛的探索者，擅长贸易与科研",
    aggression: 0.35,
    commerce: 0.62,
    xenophobia: 0.28,
    curiosity: 0.65,
    growth: 1.0,
    research: 1.0,
    military: 1.0,
  },
  machine: {
    name: "机械族",
    icon: "⚙️",
    color: 0xff5c4d,
    desc: "高效扩张的硅基帝国，崇尚武力",
    aggression: 0.72,
    commerce: 0.3,
    xenophobia: 0.55,
    curiosity: 0.12,
    growth: 1.35,
    research: 1.15,
    military: 1.3,
  },
  swarm: {
    name: "菌毯集群",
    icon: "🍄",
    color: 0x7bd44f,
    desc: "无孔不入的孢子集合体，恐惧一切异族",
    aggression: 0.55,
    commerce: 0.12,
    xenophobia: 0.8,
    curiosity: 0.22,
    growth: 1.75,
    research: 0.75,
    military: 1.05,
  },
  aether: {
    name: "光能族",
    icon: "✨",
    color: 0xc479ff,
    desc: "和平的星际行商，科技远超肉体",
    aggression: 0.05,
    commerce: 0.78,
    xenophobia: 0.1,
    curiosity: 0.8,
    growth: 0.7,
    research: 1.55,
    military: 0.55,
  },
};

export const TIERS = [
  { name: "部落时代", tag: "Ⅰ" },
  { name: "农耕文明", tag: "Ⅱ" },
  { name: "工业时代", tag: "Ⅲ" },
  { name: "核能纪元", tag: "Ⅳ" },
  { name: "宇航时代", tag: "Ⅴ" },
  { name: "星际航行", tag: "Ⅵ" },
  { name: "恒星霸主", tag: "Ⅶ" },
  { name: "银河意识", tag: "Ⅷ" },
];

export const INTERSTELLAR_TIER = 5;

const COSTS = [50, 160, 520, 1500, 4200, 11000, 28000];
const CARRY = TIERS.map((_, t) => 30 * Math.pow(2.35, t));
const STARS = [
  { id: 0, name: "太阳系" },
  { id: 1, name: "织女" },
  { id: 2, name: "北落师门" },
  { id: 3, name: "天狼" },
];

let uid = 1;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function relKey(a, b) {
  return a < b ? a + "|" + b : b + "|" + a;
}

export function createWorld({ playerSpecies = "human", seed = Date.now() % 100000 } = {}) {
  const rng = mulberry32(seed);
  const rivalPool = Object.keys(SPECIES).filter((s) => s !== playerSpecies);

  const civs = [];

  const player = {
    id: uid++,
    name: SPECIES[playerSpecies].name,
    species: playerSpecies,
    home: 0,
    ownedStars: [0],
    tier: 0,
    pop: 8,
    research: 0,
    alive: true,
    lastLaunch: -999,
    colonies: [],
    isPlayer: true,
  };
  civs.push(player);

  const shuffled = [...rivalPool].sort(() => rng() - 0.5);
  for (let i = 0; i < 3; i++) {
    civs.push({
      id: uid++,
      name: SPECIES[shuffled[i]].name,
      species: shuffled[i],
      home: i + 1,
      ownedStars: [i + 1],
      tier: Math.floor(rng() * 2.6),
      pop: 8 * (1 + Math.floor(rng() * 3)),
      research: 0,
      alive: true,
      lastLaunch: -999,
      colonies: [],
      isPlayer: false,
    });
  }

  const world = {
    week: 1,
    civs,
    stars: STARS.map((st) => ({ ...st, ownerId: null })),
    expeditions: [],
    events: [],
    relations: new Map(),
    rng,
    playerCivId: player.id,
    speed: 0,
    acc: 0,
  };
  world.stars.forEach((st) => (st.ownerId = civs.find((c) => c.home === st.id).id));

  rel(world).initAll();
  return world;
}

function rel(world) {
  const api = {
    initAll() {
      for (let i = 0; i < world.civs.length; i++)
        for (let j = i + 1; j < world.civs.length; j++) {
          const a = world.civs[i];
          const b = world.civs[j];
          const xeno =
            (SPECIES[a.species].xenophobia + SPECIES[b.species].xenophobia) / 2;
          world.relations.set(relKey(a.id, b.id), Math.round((0.4 - xeno) * 30 + (world.rng() - 0.5) * 20));
        }
    },
    get(a, b) {
      return world.relations.get(relKey(a, b)) ?? 0;
    },
    set(a, b, v) {
      world.relations.set(relKey(a, b), Math.max(-100, Math.min(100, v)));
    },
    add(a, b, d) {
      api.set(a, b, api.get(a, b) + d);
    },
  };
  return api;
}

const R = rel;

export function milOf(c) {
  return Math.pow(c.pop, 0.4) * (1 + c.tier) * SPECIES[c.species].military;
}

export function nextCost(c) {
  return c.tier < COSTS.length ? COSTS[c.tier] : null;
}

export function tierStatus(c) {
  return c.tier >= INTERSTELLAR_TIER;
}

export function fmtPop(v) {
  if (v >= 100000) return (v / 10000).toFixed(1) + "万亿";
  if (v >= 10000) return (v / 10000).toFixed(2) + "万亿";
  if (v >= 100) return v.toFixed(0) + "亿";
  return v.toFixed(1) + "亿";
}

function pushEvent(world, ev) {
  ev.week = world.week;
  world.events.push(ev);
  if (world.events.length > 200) world.events.shift();
  return ev;
}

function aliveCivs(world) {
  return world.civs.filter((c) => c.alive);
}

function launchChance(c) {
  const sp = SPECIES[c.species];
  return 0.012 + sp.aggression * 0.01 + sp.curiosity * 0.008 + sp.commerce * 0.006;
}

function pickTarget(world, from) {
  const opts = aliveCivs(world).filter((c) => c.id !== from.id && !isAlly(world, from.id, c.id));
  if (!opts.length) return [];
  const sp = SPECIES[from.species];
  const weights = opts.map((t) => {
    const dist = starDist(world, from.home, t.home);
    const mil = milOf(from) / Math.max(1, milOf(t));
    let w =
      1.2 +
      (dist < 450 ? 1 : dist < 700 ? 0.4 : -0.3) +
      (sp.aggression ? (mil > 0.9 ? 1.4 : -0.2) : 0.5) +
      (sp.commerce * (R(world).get(from.id, t.id) > 0 ? 1.2 : 0.2));
    return Math.max(0.15, w);
  });
  return opts.map((t, i) => ({ t, w: weights[i] }));
}

function chooseExpType(world, from, to) {
  const a = SPECIES[from.species];
  const d = SPECIES[to.species];
  const r = R(world).get(from.id, to.id);
  const gap = milOf(from) / Math.max(1, milOf(to));
  let war = 0.55 + a.aggression * 1.7 + a.xenophobia * 0.9 + (gap > 1.1 ? 0.7 : 0) - (r > 25 ? 0.8 : 0);
  let trade = 0.5 + a.commerce * 1.5 + a.curiosity * 0.7 + Math.max(0, r) * 0.02;
  let probe = 0.35 + a.curiosity * 0.8 - a.aggression * 0.2;
  if (d.xenophobia > 0.6) trade *= 0.55;
  if (d.aggression > 0.6) trade *= 0.7;
  if (to.isPlayer) war *= 0.55;
  war = Math.max(0.05, war);
  trade = Math.max(0.05, trade);
  probe = Math.max(0.1, probe);
  const sum = war + trade + probe;
  const roll = world.rng() * sum;
  if (roll < war) return "war";
  if (roll < war + trade) return "trade";
  return "probe";
}

function isAlly(world, a, b) {
  return R(world).get(a, b) >= 60;
}

function starDist(world, sa, sb) {
  const PA = STAR_POS;
  const a = PA[sa];
  const b = PA[sb];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export const STAR_POS = [
  [0, 0, 0],
  [-380, 55, 300],
  [430, -45, -210],
  [-300, -70, -430],
];

function contact(world, atk, def) {
  const type = chooseExpType(world, atk, def);
  const label = SPECIES[atk.species].name;
  const dl = SPECIES[def.species].name;
  if (type === "trade") {
    R(world).add(atk.id, def.id, 18);
    atk.research += atk.pop * 0.05;
    def.research += def.pop * 0.05;
    def.pop *= 1.05;
    pushEvent(world, {
      kind: "trade",
      at: def.home,
      by: atk.id,
      text: `${label} 商队与 ${dl} 达成贸易协定 · 双边经济文化↑ 关系改善`,
    });
    if (R(world).get(atk.id, def.id) >= 60 && SPECIES[atk.species].aggression + SPECIES[def.species].aggression < 0.9) {
      pushEvent(world, {
        kind: "alliance",
        at: def.home,
        text: `🤝 ${label} 与 ${dl} 缔结星际同盟！(关系 ${R(world).get(atk.id, def.id)})`,
      });
    }
  } else if (type === "probe") {
    R(world).add(atk.id, def.id, 4);
    pushEvent(world, {
      kind: "probe",
      at: def.home,
      by: atk.id,
      text: `🛰 ${label} 对 ${dl} 进行远程探测 · 获取少量数据 (关系 ${R(world).get(atk.id, def.id)})`,
    });
  } else {
    resolveWar(world, atk, def);
  }
}

function resolveWar(world, atk, def) {
  const a = SPECIES[atk.species];
  const d = SPECIES[def.species];
  const al = a.name;
  const dl = d.name;
  const pa = milOf(atk) * (0.7 + world.rng() * 0.6);
  const pd = milOf(def) * (0.7 + world.rng() * 0.6) * 1.25;
  if (pa > pd) {
    atk.research += COSTS[Math.min(atk.tier, COSTS.length - 1)] * 0.12;
    R(world).set(atk.id, def.id, -80);
    for (const c of world.civs) if (c.alive && c.id !== atk.id && c.id !== def.id) R(world).add(atk.id, c.id, -12);
    const col = def.ownedStars.find((s) => s !== def.home);
    if (col !== undefined) {
      const idx = def.ownedStars.indexOf(col);
      def.ownedStars.splice(idx, 1);
      world.stars[col].ownerId = atk.id;
      atk.ownedStars.push(col);
      pushEvent(world, {
        kind: "conquer",
        at: col,
        by: atk.id,
        text: `⚔️ ${al} 舰队攻占 ${dl} 殖民地 ${world.stars[col].name}！`,
      });
    } else {
      const home = def.home;
      def.pop *= 0.3;
      world.stars[home].ownerId = atk.id;
      atk.ownedStars.push(home);
      const newHome = def.ownedStars.find((s) => s !== home);
      def.ownedStars = def.ownedStars.filter((s) => s !== home);
      if (newHome !== undefined) {
        def.home = newHome;
        pushEvent(world, {
          kind: "annex",
          at: home,
          by: atk.id,
          text: `🔥 ${al} 攻陷 ${dl} 母星 ${world.stars[home].name}！${dl} 残余迁都至 ${world.stars[newHome].name}`,
        });
      } else {
        def.alive = false;
        pushEvent(world, {
          kind: "annex",
          at: home,
          by: atk.id,
          text: `🔥 ${al} 攻陷 ${dl} 母星 ${world.stars[home].name}，${dl} 就此覆灭`,
        });
        if (def.id === world.playerCivId) pushEvent(world, { kind: "gameover", text: `☠️ 你的文明已被吞并 —— 重开演化可更换种族` });
      }
    }
  } else {
    atk.pop *= 0.68;
    R(world).add(atk.id, def.id, -45);
    pushEvent(world, {
      kind: "defrepel",
      at: def.home,
      by: atk.id,
      text: `🛡 ${dl} 击退了 ${al} 的入侵！${al} 舰队损失 32%`,
    });
  }
}

export function getRelation(world, a, b) {
  return R(world).get(a, b);
}

export function launchManual(world, fromId, toId) {
  const from = world.civs.find((c) => c.id === fromId);
  const to = world.civs.find((c) => c.id === toId);
  if (!from?.alive || !to?.alive) return false;
  if (from.tier < INTERSTELLAR_TIER) return false;
  if (world.week - from.lastLaunch < 8) return false;
  const dist = starDist(world, from.home, to.home);
  const flightWeeks = Math.max(6, Math.round(dist / 30 + world.rng() * 6));
  const type = chooseExpType(world, from, to);
  world.expeditions.push({
    id: uid++, from: from.id, to: to.id, t: 0, flightWeeks, type, launched: true, contacted: false,
  });
  pushEvent(world, {
    kind: "launch",
    by: from.id,
    text: `🛰 你下令：向 ${SPECIES[to.species].name} 派出${type === "war" ? "远征舰队" : type === "trade" ? "外交商队" : "探测器"}（航程 ${flightWeeks} 周）`,
  });
  return true;
}

export function stepWorld(world, weeks) {
  weeks = Math.min(weeks, 160);
  const before = world.events.length;
  for (let w = 0; w < weeks; w++) {
    world.week++;
    for (const c of world.civs) {
      if (!c.alive) continue;
      const sp = SPECIES[c.species];
      const cap = CARRY[c.tier];
      const natGrowth = 0.052 * sp.growth;
      const relBonus = aliveCivs(world).filter((o) => o.id !== c.id && isAlly(world, c.id, o.id)).length * 0.015;
      c.pop = Math.min(cap, c.pop + c.pop * natGrowth * (1 - c.pop / cap) * 2.2 + c.pop * relBonus);
      const allySci = aliveCivs(world).filter((o) => o.id !== c.id && isAlly(world, c.id, o.id)).length * 0.12;
      c.research += (6 + Math.pow(c.pop, 0.7) * 1.25) * (1 + 0.5 * c.tier) * sp.research * (1 + allySci);
      c.colonies = c.ownedStars.filter((s) => s !== c.home);
      while (c.tier < COSTS.length && c.research >= COSTS[c.tier]) {
        c.research -= COSTS[c.tier];
        c.tier++;
        pushEvent(world, {
          kind: "tech",
          by: c.id,
          text: `${sp.icon} ${sp.name} 晋升【${TIERS[c.tier].name}】（文明等级 ${c.tier}）`,
        });
        if (c.tier === INTERSTELLAR_TIER) {
          pushEvent(world, { kind: "star", by: c.id, text: `🚀 ${sp.name} 突破光速壁垒 —— 恒星际航线解锁！` });
        }
      }

      if (c.tier >= INTERSTELLAR_TIER && world.week - c.lastLaunch > 14 && world.rng() < launchChance(c)) {
        const targets = pickTarget(world, c);
        if (targets.length) {
          let sum = 0;
          for (const t of targets) sum += t.w;
          let roll = world.rng() * sum;
          let picked = targets[targets.length - 1].t;
          for (const t of targets) {
            roll -= t.w;
            if (roll <= 0) {
              picked = t.t;
              break;
            }
          }
          if (!isAlly(world, c.id, picked.id) || world.rng() < 0.6) {
            const dist = starDist(world, c.home, picked.home);
            const flightWeeks = Math.max(8, Math.round(dist / 26 + world.rng() * 8));
            c.lastLaunch = world.week;
            const type = chooseExpType(world, c, picked);
            world.expeditions.push({
              id: uid++,
              from: c.id,
              to: picked.id,
              t: 0,
              flightWeeks,
              type,
              launched: true,
              contacted: false,
            });
            pushEvent(world, {
              kind: "launch",
              by: c.id,
              text: `🛸 ${sp.name}·${world.stars[c.home].name} 向 ${SPECIES[picked.species].name}·${world.stars[picked.home].name} 派遣${type === "war" ? "无敌舰队" : type === "trade" ? "商队" : "探测器"}（航程 ${flightWeeks} 周 · 意图:${type === "war" ? "战争" : type === "trade" ? "贸易" : "探测"}）`,
            });
          }
        }
      }

      if (world.rng() < 0.0045) {
        c.pop *= 0.72;
        pushEvent(world, { kind: "misc", by: c.id, text: `⚠️ ${sp.name} 遭遇${c.species === "machine" ? "核心熔毁事故" : "星际瘟疫"}，人口锐减 28%` });
      } else if (world.rng() < 0.0035) {
        c.research += COSTS[Math.min(c.tier, COSTS.length - 1)] * 0.18;
        pushEvent(world, { kind: "misc", by: c.id, text: `💡 ${sp.name} 出现天才学者，科研加速！` });
      }
    }

    for (let i = world.expeditions.length - 1; i >= 0; i--) {
      const exp = world.expeditions[i];
      exp.t += 1 / exp.flightWeeks;
      const from = world.civs.find((x) => x.id === exp.from);
      const to = world.civs.find((x) => x.id === exp.to);
      if (!from?.alive || !to?.alive) {
        world.expeditions.splice(i, 1);
        continue;
      }
      if (exp.t >= 1) {
        contact(world, from, to);
        exp.done = true;
        world.expeditions.splice(i, 1);
      }
    }
  }
  return world.events.slice(before);
}
