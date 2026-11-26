/* LiveData AR — panel de audiencias de vivos de YouTube */
"use strict";
const REPO = "jro-ar/livedata-ar";
const BASE = `https://raw.githubusercontent.com/${REPO}/datos/`;
const BASE_DATOS = (new URLSearchParams(location.search).get("datos")) || BASE;
const COLORES = ["#e5484d", "#5b8def", "#3dd68c", "#f5c542", "#b07cf7", "#ff8c42", "#2ec4c4", "#ec6fb4"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ------------------------------------------------------------ datos */
const cache = {};
async function cargar(ruta, minutos = 2) {
  const k = ruta, ahora = Date.now();
  if (cache[k] && ahora - cache[k].t < minutos * 60000) return cache[k].v;
  const marca = Math.floor(ahora / 60000);
  try {
    const r = await fetch(BASE_DATOS + ruta + "?v=" + marca, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const v = await r.json();
    cache[k] = { t: ahora, v };
    return v;
  } catch (e) {
    if (cache[k]) return cache[k].v;
    return null;
  }
}
const D = {
  ahora: () => cargar("ahora.json", 1),
  canales: () => cargar("canales.json", 30),
  dias: () => cargar("dias.json", 5),
  dia: (f) => cargar(`dia/${f}.json`, f === hoyAR() ? 2 : 600),
  resumen: () => cargar("resumen_dias.json", 5),
  totales: () => cargar("totales.json", 5),
  heat: () => cargar("heatmap.json", 30),
  fin: () => cargar("finalizados.json", 3),
  videos: () => cargar("videos.json", 30),
  statsIdx: () => cargar("stats_indice.json", 30),
  stats: (f) => cargar(`stats/${f}.json`, f === hoyAR() ? 30 : 600),
};

/* ------------------------------------------------------------ utilidades */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function fmt(n) {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(".", ",") + "M";
  if (a >= 1e4) return (n / 1e3).toFixed(1).replace(".", ",") + "K";
  return Math.round(n).toLocaleString("es-AR");
}
const entero = (n) => (n == null ? "—" : Math.round(n).toLocaleString("es-AR"));
function signo(n) { return n == null ? "—" : (n > 0 ? "+" : "") + fmt(n); }
function delta(p, texto = "vs ayer a esta hora") {
  if (p == null) return `<span class="delta sub">sin dato de ayer</span>`;
  const c = p >= 0 ? "sube" : "baja", f = p >= 0 ? "↑" : "↓";
  return `<span class="delta ${c}">${f} ${Math.abs(p).toLocaleString("es-AR")}% ${texto}</span>`;
}
function pct(a, b) { return b ? Math.round(((a - b) * 1000) / b) / 10 : null; }
function hoyAR(off = 0) {
  const d = new Date(Date.now() - 3 * 3600e3 - off * 86400e3);
  return d.toISOString().slice(0, 10);
}
const fechaDe = (tmin) => new Date(tmin * 60000 - 3 * 3600e3).toISOString().slice(0, 10);
function horaDe(tmin) { const d = new Date(tmin * 60000 - 3 * 3600e3); return d.toISOString().slice(11, 16); }
function fechaHora(tmin) { const d = new Date(tmin * 60000 - 3 * 3600e3); return d.toISOString().slice(8, 10) + "/" + d.toISOString().slice(5, 7) + " " + d.toISOString().slice(11, 16); }
function dur(min) { if (min == null) return "—"; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min`; }
const thumb = (vid) => `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
const ytv = (vid) => `https://www.youtube.com/watch?v=${vid}`;
function avatar(c, cls = "") { return c && c.imagen ? `<img class="avatar ${cls}" src="${esc(c.imagen)}" loading="lazy" referrerpolicy="no-referrer" alt="">` : `<span class="avatar ${cls}"></span>`; }
function nombre(c) { return c ? esc(c.nombre || c.handle || c.id) : "?"; }
function linkCanal(c, cls = "") { return c ? `<a class="celda-canal" href="#/canal/${c.id}">${avatar(c, cls)}<span>${nombre(c)}</span></a>` : "?"; }
const favs = {
  get() { try { return JSON.parse(localStorage.getItem("ld_favs") || "[]"); } catch { return []; } },
  tiene(id) { return this.get().includes(id); },
  alternar(id) { let f = this.get(); f = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; try { localStorage.setItem("ld_favs", JSON.stringify(f)); } catch {} return f.includes(id); },
};
document.addEventListener("click", (e) => {
  const b = e.target.closest(".estrella");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const on = favs.alternar(b.dataset.id);
  b.classList.toggle("on", on); b.textContent = on ? "★" : "☆";
});
function estrella(id, extra = "") { const on = favs.tiene(id); return `<button class="estrella ${extra} ${on ? "on" : ""}" data-id="${id}" title="Favorito">${on ? "★" : "☆"}</button>`; }

/* tablas ordenables */
function tabla(cols, filas, opciones = {}) {
  const id = "t" + Math.random().toString(36).slice(2, 8);
  let orden = opciones.orden ?? null, desc = true;
  const pintar = () => {
    let fs = filas.slice();
    if (orden != null) {
      const c = cols[orden];
      fs.sort((a, b) => { const x = c.v(a), y = c.v(b); return (x == null) - (y == null) || (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); });
    }
    if (opciones.limite) fs = fs.slice(0, opciones.limite);
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<table><thead><tr>${cols.map((c, i) => `<th class="${c.n ? "n" : ""} ${c.cls || ""}" data-i="${i}">${c.t}${orden === i ? (desc ? " ▼" : " ▲") : ""}</th>`).join("")}</tr></thead><tbody>${
      fs.length ? fs.map((f, i) => `<tr>${cols.map((c) => `<td class="${c.n ? "n" : ""} ${c.cls || ""}">${c.h ? c.h(f, i) : esc(c.v(f))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" class="vacio">Sin datos todavía</td></tr>`
    }</tbody></table>`;
    el.querySelectorAll("th").forEach((th) => th.onclick = () => {
      const i = +th.dataset.i; if (cols[i].v == null) return;
      if (orden === i) desc = !desc; else { orden = i; desc = true; }
      pintar();
    });
  };
  setTimeout(pintar);
  return `<div class="tabla-wrap" id="${id}"></div>`;
}

/* gráficos */
const graficos = [];
function limpiarGraficos() { while (graficos.length) { try { graficos.pop().destroy(); } catch {} } }
Chart.defaults.color = "#9aa0aa";
Chart.defaults.borderColor = "#2c313a";
Chart.defaults.font.family = "Inter, system-ui, sans-serif";
function grafLineas(canvasId, etiquetas, series, opc = {}) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const g = new Chart(el, {
    type: "line",
    data: { labels: etiquetas, datasets: series.map((s, i) => ({ label: s.nombre, data: s.datos, borderColor: s.color || COLORES[i % COLORES.length], backgroundColor: (s.color || COLORES[i % COLORES.length]) + "22", fill: !!s.relleno, tension: 0.35, pointRadius: etiquetas.length < 4 ? 4 : 0, borderWidth: 2, spanGaps: false })) },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: series.length > 1, labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${entero(c.parsed.y)}` } } },
      scales: { x: { ticks: { maxTicksLimit: opc.maxTicks || 12, maxRotation: 0 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => fmt(v) } } },
    },
  });
  graficos.push(g);
}
function grafBarras(canvasId, etiquetas, datos, opc = {}) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const g = new Chart(el, {
    type: opc.tipo || "bar",
    data: { labels: etiquetas, datasets: [{ data: datos, backgroundColor: opc.colores || COLORES, borderRadius: 6, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: opc.horizontal ? "y" : "x",
      plugins: { legend: { display: opc.tipo === "doughnut", position: "right" }, tooltip: { callbacks: { label: (c) => " " + entero(c.parsed.y ?? c.parsed.x ?? c.parsed) } } },
      scales: opc.tipo === "doughnut" ? {} : { y: { ticks: { callback: function (v) { return opc.horizontal ? this.getLabelForValue(v) : fmt(v); } } }, x: { ticks: { callback: function (v) { return opc.horizontal ? fmt(v) : this.getLabelForValue(v); } } } } },
  });
  graficos.push(g);
}

/* series por canal a partir de archivos de día */
async function seriesCanales(fechas, desdeT = 0) {
  const dias = (await Promise.all(fechas.map((f) => D.dia(f)))).filter(Boolean);
  const tiempos = [], porCanal = {};
  for (const dia of dias) {
    for (const m of dia.m) {
      if (m.t < desdeT) continue;
      tiempos.push(m.t);
      const pc = {};
      for (const [vid, n] of Object.entries(m.d)) { const cid = dia.vids[vid]?.cid; if (cid) pc[cid] = (pc[cid] || 0) + n; }
      for (const cid of Object.keys(pc)) (porCanal[cid] ||= {})[m.t] = pc[cid];
    }
  }
  return { tiempos, porCanal, dias };
}
async function fechasDisponibles(n) {
  const dias = (await D.dias()) || [];
  return dias.slice(-n);
}

/* estadísticas de canales (suscriptores, vistas, videos) en días aproximados */
async function statsEn(diasAtras) {
  const idx = (await D.statsIdx()) || [];
  if (!idx.length) return {};
  const objetivo = hoyAR(diasAtras);
  let f = idx.filter((x) => x <= objetivo).pop();
  if (!f) f = idx[0];
  return { fecha: f, datos: (await D.stats(f)) || {} };
}

/* ------------------------------------------------------------ vistas */
const V = {};

V.dash = async () => {
  const [a, can, heat, res] = await Promise.all([D.ahora(), D.canales(), D.heat(), D.resumen()]);
  if (!a) return sinDatos();
  const hace12 = a.t - 12 * 60;
  const { tiempos, porCanal } = await seriesCanales([fechaDe(hace12), hoyAR()].filter((v, i, s) => s.indexOf(v) === i), hace12);
  const top5 = Object.entries(a.por_canal).sort((x, y) => y[1] - x[1]).slice(0, 5).map((x) => x[0]);
  const top5b = top5.length >= 5 ? top5 : Object.entries(porCanal).map(([cid, s]) => [cid, Math.max(...Object.values(s))]).sort((x, y) => y[1] - x[1]).slice(0, 5).map((x) => x[0]);
  const crecimiento = Object.entries(a.por_canal).filter(([cid, n]) => (a.por_canal_ayer[cid] || 0) >= 300 && n >= 300).map(([cid, n]) => ({ cid, n, p: pct(n, a.por_canal_ayer[cid]) })).sort((x, y) => y.p - x.p).slice(0, 5);
  const ayer = res && res[hoyAR(1)] ? Object.entries(res[hoyAR(1)]).sort((x, y) => y[1].pico - x[1].pico).slice(0, 3) : [];
  const cats = Object.entries(a.categorias || {}).sort((x, y) => y[1].viewers - x[1].viewers);
  const maxHeat = heat ? Math.max(1, ...heat.map((h) => h.prom)) : 1;
  const hm = {}; (heat || []).forEach((h) => (hm[h.dia + "-" + h.hora] = h.prom));
  let pico = null; (heat || []).forEach((h) => { if (!pico || h.prom > pico.prom) pico = h; });

  $("#vista").innerHTML = `
  <h1>Dashboard <span class="chip">🇦🇷 Argentina</span></h1>
  <div class="grid g3">
    <div class="tarjeta kpi"><div class="ico">👥</div><div><div class="num">${fmt(a.total)}</div><div class="lbl">Espectadores ahora</div>${delta(a.delta_pct)}</div></div>
    <div class="tarjeta kpi"><div class="ico">🔥</div><div><div class="num">${fmt(a.pico_dia)}</div><div class="lbl">Pico del día · ${horaDe(a.pico_dia_t)}</div>${delta(a.pico_delta_pct)}</div></div>
    <div class="tarjeta kpi"><div class="ico">📡</div><div><div class="num">${a.canales_en_vivo}</div><div class="lbl">Canales en vivo</div><span class="delta sub">${a.vivos} transmisiones</span></div></div>
  </div>
  <div class="grid g2 mt">
    <div class="tarjeta"><h2>Últimas 12 horas <span class="sub">Top 5 canales · Argentina</span></h2><div class="lienzo alto"><canvas id="g12"></canvas></div></div>
    <div class="tarjeta"><h2><span class="vivo-dot"></span> En vivo ahora <a class="sub" style="margin-left:auto" href="#/en-vivo">Ver todos</a></h2>
      <div class="lista-vivo">${a.lives.slice(0, 10).map((l, i) => itemVivo(l, i, can)).join("") || '<div class="vacio">Nadie en vivo ahora</div>'}</div></div>
  </div>
  <div class="grid g2i mt">
    <div class="tarjeta"><h2>Categorías <span class="sub">espectadores ahora</span></h2><div class="cats">${cats.map(([n, c]) => `<a class="cat" href="#/categorias"><div class="t">${esc(n)}</div><div class="v">${fmt(c.viewers)}</div><div class="sub">${c.canales} canales · líder: ${nombre(can?.[c.lider])} (${fmt(c.lider_v)})</div></a>`).join("") || '<div class="vacio">—</div>'}</div></div>
    <div class="tarjeta"><h2>Mayor crecimiento <span class="sub">vs ayer a esta hora</span></h2>
      ${crecimiento.length ? crecimiento.map((c) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde)">${linkCanal(can?.[c.cid])}<span style="margin-left:auto" class="n">${fmt(c.n)}</span><span class="delta ${c.p >= 0 ? "sube" : "baja"}" style="width:70px;text-align:right">${c.p >= 0 ? "↑" : "↓"} ${Math.abs(c.p).toLocaleString("es-AR")}%</span></div>`).join("") : '<div class="vacio">Se calcula cuando haya datos de ayer</div>'}
      <h2 class="mt">Podio de ayer <span class="sub">por pico</span></h2>
      ${ayer.length ? ayer.map(([cid, r], i) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">${["🥇", "🥈", "🥉"][i]} ${linkCanal(can?.[cid])}<b style="margin-left:auto">${fmt(r.pico)}</b></div>`).join("") : '<div class="vacio">Disponible desde mañana</div>'}
    </div>
  </div>
  <div class="tarjeta mt"><h2>Mapa de calor <span class="sub">promedio de espectadores por día y hora${pico ? ` · pico: ${DIAS[pico.dia]} ${pico.hora}:00 (${fmt(pico.prom)})` : ""}</span></h2>
    <div class="heat"><div class="et"></div>${Array.from({ length: 24 }, (_, h) => `<div class="et" style="justify-content:center">${h % 3 ? "" : h}</div>`).join("")}
    ${DIAS.map((d, i) => `<div class="et">${d}</div>` + Array.from({ length: 24 }, (_, h) => { const v = hm[i + "-" + h]; const o = v ? 0.12 + 0.88 * (v / maxHeat) : 0.04; return `<div title="${d} ${h}:00 · ${v ? entero(v) : "sin datos"}" style="background:rgba(229,72,77,${o.toFixed(2)})"></div>`; }).join("")).join("")}</div></div>`;
  grafLineas("g12", tiempos.map(horaDe), top5b.map((cid) => ({ nombre: can?.[cid]?.nombre || cid, datos: tiempos.map((t) => porCanal[cid]?.[t] ?? 0) })));
};

function itemVivo(l, i, can) {
  const c = can?.[l.cid];
  return `<a class="item-vivo" href="${ytv(l.vid)}" target="_blank" rel="noopener"><span class="pos">${i + 1}</span><img class="miniatura" src="${thumb(l.vid)}" loading="lazy" alt="">
  <div class="txt"><div class="canal">${avatar(c)} ${nombre(c)}</div><div class="titulo-l" title="${esc(l.titulo)}">${esc(l.titulo)}</div>
  <div><b style="color:var(--rojo2)">${fmt(l.viewers)}</b> ${l.delta_pct != null ? `<span class="delta ${l.delta_pct >= 0 ? "sube" : "baja"}">${l.delta_pct >= 0 ? "↑" : "↓"} ${Math.abs(l.delta_pct).toLocaleString("es-AR")}% vs ayer</span>` : ""}</div></div></a>`;
}

function filtrosCanales(can, a, soloFavs) {
  const cats = [...new Set(Object.values(can).map((c) => c.cat))].sort();
  return `<div class="filtros"><input id="f-txt" placeholder="Filtrar por nombre"><select id="f-cat"><option value="">Todas las categorías</option>${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
  <select id="f-ord"><option value="vivo">Más vistos ahora</option><option value="subs">Más suscriptores</option><option value="vistas">Más visualizaciones</option><option value="nombre">Nombre</option></select></div><div id="lista-canales" class="canales-grid"></div>`;
}
async function pintarCanales(soloFavs) {
  const [can, a, st] = await Promise.all([D.canales(), D.ahora(), statsEn(0)]);
  if (!can) return sinDatos();
  $("#vista").innerHTML = `<h1>${soloFavs ? "Favoritos" : "Explorar canales"} <span class="sub">${Object.keys(can).length} canales seguidos</span></h1>${filtrosCanales(can, a, soloFavs)}`;
  const s = st.datos || {};
  const pintar = () => {
    const txt = $("#f-txt").value.toLowerCase(), cat = $("#f-cat").value, ord = $("#f-ord").value;
    let lista = Object.values(can).filter((c) => (!txt || (c.nombre || "").toLowerCase().includes(txt)) && (!cat || c.cat === cat) && (!soloFavs || favs.tiene(c.id)));
    const vivo = (c) => a?.por_canal?.[c.id] || 0;
    lista.sort((x, y) => ord === "nombre" ? (x.nombre || "").localeCompare(y.nombre || "") : ord === "subs" ? (s[y.id]?.subs || 0) - (s[x.id]?.subs || 0) : ord === "vistas" ? (s[y.id]?.vistas || 0) - (s[x.id]?.vistas || 0) : vivo(y) - vivo(x) || (s[y.id]?.subs || 0) - (s[x.id]?.subs || 0));
    $("#lista-canales").innerHTML = lista.map((c) => `<a class="tarjeta tarjeta-canal" href="#/canal/${c.id}">${estrella(c.id)}
      <div class="cab">${avatar(c, "g")}<div style="min-width:0"><div class="nombre">${nombre(c)}</div><div class="sub">${esc(c.cat)}</div></div></div>
      <div class="datos"><span>${fmt(s[c.id]?.subs)} suscriptores</span>${vivo(c) ? `<span><span class="badge-vivo">EN VIVO</span> <b style="color:var(--texto)">${fmt(vivo(c))}</b></span>` : `<span>${fmt(s[c.id]?.vistas)} vistas</span>`}</div></a>`).join("") || `<div class="vacio">${soloFavs ? "Todavía no marcaste favoritos. Tocá la ☆ en cualquier canal de Explorar." : "Sin resultados"}</div>`;
  };
  ["#f-txt", "#f-cat", "#f-ord"].forEach((sel) => $(sel).addEventListener("input", pintar));
  pintar();
}
V.explorar = () => pintarCanales(false);
V.favoritos = () => pintarCanales(true);

V.canal = async (cid) => {
  const [can, a, fin, vids, st0, st7, st30] = await Promise.all([D.canales(), D.ahora(), D.fin(), D.videos(), statsEn(0), statsEn(7), statsEn(30)]);
  const c = can?.[cid];
  if (!c) return ($("#vista").innerHTML = `<div class="vacio">Canal no encontrado</div>`);
  const fechas = await fechasDisponibles(7);
  const { tiempos, porCanal } = await seriesCanales(fechas);
  const serie = porCanal[cid] || {};
  const res = (await D.resumen()) || {};
  const ult7 = Object.keys(res).sort().slice(-7);
  const pico7 = Math.max(0, ...ult7.map((f) => res[f]?.[cid]?.pico || 0));
  const horas7 = ult7.reduce((s, f) => s + (res[f]?.[cid]?.horas || 0), 0);
  const min7 = ult7.reduce((s, f) => s + (res[f]?.[cid]?.min || 0), 0);
  const s0 = st0.datos?.[cid] || {}, s7 = st7.datos?.[cid] || {}, s30 = st30.datos?.[cid] || {};
  const misFin = (fin || []).filter((f) => f.cid === cid).slice(0, 50);
  const misVids = Object.values(vids || {}).filter((v) => v.cid === cid).sort((x, y) => (y.publicado || "").localeCompare(x.publicado || "")).slice(0, 15);
  const enVivo = (a?.lives || []).filter((l) => l.cid === cid);
  $("#vista").innerHTML = `
  <div class="perfil">${avatar(c, "xl")}<div style="flex:1;min-width:200px"><h1 style="margin:0 0 4px">${nombre(c)} ${estrella(c.id, "inline")}</h1>
    <div class="sub">${esc(c.cat)} · <a href="https://www.youtube.com/channel/${c.id}" target="_blank" rel="noopener" style="color:var(--rojo2)">Ver en YouTube ↗</a></div></div>
    <div class="nums"><div><b>${fmt(s0.subs)}</b><span>Suscriptores ${s7.subs ? `(${signo(s0.subs - s7.subs)} 7d)` : ""}</span></div><div><b>${fmt(s0.vistas)}</b><span>Visualizaciones ${s7.vistas ? `(${signo(s0.vistas - s7.vistas)} 7d)` : ""}</span></div><div><b>${entero(s0.videos)}</b><span>Videos ${s30.videos ? `(${signo(s0.videos - s30.videos)} 30d)` : ""}</span></div></div></div>
  <div class="grid g3">
    <div class="tarjeta kpi"><div class="ico">👥</div><div><div class="num">${fmt(a?.por_canal?.[cid] || 0)}</div><div class="lbl">Espectadores ahora</div>${a?.por_canal?.[cid] ? delta(pct(a.por_canal[cid], a.por_canal_ayer?.[cid])) : '<span class="delta sub">fuera del aire</span>'}</div></div>
    <div class="tarjeta kpi"><div class="ico">🔥</div><div><div class="num">${fmt(pico7)}</div><div class="lbl">Pico de los últimos 7 días</div></div></div>
    <div class="tarjeta kpi"><div class="ico">⏱</div><div><div class="num">${fmt(horas7)}</div><div class="lbl">Horas vistas en 7 días</div><span class="delta sub">${dur(min7)} al aire</span></div></div>
  </div>
  ${enVivo.length ? `<div class="tarjeta mt"><h2><span class="vivo-dot"></span> En vivo ahora</h2><div class="lista-vivo">${enVivo.map((l, i) => itemVivo(l, i, can)).join("")}</div></div>` : ""}
  <div class="tarjeta mt"><h2>Espectadores · últimos 7 días</h2><div class="lienzo"><canvas id="gc"></canvas></div></div>
  <div class="grid g2i mt">
    <div class="tarjeta"><h2>Vivos finalizados</h2>${tabla([
      { t: "Vivo", v: (f) => f.titulo, h: (f) => `<a href="${ytv(f.vid)}" target="_blank" rel="noopener">${esc(f.titulo)}</a><div class="sub">${fechaHora(f.ini)}</div>` },
      { t: "Pico", n: 1, v: (f) => f.pico, h: (f) => fmt(f.pico) }, { t: "Prom.", n: 1, v: (f) => f.prom, h: (f) => fmt(f.prom) }, { t: "Duración", n: 1, v: (f) => f.dur, h: (f) => dur(f.dur), cls: "ocultar-movil" }], misFin, { limite: 50 })}</div>
    <div class="tarjeta"><h2>Últimos videos</h2>${tabla([
      { t: "Video", v: (v) => v.titulo, h: (v) => `<a href="${ytv(v.vid)}" target="_blank" rel="noopener">${esc(v.titulo)}</a><div class="sub">${(v.publicado || "").slice(0, 10)}</div>` },
      { t: "Vistas", n: 1, v: (v) => v.vistas, h: (v) => fmt(v.vistas) }], misVids)}</div>
  </div>`;
  grafLineas("gc", tiempos.map(fechaHora), [{ nombre: c.nombre, datos: tiempos.map((t) => serie[t] ?? 0), relleno: true }], { maxTicks: 8 });
};

V["en-vivo"] = async () => {
  const [a, can] = await Promise.all([D.ahora(), D.canales()]);
  if (!a) return sinDatos();
  $("#vista").innerHTML = `<h1><span class="vivo-dot"></span> Canales en vivo <span class="sub">${a.vivos} transmisiones · ${fmt(a.total)} espectadores</span></h1>
  <div class="tarjeta">${tabla([
    { t: "#", v: null, h: (l, i) => i + 1 },
    { t: "Transmisión", v: (l) => l.titulo, h: (l) => `<a href="${ytv(l.vid)}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:center"><img class="miniatura" src="${thumb(l.vid)}" loading="lazy" alt=""><div style="min-width:0"><div class="titulo-l" style="white-space:normal">${esc(l.titulo)}</div><div class="sub">${nombre(can?.[l.cid])}</div></div></a>` },
    { t: "Espectadores", n: 1, v: (l) => l.viewers, h: (l) => `<b>${entero(l.viewers)}</b>` },
    { t: "Vs ayer", n: 1, v: (l) => l.delta_pct, h: (l) => l.delta_pct == null ? "—" : `<span class="delta ${l.delta_pct >= 0 ? "sube" : "baja"}">${l.delta_pct >= 0 ? "↑" : "↓"} ${Math.abs(l.delta_pct).toLocaleString("es-AR")}%</span>`, cls: "ocultar-movil" },
    { t: "Pico", n: 1, v: (l) => l.pico, h: (l) => fmt(l.pico), cls: "ocultar-movil" },
    { t: "Al aire", n: 1, v: (l) => l.ini ? a.t - l.ini : null, h: (l) => l.ini ? dur(a.t - l.ini) : "—", cls: "ocultar-movil" },
  ], a.lives, { orden: 2 })}</div>`;
};

let pizarraPrev = {}, pizarraSig = null, pizarraTimer = null;
V.pizarra = async () => {
  const pintar = async () => {
    if (location.hash !== "#/pizarra") return;
    const [a, can] = await Promise.all([D.ahora(), D.canales()]);
    if (!a) return sinDatos();
    const filas = a.lives.slice(0, 40);
    if (pizarraSig && pizarraSig._t !== a.t) pizarraPrev = pizarraSig;
    const html = `<h1><span class="vivo-dot"></span> Pizarra en vivo <span class="sub">se actualiza sola · ${fmt(a.total)} espectadores · ${horaDe(a.t)} hs</span>
      <button class="btn gris" style="margin-left:auto" onclick="document.documentElement.requestFullscreen?.()">Pantalla completa</button></h1>
      <div class="pizarra">${filas.map((l, i) => {
        const prev = pizarraPrev[l.vid]; const cambio = prev && prev.pos !== i;
        const fl = !prev ? "" : prev.pos > i ? `<span class="flecha sube">▲${prev.pos - i}</span>` : prev.pos < i ? `<span class="flecha baja">▼${i - prev.pos}</span>` : "";
        const dif = prev ? l.viewers - prev.v : 0;
        return `<a class="pz ${cambio ? "cambio" : ""}" href="${ytv(l.vid)}" target="_blank" rel="noopener" style="position:relative"><span class="rk">${i + 1}${fl}</span><img src="${thumb(l.vid)}" loading="lazy" alt="">
        <div class="info"><div class="canal" style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--suave)">${avatar(can?.[l.cid])} ${nombre(can?.[l.cid])}</div>
        <div class="vv">${entero(l.viewers)} ${prev && dif ? `<span class="delta ${dif > 0 ? "sube" : "baja"}" style="font-size:13px">${dif > 0 ? "+" : ""}${entero(dif)}</span>` : ""}</div>
        <div class="titulo-l">${esc(l.titulo)}</div></div></a>`;
      }).join("") || '<div class="vacio">Nadie en vivo ahora</div>'}</div>`;
    $("#vista").innerHTML = html;
    if (pizarraPrev._t !== a.t) { const nuevo = { _t: a.t }; filas.forEach((l, i) => (nuevo[l.vid] = { pos: i, v: l.viewers })); pizarraSig = nuevo; }
  };
  pizarraPrev = {}; pizarraSig = null;
  await pintar();
  clearInterval(pizarraTimer);
  pizarraTimer = setInterval(pintar, 60000);
};

V.categorias = async () => {
  const [a, can, res] = await Promise.all([D.ahora(), D.canales(), D.resumen()]);
  if (!a || !can) return sinDatos();
  const cats = {};
  Object.values(can).forEach((c) => (cats[c.cat] ||= { canales: [], viewers: 0 }).canales.push(c));
  Object.entries(a.por_canal).forEach(([cid, n]) => { const c = can[cid]; if (c) cats[c.cat].viewers += n; });
  const orden = Object.entries(cats).sort((x, y) => y[1].viewers - x[1].viewers);
  const hoy = res?.[hoyAR()] || {};
  $("#vista").innerHTML = `<h1>Categorías</h1>
  <div class="grid g2i"><div class="tarjeta"><h2>Reparto de espectadores ahora</h2><div class="lienzo"><canvas id="gcat"></canvas></div></div>
  <div class="tarjeta"><h2>Horas vistas hoy por categoría</h2><div class="lienzo"><canvas id="gcat2"></canvas></div></div></div>
  ${orden.map(([n, c]) => `<div class="tarjeta mt"><h2>${esc(n)} <span class="sub">${fmt(c.viewers)} espectadores ahora · ${c.canales.length} canales</span></h2>
  ${tabla([{ t: "Canal", v: (x) => x.nombre, h: (x) => linkCanal(x) },
    { t: "Ahora", n: 1, v: (x) => a.por_canal[x.id] || 0, h: (x) => a.por_canal[x.id] ? `<span class="badge-vivo">VIVO</span> <b>${entero(a.por_canal[x.id])}</b>` : '<span class="sub">—</span>' },
    { t: "Pico hoy", n: 1, v: (x) => hoy[x.id]?.pico || 0, h: (x) => fmt(hoy[x.id]?.pico) },
    { t: "Horas vistas hoy", n: 1, v: (x) => hoy[x.id]?.horas || 0, h: (x) => fmt(hoy[x.id]?.horas), cls: "ocultar-movil" }], c.canales, { orden: 1 })}</div>`).join("")}`;
  grafBarras("gcat", orden.map((x) => x[0]), orden.map((x) => x[1].viewers), { tipo: "doughnut" });
  const hc = {}; Object.entries(hoy).forEach(([cid, r]) => { const c = can[cid]; if (c) hc[c.cat] = (hc[c.cat] || 0) + r.horas; });
  const hco = Object.entries(hc).sort((x, y) => y[1] - x[1]);
  grafBarras("gcat2", hco.map((x) => x[0]), hco.map((x) => x[1]), { horizontal: true });
};

V.finalizados = async () => {
  const [fin, can] = await Promise.all([D.fin(), D.canales()]);
  if (!fin || !can) return sinDatos();
  const opts = Object.values(can).sort((x, y) => (x.nombre || "").localeCompare(y.nombre || ""));
  $("#vista").innerHTML = `<h1>Vivos finalizados <span class="sub">${fin.length} registrados</span></h1>
  <div class="filtros"><select id="f-per"><option value="1">Hoy</option><option value="2">Ayer</option><option value="7" selected>Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="9999">Todo</option></select>
  <select id="f-can"><option value="">Todos los canales</option>${opts.map((c) => `<option value="${c.id}">${nombre(c)}</option>`).join("")}</select>
  <input id="f-txt" placeholder="Buscar en el título"></div><div class="tarjeta" id="t-fin"></div>`;
  const pintar = () => {
    const per = +$("#f-per").value, cc = $("#f-can").value, txt = $("#f-txt").value.toLowerCase();
    const ahoraT = Date.now() / 60000;
    const inicioHoy = Math.floor((Date.now() - 3 * 3600e3) / 86400e3) * 1440 + 180;
    const filtro = (f) => (per === 1 ? f.fin >= inicioHoy : per === 2 ? f.fin >= inicioHoy - 1440 && f.fin < inicioHoy : f.fin >= ahoraT - per * 1440) && (!cc || f.cid === cc) && (!txt || (f.titulo || "").toLowerCase().includes(txt));
    $("#t-fin").innerHTML = tabla([
      { t: "Vivo", v: (f) => f.titulo, h: (f) => `<a href="${ytv(f.vid)}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:center"><img class="miniatura ocultar-movil" src="${thumb(f.vid)}" loading="lazy" alt=""><div style="min-width:0"><div class="titulo-l" style="white-space:normal">${esc(f.titulo)}</div><div class="sub">${nombre(can[f.cid])} · ${fechaHora(f.ini)} a ${horaDe(f.fin)}</div></div></a>` },
      { t: "Pico", n: 1, v: (f) => f.pico, h: (f) => `<b>${entero(f.pico)}</b><div class="sub">${horaDe(f.pico_t)}</div>` },
      { t: "Promedio", n: 1, v: (f) => f.prom, h: (f) => entero(f.prom) },
      { t: "Duración", n: 1, v: (f) => f.dur, h: (f) => dur(f.dur), cls: "ocultar-movil" },
      { t: "Horas vistas", n: 1, v: (f) => f.prom * f.dur / 60, h: (f) => fmt(f.prom * f.dur / 60), cls: "ocultar-movil" },
    ], fin.filter(filtro), { orden: 1, limite: 500 });
  };
  ["#f-per", "#f-can", "#f-txt"].forEach((s) => $(s).addEventListener("input", pintar));
  pintar();
};

async function informe(campo, titulo, unidad) {
  const [can, s0, s1, s7, s30] = await Promise.all([D.canales(), statsEn(0), statsEn(1), statsEn(7), statsEn(30)]);
  if (!can || !s0.datos) return sinDatos();
  const filas = Object.values(can).map((c) => {
    const v = (s) => s.datos?.[c.id]?.[campo];
    const a = v(s0);
    const d = (s) => (a != null && v(s) != null && s.fecha !== s0.fecha ? a - v(s) : null);
    return { c, a, d1: d(s1), d7: d(s7), d30: d(s30) };
  });
  const top = filas.filter((f) => f.d7 != null).sort((x, y) => y.d7 - x.d7).slice(0, 10);
  $("#vista").innerHTML = `<h1>${titulo} <span class="sub">datos al ${s0.fecha}${s7.fecha !== s0.fecha ? ` · comparado con ${s7.fecha}` : " · las variaciones aparecen a partir del segundo día"}</span></h1>
  ${top.length ? `<div class="tarjeta"><h2>Mayor suba en 7 días</h2><div class="lienzo"><canvas id="ginf"></canvas></div></div>` : ""}
  <div class="tarjeta mt">${tabla([
    { t: "#", v: null, h: (f, i) => i + 1 },
    { t: "Canal", v: (f) => f.c.nombre, h: (f) => linkCanal(f.c) },
    { t: unidad, n: 1, v: (f) => f.a, h: (f) => `<b>${campo === "videos" ? entero(f.a) : fmt(f.a)}</b>` },
    { t: "24 h", n: 1, v: (f) => f.d1, h: (f) => varCelda(f.d1) },
    { t: "7 días", n: 1, v: (f) => f.d7, h: (f) => varCelda(f.d7) },
    { t: "30 días", n: 1, v: (f) => f.d30, h: (f) => varCelda(f.d30), cls: "ocultar-movil" },
  ], filas, { orden: top.length ? 4 : 2 })}</div>`;
  if (top.length) grafBarras("ginf", top.map((f) => f.c.nombre), top.map((f) => f.d7), { horizontal: true });
  return filas;
}
function varCelda(n) { return n == null ? '<span class="sub">—</span>' : `<span class="delta ${n > 0 ? "sube" : n < 0 ? "baja" : "sub"}">${n > 0 ? "+" : ""}${fmt(n)}</span>`; }
V.vistas = () => informe("vistas", "Visualizaciones", "Total");
V.suscriptores = () => informe("subs", "Suscriptores", "Suscriptores");
V.videos = async () => {
  await informe("videos", "Nuevos videos", "Videos");
  const [vids, can] = await Promise.all([D.videos(), D.canales()]);
  const desde = new Date(Date.now() - 2 * 86400e3).toISOString();
  const nuevos = Object.values(vids || {}).filter((v) => (v.publicado || "") >= desde).sort((x, y) => (y.publicado || "").localeCompare(x.publicado || ""));
  $("#vista").insertAdjacentHTML("beforeend", `<div class="tarjeta mt"><h2>Publicados en las últimas 48 horas <span class="sub">${nuevos.length} videos</span></h2>${tabla([
    { t: "Video", v: (v) => v.titulo, h: (v) => `<a href="${ytv(v.vid)}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:center"><img class="miniatura ocultar-movil" src="${thumb(v.vid)}" loading="lazy" alt=""><div><div class="titulo-l" style="white-space:normal">${esc(v.titulo)}</div><div class="sub">${nombre(can?.[v.cid])}</div></div></a>` },
    { t: "Publicado", v: (v) => v.publicado, h: (v) => new Date(v.publicado).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) },
    { t: "Vistas", n: 1, v: (v) => v.vistas, h: (v) => fmt(v.vistas) }], nuevos, { limite: 300 })}</div>`);
};

V.contenido = async () => {
  const [vids, can] = await Promise.all([D.videos(), D.canales()]);
  if (!vids) return sinDatos();
  $("#vista").innerHTML = `<h1>Contenido más visto</h1><div class="filtros"><div class="pestanas" id="per">${[["1", "24 horas"], ["7", "7 días"], ["30", "30 días"]].map(([v, t], i) => `<button data-v="${v}" class="${i === 1 ? "activo" : ""}">${t}</button>`).join("")}</div>
  <select id="f-cat"><option value="">Todas las categorías</option>${[...new Set(Object.values(can || {}).map((c) => c.cat))].sort().map((c) => `<option>${esc(c)}</option>`).join("")}</select></div><div class="tarjeta" id="t-cont"></div>`;
  let per = 7;
  const pintar = () => {
    const cat = $("#f-cat").value;
    const desde = new Date(Date.now() - per * 86400e3).toISOString();
    const lista = Object.values(vids).filter((v) => (v.publicado || "") >= desde && (!cat || can?.[v.cid]?.cat === cat));
    $("#t-cont").innerHTML = tabla([
      { t: "#", v: null, h: (v, i) => i + 1 },
      { t: "Video", v: (v) => v.titulo, h: (v) => `<a href="${ytv(v.vid)}" target="_blank" rel="noopener" style="display:flex;gap:10px;align-items:center"><img class="miniatura" src="${thumb(v.vid)}" loading="lazy" alt=""><div style="min-width:0"><div class="titulo-l" style="white-space:normal">${esc(v.titulo)}</div><div class="sub">${nombre(can?.[v.cid])} · ${(v.publicado || "").slice(0, 10)}</div></div></a>` },
      { t: "Vistas", n: 1, v: (v) => v.vistas, h: (v) => `<b>${fmt(v.vistas)}</b>` },
      { t: "Vistas por día", n: 1, v: (v) => v.vistas / Math.max(1, (Date.now() - new Date(v.publicado)) / 86400e3), h: (v) => fmt(v.vistas / Math.max(1, (Date.now() - new Date(v.publicado)) / 86400e3)), cls: "ocultar-movil" },
    ], lista, { orden: 2, limite: 200 });
  };
  $("#per").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; per = +b.dataset.v; [...$("#per").children].forEach((x) => x.classList.toggle("activo", x === b)); pintar(); };
  $("#f-cat").oninput = pintar;
  pintar();
};

V.podios = async () => {
  const [res, can, fin] = await Promise.all([D.resumen(), D.canales(), D.fin()]);
  if (!res || !can) return sinDatos();
  const fechas = Object.keys(res).sort();
  const periodos = { hoy: [hoyAR()], ayer: [hoyAR(1)], semana: fechas.slice(-7), mes: fechas.slice(-30) };
  $("#vista").innerHTML = `<h1>Podios globales</h1><div class="filtros"><div class="pestanas" id="per">${[["hoy", "Hoy"], ["ayer", "Ayer"], ["semana", "7 días"], ["mes", "30 días"]].map(([v, t], i) => `<button data-v="${v}" class="${i === 0 ? "activo" : ""}">${t}</button>`).join("")}</div>
  <div class="pestanas" id="crit"><button data-v="pico" class="activo">Por pico</button><button data-v="horas">Por horas vistas</button><button data-v="prom">Por promedio</button></div></div><div id="pod"></div>`;
  let per = "hoy", crit = "pico";
  const pintar = () => {
    const fs = periodos[per].filter((f) => res[f]);
    const agg = {};
    fs.forEach((f) => Object.entries(res[f]).forEach(([cid, r]) => {
      const a = (agg[cid] ||= { cid, pico: 0, horas: 0, min: 0, suma: 0, n: 0 });
      a.pico = Math.max(a.pico, r.pico); a.horas += r.horas; a.min += r.min; a.suma += r.prom * r.min; a.n += r.min;
    }));
    const lista = Object.values(agg).map((a) => ({ ...a, prom: a.n ? Math.round(a.suma / a.n) : 0 })).sort((x, y) => y[crit] - x[crit]);
    const [p1, p2, p3] = lista;
    const esc_ = (p, n) => p ? `<div class="escalon"><a href="#/canal/${p.cid}">${avatar(can[p.cid], "g")}</a><div class="nom">${nombre(can[p.cid])}</div><b>${fmt(p[crit])}</b><div class="base">${n}</div></div>` : "";
    const lim = { hoy: 1, ayer: 2, semana: 7, mes: 30 }[per];
    const ahoraT = Date.now() / 60000;
    const inicioHoy = Math.floor((Date.now() - 3 * 3600e3) / 86400e3) * 1440 + 180;
    const vivosTop = (fin || []).filter((f) => per === "hoy" ? f.fin >= inicioHoy : per === "ayer" ? f.fin >= inicioHoy - 1440 && f.fin < inicioHoy : f.fin >= ahoraT - lim * 1440).sort((x, y) => y.pico - x.pico).slice(0, 10);
    $("#pod").innerHTML = lista.length ? `<div class="tarjeta"><div class="podio">${esc_(p2, 2)}${esc_(p1, 1)}${esc_(p3, 3)}</div>
      ${tabla([{ t: "#", v: null, h: (x, i) => i + 1 }, { t: "Canal", v: (x) => can[x.cid]?.nombre, h: (x) => linkCanal(can[x.cid]) },
        { t: "Pico", n: 1, v: (x) => x.pico, h: (x) => fmt(x.pico) }, { t: "Promedio", n: 1, v: (x) => x.prom, h: (x) => fmt(x.prom) },
        { t: "Horas vistas", n: 1, v: (x) => x.horas, h: (x) => fmt(x.horas) }, { t: "Al aire", n: 1, v: (x) => x.min, h: (x) => dur(x.min), cls: "ocultar-movil" }], lista, { limite: 30 })}</div>
      <div class="tarjeta mt"><h2>Vivos con más audiencia</h2>${tabla([{ t: "Vivo", v: (f) => f.titulo, h: (f) => `<a href="${ytv(f.vid)}" target="_blank" rel="noopener">${esc(f.titulo)}</a><div class="sub">${nombre(can[f.cid])} · ${fechaHora(f.ini)}</div>` },
        { t: "Pico", n: 1, v: (f) => f.pico, h: (f) => `<b>${fmt(f.pico)}</b>` }, { t: "Promedio", n: 1, v: (f) => f.prom, h: (f) => fmt(f.prom) }], vivosTop)}</div>` : '<div class="vacio">Todavía no hay datos para este período</div>';
  };
  const pest = (sel, set) => ($(sel).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; set(b.dataset.v); [...$(sel).children].forEach((x) => x.classList.toggle("activo", x === b)); pintar(); });
  pest("#per", (v) => (per = v)); pest("#crit", (v) => (crit = v));
  pintar();
};

V.tendencias = async () => {
  const [res, can, s0, s7] = await Promise.all([D.resumen(), D.canales(), statsEn(0), statsEn(7)]);
  if (!res || !can) return sinDatos();
  const fechas = Object.keys(res).sort();
  const ult = fechas.slice(-7), prev = fechas.slice(-14, -7);
  const suma = (fs, cid, k) => fs.reduce((s, f) => s + (res[f]?.[cid]?.[k] || 0), 0);
  const maxi = (fs, cid) => Math.max(0, ...fs.map((f) => res[f]?.[cid]?.pico || 0));
  const filas = Object.values(can).map((c) => {
    const h = suma(ult, c.id, "horas"), hp = suma(prev, c.id, "horas");
    const sub0 = s0.datos?.[c.id]?.subs, sub7 = s7.datos?.[c.id]?.subs;
    return { c, h, hp, ph: prev.length >= 3 ? pct(h / ult.length, hp / prev.length) : null, pico: maxi(ult, c.id), picop: maxi(prev, c.id), dsubs: sub0 != null && sub7 != null && s0.fecha !== s7.fecha ? sub0 - sub7 : null };
  }).filter((f) => f.h || f.hp);
  const alza = filas.filter((f) => f.ph != null && f.hp / Math.max(1, prev.length) >= 20).sort((x, y) => y.ph - x.ph);
  const cols = [{ t: "Canal", v: (f) => f.c.nombre, h: (f) => linkCanal(f.c) },
    { t: "Horas vistas 7d", n: 1, v: (f) => f.h, h: (f) => fmt(f.h) },
    { t: "Semana anterior", n: 1, v: (f) => f.hp, h: (f) => fmt(f.hp), cls: "ocultar-movil" },
    { t: "Cambio", n: 1, v: (f) => f.ph, h: (f) => f.ph == null ? "—" : `<span class="delta ${f.ph >= 0 ? "sube" : "baja"}">${f.ph >= 0 ? "↑" : "↓"} ${Math.abs(f.ph).toLocaleString("es-AR")}%</span>` },
    { t: "Pico 7d", n: 1, v: (f) => f.pico, h: (f) => fmt(f.pico), cls: "ocultar-movil" },
    { t: "Suscriptores 7d", n: 1, v: (f) => f.dsubs, h: (f) => varCelda(f.dsubs), cls: "ocultar-movil" }];
  $("#vista").innerHTML = `<h1>Tendencias <span class="sub">últimos 7 días contra los 7 anteriores (promedio diario)${prev.length >= 3 ? "" : " (la comparación aparece cuando haya 8 días de datos)"}</span></h1>
  <div class="grid g2i"><div class="tarjeta"><h2>📈 En alza</h2>${tabla(cols.slice(0, 4), alza.slice(0, 10))}</div><div class="tarjeta"><h2>📉 En baja</h2>${tabla(cols.slice(0, 4), alza.slice().reverse().filter((f) => f.ph < 0).slice(0, 10))}</div></div>
  <div class="tarjeta mt"><h2>Total de espectadores por día</h2><div class="lienzo"><canvas id="gtd"></canvas></div></div>
  <div class="tarjeta mt"><h2>Todos los canales</h2>${tabla(cols, filas, { orden: 1 })}</div>`;
  const tot = (await D.totales()) || {};
  const ds = Object.keys(tot).sort();
  grafLineas("gtd", ds.map((d) => d.slice(8, 10) + "/" + d.slice(5, 7)), [
    { nombre: "Pico del día", datos: ds.map((d) => Math.max(0, ...tot[d].map((x) => x[1]))) },
    { nombre: "Promedio", datos: ds.map((d) => Math.round(tot[d].reduce((s, x) => s + x[1], 0) / Math.max(1, tot[d].length))) },
  ]);
};

V.comparar = async () => {
  const [can, a] = await Promise.all([D.canales(), D.ahora()]);
  if (!can) return sinDatos();
  const opts = Object.values(can).sort((x, y) => (x.nombre || "").localeCompare(y.nombre || ""));
  const pre = (sessionStorage.getItem("ld_comp") || "").split(",").filter((x) => can[x]);
  const top = Object.entries(a?.por_canal || {}).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
  const ini = pre.length ? pre : top.slice(0, 2);
  const sel = (i) => `<select class="sc"><option value="">— Canal ${i + 1} —</option>${opts.map((c) => `<option value="${c.id}" ${ini[i] === c.id ? "selected" : ""}>${nombre(c)}</option>`).join("")}</select>`;
  $("#vista").innerHTML = `<h1>Comparar canales</h1><div class="filtros">${[0, 1, 2, 3].map(sel).join("")}
  <select id="rango"><option value="0">Hoy</option><option value="1">Ayer</option><option value="7" selected>Últimos 7 días</option><option value="30">Últimos 30 días</option></select></div><div id="comp"></div>`;
  const pintar = async () => {
    limpiarGraficos();
    const ids = [...document.querySelectorAll(".sc")].map((s) => s.value).filter(Boolean);
    try { sessionStorage.setItem("ld_comp", ids.join(",")); } catch {}
    if (!ids.length) return ($("#comp").innerHTML = '<div class="vacio">Elegí al menos un canal</div>');
    const r = +$("#rango").value;
    let fechas = r === 0 ? [hoyAR()] : r === 1 ? [hoyAR(1)] : await fechasDisponibles(r);
    $("#comp").innerHTML = '<div class="cargando">Cargando…</div>';
    const { tiempos, porCanal } = await seriesCanales(fechas);
    const [res, s0, s7] = await Promise.all([D.resumen(), statsEn(0), statsEn(7)]);
    const rf = r === 0 ? [hoyAR()] : r === 1 ? [hoyAR(1)] : Object.keys(res || {}).sort().slice(-r);
    const fila = (cid) => {
      const rr = rf.map((f) => res?.[f]?.[cid]).filter(Boolean);
      const min = rr.reduce((s, x) => s + x.min, 0);
      return { c: can[cid], ahora: a?.por_canal?.[cid] || 0, pico: Math.max(0, ...rr.map((x) => x.pico)), horas: rr.reduce((s, x) => s + x.horas, 0), min,
        prom: min ? Math.round(rr.reduce((s, x) => s + x.prom * x.min, 0) / min) : 0, subs: s0.datos?.[cid]?.subs, dsubs: s7.fecha !== s0.fecha && s0.datos?.[cid]?.subs != null && s7.datos?.[cid]?.subs != null ? s0.datos[cid].subs - s7.datos[cid].subs : null, vistas: s0.datos?.[cid]?.vistas };
    };
    const filas = ids.map(fila);
    const met = [["Ahora", "ahora"], ["Pico", "pico"], ["Promedio en vivo", "prom"], ["Horas vistas", "horas"], ["Tiempo al aire", "min"], ["Suscriptores", "subs"], ["Suscriptores (7d)", "dsubs"], ["Visualizaciones", "vistas"]];
    $("#comp").innerHTML = `<div class="tarjeta"><h2>Espectadores</h2><div class="lienzo alto"><canvas id="gcomp"></canvas></div></div>
      <div class="tarjeta mt"><div class="tabla-wrap"><table><thead><tr><th></th>${filas.map((f, i) => `<th class="n" style="color:${COLORES[i]}">${nombre(f.c)}</th>`).join("")}</tr></thead><tbody>
      ${met.map(([t, k]) => { const vals = filas.map((f) => f[k]); const mx = Math.max(...vals.filter((v) => v != null)); return `<tr><td>${t}</td>${vals.map((v) => `<td class="n" style="${v === mx && filas.length > 1 && v ? "color:var(--verde);font-weight:700" : ""}">${k === "min" ? dur(v) : k === "dsubs" ? varCelda(v) : fmt(v)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div></div>`;
    grafLineas("gcomp", tiempos.map(fechas.length > 1 ? fechaHora : horaDe), ids.map((cid) => ({ nombre: can[cid].nombre, datos: tiempos.map((t) => porCanal[cid]?.[t] ?? 0) })), { maxTicks: 10 });
  };
  document.querySelectorAll(".sc, #rango").forEach((s) => s.addEventListener("change", pintar));
  pintar();
};

function sinDatos() {
  $("#vista").innerHTML = `<div class="tarjeta vacio"><h2 style="justify-content:center">Juntando datos…</h2>El recolector toma una muestra cada 10 minutos. Si recién se puso en marcha, en unos minutos aparece la primera.</div>`;
}

/* ------------------------------------------------------------ navegación */
async function ruta() {
  limpiarGraficos();
  clearInterval(pizarraTimer);
  const [r, arg] = (location.hash.replace(/^#\/?/, "") || "dash").split("/");
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("activo", a.dataset.r === r));
  $("#menu").classList.remove("abierto"); $("#velo").classList.add("oculto");
  $("#vista").innerHTML = '<div class="cargando">Cargando…</div>';
  window.scrollTo(0, 0);
  try { await (V[r] || V.dash)(arg); } catch (e) { console.error(e); $("#vista").innerHTML = `<div class="vacio">No se pudo mostrar esta sección. Probá recargar.</div>`; }
  actualizado();
}
async function actualizado() {
  const a = await D.ahora();
  if (a) { const m = Math.round(Date.now() / 60000 - a.t); $("#actualizado").innerHTML = `<span class="vivo-dot"></span> Actualizado ${m <= 1 ? "recién" : `hace ${m} min`}`; }
}
window.addEventListener("hashchange", ruta);
$("#btn-menu").onclick = () => { $("#menu").classList.add("abierto"); $("#velo").classList.remove("oculto"); };
$("#velo").onclick = () => { $("#menu").classList.remove("abierto"); $("#velo").classList.add("oculto"); };

/* buscador */
$("#buscar").addEventListener("input", async (e) => {
  const q = e.target.value.trim().toLowerCase(), box = $("#resultados");
  if (!q) return box.classList.add("oculto");
  const can = (await D.canales()) || {};
  const r = Object.values(can).filter((c) => (c.nombre || "").toLowerCase().includes(q) || (c.handle || "").toLowerCase().includes(q)).slice(0, 10);
  box.innerHTML = r.map((c) => `<a href="#/canal/${c.id}">${avatar(c)} ${nombre(c)} <span class="sub" style="margin-left:auto">${esc(c.cat)}</span></a>`).join("") || '<div class="vacio">Sin resultados</div>';
  box.classList.remove("oculto");
});
document.addEventListener("click", (e) => { if (!e.target.closest(".buscador")) $("#resultados").classList.add("oculto"); else if (e.target.closest("#resultados a")) { $("#resultados").classList.add("oculto"); $("#buscar").value = ""; } });

/* refresco automático del dashboard y la lista en vivo */
setInterval(() => { const r = location.hash.replace(/^#\/?/, "").split("/")[0] || "dash"; if (["dash", "en-vivo"].includes(r) && !document.hidden) ruta(); else actualizado(); }, 5 * 60000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
ruta();
