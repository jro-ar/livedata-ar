#!/usr/bin/env python3
"""
Recolector de LiveData AR.
Cada 10 minutos mira en YouTube que canales estan en vivo y cuanta gente los mira.
Guarda todo en la carpeta "datos" (que se sube a la rama "datos" del repositorio).
No usa claves: lee la misma informacion publica que ve cualquier visitante de YouTube.
"""
import json, os, re, sys, time, subprocess, traceback, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

AR = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.environ.get("DATOS_DIR", os.path.join(RAIZ, "datos"))
CANALES_CFG = os.path.join(RAIZ, "canales.json")
DIAS_GUARDADOS = 35          # dias de detalle cada 10 minutos
FINALIZADOS_MAX = 3000
INTERVALO_MIN = 10
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
CLIENTE = {"clientName": "WEB", "clientVersion": "2.20251120.01.00", "hl": "en", "gl": "AR", "timeZone": "America/Argentina/Buenos_Aires"}
P_STREAMS = "EgdzdHJlYW1z8gYECgJ6AA%3D%3D"
P_ABOUT = "EgVhYm91dPIGBAoCEgA%3D"
P_BUSCAR_CANAL = "EgIQAg%3D%3D"

def log(*a):
    print(datetime.now(AR).strftime("%H:%M:%S"), *a, flush=True)

# ---------------------------------------------------------------- red
def http(url, data=None, intentos=3, timeout=25):
    ult = None
    for i in range(intentos):
        try:
            h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9",
                 "Cookie": "CONSENT=YES+cb; SOCS=CAI; PREF=hl=en&gl=AR"}
            body = None
            if data is not None:
                body = json.dumps(data).encode()
                h["Content-Type"] = "application/json"
                h["Origin"] = "https://www.youtube.com"
                h["X-Youtube-Client-Name"] = "1"
                h["X-Youtube-Client-Version"] = CLIENTE["clientVersion"]
            req = urllib.request.Request(url, data=body, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            ult = e
            time.sleep(1.5 * (i + 1))
    raise ult

def yt(endpoint, **campos):
    cuerpo = {"context": {"client": CLIENTE}}
    cuerpo.update(campos)
    txt = http(f"https://www.youtube.com/youtubei/v1/{endpoint}?prettyPrint=false", cuerpo)
    return json.loads(txt)

# ---------------------------------------------------------------- utilidades
def recorrer(o):
    """Recorre todo el JSON devolviendo cada diccionario."""
    pila = [o]
    while pila:
        x = pila.pop()
        if isinstance(x, dict):
            yield x
            pila.extend(x.values())
        elif isinstance(x, list):
            pila.extend(x)

def texto(t):
    if t is None: return ""
    if isinstance(t, str): return t
    if "simpleText" in t: return t["simpleText"]
    if "runs" in t: return "".join(r.get("text", "") for r in t["runs"])
    if "content" in t: return t["content"]
    return ""

def numero(s):
    """'12,345 watching' -> 12345 ; '1.2M subscribers' -> 1200000"""
    if s is None: return None
    s = str(s).replace(" ", " ").strip()
    m = re.search(r"([\d][\d,\.]*)\s*([KMB])?\b", s, re.I)
    if not m: return None
    num, suf = m.group(1), (m.group(2) or "").upper()
    if suf:
        try:
            return int(float(num.replace(",", "")) * {"K": 1e3, "M": 1e6, "B": 1e9}[suf])
        except ValueError:
            return None
    d = re.sub(r"[^\d]", "", num)
    return int(d) if d else None

def leer(nombre, defecto):
    p = os.path.join(DATOS, nombre)
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return defecto

def escribir(nombre, obj):
    p = os.path.join(DATOS, nombre)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)

def ahora_ar():
    return datetime.now(AR)

def fecha(dt):
    return dt.strftime("%Y-%m-%d")

# ---------------------------------------------------------------- YouTube
def resolver_handle(handle):
    try:
        r = yt("navigation/resolve_url", url=f"https://www.youtube.com/{handle}")
        cid = r.get("endpoint", {}).get("browseEndpoint", {}).get("browseId")
        if cid and cid.startswith("UC"):
            return cid
    except Exception:
        pass
    return None

def buscar_canal(q):
    try:
        r = yt("search", query=q, params=P_BUSCAR_CANAL)
        for d in recorrer(r):
            cr = d.get("channelRenderer")
            if cr and cr.get("channelId"):
                return cr["channelId"]
    except Exception:
        pass
    return None

def info_canal(cid):
    """Nombre, foto, suscriptores, vistas totales y cantidad de videos (panel "Acerca de")."""
    r = yt("browse", browseId=cid, params=P_STREAMS)
    out = {"id": cid}
    md = r.get("metadata", {}).get("channelMetadataRenderer", {})
    if md:
        out["nombre"] = md.get("title")
        th = md.get("avatar", {}).get("thumbnails", [])
        if th: out["imagen"] = th[-1]["url"]
        out["handle"] = (md.get("vanityChannelUrl") or "").rsplit("/", 1)[-1] or None
    header = r.get("header", {})
    hs = json.dumps(header)
    out["verificado"] = "CHECK_CIRCLE" in hs or "BADGE_STYLE_TYPE_VERIFIED" in hs
    m = re.search(r'"([\d\.,]+[KMB]?) subscribers"', hs)
    if m: out["subs"] = numero(m.group(1))
    for tok in re.findall(r'"token": "([^"]+)"', hs)[:2]:
        try:
            r2 = yt("browse", continuation=tok)
        except Exception:
            continue
        for d in recorrer(r2):
            a = d.get("aboutChannelViewModel")
            if a:
                out["subs"] = numero(a.get("subscriberCountText")) or out.get("subs")
                out["vistas"] = numero(a.get("viewCountText"))
                out["videos"] = numero(a.get("videoCountText"))
                out["pais"] = a.get("country")
                return out
    return out

def vivos_del_canal(cid):
    """Devuelve los videos que el canal tiene EN VIVO ahora (id, titulo, espectadores aproximados)."""
    r = yt("browse", browseId=cid, params=P_STREAMS)
    vistos, res = set(), []
    for d in recorrer(r):
        vr = d.get("videoRenderer") or d.get("gridVideoRenderer")
        if vr and vr.get("videoId"):
            s = json.dumps(vr)
            vivo = ("BADGE_STYLE_TYPE_LIVE_NOW" in s) or ('"style": "LIVE"' in s) or (" watching" in texto(vr.get("viewCountText")))
            if vivo and "UPCOMING" not in s and vr["videoId"] not in vistos:
                vistos.add(vr["videoId"])
                res.append({"vid": vr["videoId"], "titulo": texto(vr.get("title")),
                            "aprox": numero(texto(vr.get("viewCountText")))})
            continue
        lv = d.get("lockupViewModel")
        if lv and lv.get("contentId") and lv.get("contentType", "").endswith("VIDEO"):
            s = json.dumps(lv)
            if (" watching" in s or '"LIVE"' in s) and "UPCOMING" not in s and lv["contentId"] not in vistos:
                vistos.add(lv["contentId"])
                tit = ""
                for x in recorrer(lv):
                    if "lockupMetadataViewModel" in x:
                        tit = texto(x["lockupMetadataViewModel"].get("title")); break
                m = re.search(r'"([\d\.,]+[KMB]?) watching', s)
                res.append({"vid": lv["contentId"], "titulo": tit, "aprox": numero(m.group(1)) if m else None})
    return res

def detalle_vivo(vid):
    """Cantidad exacta de espectadores en este momento (lo mismo que muestra YouTube debajo del video)."""
    r = yt("updated_metadata", videoId=vid)
    out = {"vivo": None, "viewers": None, "titulo": None}
    for d in recorrer(r):
        v = d.get("videoViewCountRenderer")
        if v:
            out["vivo"] = bool(v.get("isLive"))
            out["viewers"] = numero(v.get("originalViewCount")) or numero(texto(v.get("viewCount")))
        if "updateTitleAction" in d:
            out["titulo"] = texto(d["updateTitleAction"].get("title"))
    return out

def rss(cid):
    txt = http(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}")
    ns = {"a": "http://www.w3.org/2005/Atom", "m": "http://search.yahoo.com/mrss/", "y": "http://www.youtube.com/xml/schemas/2015"}
    root = ET.fromstring(txt)
    out = []
    for e in root.findall("a:entry", ns):
        vid = e.findtext("y:videoId", namespaces=ns)
        st = e.find("m:group/m:community/m:statistics", ns)
        out.append({"vid": vid, "cid": cid, "titulo": e.findtext("a:title", namespaces=ns),
                    "publicado": e.findtext("a:published", namespaces=ns),
                    "vistas": int(st.get("views")) if st is not None and st.get("views") else None})
    return out

# ---------------------------------------------------------------- pasos
def asegurar_canales():
    cfg = json.load(open(CANALES_CFG, encoding="utf-8"))
    canales = leer("canales.json", {})
    por_handle = {c.get("cfg_handle"): cid for cid, c in canales.items()}
    nuevos = 0
    for c in cfg:
        h = c["handle"]
        if h in por_handle:
            canales[por_handle[h]]["cat"] = c["cat"]
            continue
        cid = c.get("id") or resolver_handle(h) or buscar_canal(c.get("busqueda") or h)
        if not cid:
            log("NO ENCONTRADO", h); continue
        if cid in canales:
            canales[cid]["cfg_handle"] = h; canales[cid]["cat"] = c["cat"]; continue
        canales[cid] = {"id": cid, "cfg_handle": h, "cat": c["cat"], "nombre": c.get("busqueda") or h, "imagen": None}
        nuevos += 1
    # sacar los que ya no estan en la lista
    hs = {c["handle"] for c in cfg}
    canales = {k: v for k, v in canales.items() if v.get("cfg_handle") in hs}
    if nuevos:
        log("canales nuevos:", nuevos)
    return canales

def actualizar_estadisticas(canales, hoy):
    """Una vez cada 6 horas: suscriptores, vistas, videos y ultimos videos."""
    log("actualizando estadisticas de", len(canales), "canales")
    stats = leer(f"stats/{hoy}.json", {})
    def uno(cid):
        try: return cid, info_canal(cid)
        except Exception as e: return cid, None
    with ThreadPoolExecutor(8) as ex:
        for cid, inf in ex.map(uno, list(canales)):
            if not inf: continue
            c = canales[cid]
            for k in ("nombre", "imagen", "verificado", "handle"):
                if inf.get(k) is not None: c[k] = inf[k]
            stats[cid] = {k: inf.get(k) for k in ("subs", "vistas", "videos")}
    escribir(f"stats/{hoy}.json", stats)
    # ultimos videos (RSS)
    videos = leer("videos.json", {})
    def uno_rss(cid):
        try: return rss(cid)
        except Exception: return []
    with ThreadPoolExecutor(8) as ex:
        for lista in ex.map(uno_rss, list(canales)):
            for v in lista:
                ant = videos.get(v["vid"], {})
                hist = ant.get("h", {})
                if v["vistas"] is not None: hist[hoy] = v["vistas"]
                v["h"] = dict(sorted(hist.items())[-40:])
                videos[v["vid"]] = v
    limite = (ahora_ar() - timedelta(days=45)).isoformat()
    videos = {k: v for k, v in videos.items() if (v.get("publicado") or "") >= limite[:10]}
    escribir("videos.json", videos)
    # indice de dias con estadisticas
    idx = sorted(f[:-5] for f in os.listdir(os.path.join(DATOS, "stats")) if f.endswith(".json"))
    escribir("stats_indice.json", idx[-400:])

def muestra(canales):
    t0 = time.time()
    def uno(cid):
        try: return cid, vivos_del_canal(cid), None
        except Exception as e: return cid, [], str(e)[:100]
    vivos, errores = [], 0
    with ThreadPoolExecutor(10) as ex:
        for cid, lista, err in ex.map(uno, list(canales)):
            if err: errores += 1
            for v in lista:
                v["cid"] = cid; vivos.append(v)
    def det(v):
        try: return v, detalle_vivo(v["vid"])
        except Exception: return v, {"vivo": None, "viewers": None, "titulo": None}
    res = []
    with ThreadPoolExecutor(10) as ex:
        for v, d in ex.map(det, vivos):
            if d["vivo"] is False:
                continue
            viewers = d["viewers"] if d["viewers"] is not None else v.get("aprox")
            if viewers is None:
                continue
            res.append({"vid": v["vid"], "cid": v["cid"], "titulo": d["titulo"] or v["titulo"], "viewers": viewers})
    log(f"muestra: {len(res)} vivos, {sum(x['viewers'] for x in res)} espectadores, {errores} errores, {time.time()-t0:.0f}s")
    return res, errores

def por_canal(muestra_d, vidmeta):
    out = {}
    for vid, n in muestra_d.items():
        cid = vidmeta.get(vid, {}).get("cid")
        if cid: out[cid] = out.get(cid, 0) + n
    return out

def valor_cercano(dia, tmin, tolerancia=20):
    """Busca en un archivo de dia la muestra mas cercana a tmin (minutos epoch)."""
    if not dia or not dia.get("m"): return None
    mejor = min(dia["m"], key=lambda s: abs(s["t"] - tmin))
    return mejor if abs(mejor["t"] - tmin) <= tolerancia else None

def resumir_dia(dia):
    """Por canal: pico, promedio, minutos en vivo, horas vistas."""
    meta = dia.get("vids", {})
    res = {}
    for s in dia.get("m", []):
        pc = por_canal(s["d"], meta)
        for cid, n in pc.items():
            r = res.setdefault(cid, {"pico": 0, "suma": 0, "n": 0})
            r["pico"] = max(r["pico"], n); r["suma"] += n; r["n"] += 1
    out = {}
    for cid, r in res.items():
        out[cid] = {"pico": r["pico"], "prom": round(r["suma"] / r["n"]), "min": r["n"] * INTERVALO_MIN,
                    "horas": round(r["suma"] * INTERVALO_MIN / 60)}
    return out

def guardar(canales, vivos, errores):
    ahora = ahora_ar()
    hoy, ayer = fecha(ahora), fecha(ahora - timedelta(days=1))
    tmin = int(ahora.timestamp() // 60)
    os.makedirs(os.path.join(DATOS, "dia"), exist_ok=True)

    # si fallaron casi todos los canales, no guardamos una muestra falsa en cero
    if errores > len(canales) * 0.5:
        log("demasiados errores, muestra descartada"); return

    dia = leer(f"dia/{hoy}.json", {"fecha": hoy, "m": [], "vids": {}})
    vids = dia["vids"]
    d = {}
    for v in vivos:
        d[v["vid"]] = v["viewers"]
        meta = vids.setdefault(v["vid"], {"cid": v["cid"], "titulo": v["titulo"], "ini": tmin})
        meta["titulo"] = v["titulo"] or meta.get("titulo")
    dia["m"].append({"t": tmin, "d": d})
    escribir(f"dia/{hoy}.json", dia)

    # ---- vivos activos y finalizados
    activos = leer("activos.json", {})
    fin = leer("finalizados.json", [])
    vivos_ids = set(d)
    for v in vivos:
        a = activos.get(v["vid"])
        if not a:
            a = activos[v["vid"]] = {"vid": v["vid"], "cid": v["cid"], "titulo": v["titulo"], "ini": tmin,
                                     "pico": 0, "pico_t": tmin, "suma": 0, "n": 0, "faltas": 0}
        a["titulo"] = v["titulo"] or a["titulo"]
        a["ult"] = tmin; a["faltas"] = 0
        a["suma"] += v["viewers"]; a["n"] += 1
        if v["viewers"] > a["pico"]: a["pico"], a["pico_t"] = v["viewers"], tmin
    for vid in list(activos):
        if vid in vivos_ids: continue
        a = activos[vid]; a["faltas"] = a.get("faltas", 0) + 1
        if a["faltas"] >= 2 or tmin - a.get("ult", tmin) > 60:
            fin.insert(0, {"vid": vid, "cid": a["cid"], "titulo": a["titulo"], "ini": a["ini"], "fin": a.get("ult", tmin),
                           "dur": a.get("ult", tmin) - a["ini"] + INTERVALO_MIN, "pico": a["pico"], "pico_t": a["pico_t"],
                           "prom": round(a["suma"] / max(a["n"], 1))})
            del activos[vid]
    escribir("activos.json", activos)
    escribir("finalizados.json", fin[:FINALIZADOS_MAX])

    # ---- resumen del dia y comparaciones con ayer
    dia_ayer = leer(f"dia/{ayer}.json", None)
    pc = por_canal(d, vids)
    total = sum(d.values())
    s_ayer = valor_cercano(dia_ayer, tmin - 1440)
    pc_ayer = por_canal(s_ayer["d"], dia_ayer["vids"]) if s_ayer else {}
    total_ayer = sum(s_ayer["d"].values()) if s_ayer else None
    tot_hoy = [(s["t"], sum(s["d"].values())) for s in dia["m"]]
    pico_t, pico_v = max(tot_hoy, key=lambda x: x[1])
    pico_ayer_hasta = None
    if dia_ayer:
        prev = [sum(s["d"].values()) for s in dia_ayer["m"] if s["t"] <= tmin - 1440]
        pico_ayer_hasta = max(prev) if prev else None

    def pct(a, b):
        return round((a - b) * 100 / b, 1) if b else None

    lives = []
    for v in sorted(vivos, key=lambda x: -x["viewers"]):
        a = activos.get(v["vid"], {})
        lives.append({"vid": v["vid"], "cid": v["cid"], "titulo": v["titulo"], "viewers": v["viewers"],
                      "ini": a.get("ini"), "pico": a.get("pico"),
                      "delta_pct": pct(pc.get(v["cid"], 0), pc_ayer.get(v["cid"])) if pc_ayer.get(v["cid"]) else None})
    cats = {}
    for cid, n in pc.items():
        cat = canales.get(cid, {}).get("cat", "Otros")
        c = cats.setdefault(cat, {"viewers": 0, "lider": None, "lider_v": 0, "canales": 0})
        c["viewers"] += n; c["canales"] += 1
        if n > c["lider_v"]: c["lider"], c["lider_v"] = cid, n
    escribir("ahora.json", {
        "t": tmin, "iso": ahora.isoformat(timespec="seconds"),
        "total": total, "total_ayer": total_ayer, "delta_pct": pct(total, total_ayer),
        "pico_dia": pico_v, "pico_dia_t": pico_t, "pico_ayer_hasta": pico_ayer_hasta, "pico_delta_pct": pct(pico_v, pico_ayer_hasta),
        "canales_en_vivo": len(pc), "vivos": len(lives),
        "lives": lives, "por_canal": pc, "por_canal_ayer": pc_ayer, "categorias": cats,
    })

    # ---- resumen por dia (para podios, tendencias, informes)
    resumen = leer("resumen_dias.json", {})
    resumen[hoy] = resumir_dia(dia)
    if dia_ayer and ayer not in resumen:
        resumen[ayer] = resumir_dia(dia_ayer)
    resumen = dict(sorted(resumen.items())[-400:])
    escribir("resumen_dias.json", resumen)

    # ---- totales por dia (total de espectadores cada 10 min, liviano, para graficos largos)
    totales = leer("totales.json", {})
    totales[hoy] = [[s["t"], sum(s["d"].values())] for s in dia["m"]]
    totales = dict(sorted(totales.items())[-DIAS_GUARDADOS:])
    escribir("totales.json", totales)

    # ---- mapa de calor: promedio de espectadores por dia de semana y hora (ultimas 4 semanas)
    acc = {}
    for f, serie in totales.items():
        for t, n in serie:
            dt = datetime.fromtimestamp(t * 60, AR)
            k = (dt.weekday(), dt.hour)
            a = acc.setdefault(k, [0, 0]); a[0] += n; a[1] += 1
    heat = [{"dia": k[0], "hora": k[1], "prom": round(v[0] / v[1])} for k, v in sorted(acc.items())]
    escribir("heatmap.json", heat)

    # ---- indice de dias disponibles y limpieza
    dias = sorted(f[:-5] for f in os.listdir(os.path.join(DATOS, "dia")) if f.endswith(".json"))
    for viejo in dias[:-DIAS_GUARDADOS]:
        os.remove(os.path.join(DATOS, "dia", viejo + ".json"))
    escribir("dias.json", dias[-DIAS_GUARDADOS:])
    escribir("canales.json", canales)

def subir():
    token = os.environ.get("GH_TOKEN"); repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        log("(sin token: no se sube)"); return
    def g(*a):
        subprocess.run(["git", *a], cwd=DATOS, check=True, capture_output=True)
    if os.path.isdir(os.path.join(DATOS, ".git")):
        subprocess.run(["rm", "-rf", os.path.join(DATOS, ".git")], check=True)
    g("init", "-q"); g("checkout", "-q", "-b", "datos")
    g("config", "user.name", "livedata-bot"); g("config", "user.email", "livedata-bot@users.noreply.github.com")
    g("add", "-A"); g("commit", "-q", "-m", "datos " + ahora_ar().strftime("%Y-%m-%d %H:%M"))
    for i in range(3):
        r = subprocess.run(["git", "push", "-q", "-f", f"https://x-access-token:{token}@github.com/{repo}.git", "datos:datos"],
                           cwd=DATOS, capture_output=True, text=True)
        if r.returncode == 0:
            log("subido"); return
        log("error al subir, reintento", r.stderr[-200:]); time.sleep(5)

def una_vuelta():
    os.makedirs(DATOS, exist_ok=True)
    canales = asegurar_canales()
    ahora = ahora_ar(); hoy = fecha(ahora)
    ult = leer("ult_stats.json", {"t": 0})
    if time.time() - ult["t"] > 6 * 3600 or not os.path.exists(os.path.join(DATOS, f"stats/{hoy}.json")):
        try:
            actualizar_estadisticas(canales, hoy)
            escribir("ult_stats.json", {"t": time.time()})
        except Exception:
            traceback.print_exc()
    vivos, errores = muestra(canales)
    guardar(canales, vivos, errores)
    subir()

def prueba():
    for h in ("@LuzuTV", "@c5n"):
        cid = resolver_handle(h)
        log("resolver", h, cid)
        if not cid: continue
        try: log("info", info_canal(cid))
        except Exception as e: log("info ERROR", e)
        try:
            vs = vivos_del_canal(cid); log("vivos", vs)
            for v in vs[:3]: log("detalle", v["vid"], detalle_vivo(v["vid"]))
        except Exception as e: log("vivos ERROR", e)

def buscar_lista():
    qs = ["TN Todo Noticias en vivo", "LN+", "IP Noticias", "Television Publica Argentina", "America TV", "Net TV", "Blender", "La Casa streaming",
          "Azz", "Picante", "El Destape", "Canal E", "Radio con Vos", "Radio 10", "AM750", "Aspen 102.3", "Radio Continental 590", "ESPN Argentina",
          "Ole", "DSports", "Seleccion Argentina", "Boca Juniors", "Senado Argentina", "Javier Milei", "Metro 95.1", "Rock and Pop 95.9", "Urbana Play",
          "Telefe Noticias", "Gravedad Zero", "Cronica TV", "Congreso Argentino diputados", "TyC Sports", "Futurock", "Republica Z", "Carajo", "Neura"]
    for q in qs:
        try:
            r = yt("search", query=q, params=P_BUSCAR_CANAL)
            res = []
            for d in recorrer(r):
                cr = d.get("channelRenderer")
                if cr:
                    res.append((cr.get("channelId"), texto(cr.get("title")), texto(cr.get("subscriberCountText")), texto(cr.get("videoCountText"))))
            res = res[:4]
            log("BUSCAR", q, "=>", " | ".join(f"{a} {b} [{c} / {d}]" for a, b, c, d in res))
        except Exception as e:
            log("BUSCAR", q, "ERROR", e)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "buscar":
        return buscar_lista()
    if len(sys.argv) > 1 and sys.argv[1] == "prueba":
        return prueba()
    minutos = float(sys.argv[1]) if len(sys.argv) > 1 else 0
    fin = time.time() + minutos * 60
    while True:
        inicio = time.time()
        try:
            una_vuelta()
        except Exception:
            traceback.print_exc()
        espera = INTERVALO_MIN * 60 - (time.time() - inicio)
        if time.time() + espera > fin:
            break
        time.sleep(max(espera, 30))

if __name__ == "__main__":
    main()
