/* vivosAR — panel de audiencias de vivos de YouTube */
"use strict";
const REPO = "jro-ar/livedata-ar";
const BASE = new URLSearchParams(location.search).get("datos") || `https://raw.githubusercontent.com/${REPO}/datos/`;
const COL = ["#fc2044", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#a3a3a3"];
const COL_CAT = { "Televisión": "#fc2044", "Streaming": "#8b5cf6", "Radio": "#3b82f6", "Noticias y Periodismo": "#10b981", "Gobierno e Institucional": "#f59e0b",
  "Contenido Infantil": "#ec4899", "Deportes": "#06b6d4", "Youtubers": "#84cc16", "Música": "#f97316", "Gaming y Esports": "#a78bfa", "Entretenimiento": "#fb7185",
  "Política y Opinión": "#facc15", "Otros / Especializados": "#6b7280" };
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const ISO2 = (p) => p.toLowerCase();

/* ------------------------------------------------------------ iconos */
const IC = {
  dash: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  cats: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/>',
  tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  film: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/>',
  podium: '<path d="M8 21V11h8v10M2 21v-6h6M16 21v-4h6M2 21h20"/><path d="m12 3 1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 5.3l2-.3z"/>',
  bars: '<path d="M3 3v18h18"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16V5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.050 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
};
const ic = (n, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}">${IC[n] || ""}</svg>`;

const MENU = [
  ["Principal", [["dash", "Dashboard", "dash"], ["explorar", "Explorar", "compass"], ["favoritos", "Favoritos", "star"], ["tendencias", "Tendencias", "trend"]]],
  ["En vivo", [["en-vivo", "Canales en vivo", "radio"], ["pizarra", "Pizarra en vivo", "board"], ["categorias", "Categorías", "cats"], ["finalizados", "Vivos finalizados", "tv"]]],
  ["Rankings", [["vistas", "Visualizaciones", "eye"], ["suscriptores", "Suscriptores", "userplus"], ["videos", "Nuevos videos", "video"]]],
  ["Análisis", [["contenido", "Contenido visto", "film"], ["podios", "Podios globales", "podium"], ["comparar", "Comparar canales", "bars"]]],
];
document.getElementById("menu").innerHTML = MENU.map(([g, items]) => `<div class="grupo">${g}</div>` + items.map(([r, t, i]) => `<a href="#/${r}" data-r="${r}">${ic(i)}${t}</a>`).join("")).join("");
document.getElementById("abajo").innerHTML = [["dash", "Inicio", "home"], ["en-vivo", "En vivo", "radio"], ["favoritos", "Favoritos", "star"], ["tendencias", "Tendencias", "trend"], ["mas", "Más", "more"]]
  .map(([r, t, i]) => `<a href="${r === "mas" ? "javascript:void 0" : "#/" + r}" data-r="${r}">${ic(i)}${t}</a>`).join("");

/* ------------------------------------------------------------ datos */
const cache = {};
async function cargar(ruta, min = 2) {
  const ahora = Date.now();
  if (cache[ruta] && ahora - cache[ruta].t < min * 60000) return cache[ruta].v;
  try {
    const r = await fetch(BASE + ruta + "?v=" + Math.floor(ahora / 60000), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const v = await r.json();
    cache[ruta] = { t: ahora, v };
    return v;
  } catch (e) {
    return cache[ruta] ? cache[ruta].v : null;
  }
}
const D = {
  ahora: () => cargar("ahora.json", 1),
  canales: () => cargar("canales.json", 20),
  paises: () => cargar("paises.json", 600),
  dias: () => cargar("dias.json", 10),
  dia: (p, f) => cargar(`dia/${p}/${f}.json`, f === hoyAR() ? 3 : 600),
  totales: (p) => cargar(`totales/${p}.json`, 5),
  resumen: (p) => cargar(`resumen/${p}.json`, 5),
  heat: (p) => cargar(`heatmap/${p}.json`, 30),
  fin: () => cargar("finalizados.json", 3),
  videos: () => cargar("videos.json", 30),
  records: () => cargar("records.json", 10),
  reciente: () => cargar("reciente_AR.json", 1),
  statsIdx: () => cargar("stats_indice.json", 30),
  stats: (f) => cargar(`stats/${f}.json`, f === hoyAR() ? 30 : 600),
};

/* ------------------------------------------------------------ estado */
const S = {
  get pais() { try { return localStorage.getItem("vz_pais") || "AR"; } catch { return "AR"; } },
  set pais(v) { try { localStorage.setItem("vz_pais", v); } catch {} },
  favs() { try { return JSON.parse(localStorage.getItem("vz_favs") || "[]"); } catch { return []; } },
  esFav(id) { return this.favs().includes(id); },
  alternarFav(id) { let f = this.favs(); f = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; try { localStorage.setItem("vz_favs", JSON.stringify(f)); } catch {} return f.includes(id); },
};

/* ------------------------------------------------------------ utilidades */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function K(n) {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return s + (a / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return s + Math.round(a);
}
const miles = (n) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("es-AR"));
const mas = (n) => (n == null || isNaN(n) ? "—" : (n > 0 ? "+" : "") + miles(n));
const pctNum = (p) => Math.abs(p).toFixed(1).replace(/\.0$/, "");
function delta(p, txt = "vs ayer a esta hora") {
  if (p == null) return `<span class="delta muted">sin datos de ayer</span>`;
  return `<span class="delta ${p >= 0 ? "sube" : "baja"}">${p >= 0 ? "↑" : "↓"} ${pctNum(p)}% ${txt}</span>`;
}
const pct = (a, b) => (b ? Math.round(((a - b) * 1000) / b) / 10 : null);
function hoyAR(off = 0) { return new Date(Date.now() - 3 * 3600e3 - off * 86400e3).toISOString().slice(0, 10); }
const fechaDe = (t) => new Date(t * 60000 - 3 * 3600e3).toISOString().slice(0, 10);
const horaDe = (t) => new Date(t * 60000 - 3 * 3600e3).toISOString().slice(11, 16);
const horaH = (t) => new Date(t * 60000 - 3 * 3600e3).toISOString().slice(11, 13) + "h";
function fechaHora(t) { const s = new Date(t * 60000 - 3 * 3600e3).toISOString(); return s.slice(8, 10) + "/" + s.slice(5, 7) + " " + s.slice(11, 16); }
function dur(min) { if (min == null || isNaN(min) || min < 0) return "—"; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${m}min` : `${m}min`; }
const tAhora = () => Math.floor(Date.now() / 60000);
const thumb = (vid) => `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
const thumbLive = (vid) => `https://i.ytimg.com/vi/${vid}/mqdefault_live.jpg`;
const ytv = (vid) => `https://www.youtube.com/watch?v=${vid}`;
const bandera = (p, cls = "", estilo = "") => (p && p !== "GL" ? `<img class="flag ${cls}" style="${estilo}" src="https://flagcdn.com/w40/${ISO2(p)}.png" alt="" loading="lazy">` : `<span class="flag ${cls}" style="display:grid;place-items:center;background:none;${estilo}">${ic("globe")}</span>`);
function av(c, cls = "") { return c && c.imagen ? `<img class="avatar ${cls}" src="${esc(c.imagen)}" loading="lazy" referrerpolicy="no-referrer" alt="">` : `<span class="avatar ${cls}"></span>`; }
const nom = (c) => (c ? esc(c.nombre || c.handle || c.id) : "?");
const linkCanal = (c, cls = "av28") => (c ? `<a class="celda-canal" href="#/canal/${c.id}">${av(c, cls)}<span>${nom(c)}</span></a>` : "?");
function estrella(id) { const on = S.esFav(id); return `<button class="estrella ${on ? "on" : ""}" data-id="${id}" title="Favorito">${ic("star")}</button>`; }
document.addEventListener("click", (e) => {
  const b = e.target.closest(".estrella");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  b.classList.toggle("on", S.alternarFav(b.dataset.id));
});
const enPais = (p) => (l) => p === "GL" || l.p === p;
const canalEnPais = (p, can) => (cid) => p === "GL" || can[cid]?.pais === p;

async function selectorPais(soloConDatos = true, incluirGlobal = true) {
  const [a, ps] = await Promise.all([D.ahora(), D.paises()]);
  const conDatos = Object.keys(a?.paises || {});
  const lista = Object.entries(ps || { AR: "Argentina" }).filter(([k]) => !soloConDatos || conDatos.includes(k)).sort((x, y) => (a?.paises?.[y[0]]?.total || 0) - (a?.paises?.[x[0]]?.total || 0));
  const p = S.pais;
  return `<span class="select">${bandera(p, "f18", "position:absolute;left:10px;pointer-events:none")}<select id="sel-pais" style="padding-left:40px">${incluirGlobal ? `<option value="GL" ${p === "GL" ? "selected" : ""}>Global</option>` : ""}${lista.map(([k, v]) => `<option value="${k}" ${p === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></span>`;
}
function alCambiarPais(fn) { const s = $("#sel-pais"); if (s) s.onchange = () => { S.pais = s.value; fn(); }; }
async function nombrePais(p) { if (p === "GL") return "Global"; const ps = await D.paises(); return ps?.[p] || p; }

/* datos agregados de un pais (o global) */
function datosPais(a, p) {
  if (!a) return null;
  if (p !== "GL") return a.paises?.[p] || { total: 0, canales: 0, vivos: 0, categorias: {} };
  const out = { total: 0, total_ayer: 0, canales: 0, vivos: 0, pico: 0, pico_t: a.t, pico_ayer: 0, categorias: {} };
  for (const x of Object.values(a.paises || {})) {
    out.total += x.total; out.total_ayer += x.total_ayer || 0; out.canales += x.canales; out.vivos += x.vivos; out.pico += x.pico || 0; out.pico_ayer += x.pico_ayer || 0;
    for (const [k, c] of Object.entries(x.categorias || {})) {
      const o = (out.categorias[k] ||= { viewers: 0, lider: null, lider_v: 0, canales: 0, vivos: 0 });
      o.viewers += c.viewers; o.canales += c.canales; o.vivos += c.vivos;
      if (c.lider_v > o.lider_v) { o.lider = c.lider; o.lider_v = c.lider_v; }
    }
  }
  out.delta_pct = pct(out.total, out.total_ayer); out.pico_delta_pct = pct(out.pico, out.pico_ayer);
  return out;
}

/* tablas ordenables */
function tabla(cols, filas, op = {}) {
  const id = "t" + Math.random().toString(36).slice(2, 8);
  let orden = op.orden ?? null, desc = true;
  const pintar = () => {
    let fs = filas.slice();
    if (orden != null && cols[orden].v) { const c = cols[orden]; fs.sort((a, b) => { const x = c.v(a), y = c.v(b); return (x == null) - (y == null) || (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); }); }
    if (op.limite) fs = fs.slice(0, op.limite);
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = `<table><thead><tr>${cols.map((c, i) => `<th class="${c.n ? "n" : ""} ${c.cls || ""}" data-i="${i}">${c.t}${orden === i ? (desc ? " ↓" : " ↑") : ""}</th>`).join("")}</tr></thead><tbody>${fs.length ? fs.map((f, i) => `<tr>${cols.map((c) => `<td class="${c.n ? "n" : ""} ${c.cls || ""}">${c.h ? c.h(f, i) : esc(c.v(f))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" class="vacio">${op.vacio || "Sin datos todavía"}</td></tr>`}</tbody></table>`;
    $$("th", el).forEach((th) => (th.onclick = () => { const i = +th.dataset.i; if (!cols[i].v) return; if (orden === i) desc = !desc; else { orden = i; desc = true; } pintar(); }));
  };
  setTimeout(pintar);
  return `<div class="tabla-wrap" id="${id}"></div>`;
}

/* graficos */
const graficos = [];
function limpiarGraficos() { while (graficos.length) { try { graficos.pop().destroy(); } catch {} } }
Chart.defaults.color = "#6b7280"; Chart.defaults.borderColor = "rgba(255,255,255,.05)";
Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 10.5;
function grafLineas(id, etiquetas, series, op = {}) {
  const el = document.getElementById(id); if (!el) return;
  const g = new Chart(el, {
    type: "line",
    data: { labels: etiquetas, datasets: series.map((s, i) => { const c = s.color || COL[i % COL.length]; return { label: s.nombre, data: s.datos, borderColor: c,
      backgroundColor: op.area ? (ctx) => { const ch = ctx.chart; const gr = ch.ctx.createLinearGradient(0, 0, 0, ch.height); gr.addColorStop(0, c + "40"); gr.addColorStop(1, c + "00"); return gr; } : c,
      fill: !!op.area, tension: 0.4, cubicInterpolationMode: "monotone", pointRadius: op.puntos ? 3 : etiquetas.length < 4 ? 3 : 0, pointHoverRadius: 4, borderWidth: 2, spanGaps: op.spanGaps ?? true }; }) },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, animation: { duration: 350 },
      plugins: { legend: { display: op.leyenda !== false && series.length > 1, position: op.leyendaPos || "bottom", align: op.leyendaPos === "top" ? "end" : "center", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", padding: 14, color: "#9ca3af" } },
        tooltip: { backgroundColor: "#1a1e26", borderColor: "rgba(255,255,255,.1)", borderWidth: 1, padding: 10, callbacks: { label: (c) => ` ${c.dataset.label}: ${miles(c.parsed.y)}` } } },
      scales: { x: { ticks: { maxTicksLimit: op.maxTicks || 12, maxRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (v) => (v >= 1000 ? Math.round(v / 1000) + "K" : v), maxTicksLimit: 6 }, grid: { color: "rgba(255,255,255,.04)" } } },
    },
  });
  graficos.push(g);
}
function grafDona(id, etiquetas, datos, colores, op = {}) {
  const el = document.getElementById(id); if (!el) return;
  graficos.push(new Chart(el, { type: "doughnut", data: { labels: etiquetas, datasets: [{ data: datos, backgroundColor: colores, borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: op.cutout || "58%", plugins: { legend: { display: !!op.leyenda, position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", padding: 10, color: "#9ca3af" } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${miles(c.parsed)}` } } } } }));
}
function grafBarras(id, etiquetas, datos, op = {}) {
  const el = document.getElementById(id); if (!el) return;
  graficos.push(new Chart(el, { type: "bar", data: { labels: etiquetas, datasets: [{ data: datos, backgroundColor: op.color || "#fc2044", borderRadius: 5, borderWidth: 0, maxBarThickness: 26 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: op.horizontal ? "y" : "x", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + miles(op.horizontal ? c.parsed.x : c.parsed.y) } } },
      scales: { x: { grid: { display: !!op.horizontal, color: "rgba(255,255,255,.04)" }, ticks: op.horizontal ? { callback: (v) => K(v) } : {} }, y: { grid: { display: !op.horizontal, color: "rgba(255,255,255,.04)" }, ticks: op.horizontal ? {} : { callback: (v) => K(v) } } } } }));
}

/* series de espectadores por canal */
async function seriesDias(p, fechas, desdeT = 0) {
  const paises = p === "GL" ? Object.keys((await D.dias()) || {}) : [p];
  const tiempos = new Set(), por = {};
  for (const pp of paises) {
    const dias = (await Promise.all(fechas.map((f) => D.dia(pp, f)))).filter(Boolean);
    for (const dia of dias) for (const m of dia.m) {
      if (m.t < desdeT) continue;
      const tt = Math.round(m.t / 10) * 10; tiempos.add(tt);
      for (const [vid, n] of Object.entries(m.d)) { const cid = dia.vids[vid]?.cid; if (cid) { const o = (por[cid] ||= {}); o[tt] = (o[tt] || 0) + n; } }
    }
  }
  return { tiempos: [...tiempos].sort((a, b) => a - b), por };
}
/* ultimas N horas: Argentina usa la serie de 2 minutos; el resto, la de 10 minutos */
async function seriesRecientes(p, horas, ids = null) {
  const desde = tAhora() - horas * 60;
  if (p === "AR") {
    const r = await D.reciente();
    if (r && r.t.length) {
      const idx = r.t.map((t, i) => [t, i]).filter(([t]) => t >= desde);
      const por = {};
      for (const [cid, vals] of Object.entries(r.c)) { if (ids && !ids.includes(cid)) continue; por[cid] = {}; for (const [t, i] of idx) if (vals[i] != null) por[cid][t] = vals[i]; }
      return { tiempos: idx.map(([t]) => t), por };
    }
  }
  const fechas = [...new Set([fechaDe(desde), hoyAR()])];
  return seriesDias(p, fechas, desde);
}
async function statsEn(diasAtras) {
  const idx = (await D.statsIdx()) || [];
  if (!idx.length) return { fecha: null, datos: {} };
  const obj = hoyAR(diasAtras);
  const f = idx.filter((x) => x <= obj).pop() || idx[0];
  return { fecha: f, datos: (await D.stats(f)) || {} };
}
function sinDatos(msg) {
  $("#vista").innerHTML = `<div class="tarjeta vacio" style="padding:50px"><h3 style="justify-content:center;margin-bottom:8px">Juntando datos…</h3>${msg || "El recolector toma muestras cada 2 a 10 minutos. Si recién se puso en marcha, en unos minutos aparece todo."}</div>`;
}
function itemVivo(l, i, can, color) {
  const c = can?.[l.cid];
  return `<a class="item-vivo" style="${color ? `--c:${color}` : ""}" href="${ytv(l.vid)}" target="_blank" rel="noopener"><span class="pos">${i + 1}</span>
  <span class="mini"><img src="${thumbLive(l.vid)}" onerror="this.onerror=null;this.src='${thumb(l.vid)}'" loading="lazy" alt=""><span class="badge-live">LIVE</span></span>
  <div class="txt"><div class="linea-canal">${av(c, "av18")}<span>${nom(c)}</span></div><div class="tit1" title="${esc(l.titulo)}">${esc(l.titulo)}</div>
  <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><span class="vv">${K(l.viewers)}</span>${l.delta_pct != null ? delta(l.delta_pct) : ""}</div></div></a>`;
}

/* ============================================================ VISTAS */
const V = {};

/* ---------------- Dashboard */
V.dash = async () => {
  const p = S.pais;
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a || !can) return sinDatos();
  const dp = datosPais(a, p), np = await nombrePais(p);
  const lives = a.lives.filter(enPais(p));
  const pc = {}; lives.forEach((l) => (pc[l.cid] = (pc[l.cid] || 0) + l.viewers));
  const top5 = Object.entries(pc).sort((x, y) => y[1] - x[1]).slice(0, 5).map((x) => x[0]);
  const colorDe = {}; top5.forEach((cid, i) => (colorDe[cid] = COL[i]));
  const cats = Object.entries(dp.categorias || {}).sort((x, y) => y[1].viewers - x[1].viewers);
  const pHeat = p === "GL" ? Object.keys((await D.dias()) || {}) : [p];
  const heats = (await Promise.all(pHeat.map((x) => D.heat(x)))).filter(Boolean);
  const hm = {}; heats.forEach((h) => h.forEach((c) => (hm[c.dia + "-" + c.hora] = (hm[c.dia + "-" + c.hora] || 0) + c.prom)));
  const maxH = Math.max(1, ...Object.values(hm));
  let picoH = null; Object.entries(hm).forEach(([k, v]) => { if (!picoH || v > picoH.v) picoH = { k, v }; });
  const [s0, s7] = await Promise.all([statsEn(0), statsEn(7)]);
  const od = (campo) => {
    if (!s0.fecha || s0.fecha === s7.fecha) return [];
    return Object.keys(s0.datos).filter(canalEnPais(p, can)).map((cid) => ({ cid, d: (s0.datos[cid]?.[campo] ?? NaN) - (s7.datos[cid]?.[campo] ?? NaN) })).filter((x) => !isNaN(x.d) && x.d > 0).sort((x, y) => y.d - x.d).slice(0, 3);
  };
  const odCard = (titulo, lista) => `<div class="od-card"><div class="t">${titulo}<span>Ranking</span></div>${lista.length ? `
    <a class="od-uno" href="#/canal/${lista[0].cid}"><span class="r">#1</span>${av(can[lista[0].cid], "av44")}<div style="min-width:0"><div class="nom">${nom(can[lista[0].cid])}</div><div class="val">+${miles(lista[0].d)}</div></div></a>
    ${lista.slice(1).map((x, i) => `<a class="od-fila" href="#/canal/${x.cid}"><span class="p">${i + 2}</span>${av(can[x.cid])}<span>${nom(can[x.cid])}</span><span class="val">+${miles(x.d)}</span></a>`).join("")}` : '<div class="vacio">Se calcula cuando haya 7 días de datos</div>'}</div>`;
  const heatColor = (v) => { if (!v) return "rgba(255,255,255,.02)"; const x = v / maxH; const st = [[0, [30, 27, 46]], [0.45, [91, 33, 182]], [0.75, [192, 38, 211]], [1, [252, 32, 68]]]; let i = 1; while (i < st.length - 1 && x > st[i][0]) i++; const [a0, c0] = st[i - 1], [a1, c1] = st[i]; const f = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * f)).join(",")})`; };
  const ordenDias = [6, 5, 4, 3, 2, 1, 0];

  $("#vista").innerHTML = `
  <div class="cab"><h1>Dashboard</h1>${await selectorPais()}</div>
  <div class="grid g3">
    <div class="tarjeta kpi"><div class="ico">${ic("users")}</div><div><div class="num">${K(dp.total)}</div><div class="lbl">Espectadores ahora</div>${delta(dp.delta_pct)}</div></div>
    <div class="tarjeta kpi"><div class="ico">${ic("flame")}</div><div><div class="num">${K(dp.pico)}</div><div class="lbl">Pico del día · ${dp.pico_t ? horaDe(dp.pico_t) : "—"}</div>${delta(dp.pico_delta_pct)}</div></div>
    <div class="tarjeta kpi"><div class="ico">${ic("radio")}</div><div><div class="num">${dp.canales}</div><div class="lbl">Canales en vivo</div></div></div>
  </div>
  <div class="grid g-dash mt">
    <div class="tarjeta"><div class="tarjeta-cab"><div><h3>Últimas 12 horas</h3><div class="h3sub">Top 5 canales · ${esc(np)}</div></div><div class="der">${bandera(p, "f18")}</div></div>
      <div class="lienzo l380"><div class="marca-agua">vivos<span style="color:var(--primary)">AR</span></div><canvas id="g12"></canvas></div></div>
    <div class="tarjeta" style="display:flex;flex-direction:column"><div class="tarjeta-cab"><h3><span class="dot vivo"></span> En vivo ahora</h3><a class="der" href="#/en-vivo">Ver todos</a></div>
      <div class="lista-vivos" style="max-height:384px">${lives.slice(0, 30).map((l, i) => itemVivo(l, i, can, colorDe[l.cid])).join("") || '<div class="vacio">Nadie en vivo ahora</div>'}</div></div>
  </div>
  <div class="grid g-cat mt">
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Top 3 categorías en vivo</h3></div><div class="top3cat">${cats.slice(0, 3).map(([n, c], i) => `<a class="c ${i === 0 ? "uno" : ""}" href="#/categorias"><span class="n">#${i + 1}</span><span class="nom">${esc(n)}</span><span class="v">${K(c.viewers)}<small>VIEWERS</small></span></a>`).join("") || '<div class="vacio">—</div>'}</div></div>
      <div class="tarjeta"><div class="tarjeta-cab"><div><h3>Horarios más vistos</h3><div class="h3sub">Prom. 30 días · GTM-3</div></div></div>
        <div class="heat">${ordenDias.map((d) => `<div class="y">${DIAS[d]}</div>` + Array.from({ length: 24 }, (_, h) => { const v = hm[d + "-" + h]; return `<div title="${DIAS[d]} ${String(h).padStart(2, "0")}:00 · ${v ? miles(v) + " prom." : "sin datos"}" style="background:${heatColor(v)}"></div>`; }).join("")).join("")}
        <div></div>${Array.from({ length: 24 }, (_, h) => `<div class="x">${h % 3 === 0 ? String(h).padStart(2, "0") + "h" : ""}</div>`).join("")}</div>
        <div class="pill-pico">Pico: <b>${picoH ? DIAS[+picoH.k.split("-")[0]] + " " + String(picoH.k.split("-")[1]).padStart(2, "0") + ":00 · " + K(picoH.v) + " prom." : "—"}</b></div></div>
    </div>
    <div class="tarjeta"><div class="tarjeta-cab"><h3>Viewers por categoría</h3></div>
      <div class="grid" style="grid-template-columns:minmax(0,.9fr) minmax(0,1.2fr);align-items:center"><div class="lienzo l260"><canvas id="gcat"></canvas></div>
      <div class="filas-cat">${cats.slice(0, 9).map(([n, c]) => `<div class="fila-cat"><div><span class="nom">${esc(n)}</span><span class="v">${K(c.viewers)}<small>TOTAL</small></span></div>${c.lider ? `<a class="lider" href="#/canal/${c.lider}">${av(can[c.lider], "av18")}<span>${nom(can[c.lider])}</span><b>${K(c.lider_v)}</b></a>` : ""}</div>`).join("")}</div></div></div>
  </div>
  <div class="tarjeta mt"><div class="tarjeta-cab"><h3>On demand · últimos 7 días</h3></div>
    <div class="grid g3">${odCard("Vistas acumuladas en 7 días", od("vistas"))}${odCard("Suscriptores ganados en 7 días", od("subs"))}${odCard("Videos publicados en 7 días", od("videos"))}</div></div>`;
  alCambiarPais(ruta);
  const { tiempos, por } = await seriesRecientes(p, 12, top5);
  grafLineas("g12", tiempos.map(horaDe), top5.map((cid, i) => ({ nombre: can[cid]?.nombre || cid, datos: tiempos.map((t) => por[cid]?.[t] ?? null), color: COL[i] })), { maxTicks: 13 });
  grafDona("gcat", cats.map((x) => x[0]), cats.map((x) => x[1].viewers), cats.map((x) => COL_CAT[x[0]] || "#6b7280"));
};

/* ---------------- Explorar */
const COORD = { AR: [-64, -34], CO: [-74, 4.6], BR: [-51, -10], ES: [-3.7, 40.4], US: [-98, 39], MX: [-102, 23], CL: [-71, -33], PE: [-75, -9.5], GB: [-2, 54], IN: [78, 21], UY: [-56, -32.8], PY: [-58, -23.4], BO: [-64.7, -16.7], CA: [-100, 56], DO: [-70.2, 18.7], EC: [-78.2, -1.5] };
let mundo = null;
V.explorar = async (detalle) => {
  const [a, can, ps] = await Promise.all([D.ahora(), D.canales(), D.paises()]);
  if (!a) return sinDatos();
  const lista = Object.entries(a.paises).map(([k, x]) => ({ k, ...x, nombre: ps?.[k] || k })).filter((x) => x.vivos).sort((x, y) => y.total - x.total);
  const tot = lista.reduce((s, x) => s + x.total, 0), vivos = lista.reduce((s, x) => s + x.vivos, 0);
  const gcat = datosPais(a, "GL").categorias;
  $("#vista").innerHTML = `<div class="cab"><div><h1>${ic("globe")} Explorar por países</h1><div class="sub">Mapa en vivo · tocá un país para ver detalle y navegar</div></div>
    <div class="der"><span style="display:flex;align-items:center;gap:6px;font-weight:800"><span class="dot vivo"></span>${vivos} <span class="sub">en vivo</span></span><span style="font-weight:800;font-size:15px">${miles(tot)} <span class="sub">viewers</span></span>
    <button class="btn gris" id="btn-cg">${ic("cats")} Categorías globales ▾</button></div></div>
    <div id="cg" class="tarjeta oculto" style="margin-bottom:14px"><div class="filas-cat" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${Object.entries(gcat).sort((x, y) => y[1].viewers - x[1].viewers).map(([n, c]) => `<div class="fila-cat"><div><span class="nom">${esc(n)}</span><span class="v">${K(c.viewers)}<small>TOTAL</small></span></div>${c.lider ? `<a class="lider" href="#/canal/${c.lider}">${av(can?.[c.lider], "av18")}<span>${nom(can?.[c.lider])}</span><b>${K(c.lider_v)}</b></a>` : ""}</div>`).join("")}</div></div>
    <div class="layout-mapa"><div id="mapa"></div><div class="panel-paises" id="panel"></div></div>`;
  $("#btn-cg").onclick = () => $("#cg").classList.toggle("oculto");
  const panelLista = () => {
    $("#panel").innerHTML = `<div class="tarjeta-cab"><h3>Países en vivo</h3><span class="der muted">${lista.length} países</span></div>` + lista.map((x, i) => `<div class="pp" data-p="${x.k}"><span class="r">${i + 1}</span>${bandera(x.k)}<div style="min-width:0;flex:1"><div class="nom">${esc(x.nombre)}</div>
      <div class="l2"><span class="rojo">•${x.vivos} en vivo</span> <b>${K(x.total)} viewers</b></div><div class="l3">${av(can?.[x.top], "av18")}<span>${nom(can?.[x.top])}</span></div></div><span class="chev">${ic("chev")}</span></div>`).join("");
    $$(".pp").forEach((el) => (el.onclick = () => panelPais(el.dataset.p)));
  };
  const panelPais = (k) => {
    const x = lista.find((y) => y.k === k); if (!x) return panelLista();
    const rk = lista.indexOf(x) + 1;
    const lc = Object.entries(x.categorias || {}).sort((a1, b1) => b1[1].viewers - a1[1].viewers)[0];
    const top3 = a.lives.filter((l) => l.p === k).slice(0, 3);
    $("#panel").innerHTML = `<button class="btn gris" id="volver" style="padding:5px 10px;font-size:12px;margin-bottom:12px">${ic("back")} Volver a países</button>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${bandera(k, "", "width:44px;height:30px")}<div><div style="font-weight:800;font-size:18px">${esc(x.nombre)}</div><div style="font-size:13px"><span class="rojo">• ${x.vivos} en vivo</span> <b>${K(x.total)} viewers</b></div></div></div>
      <button class="btn violeta" id="ver-met">${ic("chart")} Ver métricas de ${esc(x.nombre)}</button>
      <div class="bloque" style="margin-top:10px;background:linear-gradient(90deg,rgba(252,32,68,.12),transparent);border-color:rgba(252,32,68,.25)"><span style="font-size:20px;font-weight:800;font-style:italic" class="rojo">#${rk}</span> <span class="sub">en viewers en vivo ahora</span></div>
      <div class="sub" style="text-transform:uppercase;letter-spacing:.06em;font-weight:700;font-size:10.5px;margin:14px 0 8px">Categoría líder ahora</div>
      ${lc ? `<a class="bloque" style="display:flex;align-items:center" href="#/categorias"><div><b>${esc(lc[0])}</b><div class="sub">${K(lc[1].viewers)} viewers · ${lc[1].vivos} vivos</div></div><span class="chev" style="margin-left:auto">${ic("chev")}</span></a>` : ""}
      <div class="sub" style="text-transform:uppercase;letter-spacing:.06em;font-weight:700;font-size:10.5px;margin:14px 0 8px"><span class="dot vivo"></span> Top 3 en vivo</div>
      ${top3.map((l, i) => `<a class="vl" href="${ytv(l.vid)}" target="_blank" rel="noopener"><span class="muted" style="align-self:center;width:14px">${i + 1}</span><span class="mini" style="width:84px;height:47px"><img src="${thumbLive(l.vid)}" onerror="this.onerror=null;this.src='${thumb(l.vid)}'" alt=""><span class="badge-live">LIVE</span></span><div style="min-width:0"><div class="linea-canal">${av(can?.[l.cid], "av18")}<span style="color:var(--t1);font-weight:700">${nom(can?.[l.cid])}</span></div><div class="tit1">${esc(l.titulo)}</div><div style="font-size:11.5px"><span class="vv">${K(l.viewers)} viewers</span> <span class="muted">· ${dur(a.t - l.ini)}</span></div></div></a>`).join("")}`;
    $("#volver").onclick = panelLista;
    $("#ver-met").onclick = () => { S.pais = k; location.hash = "#/dash"; };
  };
  panelLista();
  if (detalle) panelPais(detalle);
  try {
    if (!mundo) mundo = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")).json();
    const el = $("#mapa"); const W = el.clientWidth || 800, H = el.clientHeight || 500;
    const geo = topojson.feature(mundo, mundo.objects.countries);
    geo.features = geo.features.filter((f) => f.id !== "010");
    const marco = { type: "MultiPoint", coordinates: [[-135, -56], [95, 68]] };
    const proj = d3.geoMercator().fitExtent([[0, 0], [W, H]], marco);
    const path = d3.geoPath(proj);
    const maxT = Math.max(1, ...lista.map((x) => x.total));
    const burb = lista.filter((x) => COORD[x.k]).map((x) => { const [px, py] = proj(COORD[x.k]); return { ...x, px, py, r: 5 + 22 * Math.sqrt(x.total / maxT) }; });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${geo.features.map((f) => `<path class="pais" d="${path(f)}"/>`).join("")}
      ${burb.map((b) => `<g data-p="${b.k}" class="grupo-b" style="cursor:pointer"><circle class="anillo" cx="${b.px}" cy="${b.py}" r="${b.r + 7}"/><circle class="anillo" cx="${b.px}" cy="${b.py}" r="${b.r + 14}" stroke-opacity=".15"/><circle class="burbuja" cx="${b.px}" cy="${b.py}" r="${b.r}"/></g>`).join("")}</svg>
      ${(() => { const usadas = []; return burb.slice(0, 8).filter((b) => { const caja = [b.px - 60, b.py - b.r - 62, b.px + 60, b.py - b.r - 10]; const choca = usadas.some((u) => !(caja[2] < u[0] || caja[0] > u[2] || caja[3] < u[1] || caja[1] > u[3])); if (!choca) usadas.push(caja); return !choca; }).map((b) => `<div class="eti-box" style="left:${b.px}px;top:${b.py - b.r}px"><b>${esc(b.nombre)}</b>${K(b.total)} viewers<div class="m">${b.vivos} canales en vivo</div></div>`).join(""); })()}`;
    $$(".grupo-b", el).forEach((g) => (g.onclick = () => panelPais(g.dataset.p)));
  } catch (e) { $("#mapa").innerHTML = '<div class="vacio">No se pudo cargar el mapa</div>'; }
};

/* ---------------- Favoritos */
let ocultarGraf = false;
V.favoritos = async () => {
  const [a, can, fin] = await Promise.all([D.ahora(), D.canales(), D.fin()]);
  if (!can) return sinDatos();
  const ids = S.favs().filter((id) => can[id]);
  const pc = a?.por_canal || {};
  const enVivo = ids.filter((id) => pc[id]);
  const totalV = enVivo.reduce((s, id) => s + pc[id], 0);
  const ult = {}; (fin || []).forEach((f) => { if (ids.includes(f.cid) && !ult[f.cid]) ult[f.cid] = f; });
  const top5 = enVivo.slice().sort((x, y) => pc[y] - pc[x]).slice(0, 5);
  $("#vista").innerHTML = `<div style="max-width:860px;margin:0 auto">
    <div class="cab"><div><h1>Mis favoritos</h1><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><span class="chip">${ids.length} canales</span><span class="chip azul"><span class="dot" style="background:#7aa7ff"></span> ${enVivo.length} en vivo</span><span class="chip rojo">${K(totalV)} viewers</span></div></div>
    <div class="der"><button class="ojo" id="ojo" title="Mostrar u ocultar gráfico">${ic("eye")}</button></div></div>
    ${ids.length ? `<div id="bloque-g" class="${ocultarGraf ? "oculto" : ""}"><div class="tarjeta-cab" style="margin-bottom:8px"><div><h3 style="font-size:15px">Espectadores — últimas 12 h</h3><div class="h3sub">Top 5 canales por espectadores actuales</div></div><div class="der"><span class="verde" style="display:flex;align-items:center;gap:5px;font-weight:600"><span class="dot verde"></span>En vivo</span><span class="muted">actualizado ${a ? horaDe(a.t) : "—"}</span></div></div>
    <div class="tarjeta">${top5.length ? '<div class="lienzo l260"><canvas id="gf"></canvas></div>' : '<div class="vacio">Ninguno de tus favoritos está en vivo ahora</div>'}</div></div>
    <h3 style="font-size:15px;margin:22px 0 10px">Canales</h3>
    <div class="tarjeta" style="padding:6px 8px">${tabla([
      { t: "Canal", v: (id) => can[id].nombre, h: (id) => `<div style="display:flex;align-items:center;gap:6px">${estrella(id)}${linkCanal(can[id])}</div>` },
      { t: "Estado", v: (id) => pc[id] || 0, h: (id) => (pc[id] ? `<span class="estado"><span class="dot vivo"></span><span class="rojo">En vivo · ${K(pc[id])}</span></span>` : '<span class="estado muted"><span class="dot" style="background:#4b5563"></span>Offline</span>') },
      { t: "Último vivo", n: 1, v: (id) => (pc[id] ? 1e12 : ult[id]?.fin || 0), h: (id) => (pc[id] ? '<span class="rojo">Ahora</span>' : ult[id] ? `<span class="sub">${fechaHora(ult[id].fin)}</span>` : '<span class="muted">—</span>') },
    ], ids, { orden: 1 })}</div>` : `<div class="tarjeta vacio" style="padding:46px">${ic("star")}<div style="margin-top:10px">Todavía no marcaste favoritos.<br>Tocá la ☆ en la página de cualquier canal.</div></div>`}</div>`;
  const o = $("#ojo"); if (o) o.onclick = () => { ocultarGraf = !ocultarGraf; $("#bloque-g")?.classList.toggle("oculto", ocultarGraf); };
  if (top5.length) {
    const p = top5.every((id) => can[id].pais === "AR") ? "AR" : "GL";
    const { tiempos, por } = await seriesRecientes(p, 12, top5);
    grafLineas("gf", tiempos.map(horaH), top5.map((id, i) => ({ nombre: can[id].handle || can[id].nombre, datos: tiempos.map((t) => por[id]?.[t] ?? null), color: COL[i] })), { area: true, leyendaPos: "top", maxTicks: 7 });
  }
};

/* ---------------- Tendencias */
V.tendencias = async () => {
  const p = S.pais;
  const [a, can, rec, vt, diasIdx] = await Promise.all([D.ahora(), D.canales(), D.records(), cargar(`videos_top/${p}.json`, 30), D.dias()]);
  if (!a || !can) return sinDatos();
  const lives = a.lives.filter(enPais(p));
  const hayHistoria = (diasIdx?.[p === "GL" ? "AR" : p] || []).length >= 3;
  const t = a.t;
  const ascenso = lives.map((l) => { const base = l.v1h != null ? l.v1h : t - l.ini <= 60 ? 0 : null; return base == null ? null : { l, g: l.viewers - base, pc: base ? pct(l.viewers, base) : null }; }).filter((x) => x && x.g > 0).sort((x, y) => y.g - x.g).slice(0, 12);
  const mg = lives.filter((l) => l.mg2h > 0).sort((x, y) => y.mg2h - x.mg2h).slice(0, 12);
  const recien = lives.filter((l) => t - l.ini <= 20).sort((x, y) => y.viewers - x.viewers).slice(0, 12);
  const pcv = {}; lives.forEach((l) => (pcv[l.cid] = (pcv[l.cid] || 0) + l.viewers));
  const maximo = Object.entries(pcv).map(([cid, n]) => ({ cid, n, r: Math.max(n, rec?.[cid] || n), f: n / Math.max(n, rec?.[cid] || n) })).filter((x) => hayHistoria && x.f >= 0.5 && x.r >= 100).sort((x, y) => y.f - x.f).slice(0, 12);
  const durCanal = (cid) => { const l = lives.find((x) => x.cid === cid); return l ? dur(t - l.ini) : ""; };
  const explot = (vt?.explotando || []).slice(0, 12).map((v) => ({ v, g: v.g7 }));
  const shorts = (vt?.shorts || []).slice(0, 12).map((v) => ({ v, g: v.g7 }));
  const sec = (icono, titulo, sub, html) => `<div class="seccion-t"><div class="st"><span>${icono}</span>${titulo} ${ic("info", "info-i")}</div><div class="ss">${sub}</div><div class="fila-h">${html || '<div class="vacio" style="width:100%">Nada por ahora</div>'}</div></div>`;
  const cabC = (cid, d) => `<div class="cab-c">${av(can[cid], "av28")}<div style="min-width:0"><div class="nom">${nom(can[cid])}</div><div class="d">${d}</div></div></div>`;
  $("#vista").innerHTML = `<div class="cab"><h1>${ic("trend")} Tendencias</h1></div><div class="filtros"><span class="etq">País</span>${await selectorPais(true, true)}</div>
  ${sec("🔥", "En ascenso", "Vivos creciendo ahora mismo", ascenso.map((x) => `<a class="ct" style="--c:var(--verde)" href="${ytv(x.l.vid)}" target="_blank" rel="noopener">${cabC(x.l.cid, dur(t - x.l.ini))}<div class="grande verde">+${miles(x.g)}</div><div class="lbl">viewers en 1h</div><div class="pie">${K(x.l.viewers)} actuales ${x.pc != null ? `· <span class="pct">+${pctNum(x.pc)}%</span>` : ""}</div></a>`).join(""))}
  ${sec("❤️", "MG al rojo", "Más megustas ganados en las últimas 2h", mg.map((l) => `<a class="ct" style="--c:var(--rosa)" href="${ytv(l.vid)}" target="_blank" rel="noopener">${cabC(l.cid, dur(t - l.ini))}<div class="grande rosa">+${miles(l.mg2h)}</div><div class="lbl">MG en ${l.mg2h_min && l.mg2h_min < 110 ? dur(l.mg2h_min) : "2h"}</div><div class="pie">${(l.mg2h / Math.max(1, l.viewers) * 1000).toFixed(1).replace(".", ",")} c/1k viewers · ${K(l.viewers)} viewers</div></a>`).join(""))}
  ${sec("⚡", "Recién arrancaron", "Lives iniciados en los últimos 20 min", recien.map((l) => `<a class="ct" style="--c:var(--azul)" href="${ytv(l.vid)}" target="_blank" rel="noopener"><div class="cab-c">${av(can[l.cid], "av28")}<div style="min-width:0"><div class="nom">${nom(can[l.cid])}</div><span class="pill-t">hace ${Math.max(1, t - l.ini)} min</span></div></div><div class="grande azul">${K(l.viewers)}</div><div class="lbl">viewers ahora</div><div class="tt">${esc(l.titulo)}</div></a>`).join(""))}
  ${sec("🏆", "Cerca de su máximo", "Canales cerca de su pico histórico" + (hayHistoria ? "" : " · se calcula cuando haya 3 días de datos"), maximo.map((x) => `<a class="ct" style="--c:var(--amarillo)" href="#/canal/${x.cid}">${cabC(x.cid, durCanal(x.cid))}<div class="grande amarillo">${Math.round(x.f * 100)}%</div><div class="lbl">del récord histórico</div><div class="barrita"><div style="width:${Math.round(x.f * 100)}%"></div></div><div class="pie">${K(x.n)} / ${K(x.r)}</div></a>`).join(""))}
  ${sec("🎬", "Videos explotando", "Más vistas en los últimos 7 días", explot.map((x) => `<a class="vid-c" href="${ytv(x.v.vid)}" target="_blank" rel="noopener"><div class="th"><img src="${thumb(x.v.vid)}" loading="lazy" alt=""></div><div class="cuerpo"><span class="gan">+${K(x.g)} en 7d</span><div class="tit3">${esc(x.v.titulo)}</div><div class="linea-canal" style="margin-top:6px">${av(can[x.v.cid], "av18")}<span>${nom(can[x.v.cid])}</span></div></div></a>`).join(""))}
  ${sec("📱", "Shorts virales", "Más vistas en los últimos 7 días", shorts.map((x) => `<a class="vid-c short" href="https://www.youtube.com/shorts/${x.v.vid}" target="_blank" rel="noopener"><div class="th"><img src="https://i.ytimg.com/vi/${x.v.vid}/oar2.jpg" onerror="this.onerror=null;this.src='${thumb(x.v.vid)}'" loading="lazy" alt=""></div><div class="cuerpo"><span class="gan">+${K(x.g)} en 7d</span><div class="tit3">${esc(x.v.titulo)}</div><div class="linea-canal" style="margin-top:6px">${av(can[x.v.cid], "av18")}<span>${nom(can[x.v.cid])}</span></div></div></a>`).join(""))}`;
  alCambiarPais(ruta);
};

/* ---------------- Canales en vivo */
let ocultarGrafVivo = false;
V["en-vivo"] = async () => {
  const p = S.pais;
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a || !can) return sinDatos();
  const cat = sessionStorage.getItem("vz_cat") || "";
  const lives = a.lives.filter(enPais(p)).filter((l) => !cat || can[l.cid]?.cat === cat);
  const pc = {}; lives.forEach((l) => (pc[l.cid] = (pc[l.cid] || 0) + l.viewers));
  const orden = Object.entries(pc).sort((x, y) => y[1] - x[1]);
  const tot = lives.reduce((s, l) => s + l.viewers, 0);
  const cats = {}; lives.forEach((l) => { const c = can[l.cid]?.cat || "Otros / Especializados"; cats[c] = (cats[c] || 0) + l.viewers; });
  const co = Object.entries(cats).sort((x, y) => y[1] - x[1]);
  const todasCats = [...new Set(Object.values(can).map((c) => c.cat))].sort();
  $("#vista").innerHTML = `<div class="layout-vivo"><div style="min-width:0">
    <div class="cab"><div><h1><span class="dot vivo"></span> Canales en vivo</h1><div class="sub">${orden.length} canal${orden.length === 1 ? "" : "es"} en vivo · <b class="rojo">${miles(tot)}</b> viewers</div></div><div class="der"><button class="ojo" id="ojo" title="Ocultar gráficos">${ic("eye")}</button></div></div>
    <div class="filtros" style="justify-content:flex-end"><span class="etq">País</span>${await selectorPais(true, true)}<span class="etq">Categoría</span><span class="select"><select id="sel-cat"><option value="">Todas</option>${todasCats.map((c) => `<option ${c === cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></span></div>
    <div id="graf-vivo" class="grid ${ocultarGrafVivo ? "oculto" : ""}" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);margin-bottom:14px">
      <div class="tarjeta"><div class="tarjeta-cab"><h3 style="font-size:12.5px">Top 5 en vivo · últimas 6 horas</h3></div><div class="lienzo l220"><canvas id="g6"></canvas></div></div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3 style="font-size:12.5px">Categorías en vivo</h3></div><div class="lienzo l220"><canvas id="gc"></canvas></div></div></div>
    <div class="grid-canales">${orden.map(([cid, n], i) => `<a class="cc ${i < 5 ? "top" : ""}" style="--c:${COL[i] || "transparent"}" href="#/canal/${cid}">${S.esFav(cid) ? '<span class="fav">★</span>' : ""}${av(can[cid], "av44")}<div style="min-width:0"><div class="nom">${nom(can[cid])}</div><div class="v">${K(n)}</div></div></a>`).join("") || '<div class="vacio">Nadie en vivo con este filtro</div>'}</div>
  </div>
  <div class="tarjeta lateral"><div class="tarjeta-cab"><h3><span class="dot vivo"></span> Vivos ahora <span class="chip rojo" style="font-size:9.5px;padding:1px 6px">EN VIVO</span></h3><span class="der chip">${Math.min(100, lives.length)}</span></div>
    <div class="lista-vivos" style="gap:0">${lives.slice(0, 100).map((l) => `<a class="vl" href="${ytv(l.vid)}" target="_blank" rel="noopener"><span class="mini"><img src="${thumbLive(l.vid)}" onerror="this.onerror=null;this.src='${thumb(l.vid)}'" loading="lazy" alt=""><span class="badge-dur">${dur(a.t - l.ini)}</span></span><div style="min-width:0"><div class="tit2">${esc(l.titulo)}</div><div style="margin-top:3px"><span class="vv">${K(l.viewers)}</span><span class="pico">pico ${K(l.pico)}</span></div></div></a>`).join("")}</div></div></div>`;
  alCambiarPais(ruta);
  $("#sel-cat").onchange = (e) => { sessionStorage.setItem("vz_cat", e.target.value); ruta(); };
  $("#ojo").onclick = () => { ocultarGrafVivo = !ocultarGrafVivo; $("#graf-vivo").classList.toggle("oculto", ocultarGrafVivo); };
  const top5 = orden.slice(0, 5).map((x) => x[0]);
  const { tiempos, por } = await seriesRecientes(p, 6, top5);
  const paso = Math.max(1, Math.round(tiempos.length / 12)); const tt = tiempos.filter((_, i) => i % paso === 0 || i === tiempos.length - 1);
  grafLineas("g6", tt.map(horaH), top5.map((cid, i) => ({ nombre: can[cid]?.nombre, datos: tt.map((x) => por[cid]?.[x] ?? null), color: COL[i] })), { puntos: true, maxTicks: 7 });
  grafDona("gc", co.map((x) => x[0]), co.map((x) => x[1]), co.map((x) => COL_CAT[x[0]] || "#6b7280"), { leyenda: true, cutout: "55%" });
};

/* ---------------- Pizarra en vivo (varios vivos a la vez) */
let pzTimer = null, pzAntes = {};
const GRILLAS = { "1x2": [2, 1], "2x2": [2, 2], "2x3": [3, 2], "3x2": [2, 3], "3x3": [3, 3] };
const GRILLA_TXT = { "1x2": "1 × 2", "2x2": "2 × 2", "2x3": "2 × 3", "3x2": "3 × 2", "3x3": "3 × 3" };
V.pizarra = async () => {
  const p = S.pais;
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a || !can) return sinDatos();
  let g = localStorage.getItem("vz_pz_g") || "2x2"; if (!GRILLAS[g]) g = "2x2";
  const [cols, filas] = GRILLAS[g], n = cols * filas;
  const lives = a.lives.filter(enPais(p));
  const mejor = {}; lives.forEach((l) => { if (!mejor[l.cid] || l.viewers > mejor[l.cid].viewers) mejor[l.cid] = l; });
  const orden = Object.values(mejor).sort((x, y) => y.viewers - x.viewers).map((l) => l.cid);
  let sel = []; try { sel = JSON.parse(localStorage.getItem("vz_pz") || "[]"); } catch {}
  sel = sel.filter((cid) => mejor[cid]);
  for (const cid of orden) { if (sel.length >= n) break; if (!sel.includes(cid)) sel.push(cid); }
  sel = sel.slice(0, n);
  const guardar = () => { try { localStorage.setItem("vz_pz", JSON.stringify(sel)); } catch {} };
  guardar();
  const opciones = (actual) => orden.map((cid) => `<option value="${cid}" ${cid === actual ? "selected" : ""}>${nom(can[cid])} · ${K(mejor[cid].viewers)}</option>`).join("");
  const cifra = (cid) => { const v = mejor[cid]?.viewers || 0, ant = pzAntes[cid]; const f = ant == null || ant === v ? "" : ant < v ? '<span class="sube">▲</span>' : '<span class="baja">▼</span>'; return `${f} <b class="rojo">${miles(v)}</b> <span class="dot vivo" style="width:6px;height:6px"></span>`; };
  const tile = (cid, i) => `<div class="pz-tile" data-i="${i}"><div class="pz-cab"><span class="select pz-sel"><select data-i="${i}">${opciones(cid)}</select></span>
      <button class="pz-fl" data-i="${i}" data-d="-1" title="Anterior">◀</button><button class="pz-fl" data-i="${i}" data-d="1" title="Siguiente">▶</button><span class="pz-v" data-cid="${cid}">${cifra(cid)}</span></div>
      <div class="pz-video"><iframe src="https://www.youtube-nocookie.com/embed/${mejor[cid].vid}?autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div></div>`;
  $("#vista").innerHTML = `<div class="cab"><h1>Pizarra en vivo</h1><div class="der">${await selectorPais(true, false)}<span class="select"><select id="pz-g">${Object.keys(GRILLAS).map((k) => `<option value="${k}" ${k === g ? "selected" : ""}>${GRILLA_TXT[k]}</option>`).join("")}</select></span><button class="btn gris" id="pz-nueva">Nueva ventana</button></div></div>
    ${sel.length ? `<div class="pz-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${sel.map(tile).join("")}</div>` : '<div class="tarjeta vacio">Nadie en vivo ahora</div>'}`;
  const cambiar = (i, cid) => {
    sel[i] = cid; guardar();
    const el = $(`.pz-tile[data-i="${i}"]`); if (el) el.outerHTML = tile(cid, i);
    enlazar();
  };
  const enlazar = () => {
    $$(".pz-sel select").forEach((s) => (s.onchange = () => cambiar(+s.dataset.i, s.value)));
    $$(".pz-fl").forEach((b) => (b.onclick = () => { const i = +b.dataset.i; const pos = orden.indexOf(sel[i]); let k = pos; do { k = (k + +b.dataset.d + orden.length) % orden.length; } while (sel.includes(orden[k]) && orden.length > sel.length && k !== pos); cambiar(i, orden[k]); }));
  };
  enlazar();
  $("#pz-g").onchange = (e) => { localStorage.setItem("vz_pz_g", e.target.value); ruta(); };
  $("#pz-nueva").onclick = () => window.open(location.href, "_blank", "width=1280,height=760");
  alCambiarPais(ruta);
  Object.entries(mejor).forEach(([cid, l]) => (pzAntes[cid] = l.viewers));
  clearInterval(pzTimer);
  pzTimer = setInterval(async () => {
    if (!location.hash.startsWith("#/pizarra")) return clearInterval(pzTimer);
    const a2 = await D.ahora(); if (!a2) return;
    const m2 = {}; a2.lives.forEach((l) => { if (!m2[l.cid] || l.viewers > m2[l.cid].viewers) m2[l.cid] = l; });
    $$(".pz-v").forEach((el) => { const cid = el.dataset.cid; if (m2[cid]) { mejor[cid].viewers = m2[cid].viewers; el.innerHTML = cifra(cid); pzAntes[cid] = m2[cid].viewers; } });
  }, 60000);
};

/* ---------------- Categorías */
function heatmapHTML(hm, sufijo = "prom.") {
  const vals = Object.values(hm); const maxH = Math.max(1, ...vals);
  let pico = null; Object.entries(hm).forEach(([k, v]) => { if (!pico || v > pico.v) pico = { k, v }; });
  const color = (v) => { if (!v) return "rgba(255,255,255,.02)"; const x = v / maxH; const st = [[0, [30, 27, 46]], [0.45, [91, 33, 182]], [0.75, [192, 38, 211]], [1, [252, 32, 68]]]; let i = 1; while (i < st.length - 1 && x > st[i][0]) i++; const [a0, c0] = st[i - 1], [a1, c1] = st[i]; const f = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * f)).join(",")})`; };
  const html = `<div class="heat">${[6, 5, 4, 3, 2, 1, 0].map((d) => `<div class="y">${DIAS[d]}</div>` + Array.from({ length: 24 }, (_, h) => { const v = hm[d + "-" + h]; return `<div title="${DIAS[d]} ${String(h).padStart(2, "0")}:00 · ${v ? miles(v) + " " + sufijo : "sin datos"}" style="background:${color(v)}"></div>`; }).join("")).join("")}
    <div></div>${Array.from({ length: 24 }, (_, h) => `<div class="x">${h % 3 === 0 ? String(h).padStart(2, "0") + "h" : ""}</div>`).join("")}</div>`;
  return { html, pico };
}
function catStats(a, can, p) {
  const cats = {};
  a.lives.filter(enPais(p)).forEach((l) => {
    const c = can[l.cid]?.cat || "Otros / Especializados";
    const o = (cats[c] ||= { viewers: 0, vivos: 0, canales: new Set(), lider: null, ayer: 0 });
    o.viewers += l.viewers; o.vivos++; o.canales.add(l.cid);
    if (!o.lider || l.viewers > o.lider.viewers) o.lider = l;
  });
  Object.entries(a.por_canal_ayer || {}).forEach(([cid, n]) => { const c = can[cid]; if (!c || (p !== "GL" && c.pais !== p)) return; if (cats[c.cat]) cats[c.cat].ayer += n; });
  return cats;
}
V.categorias = async (arg) => (arg ? catDetalle(decodeURIComponent(arg)) : catLista());
async function catLista() {
  const p = S.pais;
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a || !can) return sinDatos();
  const cats = Object.entries(catStats(a, can, p)).sort((x, y) => y[1].viewers - x[1].viewers);
  $("#vista").innerHTML = `<div class="cab"><div><h1>${ic("cats")} Categorías en vivo</h1><div class="sub">Explorá los canales en vivo agrupados por categoría · <a href="#/dash" class="rojo">Ver resumen de ${esc(await nombrePais(p))}</a></div></div><div class="der">${await selectorPais()}</div></div>
  <div class="grid-cats">${cats.map(([n, c]) => `<a class="cat-card" href="#/categorias/${encodeURIComponent(n)}" style="--c:${COL_CAT[n] || "#6b7280"}"><div class="cat-nom">${esc(n)}</div>
    <div class="cat-l2"><span class="rojo">• ${c.vivos} en vivo</span> <b>${K(c.viewers)} viewers</b></div>${c.ayer ? delta(pct(c.viewers, c.ayer)) : '<span class="delta muted">sin datos de ayer</span>'}
    <div class="cat-lider">${av(can[c.lider.cid], "av28")}<div style="min-width:0"><div class="nom">${nom(can[c.lider.cid])}</div><div class="tt">${esc(c.lider.titulo)}</div></div></div></a>`).join("") || '<div class="tarjeta vacio">Nadie en vivo ahora</div>'}</div>`;
  alCambiarPais(ruta);
}
async function catDetalle(cat) {
  const p = S.pais;
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a || !can) return sinDatos();
  const c = catStats(a, can, p)[cat] || { viewers: 0, vivos: 0, canales: new Set(), lider: null, ayer: 0 };
  const lives = a.lives.filter(enPais(p)).filter((l) => (can[l.cid]?.cat || "Otros / Especializados") === cat);
  const pc = {}; lives.forEach((l) => (pc[l.cid] = (pc[l.cid] || 0) + l.viewers));
  const top5 = Object.entries(pc).sort((x, y) => y[1] - x[1]).slice(0, 5).map((x) => x[0]);
  const pHeat = p === "GL" ? Object.keys((await D.dias()) || {}) : [p];
  const hm = {}; (await Promise.all(pHeat.map((x) => cargar(`heatmap_cat/${x}.json`, 30)))).filter(Boolean).forEach((h) => (h[cat] || []).forEach((x) => (hm[x.dia + "-" + x.hora] = (hm[x.dia + "-" + x.hora] || 0) + x.prom)));
  const { html, pico } = heatmapHTML(hm);
  const L = c.lider;
  $("#vista").innerHTML = `<a href="#/categorias" class="sub" style="display:inline-flex;align-items:center;gap:4px">${ic("back")} Categorías</a>
  <div class="cab" style="margin-top:6px"><h1>${esc(cat)}</h1><div class="der">${await selectorPais()}</div></div>
  <div class="grid g3">
    <div class="tarjeta kpi"><div class="ico">${ic("users")}</div><div><div class="num">${K(c.viewers)}</div><div class="lbl">Espectadores ahora</div>${c.ayer ? delta(pct(c.viewers, c.ayer)) : '<span class="delta muted">sin datos de ayer</span>'}</div></div>
    <div class="tarjeta kpi"><div class="ico">${ic("radio")}</div><div><div class="num">${c.vivos}</div><div class="lbl">Transmisiones en vivo</div></div></div>
    <div class="tarjeta" style="display:flex;flex-direction:column;justify-content:center"><div class="sub" style="font-size:11px">Canal más visto ahora</div>${L ? `<div style="display:flex;align-items:center;gap:10px;margin-top:6px">${av(can[L.cid], "av36")}<div style="min-width:0;flex:1"><b>${nom(can[L.cid])}</b><div class="tit1" style="font-weight:500;color:var(--t2)">${esc(L.titulo)}</div></div><a class="rojo" style="font-weight:700;white-space:nowrap" href="${ytv(L.vid)}" target="_blank" rel="noopener">Ver vivo</a></div>` : '<div class="muted">—</div>'}</div>
  </div>
  <div class="tarjeta mt"><div class="tarjeta-cab"><div><h3>Últimas 12 horas</h3><div class="h3sub">Top 5 canales · ${esc(cat)} · ${esc(await nombrePais(p))}</div></div><div class="der">${bandera(p, "f18")}</div></div><div class="lienzo"><div class="marca-agua">vivos<span style="color:var(--primary)">AR</span></div><canvas id="gcat12"></canvas></div></div>
  <div class="grid g-dash mt">
    <div class="tarjeta"><div class="tarjeta-cab"><div><h3>Actividad semanal</h3><div class="h3sub">Promedio de viewers por día y hora · últimos 14 días · horario Argentina (GMT−3)</div></div></div>${html}
      <div class="pill-pico">Pico habitual: <b>${pico ? DIAS[+pico.k.split("-")[0]] + " " + pico.k.split("-")[1] + "h · " + K(pico.v) + " prom." : "—"}</b></div></div>
    <div class="tarjeta"><div class="tarjeta-cab"><h3>En vivo ahora</h3></div><div class="lista-vivos" style="max-height:340px">${lives.slice(0, 40).map((l, i) => itemVivo(l, i, can)).join("") || '<div class="vacio">Nadie en vivo</div>'}</div></div>
  </div>`;
  alCambiarPais(ruta);
  const { tiempos, por } = await seriesRecientes(p, 12, top5);
  grafLineas("gcat12", tiempos.map(horaDe), top5.map((cid, i) => ({ nombre: can[cid]?.nombre, datos: tiempos.map((t) => por[cid]?.[t] ?? null), color: COL[i] })), { maxTicks: 13 });
}

/* ---------------- Vivos finalizados */
function haceTxt(min) { if (min < 60) return `hace ${Math.max(1, Math.round(min))} min`; if (min < 1440) return `hace ${Math.floor(min / 60)} h`; return `hace ${Math.floor(min / 1440)} d`; }
V.finalizados = async () => {
  const p = S.pais;
  const [fin, can, a] = await Promise.all([D.fin(), D.canales(), D.ahora()]);
  if (!fin || !can) return sinDatos();
  const res = p === "GL" ? null : await D.resumen(p);
  const cat = sessionStorage.getItem("vz_fcat") || "";
  const lista = fin.filter((f) => (p === "GL" || can[f.cid]?.pais === p) && (!cat || can[f.cid]?.cat === cat)).slice(0, 200);
  const hoyR = res?.[hoyAR()] || {};
  const titulos = {}; [...(a?.lives || []), ...fin].forEach((x) => { if (!titulos[x.cid]) titulos[x.cid] = x.titulo; });
  const hoyLista = Object.entries(hoyR).filter(([cid]) => can[cid] && (!cat || can[cid].cat === cat)).sort((x, y) => y[1].pico - x[1].pico);
  const todasCats = [...new Set(Object.values(can).map((c) => c.cat))].sort();
  const at = tAhora();
  $("#vista").innerHTML = `<div class="layout-vivo"><div style="min-width:0">
    <div class="cab"><div><h1>${ic("tv")} Vivos finalizados</h1><div class="sub">${lista.length} vivos finalizados</div></div>
      <div class="der"><span class="etq">País</span>${await selectorPais(false, true)}<span class="etq">Categoría</span><span class="select"><select id="f-cat"><option value="">Todas</option>${todasCats.map((c) => `<option ${c === cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></span></div></div>
    <div class="grid-fin">${lista.map((f) => `<a class="fin-card" href="${ytv(f.vid)}" target="_blank" rel="noopener"><div class="th"><img src="${thumb(f.vid)}" loading="lazy" alt=""><span class="badge-dur">${dur(f.dur)}</span></div>
      <div class="cuerpo"><div class="linea-canal">${av(can[f.cid], "av18")}<span>${nom(can[f.cid])}</span></div><div class="tit2" style="margin:4px 0 8px">${esc(f.titulo)}</div>
      <div class="pie-fin"><div><div class="mini-lbl">TERMINÓ CON</div><b class="rojo">${miles(f.ultv ?? f.prom)}</b></div><span class="muted">${haceTxt(at - f.fin)}</span></div></div></a>`).join("") || '<div class="tarjeta vacio" style="grid-column:1/-1">Todavía no terminó ningún vivo con estos filtros</div>'}</div>
  </div>
  <div class="tarjeta lateral"><div class="tarjeta-cab"><h3>Canales que transmitieron hoy</h3><span class="der chip">${hoyLista.length}</span></div>
    <div class="lista-vivos" style="gap:0">${hoyLista.map(([cid, r]) => `<a class="vl" href="#/canal/${cid}">${av(can[cid], "av36")}<div style="min-width:0"><b style="font-size:13px">${nom(can[cid])}</b><div class="tit2" style="font-weight:500;color:var(--t2);font-size:12px">${esc(titulos[cid] || "")}</div><div style="margin-top:3px;font-size:12px"><b class="rojo">pico ${K(r.pico)}</b> <span class="muted">prom ${K(r.prom)}</span></div></div></a>`).join("") || '<div class="vacio">—</div>'}</div></div></div>`;
  alCambiarPais(ruta);
  $("#f-cat").onchange = (e) => { sessionStorage.setItem("vz_fcat", e.target.value); ruta(); };
};

/* ---------------- Informes */
function varCelda(n) { return n == null ? '<span class="muted">—</span>' : `<span class="delta ${n > 0 ? "sube" : n < 0 ? "baja" : "muted"}">${n > 0 ? "+" : ""}${miles(n)}</span>`; }
async function informe(campo, titulo, icono) {
  const p = S.pais;
  const per = +(sessionStorage.getItem("vz_iper") || 7), cat = sessionStorage.getItem("vz_icat") || "";
  const [can, s0, sA, sB] = await Promise.all([D.canales(), statsEn(0), statsEn(per), statsEn(per * 2)]);
  if (!can || !s0.fecha) return sinDatos("Las estadísticas de los canales se actualizan cada 6 horas.");
  const v = (s, cid) => s.datos?.[cid]?.[campo];
  const filas = Object.values(can).filter((c) => (p === "GL" || c.pais === p) && (!cat || c.cat === cat)).map((c) => {
    const g = sA.fecha !== s0.fecha && v(s0, c.id) != null && v(sA, c.id) != null ? v(s0, c.id) - v(sA, c.id) : null;
    const gp = sB.fecha !== sA.fecha && v(sA, c.id) != null && v(sB, c.id) != null ? v(sA, c.id) - v(sB, c.id) : null;
    return { c, g, var: g != null && gp ? Math.round(((g - gp) * 100) / Math.abs(gp)) : null };
  }).filter((f) => f.g != null);
  const todasCats = [...new Set(Object.values(can).map((c) => c.cat))].sort();
  $("#vista").innerHTML = `<div class="cab"><h1>${ic(icono)} ${titulo}</h1></div>
  <div class="filtros"><span class="etq">País:</span>${await selectorPais(false, true)}<span class="etq">Categoría:</span><span class="select"><select id="i-cat"><option value="">Todas</option>${todasCats.map((x) => `<option ${x === cat ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></span>
  <span class="etq">Período:</span><span class="select"><select id="i-per">${[7, 14, 30, 60, 90].map((d) => `<option value="${d}" ${d === per ? "selected" : ""}>Últimos ${d} días</option>`).join("")}</select></span></div>
  ${filas.length ? "" : `<div class="tarjeta vacio" style="margin-bottom:14px">Para este período todavía no hay historial suficiente (los datos empezaron el ${(await D.statsIdx())?.[0] || "—"}). Se completa solo con los días.</div>`}
  <div class="tarjeta" style="padding:6px 8px">${tabla([
    { t: "#", h: (f, i) => `<span class="muted">${i + 1}</span>` },
    { t: "Canal", v: (f) => f.c.nombre, h: (f) => `<a class="celda-canal" href="#/canal/${f.c.id}">${av(f.c, "av28")}<div style="min-width:0"><span style="display:block">${nom(f.c)}</span><span class="sub" style="font-weight:400">${esc(f.c.cat)}</span></div></a>` },
    { t: "Total", n: 1, v: (f) => f.g, h: (f) => `<b>${campo === "videos" ? miles(f.g) : K(f.g)}</b>` },
    { t: "Variación", n: 1, v: (f) => f.var, h: (f) => (f.var == null ? '<span class="muted">—</span>' : `<span class="delta ${f.var >= 0 ? "sube" : "baja"}" title="Comparado con los ${per} días anteriores">${f.var >= 0 ? "+" : ""}${f.var}% ℹ</span>`) },
  ], filas, { orden: 2, limite: 300 })}</div>`;
  alCambiarPais(ruta);
  $("#i-cat").onchange = (e) => { sessionStorage.setItem("vz_icat", e.target.value); ruta(); };
  $("#i-per").onchange = (e) => { sessionStorage.setItem("vz_iper", e.target.value); ruta(); };
}
V.vistas = () => informe("vistas", "Vistas ganadas", "eye");
V.suscriptores = () => informe("subs", "Suscriptores ganados", "userplus");
V.videos = () => informe("videos", "Videos nuevos", "video");

/* ---------------- Contenido visto */
function tarjetaVideo(x, can, extra = "") {
  const url = x.short ? `https://www.youtube.com/shorts/${x.vid}` : ytv(x.vid);
  return `<a class="vid-c ${x.short ? "short" : ""}" style="width:auto" href="${url}" target="_blank" rel="noopener"><div class="th"><img src="${x.short ? `https://i.ytimg.com/vi/${x.vid}/oar2.jpg` : thumb(x.vid)}" onerror="this.onerror=null;this.src='${thumb(x.vid)}'" loading="lazy" alt=""></div>
    <div class="cuerpo">${extra}<div class="tit3">${esc(x.titulo)}</div><div class="linea-canal" style="margin-top:6px">${av(can[x.cid], "av18")}<span>${nom(can[x.cid])}</span></div><div class="sub" style="margin-top:4px">${K(x.vistas)} vistas · ${(x.publicado || "").slice(0, 10)}</div></div></a>`;
}
V.contenido = async () => {
  const p = S.pais;
  const [vt, can] = await Promise.all([cargar(`videos_top/${p}.json`, 30), D.canales()]);
  if (!can) return sinDatos();
  let tipo = sessionStorage.getItem("vz_ctipo") || "v", per = sessionStorage.getItem("vz_cper") || "d7";
  $("#vista").innerHTML = `<div class="cab"><div><h1>${ic("film")} Contenido visto</h1><div class="sub">Videos y shorts ordenados por actividad</div></div><div class="der">${await selectorPais(false, true)}</div></div>
  <div class="filtros"><div class="pestanas" id="tipo"><button data-v="v">Videos</button><button data-v="s">Shorts</button></div><div class="pestanas" id="per"><button data-v="d1">24 horas</button><button data-v="d7">7 días</button><button data-v="d30">30 días</button></div></div><div id="cont"></div>`;
  const pintar = () => {
    $$("#tipo button").forEach((b) => b.classList.toggle("activo", b.dataset.v === tipo)); $$("#per button").forEach((b) => b.classList.toggle("activo", b.dataset.v === per));
    const lista = (vt?.[per] || []).filter((x) => (tipo === "s") === !!x.short);
    $("#cont").innerHTML = lista.length ? `<div class="${tipo === "s" ? "grid-shorts" : "grid-videos"}">${lista.map((x) => tarjetaVideo(x, can)).join("")}</div>` : '<div class="tarjeta vacio">No se encontró contenido con los filtros seleccionados.</div>';
  };
  $("#tipo").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tipo = b.dataset.v; sessionStorage.setItem("vz_ctipo", tipo); pintar(); };
  $("#per").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; per = b.dataset.v; sessionStorage.setItem("vz_cper", per); pintar(); };
  alCambiarPais(ruta);
  pintar();
};

/* ---------------- Podios globales */
V.podios = async () => {
  const p = S.pais;
  const [po, can] = await Promise.all([cargar(`podios/${p}.json`, 30), D.canales()]);
  if (!can) return sinDatos();
  const bloque = (titulo, lista, fmt, conVideo) => `<div class="tarjeta podio-card"><div class="tarjeta-cab"><h3>${titulo}</h3></div>${(lista || []).length ? (() => {
    const [u, ...resto] = lista; const link = (x) => (conVideo ? (x.short ? `https://www.youtube.com/shorts/${x.vid}` : ytv(x.vid)) : `#/canal/${x.cid}`); const tgt = conVideo ? ' target="_blank" rel="noopener"' : "";
    return `<a class="od-uno" href="${link(u)}"${tgt}><span class="r">#1</span>${av(can[u.cid], "av44")}<div style="min-width:0"><div class="nom">${conVideo ? esc(u.titulo) : nom(can[u.cid])}</div>${conVideo ? `<div class="sub">${nom(can[u.cid])}</div>` : ""}<div class="val">${fmt(u)}</div></div></a>
    ${resto.map((x, i) => `<a class="od-fila" href="${link(x)}"${tgt}><span class="p">${i + 2}</span>${av(can[x.cid])}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${conVideo ? esc(x.titulo) : nom(can[x.cid])}</span><span class="val">${fmt(x)}</span></a>`).join("")}`; })() : '<div class="vacio">Se completa a medida que se juntan días de datos</div>'}</div>`;
  const kk = (x) => K(x.v), mm = (x) => "+" + K(x.v);
  $("#vista").innerHTML = `<div class="cab"><h1>${ic("podium")} Podios globales</h1><div class="der">${await selectorPais(false, true)}</div></div>
  <div class="grid-podios">
    ${bloque("Mayor crecimiento en views (mes a mes)", po?.crec_mes, (x) => `${K(x.v)} <span class="delta sube">+${x.pct}%</span> <span class="muted" style="font-size:11px;font-weight:500">prev: ${K(x.prev)}</span>`)}
    ${bloque("Vistas YouTube ganadas (7 días)", po?.vistas7, kk)}
    ${bloque("Vistas YouTube ganadas (30 días)", po?.vistas30, kk)}
    ${bloque("Suscriptores ganados (7 días)", po?.subs7, kk)}
    ${bloque("Suscriptores ganados (30 días)", po?.subs30, kk)}
    ${bloque("Videos nuevos (7 días)", po?.videos7, (x) => miles(x.v))}
    ${bloque("Pico de espectadores en un vivo (cerrado, últimos 7 días)", po?.pico_vivo7, kk, true)}
    ${bloque("Vivo más largo (incluye en vivo ahora)", po?.vivo_largo, (x) => `${dur(x.dur)}${x.vivo ? ' <span class="chip rojo" style="font-size:9px;padding:0 5px">EN VIVO</span>' : ""}`, true)}
    ${bloque("Más vivos publicados (30 días)", po?.mas_vivos30, (x) => miles(x.v))}
    ${bloque("Mayor salto entre días consecutivos con datos (views, 30 días)", po?.salto, (x) => `${mm(x)} <span class="muted" style="font-size:11px;font-weight:500">${(x.fecha || "").slice(8, 10)}/${(x.fecha || "").slice(5, 7)}</span>`)}
    ${bloque("Short con más vistas ganadas (7 días)", po?.short7, (x) => "+" + K(x.g7), true)}
  </div>`;
  alCambiarPais(ruta);
};

/* ---------------- Comparar canales */
V.comparar = async (pre) => {
  const [can, a] = await Promise.all([D.canales(), D.ahora()]);
  if (!can) return sinDatos();
  const opts = Object.values(can).sort((x, y) => (a?.por_canal?.[y.id] || 0) - (a?.por_canal?.[x.id] || 0) || (x.nombre || "").localeCompare(y.nombre || ""));
  let guard = []; try { guard = JSON.parse(sessionStorage.getItem("vz_cmp") || "[]"); } catch {}
  let A = pre && can[pre] ? pre : guard[0] || "", B = guard[1] && guard[1] !== A ? guard[1] : "";
  let per = sessionStorage.getItem("vz_cmp_per") || "7";
  const sel = (id, val, lbl) => `<div class="cmp-col"><div class="mini-lbl">${lbl}</div><div style="display:flex;gap:6px"><span class="select" style="flex:1"><select id="${id}" style="width:100%"><option value="">Seleccioná un canal</option>${opts.map((c) => `<option value="${c.id}" ${c.id === val ? "selected" : ""}>${nom(c)}${a?.por_canal?.[c.id] ? " · 🔴 " + K(a.por_canal[c.id]) : ""}</option>`).join("")}</select></span><button class="btn gris" data-limpiar="${id}" style="padding:6px 10px">×</button></div></div>`;
  $("#vista").innerHTML = `<div class="cab"><h1>${ic("bars")} Comparar canales</h1></div>
  <div class="tarjeta"><div class="cmp-cab">${sel("cA", A, "Canal A")}<div class="cmp-col"><div class="mini-lbl">Período</div><div class="pestanas" id="per">${[["0", "Hoy"], ["1", "Ayer"], ["7", "7 días"], ["30", "30 días"], ["p", "Personalizado"]].map(([v, t]) => `<button data-v="${v}">${t}</button>`).join("")}</div>
    <div id="rango-p" class="oculto" style="margin-top:8px;display:flex;gap:6px;align-items:center"><input type="date" id="desde" class="inp"> → <input type="date" id="hasta" class="inp"></div></div>${sel("cB", B, "Canal B")}</div></div>
  <div id="comp" class="mt"></div>`;
  const pintar = async () => {
    limpiarGraficos();
    A = $("#cA").value; B = $("#cB").value;
    try { sessionStorage.setItem("vz_cmp", JSON.stringify([A, B])); sessionStorage.setItem("vz_cmp_per", per); } catch {}
    $$("#per button").forEach((b) => b.classList.toggle("activo", b.dataset.v === per));
    $("#rango-p").classList.toggle("oculto", per !== "p");
    const ids = [A, B].filter(Boolean);
    if (ids.length < 2) return ($("#comp").innerHTML = '<div class="tarjeta vacio">Seleccioná dos canales para comparar</div>');
    $("#comp").innerHTML = '<div class="cargando">Cargando…</div>';
    const dias = (await D.dias()) || {};
    let fechas;
    if (per === "0") fechas = [hoyAR()]; else if (per === "1") fechas = [hoyAR(1)];
    else if (per === "p") { const d = $("#desde").value || hoyAR(7), h = $("#hasta").value || hoyAR(); fechas = [...new Set(ids.flatMap((id) => dias[can[id].pais] || []))].filter((f) => f >= d && f <= h).sort(); }
    else fechas = [...new Set(ids.flatMap((id) => (dias[can[id].pais] || []).slice(-+per)))].sort();
    const ps = [...new Set(ids.map((id) => can[id].pais))];
    let tiempos = [], por = {};
    for (const x of ps) { const sr = await seriesDias(x, fechas); tiempos = [...new Set([...tiempos, ...sr.tiempos])]; Object.assign(por, sr.por); }
    tiempos.sort((x, y) => x - y);
    const resl = Object.fromEntries(await Promise.all(ps.map(async (x) => [x, (await D.resumen(x)) || {}])));
    const fin = (await D.fin()) || [];
    const idx = (await D.statsIdx()) || [];
    const sIni = idx.filter((f) => f < (fechas[0] || hoyAR())).pop() || idx[0], sFin = idx.filter((f) => f <= (fechas[fechas.length - 1] || hoyAR())).pop();
    const [st1, st2] = await Promise.all([sIni ? D.stats(sIni) : null, sFin ? D.stats(sFin) : null]);
    const tMin = fechas.length ? Date.parse(fechas[0] + "T03:00:00Z") / 60000 : 0, tMax = fechas.length ? Date.parse(fechas[fechas.length - 1] + "T03:00:00Z") / 60000 + 1440 : 0;
    const fila = (cid) => {
      const rp = resl[can[cid].pais]; const rr = fechas.map((f) => rp[f]?.[cid]).filter(Boolean); const min = rr.reduce((s, x) => s + x.min, 0);
      const d = (k) => (st1 && st2 && sIni !== sFin && st1[cid]?.[k] != null && st2[cid]?.[k] != null ? st2[cid][k] - st1[cid][k] : null);
      return { c: can[cid], pico: Math.max(0, ...rr.map((x) => x.pico)), prom: min ? Math.round(rr.reduce((s, x) => s + x.prom * x.min, 0) / min) : 0, horas: rr.reduce((s, x) => s + x.horas, 0), min,
        vivos: fin.filter((f) => f.cid === cid && f.fin >= tMin && f.fin < tMax).length, ahora: a?.por_canal?.[cid] || 0, gv: d("vistas"), gs: d("subs"), gvid: d("videos"), subs: st2?.[cid]?.subs };
    };
    const [fa, fb] = ids.map(fila);
    const fila2 = (t, k, f = miles) => { const x = fa[k], y = fb[k]; const ga = x != null && y != null && x > y, gb = x != null && y != null && y > x; return `<tr><td class="${ga ? "gana" : ""}" style="text-align:right">${f(x)}</td><td class="cmp-met">${t}</td><td class="${gb ? "gana" : ""}">${f(y)}</td></tr>`; };
    $("#comp").innerHTML = `<div class="tarjeta"><div class="tarjeta-cab"><h3>Espectadores en el período</h3></div><div class="lienzo l380"><canvas id="gcomp"></canvas></div></div>
      <div class="grid g2 mt"><div class="tarjeta"><div class="tarjeta-cab"><h3>Métricas en vivo</h3></div><table class="cmp-tabla"><thead><tr><th style="text-align:right;color:${COL[0]}">${nom(fa.c)}</th><th></th><th style="color:${COL[2]}">${nom(fb.c)}</th></tr></thead><tbody>
        ${fila2("En vivo ahora", "ahora")}${fila2("Pico", "pico")}${fila2("Promedio", "prom")}${fila2("Horas vistas", "horas")}${fila2("Tiempo al aire", "min", dur)}${fila2("Vivos realizados", "vivos")}</tbody></table></div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Métricas on demand</h3></div><table class="cmp-tabla"><thead><tr><th style="text-align:right;color:${COL[0]}">${nom(fa.c)}</th><th></th><th style="color:${COL[2]}">${nom(fb.c)}</th></tr></thead><tbody>
        ${fila2("Vistas ganadas", "gv")}${fila2("Suscriptores ganados", "gs")}${fila2("Videos nuevos", "gvid")}${fila2("Suscriptores totales", "subs")}</tbody></table></div></div>`;
    grafLineas("gcomp", tiempos.map(fechas.length > 1 ? fechaHora : horaDe), [fa, fb].map((f, i) => ({ nombre: f.c.nombre, datos: tiempos.map((t) => por[f.c.id]?.[t] ?? null), color: COL[i * 2] })), { maxTicks: 10, area: true, spanGaps: false });
  };
  $("#cA").onchange = pintar; $("#cB").onchange = pintar;
  $$("[data-limpiar]").forEach((b) => (b.onclick = () => { $("#" + b.dataset.limpiar).value = ""; pintar(); }));
  $("#per").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; per = b.dataset.v; pintar(); };
  $("#desde").onchange = pintar; $("#hasta").onchange = pintar;
  pintar();
};

/* ---------------- Página de canal */
V.canal = async (cid) => {
  const [can, a, fin, rec, idx] = await Promise.all([D.canales(), D.ahora(), D.fin(), D.records(), D.statsIdx()]);
  const c = can?.[cid];
  if (!c) return ($("#vista").innerHTML = '<div class="tarjeta vacio">Canal no encontrado</div>');
  const info = (await cargar(`canal/${cid}.json`, 30)) || { serie: {}, recientes: [], top_videos: [], top_shorts: [] };
  const serie = Object.entries(info.serie || {}).sort((x, y) => x[0].localeCompare(y[0]));
  const ult = serie[serie.length - 1]?.[1] || [], hace30 = serie.filter(([f]) => f <= hoyAR(30)).pop()?.[1], hace60 = serie.filter(([f]) => f <= hoyAR(60)).pop()?.[1];
  const d30 = (k) => (hace30 && ult[k] != null && hace30[k] != null ? ult[k] - hace30[k] : null);
  const d30p = (k) => (hace60 && hace30 && hace30[k] != null && hace60[k] != null ? hace30[k] - hace60[k] : null);
  const vsPrev = (k) => { const x = d30(k), y = d30p(k); return x != null && y ? `<div class="${x >= y ? "verde" : "rojo"}" style="font-size:11px;font-weight:600">${x >= y ? "+" : ""}${Math.round(((x - y) * 100) / Math.abs(y))}% período anterior</div>` : ""; };
  const res = (await D.resumen(c.pais)) || {};
  let pico30 = null; Object.entries(res).filter(([f]) => f >= hoyAR(30)).forEach(([f, r]) => { if (r[cid] && (!pico30 || r[cid].pico > pico30.v)) pico30 = { v: r[cid].pico, f }; });
  const ahoraV = a?.por_canal?.[cid] || 0;
  const misLives = (a?.lives || []).filter((l) => l.cid === cid);
  const misFin = (fin || []).filter((f) => f.cid === cid);
  let notas = ""; try { notas = localStorage.getItem("vz_nota_" + cid) || ""; } catch {}
  $("#vista").innerHTML = `<div class="canal-cab">${av(c, "av56 " + (ahoraV ? "anillo" : ""))}<div style="min-width:0"><h1 style="margin:0;font-size:22px;display:flex;align-items:center;gap:8px">${nom(c)} ${c.verificado ? '<span class="verif">✓</span>' : ""} ${bandera(c.pais, "f18")}</h1>
    <div class="sub" style="display:flex;align-items:center;gap:8px;margin-top:3px">${esc(c.cat)}${ahoraV ? ` · <span class="dot vivo"></span><b class="rojo" style="font-size:17px">${K(ahoraV)}</b> en vivo` : ""}</div></div>
    <div class="der canal-btns"><button class="btn gris ${S.esFav(cid) ? "fav-on" : ""}" id="b-fav">${ic("star")} ${S.esFav(cid) ? "Quitar" : "Favorito"}</button><a class="btn gris" href="#/comparar/${cid}">${ic("bars")} Comparar canal</a><button class="btn gris" id="b-exp">⤓ Exportar</button><a class="btn gris" href="https://www.youtube.com/channel/${cid}" target="_blank" rel="noopener">▶ Abrir en YouTube</a></div></div>
  <div class="grid-kpi5">
    <div class="tarjeta k5"><div class="mini-lbl">VISTAS</div><div class="num">${K(ult[1])}</div><div class="sub">Últimos 30d: ${d30(1) != null ? "+" + K(d30(1)) : "—"}</div>${vsPrev(1)}</div>
    <div class="tarjeta k5"><div class="mini-lbl">PICO ÚLTIMOS 30D</div><div class="num">${pico30 ? miles(pico30.v) : "—"}</div><div class="sub">${pico30 ? pico30.f.slice(8, 10) + "/" + pico30.f.slice(5, 7) + "/" + pico30.f.slice(0, 4) : ""}</div></div>
    <div class="tarjeta k5"><div class="mini-lbl">PICO MÁXIMO</div><div class="num">${rec?.[cid] ? miles(rec[cid]) : "—"}</div><div class="sub">desde que lo seguimos</div></div>
    <div class="tarjeta k5"><div class="mini-lbl">SUSCRIPTORES</div><div class="num">${K(ult[0])}</div><div class="sub">Últimos 30d: ${d30(0) != null ? "+" + K(d30(0)) : "—"}</div>${vsPrev(0)}</div>
    <div class="tarjeta k5"><div class="mini-lbl">VIDEOS</div><div class="num">${miles(ult[2])}</div><div class="sub">Últimos 30d: ${d30(2) != null ? "+" + miles(d30(2)) : "—"}</div>${vsPrev(2)}</div>
  </div>
  <div class="grid g-dash mt">
    <div style="min-width:0">
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Espectadores en vivo</h3></div><div class="filtros" style="margin-bottom:8px"><span class="etq">Rango</span><span class="select"><select id="rango"><option value="12">12 horas</option><option value="24">24 horas</option><option value="168">7 días</option><option value="720">30 días</option></select></span></div>
        <div class="lienzo"><canvas id="gc"></canvas></div><div class="grid-kpi4" id="kpi-r"></div></div>
      <div class="tarjeta mt"><div class="tarjeta-cab"><h3>Métricas recientes</h3></div><div class="pestanas" id="met"><button data-k="1" class="activo">Vistas 30d</button><button data-k="0">Suscriptores 30d</button><button data-k="2">Videos 30d</button></div>
        <div class="lienzo l220 mt"><canvas id="gm"></canvas></div><div id="met-res"></div></div>
    </div>
    <div class="tarjeta" style="display:flex;flex-direction:column"><div class="tarjeta-cab"><h3>Programación</h3></div>
      <div class="pestanas" id="tabs" style="width:100%"><button data-t="vivos" class="activo" style="flex:1">Vivos</button><button data-t="titulos" style="flex:1">Títulos</button><button data-t="notas" style="flex:1">Notas</button></div>
      <div id="tab-c" class="mt" style="flex:1;overflow:auto;max-height:620px"></div></div>
  </div>
  <div class="tarjeta mt"><div class="tarjeta-cab"><h3>Videos más vistos</h3><a class="der rojo" href="https://www.youtube.com/channel/${cid}/videos" target="_blank" rel="noopener">Ver más videos de ${nom(c)}</a></div><div class="fila-h">${info.top_videos.map((x) => tarjetaVideo({ ...x, cid }, can).replace('style="width:auto"', 'style="width:200px"')).join("") || '<div class="vacio">—</div>'}</div></div>
  <div class="tarjeta mt"><div class="tarjeta-cab"><h3>Shorts más vistos</h3><a class="der rojo" href="https://www.youtube.com/channel/${cid}/shorts" target="_blank" rel="noopener">Ver más shorts de ${nom(c)}</a></div><div class="fila-h">${info.top_shorts.map((x) => tarjetaVideo({ ...x, cid }, can).replace('style="width:auto"', 'style="width:160px"')).join("") || '<div class="vacio">—</div>'}</div></div>`;
  // favorito
  $("#b-fav").onclick = () => { const on = S.alternarFav(cid); $("#b-fav").innerHTML = `${ic("star")} ${on ? "Quitar" : "Favorito"}`; $("#b-fav").classList.toggle("fav-on", on); };
  // pestañas
  const tabs = {
    vivos: () => [...misLives.map((l) => ({ ...l, ahora: true })), ...misFin.slice(0, 40)].map((x) => `<a class="vl" href="${ytv(x.vid)}" target="_blank" rel="noopener" style="${x.ahora ? "background:linear-gradient(90deg,rgba(252,32,68,.12),transparent);border-radius:10px" : ""}"><span class="mini" style="width:120px;height:68px"><img src="${x.ahora ? thumbLive(x.vid) : thumb(x.vid)}" onerror="this.onerror=null;this.src='${thumb(x.vid)}'" loading="lazy" alt="">${x.ahora ? '<span class="badge-live">LIVE</span>' : `<span class="badge-dur">${dur(x.dur)}</span>`}</span><div style="min-width:0"><div class="tit2">${esc(x.titulo)}</div><div class="sub" style="margin-top:3px">${x.ahora ? `hace ${dur(tAhora() - x.ini)}` : fechaHora(x.ini)}</div><div style="font-size:12px;margin-top:2px">${x.ahora ? `<b class="rojo">${K(x.viewers)} ahora</b>` : `<b class="rojo">pico ${K(x.pico)}</b> <span class="muted">prom ${K(x.prom)}</span>`}</div></div></a>`).join("") || '<div class="vacio">Todavía no registramos vivos de este canal</div>',
    titulos: () => [...misLives, ...misFin].map((x) => `<div style="padding:8px 4px;border-bottom:1px solid var(--borde)"><div style="font-size:12.5px;font-weight:600">${esc(x.titulo)}</div><div class="sub">${fechaHora(x.ini)}</div></div>`).join("") || '<div class="vacio">—</div>',
    notas: () => `<textarea id="nota" class="inp" style="width:100%;min-height:220px;resize:vertical" placeholder="Escribí notas sobre este canal (quedan guardadas en este dispositivo)">${esc(notas)}</textarea>`,
  };
  const abrir = (t) => { $$("#tabs button").forEach((b) => b.classList.toggle("activo", b.dataset.t === t)); $("#tab-c").innerHTML = tabs[t](); const n = $("#nota"); if (n) n.oninput = () => { try { localStorage.setItem("vz_nota_" + cid, n.value); } catch {} }; };
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) abrir(b.dataset.t); };
  abrir("vivos");
  // grafico de espectadores con rango
  let datosExp = [];
  const graf = async () => {
    const horas = +$("#rango").value;
    graficos.splice(0).forEach((g) => { if (g.canvas.id === "gc") g.destroy(); else graficos.push(g); });
    let tiempos, por;
    if (horas <= 24) ({ tiempos, por } = await seriesRecientes(c.pais, horas, [cid]));
    else { const dias = (await D.dias()) || {}; ({ tiempos, por } = await seriesDias(c.pais, (dias[c.pais] || []).slice(-Math.ceil(horas / 24) - 1), tAhora() - horas * 60)); }
    const vals = tiempos.map((t) => por[cid]?.[t] ?? 0);
    datosExp = tiempos.map((t, i) => [fechaHora(t), vals[i]]);
    const enAire = vals.filter((v) => v > 0); const paso = tiempos.length > 1 ? (tiempos[tiempos.length - 1] - tiempos[0]) / (tiempos.length - 1) : 10;
    $("#kpi-r").innerHTML = [["PICO MÁXIMO", miles(Math.max(0, ...vals))], ["PROMEDIO ESPECTADORES", miles(enAire.length ? enAire.reduce((s, v) => s + v, 0) / enAire.length : 0)], ["HORAS VISTAS", K(enAire.reduce((s, v) => s + v, 0) * paso / 60)], ["TIEMPO AL AIRE", dur(enAire.length * paso)]].map(([t, v]) => `<div class="k4"><div class="mini-lbl">${t}</div><b>${v}</b></div>`).join("");
    grafLineas("gc", tiempos.map(horas > 24 ? fechaHora : horaDe), [{ nombre: "Espectadores", datos: vals, color: COL[0] }], { area: true, maxTicks: 10 });
  };
  $("#rango").onchange = graf;
  $("#b-exp").onclick = () => { const csv = "fecha,espectadores\n" + datosExp.map((r) => r.join(",")).join("\n"); const u = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const el = document.createElement("a"); el.href = u; el.download = `${(c.nombre || cid).replace(/[^\w]+/g, "_")}_espectadores.csv`; el.click(); };
  await graf();
  // metricas recientes (diarias)
  const met = (k) => {
    graficos.splice(0).forEach((g) => { if (g.canvas.id === "gm") g.destroy(); else graficos.push(g); });
    const s30 = serie.filter(([f]) => f >= hoyAR(31));
    const diarios = s30.slice(1).map(([f, v], i) => [f, v[k] != null && s30[i][1][k] != null ? v[k] - s30[i][1][k] : null]);
    const total = diarios.reduce((s, x) => s + (x[1] || 0), 0);
    grafLineas("gm", diarios.map(([f]) => f.slice(8, 10) + "/" + f.slice(5, 7)), [{ nombre: ["Suscriptores", "Vistas", "Videos"][k], datos: diarios.map((x) => x[1]), color: "#3b82f6" }], { area: true, maxTicks: 8 });
    $("#met-res").innerHTML = diarios.length ? `<div class="bloque mt" style="border-left:3px solid var(--azul)"><b>${["Suscriptores ganados", "Vistas acumuladas", "Videos publicados"][k]} del período</b><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:4px"><span class="sub">${s30[0][0]} — ${s30[s30.length - 1][0]}</span><b style="font-size:20px">${miles(total)}</b></div><div class="sub">Promedio diario · ${miles(total / diarios.length)}</div></div>
      <div class="tabla-wrap" style="max-height:240px;overflow:auto"><table><thead><tr><th>Fecha</th><th class="n">Del día</th><th class="n">Total acumulado</th></tr></thead><tbody>${s30.slice(1).reverse().map(([f, v], i, arr) => `<tr><td>${f}</td><td class="n">${miles(diarios[diarios.length - 1 - i][1])}</td><td class="n">${miles(v[k])}</td></tr>`).join("")}</tbody></table></div>` : '<div class="vacio">Se completa a medida que se juntan días de datos</div>';
  };
  $("#met").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; $$("#met button").forEach((x) => x.classList.toggle("activo", x === b)); met(+b.dataset.k); };
  met(1);
};


/* ============================================================ navegación */
async function ruta() {
  limpiarGraficos(); clearInterval(pzTimer);
  const [r, arg] = (location.hash.replace(/^#\/?/, "") || "dash").split("/");
  $$("#menu a").forEach((x) => x.classList.toggle("activo", x.dataset.r === r));
  $$("#abajo a").forEach((x) => x.classList.toggle("activo", x.dataset.r === r));
  cerrarMenu();
  const y = window.scrollY, misma = ruta.ult === location.hash; ruta.ult = location.hash;
  if (!misma) { $("#vista").innerHTML = '<div class="cargando">Cargando…</div>'; window.scrollTo(0, 0); }
  try { await (V[r] || V.dash)(arg); } catch (e) { console.error(e); $("#vista").innerHTML = '<div class="tarjeta vacio">No se pudo mostrar esta sección. Probá recargar.</div>'; }
  if (misma) window.scrollTo(0, y);
  actualizado();
}
async function actualizado() {
  const a = await D.ahora();
  if (a) { const m = Math.max(0, tAhora() - a.t); $("#actualizado").innerHTML = `<span class="dot vivo"></span> Actualizado ${m <= 1 ? "recién" : `hace ${m} min`}`; }
}
function cerrarMenu() { $("#menu").classList.remove("abierto"); $("#velo").classList.add("oculto"); }
window.addEventListener("hashchange", ruta);
$("#btn-menu").onclick = () => { $("#menu").classList.add("abierto"); $("#velo").classList.remove("oculto"); };
$("#velo").onclick = cerrarMenu;
$('#abajo a[data-r="mas"]').onclick = () => $("#btn-menu").click();

/* buscador */
$("#buscar").addEventListener("input", async (e) => {
  const q = e.target.value.trim().toLowerCase(), box = $("#resultados");
  if (!q) return box.classList.add("oculto");
  const [can, a] = await Promise.all([D.canales(), D.ahora()]);
  const r = Object.values(can || {}).filter((c) => (c.nombre || "").toLowerCase().includes(q) || (c.handle || "").toLowerCase().includes(q)).sort((x, y) => (a?.por_canal?.[y.id] || 0) - (a?.por_canal?.[x.id] || 0)).slice(0, 12);
  box.innerHTML = r.map((c) => `<a href="#/canal/${c.id}">${av(c, "av28")}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nom(c)}</span>${a?.por_canal?.[c.id] ? `<span class="vv">${K(a.por_canal[c.id])}</span>` : `<span class="muted" style="font-size:11px">${esc(c.cat)}</span>`}${bandera(c.pais, "f18")}</a>`).join("") || '<div class="vacio">Sin resultados</div>';
  box.classList.remove("oculto");
});
document.addEventListener("click", (e) => { if (!e.target.closest(".buscador")) $("#resultados").classList.add("oculto"); else if (e.target.closest("#resultados a")) { $("#resultados").classList.add("oculto"); $("#buscar").value = ""; } });

/* notificaciones: avisa cuando un favorito sale en vivo (con el panel abierto) */
let vivosAntes = null;
$("#btn-notif").onclick = async () => {
  if (!("Notification" in window)) return alert("Este navegador no permite notificaciones.");
  const r = await Notification.requestPermission();
  alert(r === "granted" ? "Listo: te aviso cuando uno de tus favoritos salga en vivo (mientras tengas el panel abierto)." : "No se activaron las notificaciones.");
};
async function revisarFavoritos() {
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a) return;
  const ahora = new Set(Object.keys(a.por_canal));
  if (vivosAntes && "Notification" in window && Notification.permission === "granted") {
    S.favs().filter((id) => ahora.has(id) && !vivosAntes.has(id)).forEach((id) => { try { new Notification(`${can?.[id]?.nombre || "Un favorito"} está en vivo`, { body: `${K(a.por_canal[id])} espectadores`, icon: can?.[id]?.imagen || "icono.svg" }); } catch {} });
  }
  vivosAntes = ahora;
}

/* refresco automático */
setInterval(() => {
  if (document.hidden) return;
  const r = location.hash.replace(/^#\/?/, "").split("/")[0] || "dash";
  if (["dash", "en-vivo", "favoritos", "tendencias"].includes(r)) ruta(); else actualizado();
  revisarFavoritos();
}, 2 * 60000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
ruta(); revisarFavoritos();
