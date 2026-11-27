#!/usr/bin/env python3
"""
Recolector de VivosAR.
- Cada 2 minutos actualiza los espectadores de los vivos argentinos.
- Cada 10 minutos revisa todos los canales seguidos (Argentina y otros 15 paises) y guarda la muestra.
- Cada 30 minutos (Argentina) / 2 horas (resto) busca vivos nuevos en YouTube y suma los canales solos.
- Cada 6 horas actualiza suscriptores, visualizaciones, videos y ultimos videos/shorts.
Todo se guarda en la carpeta "datos" (rama "datos" del repositorio). No usa claves.
"""
import json, os, re, sys, time, subprocess, traceback, unicodedata, urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

AR = timezone(timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.environ.get("DATOS_DIR", os.path.join(RAIZ, "datos"))
CANALES_CFG = os.path.join(RAIZ, "canales.json")
VERSION_DATOS = "3"
DIAS_GUARDADOS = 35
FINALIZADOS_MAX = 4000
TICK_MIN = 2            # actualizacion rapida (Argentina)
MUESTRA_MIN = 10        # muestra completa
RECIENTE_HORAS = 12
MAX_CANALES_PAIS = 45   # canales seguidos por pais (fuera de Argentina)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
CLIENTE = {"clientName": "WEB", "clientVersion": "2.20251120.01.00", "hl": "en", "gl": "AR", "timeZone": "America/Argentina/Buenos_Aires"}
P_STREAMS = "EgdzdHJlYW1z8gYECgJ6AA%3D%3D"
P_BUSCAR_CANAL = "EgIQAg%3D%3D"
P_BUSCAR_VIVO = "EgJAAQ%3D%3D"

Q_ES = ["en vivo", "en directo", "noticias en vivo", "radio en vivo", "stream en vivo", "tv en vivo", "futbol en vivo", "en vivo hoy"]
Q_EN = ["live", "live news", "live stream", "24/7 live", "radio live", "live now"]
Q_PT = ["ao vivo", "notícias ao vivo", "rádio ao vivo", "live ao vivo", "futebol ao vivo"]
PAISES = {
    "AR": {"nombre": "Argentina", "en": "Argentina", "hl": "es", "q": ["en vivo", "en vivo argentina", "streaming argentina", "stream en vivo", "radio en vivo", "fm en vivo",
           "noticias en vivo", "canal en vivo", "tv en vivo argentina", "futbol argentino en vivo", "en directo argentina", "programa en vivo", "aire en vivo",
           "vivo hoy", "en vivo buenos aires", "en vivo cordoba", "en vivo rosario", "en vivo mendoza", "en vivo santa fe", "en vivo tucuman", "en vivo la plata",
           "en vivo mar del plata", "en vivo salta", "en vivo neuquen", "radio argentina", "stream", "envivo", "live argentina", "podcast en vivo", "streaming en vivo",
           "canal de streaming", "en vivo futbol", "en vivo politica", "en vivo musica", "en vivo humor"]},
    "CO": {"nombre": "Colombia", "en": "Colombia", "hl": "es", "q": Q_ES},
    "BR": {"nombre": "Brasil", "en": "Brazil", "hl": "pt", "q": Q_PT},
    "ES": {"nombre": "España", "en": "Spain", "hl": "es", "q": Q_ES},
    "US": {"nombre": "Estados Unidos", "en": "United States", "hl": "en", "q": Q_EN},
    "MX": {"nombre": "México", "en": "Mexico", "hl": "es", "q": Q_ES},
    "CL": {"nombre": "Chile", "en": "Chile", "hl": "es", "q": Q_ES},
    "PE": {"nombre": "Perú", "en": "Peru", "hl": "es", "q": Q_ES},
    "GB": {"nombre": "Reino Unido", "en": "United Kingdom", "hl": "en", "q": Q_EN},
    "IN": {"nombre": "India", "en": "India", "hl": "en", "q": Q_EN},
    "UY": {"nombre": "Uruguay", "en": "Uruguay", "hl": "es", "q": Q_ES},
    "PY": {"nombre": "Paraguay", "en": "Paraguay", "hl": "es", "q": Q_ES},
    "BO": {"nombre": "Bolivia", "en": "Bolivia", "hl": "es", "q": Q_ES},
    "CA": {"nombre": "Canadá", "en": "Canada", "hl": "en", "q": Q_EN},
    "DO": {"nombre": "República Dominicana", "en": "Dominican Republic", "hl": "es", "q": Q_ES},
    "EC": {"nombre": "Ecuador", "en": "Ecuador", "hl": "es", "q": Q_ES},
}
EN_A_ISO = {v["en"]: k for k, v in PAISES.items()}
CATEGORIAS = ["Televisión", "Streaming", "Radio", "Noticias y Periodismo", "Deportes", "Música", "Gaming y Esports", "Entretenimiento",
              "Contenido Infantil", "Política y Opinión", "Gobierno e Institucional", "Youtubers", "Educación y Aprendizaje", "Tecnología",
              "Naturaleza y Animales", "Economía y Finanzas", "Religioso y Espiritual", "Marcas y Empresas", "Otros / Especializados"]

def log(*a):
    print(datetime.now(AR).strftime("%H:%M:%S"), *a, flush=True)

# ---------------------------------------------------------------- red
def http(url, data=None, intentos=3, timeout=25):
    ult = None
    for i in range(intentos):
        try:
            h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", "Cookie": "CONSENT=YES+cb; SOCS=CAI; PREF=hl=en&gl=AR"}
            body = None
            if data is not None:
                body = json.dumps(data).encode()
                h.update({"Content-Type": "application/json", "Origin": "https://www.youtube.com",
                          "X-Youtube-Client-Name": "1", "X-Youtube-Client-Version": CLIENTE["clientVersion"]})
            req = urllib.request.Request(url, data=body, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            ult = e
            if "404" in str(e): break
            time.sleep(1.5 * (i + 1))
    raise ult

def yt(endpoint, gl=None, **campos):
    cli = dict(CLIENTE)
    if gl: cli["gl"] = gl
    cuerpo = {"context": {"client": cli}}
    cuerpo.update(campos)
    return json.loads(http(f"https://www.youtube.com/youtubei/v1/{endpoint}?prettyPrint=false", cuerpo))

# ---------------------------------------------------------------- utilidades
def recorrer(o):
    pila = [o]
    while pila:
        x = pila.pop()
        if isinstance(x, dict):
            yield x; pila.extend(x.values())
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
    if s is None: return None
    s = str(s).replace(" ", " ").strip()
    m = re.search(r"([\d][\d,\.]*)\s*([KMB])?\b", s, re.I)
    if not m: return None
    num, suf = m.group(1), (m.group(2) or "").upper()
    if suf:
        try: return int(float(num.replace(",", "")) * {"K": 1e3, "M": 1e6, "B": 1e9}[suf])
        except ValueError: return None
    d = re.sub(r"[^\d]", "", num)
    return int(d) if d else None

def norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", t)

def leer(nombre, defecto):
    try:
        with open(os.path.join(DATOS, nombre), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return defecto

def escribir(nombre, obj):
    p = os.path.join(DATOS, nombre)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(p + ".tmp", p)

def ahora_ar(): return datetime.now(AR)
def fecha(dt): return dt.strftime("%Y-%m-%d")
def tmin_ahora(): return int(time.time() // 60)

def inicio_desde_texto(s, tmin):
    """'Started streaming 2 hours ago' / 'Started streaming on Oct 30, 2026' -> minuto epoch aproximado."""
    if not s: return None
    m = re.search(r"(\d+)\s+(second|minute|hour|day|week|month|year)s? ago", s)
    if m:
        n = int(m.group(1)); u = m.group(2)
        mult = {"second": 1 / 60, "minute": 1, "hour": 60, "day": 1440, "week": 10080, "month": 43200, "year": 525600}[u]
        return int(tmin - n * mult)
    m = re.search(r"on ([A-Z][a-z]{2} \d{1,2}, \d{4})", s)
    if m:
        try:
            d = datetime.strptime(m.group(1), "%b %d, %Y").replace(tzinfo=AR)
            return int(d.timestamp() // 60)
        except ValueError:
            return None
    return None

# ---------------------------------------------------------------- YouTube
def resolver_handle(handle):
    try:
        r = yt("navigation/resolve_url", url=f"https://www.youtube.com/{handle}")
        cid = r.get("endpoint", {}).get("browseEndpoint", {}).get("browseId")
        return cid if cid and cid.startswith("UC") else None
    except Exception:
        return None

def buscar_por_nombre(nombre):
    n = norm(nombre)
    for params, clave in ((P_BUSCAR_VIVO, "videoRenderer"), (P_BUSCAR_CANAL, "channelRenderer")):
        try: r = yt("search", query=nombre, params=params)
        except Exception: continue
        for d in recorrer(r):
            x = d.get(clave)
            if not x: continue
            if clave == "channelRenderer":
                if norm(texto(x.get("title"))) == n: return x.get("channelId")
            else:
                owner = x.get("ownerText") or x.get("longBylineText") or {}
                if norm(texto(owner)) == n:
                    for run in owner.get("runs", []):
                        cid = run.get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId")
                        if cid: return cid
    return None

def info_canal(cid):
    r = yt("browse", browseId=cid, params=P_STREAMS)
    out = {"id": cid}
    md = r.get("metadata", {}).get("channelMetadataRenderer", {})
    if md:
        out["nombre"] = md.get("title")
        th = md.get("avatar", {}).get("thumbnails", [])
        if th: out["imagen"] = re.sub(r"=s\d+-", "=s88-", th[-1]["url"])
        out["handle"] = (md.get("vanityChannelUrl") or "").rsplit("/", 1)[-1] or None
    hs = json.dumps(r.get("header", {}))
    out["verificado"] = "CHECK_CIRCLE" in hs or "BADGE_STYLE_TYPE_VERIFIED" in hs
    m = re.search(r'"([\d\.,]+[KMB]?) subscribers"', hs)
    if m: out["subs"] = numero(m.group(1))
    for tok in re.findall(r'"token": "([^"]+)"', hs)[:2]:
        try: r2 = yt("browse", continuation=tok)
        except Exception: continue
        for d in recorrer(r2):
            a = d.get("aboutChannelViewModel")
            if a:
                out["subs"] = numero(a.get("subscriberCountText")) or out.get("subs")
                out["vistas"] = numero(a.get("viewCountText"))
                out["videos"] = numero(a.get("videoCountText"))
                out["pais_en"] = a.get("country")
                return out
    return out

def vivos_del_canal(cid):
    r = yt("browse", browseId=cid, params=P_STREAMS)
    vistos, res = set(), []
    for d in recorrer(r):
        vr = d.get("videoRenderer") or d.get("gridVideoRenderer")
        if vr and vr.get("videoId"):
            s = json.dumps(vr)
            vivo = ("BADGE_STYLE_TYPE_LIVE_NOW" in s) or ('"style": "LIVE"' in s) or (" watching" in texto(vr.get("viewCountText")))
            if vivo and "UPCOMING" not in s and vr["videoId"] not in vistos:
                vistos.add(vr["videoId"])
                res.append({"vid": vr["videoId"], "titulo": texto(vr.get("title")), "aprox": numero(texto(vr.get("viewCountText")))})
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
    r = yt("updated_metadata", videoId=vid)
    out = {"vivo": None, "viewers": None, "titulo": None, "fecha_txt": None}
    for d in recorrer(r):
        v = d.get("videoViewCountRenderer")
        if v:
            out["vivo"] = bool(v.get("isLive"))
            out["viewers"] = numero(v.get("originalViewCount")) or numero(texto(v.get("viewCount")))
        if "updateTitleAction" in d:
            out["titulo"] = texto(d["updateTitleAction"].get("title"))
        if "updateDateTextAction" in d:
            out["fecha_txt"] = texto(d["updateDateTextAction"].get("dateText"))
    return out

def megustas(vid):
    t = json.dumps(yt("next", videoId=vid))
    m = re.search(r"along with ([\d,]+) other", t)
    return int(m.group(1).replace(",", "")) if m else None

def buscar_vivos(q, gl, paginas=1):
    """Busqueda de transmisiones en vivo: devuelve (canal, nombre, video, titulo, espectadores)."""
    out, token = [], None
    for _ in range(paginas):
        try:
            r = yt("search", gl=gl, continuation=token) if token else yt("search", gl=gl, query=q, params=P_BUSCAR_VIVO)
        except Exception:
            break
        token = None
        for d in recorrer(r):
            if "continuationCommand" in d and d["continuationCommand"].get("token"):
                token = d["continuationCommand"]["token"]
            vr = d.get("videoRenderer")
            if not vr: continue
            vc = texto(vr.get("viewCountText"))
            if " watching" not in vc: continue
            owner = vr.get("ownerText") or vr.get("longBylineText") or {}
            cid = None
            for run in owner.get("runs", []):
                cid = run.get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId") or cid
            if cid:
                out.append({"cid": cid, "nombre": texto(owner), "vid": vr.get("videoId"), "titulo": texto(vr.get("title")), "viewers": numero(vc) or 0})
        if not token: break
    return out

def rss(cid):
    txt = http(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}")
    ns = {"a": "http://www.w3.org/2005/Atom", "m": "http://search.yahoo.com/mrss/", "y": "http://www.youtube.com/xml/schemas/2015"}
    root = ET.fromstring(txt)
    out = []
    for e in root.findall("a:entry", ns):
        vid = e.findtext("y:videoId", namespaces=ns)
        link = e.find("a:link", ns)
        st = e.find("m:group/m:community/m:statistics", ns)
        out.append({"vid": vid, "cid": cid, "titulo": e.findtext("a:title", namespaces=ns),
                    "publicado": e.findtext("a:published", namespaces=ns),
                    "short": bool(link is not None and "/shorts/" in (link.get("href") or "")),
                    "vistas": int(st.get("views")) if st is not None and st.get("views") else None})
    return out

# ---------------------------------------------------------------- canales
def cat_adivinada(nombre):
    n = norm(nombre)
    if re.search(r"radio|fm\d|\d{2,3}fm|am\d{3}|fm$|^fm", n): return "Radio"
    if re.search(r"kids|infantil|nino|plimplim|toddler|cocomelon|cartoon", n): return "Contenido Infantil"
    if re.search(r"stream|podcast", n): return "Streaming"
    if re.search(r"noticias|news|diario|periodico|informa", n): return "Noticias y Periodismo"
    if re.search(r"sport|deport|futbol|esporte|racing|boca|river|liga|gol", n): return "Deportes"
    if re.search(r"tv|canal|television|channel|telefe|trece", n): return "Televisión"
    if re.search(r"music|musica|hits|cumbia", n): return "Música"
    if re.search(r"gaming|gamer|games|juegos", n): return "Gaming y Esports"
    if re.search(r"senado|diputados|congreso|gobierno|presidencia|casarosada|municipalidad", n): return "Gobierno e Institucional"
    return "Otros / Especializados"

def asegurar_canales():
    cfg = json.load(open(CANALES_CFG, encoding="utf-8"))
    canales = leer("canales.json", {})
    pend = leer("pendientes.json", {})
    por_clave = {c.get("cfg_key"): cid for cid, c in canales.items() if c.get("cfg_key")}
    claves = set()
    for c in cfg:
        k = c.get("id") or c.get("handle") or c["nombre"]
        claves.add(k)
        if k in por_clave:
            canales[por_clave[k]].update({"cat": c["cat"], "pais": "AR"}); continue
        if pend.get(k) and time.time() - pend[k] < 6 * 3600: continue
        cid = c.get("id") or (resolver_handle(c["handle"]) if c.get("handle") else None)
        if not cid:
            cid = buscar_por_nombre(c["nombre"])
            if cid:
                try: pe = info_canal(cid).get("pais_en")
                except Exception: pe = None
                if pe and pe != "Argentina":
                    log("descartado (es de", pe, "):", c["nombre"]); cid = None
        if not cid:
            pend[k] = time.time(); log("NO ENCONTRADO", c["nombre"]); continue
        pend.pop(k, None)
        x = canales.get(cid, {})
        x.update({"id": cid, "cfg_key": k, "cat": c["cat"], "pais": "AR", "auto": False})
        x.setdefault("nombre", c["nombre"]); x.setdefault("imagen", None)
        canales[cid] = x
    canales = {k: v for k, v in canales.items() if v.get("auto") or v.get("cfg_key") in claves}
    escribir("pendientes.json", pend)
    return canales

def descubrir(canales, paises):
    """Busca vivos nuevos en los paises indicados y suma los canales cuyo pais coincide."""
    rech = leer("rechazados.json", {})
    tareas = [(q, p) for p in paises for q in PAISES[p]["q"]]
    vistos = {}
    with ThreadPoolExecutor(6) as ex:
        for (q, p), lista in zip(tareas, ex.map(lambda t: buscar_vivos(t[0], t[1], 4 if t[1] == "AR" else 2), tareas)):
            for v in lista:
                e = vistos.setdefault(v["cid"], {"cid": v["cid"], "nombre": v["nombre"], "viewers": 0, "gl": p})
                e["viewers"] = max(e["viewers"], v["viewers"])
    nuevos = [e for e in vistos.values() if e["cid"] not in canales and e["cid"] not in rech]
    nuevos.sort(key=lambda e: -e["viewers"])
    def inf(e):
        try: return e, info_canal(e["cid"])
        except Exception: return e, None
    sumados = 0
    with ThreadPoolExecutor(6) as ex:
        for e, i in ex.map(inf, nuevos[:150]):
            if not i: continue
            iso = EN_A_ISO.get(i.get("pais_en") or "")
            if iso and (iso == "AR" or e["viewers"] >= 10):
                canales[e["cid"]] = {"id": e["cid"], "auto": True, "pais": iso, "cat": cat_adivinada(i.get("nombre") or e["nombre"]),
                                     "nombre": i.get("nombre") or e["nombre"], "imagen": i.get("imagen"), "handle": i.get("handle"),
                                     "verificado": i.get("verificado"), "alta": tmin_ahora()}
                sumados += 1
            else:
                rech[e["cid"]] = i.get("pais_en") or "-"
    escribir("rechazados.json", rech)
    log("descubrimiento", ",".join(paises), ":", len(vistos), "canales en vivo vistos,", sumados, "nuevos")

def recortar_paises(canales, records):
    """Fuera de Argentina se siguen solo los canales mas grandes de cada pais."""
    por = {}
    for cid, c in canales.items():
        if c.get("pais") != "AR" and c.get("auto"):
            por.setdefault(c.get("pais"), []).append(cid)
    for p, ids in por.items():
        if len(ids) <= MAX_CANALES_PAIS: continue
        ids.sort(key=lambda x: -(records.get(x, 0)))
        for cid in ids[MAX_CANALES_PAIS:]:
            if tmin_ahora() - canales[cid].get("alta", 0) > 3 * 1440:
                del canales[cid]

# ---------------------------------------------------------------- estadisticas (cada 6 horas)
def actualizar_estadisticas(canales, hoy, solo=None):
    ids = list(solo) if solo is not None else list(canales)
    log("estadisticas de", len(ids), "canales")
    stats = leer(f"stats/{hoy}.json", {})
    def uno(cid):
        try: return cid, info_canal(cid)
        except Exception: return cid, None
    with ThreadPoolExecutor(8) as ex:
        for cid, inf in ex.map(uno, ids):
            if not inf:
                stats.setdefault(cid, {}); continue
            c = canales[cid]
            for k in ("nombre", "imagen", "verificado", "handle"):
                if inf.get(k) is not None: c[k] = inf[k]
            stats[cid] = {k: inf.get(k) for k in ("subs", "vistas", "videos")}
    escribir(f"stats/{hoy}.json", stats)
    videos = leer("videos.json", {})
    def uno_rss(cid):
        try: return rss(cid)
        except Exception: return []
    with ThreadPoolExecutor(8) as ex:
        for lista in ex.map(uno_rss, ids):
            for v in lista:
                ant = videos.get(v["vid"], {})
                h = ant.get("h", {})
                if v["vistas"] is not None: h[hoy] = v["vistas"]
                v["h"] = dict(sorted(h.items())[-35:])
                videos[v["vid"]] = v
    lim = fecha(ahora_ar() - timedelta(days=40))
    videos = {k: v for k, v in videos.items() if (v.get("publicado") or "")[:10] >= lim and v["cid"] in canales}
    escribir("videos.json", videos)
    idx = sorted(f[:-5] for f in os.listdir(os.path.join(DATOS, "stats")) if f.endswith(".json"))
    for viejo in idx[:-400]: os.remove(os.path.join(DATOS, "stats", viejo + ".json"))
    escribir("stats_indice.json", idx[-400:])

# ---------------------------------------------------------------- derivados (cada hora)
def _min_v(v):
    return {"vid": v["vid"], "cid": v["cid"], "titulo": v.get("titulo"), "publicado": v.get("publicado"), "vistas": v.get("vistas"), "short": bool(v.get("short"))}

def generar_derivados(canales):
    """Archivos livianos para el panel: pagina de cada canal, videos destacados y podios."""
    ahora = ahora_ar(); t = tmin_ahora()
    hace = lambda d: fecha(ahora - timedelta(days=d))
    carpeta = os.path.join(DATOS, "stats")
    idx = sorted(f[:-5] for f in os.listdir(carpeta) if f.endswith(".json")) if os.path.isdir(carpeta) else []
    ult = idx[-95:]
    st = {f: leer(f"stats/{f}.json", {}) for f in ult}
    def en(d):
        c = [f for f in ult if f <= hace(d)]
        return st[c[-1]] if c else None
    s0 = st[ult[-1]] if ult else {}
    s7, s30, s60 = en(7), en(30), en(60)
    videos = leer("videos.json", {})
    fin = leer("finalizados.json", [])
    activos = leer("activos.json", {})
    lim7 = (ahora - timedelta(days=7)).isoformat()
    def gan7(v):
        if (v.get("publicado") or "") >= lim7: return v.get("vistas") or 0
        h = v.get("h", {}); base = [k for k in sorted(h) if k <= hace(7)]
        return (v.get("vistas") or 0) - h[base[-1]] if base else None
    por_canal = {}
    for v in videos.values(): por_canal.setdefault(v["cid"], []).append(v)
    for cid in canales:
        vs = por_canal.get(cid, [])
        serie = {f: [st[f][cid].get("subs"), st[f][cid].get("vistas"), st[f][cid].get("videos")] for f in ult if st[f].get(cid)}
        rec = sorted(vs, key=lambda v: v.get("publicado") or "", reverse=True)[:20]
        tv = sorted([v for v in vs if not v.get("short")], key=lambda v: -(v.get("vistas") or 0))[:12]
        ts = sorted([v for v in vs if v.get("short")], key=lambda v: -(v.get("vistas") or 0))[:12]
        escribir(f"canal/{cid}.json", {"serie": serie, "recientes": [_min_v(v) for v in rec], "top_videos": [_min_v(v) for v in tv], "top_shorts": [_min_v(v) for v in ts]})
    # videos destacados por pais
    grupos = {}
    for v in videos.values():
        p = canales.get(v["cid"], {}).get("pais")
        if not p: continue
        x = _min_v(v); x["g7"] = gan7(v)
        grupos.setdefault(p, []).append(x); grupos.setdefault("GL", []).append(x)
    l1 = (ahora - timedelta(days=1)).isoformat(); l30 = (ahora - timedelta(days=30)).isoformat()
    for p, lst in grupos.items():
        top = lambda lim, n: sorted([x for x in lst if (x["publicado"] or "") >= lim], key=lambda x: -(x["vistas"] or 0))[:n]
        escribir(f"videos_top/{p}.json", {
            "explotando": sorted([x for x in lst if not x["short"] and (x["g7"] or 0) > 0], key=lambda x: -x["g7"])[:30],
            "shorts": sorted([x for x in lst if x["short"] and (x["g7"] or 0) > 0], key=lambda x: -x["g7"])[:30],
            "d1": top(l1, 150), "d7": top(lim7, 200), "d30": top(l30, 250)})
    # podios por pais
    def dif(a, b, cid, k):
        if not a or not b or a is b: return None
        x, y = (a.get(cid) or {}).get(k), (b.get(cid) or {}).get(k)
        return x - y if x is not None and y is not None else None
    paises = {c.get("pais") for c in canales.values() if c.get("pais")}
    for p in list(paises) + ["GL"]:
        ids = [cid for cid, c in canales.items() if p == "GL" or c.get("pais") == p]
        def rank(k, a, b, n=5):
            out = [{"cid": cid, "v": dif(a, b, cid, k)} for cid in ids]
            return sorted([x for x in out if x["v"] and x["v"] > 0], key=lambda x: -x["v"])[:n]
        crec = []
        for cid in ids:
            g, pr = dif(s0, s30, cid, "vistas"), dif(s30, s60, cid, "vistas")
            if g and pr is not None and g > 0:
                crec.append({"cid": cid, "v": g, "prev": pr, "pct": min(1000, round((g - pr) * 100 / pr)) if pr > 0 else 1000})
        crec.sort(key=lambda x: (-x["pct"], -x["v"]))
        en_p = lambda cid: p == "GL" or canales.get(cid, {}).get("pais") == p
        pico7 = sorted([f for f in fin if f["fin"] >= t - 7 * 1440 and en_p(f["cid"])], key=lambda f: -f["pico"])[:5]
        largos = [{"vid": a["vid"], "cid": a["cid"], "titulo": a["titulo"], "dur": t - a["ini"], "vivo": True} for a in activos.values() if en_p(a["cid"]) and t - a.get("ult", 0) <= 15]
        largos += [{"vid": f["vid"], "cid": f["cid"], "titulo": f["titulo"], "dur": f["dur"], "vivo": False} for f in fin if en_p(f["cid"])]
        largos.sort(key=lambda x: -x["dur"])
        cuenta = {}
        for f in fin:
            if f["fin"] >= t - 30 * 1440 and en_p(f["cid"]): cuenta[f["cid"]] = cuenta.get(f["cid"], 0) + 1
        salto = []
        fs = [f for f in ult if f >= hace(30)]
        for cid in ids:
            mejor = None
            for a, b in zip(fs, fs[1:]):
                d = dif(st[b], st[a], cid, "vistas")
                if d and (not mejor or d > mejor["v"]): mejor = {"cid": cid, "v": d, "fecha": b}
            if mejor: salto.append(mejor)
        salto.sort(key=lambda x: -x["v"])
        sh = sorted([x for x in grupos.get(p, []) if x["short"] and (x["g7"] or 0) > 0], key=lambda x: -x["g7"])[:5]
        escribir(f"podios/{p}.json", {
            "crec_mes": crec[:5], "vistas7": rank("vistas", s0, s7), "vistas30": rank("vistas", s0, s30),
            "subs7": rank("subs", s0, s7), "subs30": rank("subs", s0, s30), "videos7": rank("videos", s0, s7),
            "pico_vivo7": [{"vid": f["vid"], "cid": f["cid"], "titulo": f["titulo"], "v": f["pico"]} for f in pico7],
            "vivo_largo": largos[:5], "mas_vivos30": [{"cid": c, "v": n} for c, n in sorted(cuenta.items(), key=lambda x: -x[1])[:5]],
            "salto": salto[:5], "short7": sh})
    log("derivados listos")

# ---------------------------------------------------------------- muestras
def escanear(canales, solo_ar=False):
    """Revisa los canales y devuelve los vivos encontrados con sus espectadores exactos."""
    ctrl = leer("control.json", {})
    t = tmin_ahora()
    ids = []
    for cid, c in canales.items():
        if solo_ar and c.get("pais") != "AR": continue
        k = ctrl.get(cid, {})
        reciente = t - k.get("vivo", 0) < 3 * 1440
        if reciente or t - k.get("scan", 0) >= 30 or c.get("pais") == "AR":
            ids.append(cid)
    def uno(cid):
        try: return cid, vivos_del_canal(cid), None
        except Exception as e: return cid, [], str(e)[:80]
    vivos, errores = [], 0
    with ThreadPoolExecutor(12) as ex:
        for cid, lista, err in ex.map(uno, ids):
            k = ctrl.setdefault(cid, {})
            if err: errores += 1; continue
            k["scan"] = t
            if lista: k["vivo"] = t
            for v in lista:
                v["cid"] = cid; vivos.append(v)
    escribir("control.json", ctrl)
    det = completar(vivos)
    log(f"escaneo: {len(ids)} canales, {len(det)} vivos, {sum(x['viewers'] for x in det)} espectadores, {errores} errores")
    return det, errores, len(ids)

def completar(vivos):
    def d(v):
        try: return v, detalle_vivo(v["vid"])
        except Exception: return v, {"vivo": None, "viewers": None, "titulo": None, "fecha_txt": None}
    out = []
    with ThreadPoolExecutor(12) as ex:
        for v, x in ex.map(d, vivos):
            if x["vivo"] is False: continue
            n = x["viewers"] if x["viewers"] is not None else v.get("aprox")
            if n is None: continue
            out.append({"vid": v["vid"], "cid": v["cid"], "titulo": x["titulo"] or v.get("titulo"), "viewers": n, "fecha_txt": x["fecha_txt"]})
    return out

# ---------------------------------------------------------------- guardado
def pct(a, b):
    return round((a - b) * 100 / b, 1) if b else None

def por_canal(d, vids):
    out = {}
    for vid, n in d.items():
        cid = vids.get(vid, {}).get("cid")
        if cid: out[cid] = out.get(cid, 0) + n
    return out

def cercano(dia, t, tol=20):
    if not dia or not dia.get("m"): return None
    m = min(dia["m"], key=lambda s: abs(s["t"] - t))
    return m if abs(m["t"] - t) <= tol else None

def resumir_dia(dia):
    res = {}
    for s in dia.get("m", []):
        for cid, n in por_canal(s["d"], dia.get("vids", {})).items():
            r = res.setdefault(cid, [0, 0, 0])
            r[0] = max(r[0], n); r[1] += n; r[2] += 1
    return {cid: {"pico": r[0], "prom": round(r[1] / r[2]), "min": r[2] * MUESTRA_MIN, "horas": round(r[1] * MUESTRA_MIN / 60)} for cid, r in res.items()}

def actualizar_activos(vivos, t, completo):
    """Lleva la cuenta de cada transmision: inicio, pico, promedio, me gusta."""
    activos = leer("activos.json", {})
    fin = leer("finalizados.json", [])
    vistos = set()
    for v in vivos:
        vistos.add(v["vid"])
        a = activos.get(v["vid"])
        if not a:
            ini = inicio_desde_texto(v.get("fecha_txt"), t) or t
            a = activos[v["vid"]] = {"vid": v["vid"], "cid": v["cid"], "titulo": v["titulo"], "ini": ini, "visto": t,
                                     "pico": 0, "pico_t": t, "suma": 0, "n": 0, "faltas": 0, "serie": []}
        a["titulo"] = v["titulo"] or a["titulo"]; a["ult"] = t; a["faltas"] = 0
        a["viewers"] = v["viewers"]
        if v["viewers"] > a["pico"]: a["pico"], a["pico_t"] = v["viewers"], t
        if completo: a["suma"] += v["viewers"]; a["n"] += 1
        a["serie"] = [p for p in a["serie"] if t - p[0] <= 130] + [[t, v["viewers"]]]
    if completo:
        for vid in list(activos):
            if vid in vistos: continue
            a = activos[vid]; a["faltas"] = a.get("faltas", 0) + 1
            if a["faltas"] >= 2 or t - a.get("ult", t) > 60:
                fin.insert(0, {"vid": vid, "cid": a["cid"], "titulo": a["titulo"], "ini": a["ini"], "fin": a.get("ult", t),
                               "dur": a.get("ult", t) - a["ini"], "pico": a["pico"], "pico_t": a["pico_t"],
                               "prom": round(a["suma"] / max(a["n"], 1)), "mg": a.get("mg"), "ultv": a.get("viewers")})
                del activos[vid]
        escribir("finalizados.json", fin[:FINALIZADOS_MAX])
    return activos

def actualizar_megustas(activos, canales, t):
    ar = [a for a in activos.values() if canales.get(a["cid"], {}).get("pais") == "AR" and a.get("viewers", 0) >= 50]
    def uno(a):
        try: return a, megustas(a["vid"])
        except Exception: return a, None
    with ThreadPoolExecutor(10) as ex:
        for a, mg in ex.map(uno, ar):
            if mg is None: continue
            a["mg"] = mg
            a["mg_serie"] = [p for p in a.get("mg_serie", []) if t - p[0] <= 130] + [[t, mg]]

def guardar_rapido(canales, activos, t):
    """Escribe ahora.json y la serie reciente (cada 2 minutos)."""
    records = leer("records.json", {})
    lives = []
    pc = {}
    for a in activos.values():
        if t - a.get("ult", 0) > MUESTRA_MIN + 1: continue
        c = canales.get(a["cid"])
        if not c: continue
        pc[a["cid"]] = pc.get(a["cid"], 0) + a["viewers"]
        s = a.get("serie", [])
        hace1h = min(s, key=lambda p: abs(p[0] - (t - 60))) if s else None
        v1h = hace1h[1] if hace1h and abs(hace1h[0] - (t - 60)) <= 12 else None
        mgs = a.get("mg_serie", [])
        mg2h = (mgs[-1][1] - mgs[0][1]) if len(mgs) >= 2 else None
        lives.append({"vid": a["vid"], "cid": a["cid"], "p": c.get("pais"), "titulo": a["titulo"], "viewers": a["viewers"],
                      "ini": a["ini"], "visto": a.get("visto"), "pico": a["pico"], "v1h": v1h, "mg": a.get("mg"), "mg2h": mg2h,
                      "mg2h_min": (mgs[-1][0] - mgs[0][0]) if len(mgs) >= 2 else None})
    for cid, n in pc.items():
        if n > records.get(cid, 0): records[cid] = n
    escribir("records.json", records)
    lives.sort(key=lambda x: -x["viewers"])
    # comparacion con ayer (por canal) desde el archivo del dia
    ayer = fecha(datetime.fromtimestamp((t - 1440) * 60, AR))
    pc_ayer, tot_ayer = {}, {}
    for p in PAISES:
        dia = leer(f"dia/{p}/{ayer}.json", None)
        s = cercano(dia, t - 1440)
        if s:
            x = por_canal(s["d"], dia["vids"])
            pc_ayer.update(x); tot_ayer[p] = sum(x.values())
    for l in lives:
        l["delta_pct"] = pct(pc[l["cid"]], pc_ayer.get(l["cid"])) if pc_ayer.get(l["cid"]) else None
    # resumen por pais
    hoy = fecha(datetime.fromtimestamp(t * 60, AR))
    paises = {}
    for p in PAISES:
        lp = [l for l in lives if l["p"] == p]
        if not lp and p != "AR": continue
        tot = sum(l["viewers"] for l in lp)
        cats = {}
        for cid in {l["cid"] for l in lp}:
            n = pc[cid]; cat = canales[cid].get("cat", "Otros / Especializados")
            c = cats.setdefault(cat, {"viewers": 0, "lider": None, "lider_v": 0, "canales": 0, "vivos": 0})
            c["viewers"] += n; c["canales"] += 1
            if n > c["lider_v"]: c["lider"], c["lider_v"] = cid, n
        for l in lp: cats[canales[l["cid"]].get("cat", "Otros / Especializados")]["vivos"] += 1
        tot_dia = leer(f"totales/{p}.json", {}).get(hoy, [])
        serie = tot_dia + [[t, tot]]
        pico = max(serie, key=lambda x: x[1])
        dia_ayer = leer(f"dia/{p}/{ayer}.json", None)
        pico_ayer = max([sum(s["d"].values()) for s in dia_ayer["m"] if s["t"] <= t - 1440], default=None) if dia_ayer else None
        paises[p] = {"total": tot, "total_ayer": tot_ayer.get(p), "delta_pct": pct(tot, tot_ayer.get(p)), "canales": len({l["cid"] for l in lp}),
                     "vivos": len(lp), "pico": pico[1], "pico_t": pico[0], "pico_ayer": pico_ayer, "pico_delta_pct": pct(pico[1], pico_ayer),
                     "categorias": cats, "top": lp[0]["cid"] if lp else None}
    escribir("ahora.json", {"t": t, "iso": datetime.fromtimestamp(t * 60, AR).isoformat(timespec="minutes"), "paises": paises,
                            "lives": lives, "por_canal": pc, "por_canal_ayer": pc_ayer})
    # serie de alta resolucion de las ultimas 12 horas (Argentina)
    rec = leer("reciente_AR.json", {"t": [], "c": {}})
    n_prev = len(rec["t"])
    rec["t"].append(t)
    for cid in list(rec["c"]):
        rec["c"][cid].append(pc.get(cid))
    for cid, n in pc.items():
        if canales[cid].get("pais") == "AR" and cid not in rec["c"]:
            rec["c"][cid] = [None] * n_prev + [n]
    corte = t - RECIENTE_HORAS * 60
    desde = next((i for i, x in enumerate(rec["t"]) if x >= corte), len(rec["t"]))
    rec["t"] = rec["t"][desde:]
    for cid in list(rec["c"]):
        vals = rec["c"][cid][desde:]
        if all(v is None for v in vals): del rec["c"][cid]
        else: rec["c"][cid] = vals
    escribir("reciente_AR.json", rec)

def guardar_muestra(canales, vivos, t):
    """Guarda la muestra de 10 minutos por pais: dia, totales, resumen, mapa de calor."""
    hoy = fecha(datetime.fromtimestamp(t * 60, AR))
    for p in PAISES:
        vp = [v for v in vivos if canales.get(v["cid"], {}).get("pais") == p]
        if not vp and not os.path.exists(os.path.join(DATOS, f"dia/{p}/{hoy}.json")) and p != "AR": continue
        dia = leer(f"dia/{p}/{hoy}.json", {"fecha": hoy, "m": [], "vids": {}})
        d = {}
        for v in vp:
            d[v["vid"]] = v["viewers"]
            m = dia["vids"].setdefault(v["vid"], {"cid": v["cid"], "titulo": v["titulo"]})
            m["titulo"] = v["titulo"] or m.get("titulo")
        dia["m"].append({"t": t, "d": d})
        escribir(f"dia/{p}/{hoy}.json", dia)
        tot = leer(f"totales/{p}.json", {})
        tot[hoy] = [[s["t"], sum(s["d"].values())] for s in dia["m"]]
        tot = dict(sorted(tot.items())[-DIAS_GUARDADOS:])
        escribir(f"totales/{p}.json", tot)
        tc = leer(f"totales_cat/{p}.json", {})
        porcat = {}
        for v in vp:
            cat = canales[v["cid"]].get("cat", "Otros / Especializados")
            porcat[cat] = porcat.get(cat, 0) + v["viewers"]
        dc = tc.setdefault(hoy, {})
        for cat, n in porcat.items(): dc.setdefault(cat, []).append([t, n])
        tc = dict(sorted(tc.items())[-15:])
        escribir(f"totales_cat/{p}.json", tc)
        acc2 = {}
        for f, cats in list(tc.items())[-14:]:
            for cat, serie in cats.items():
                for tt, n in serie:
                    dt = datetime.fromtimestamp(tt * 60, AR)
                    a = acc2.setdefault(cat, {}).setdefault((dt.weekday(), dt.hour), [0, 0]); a[0] += n; a[1] += 1
        escribir(f"heatmap_cat/{p}.json", {cat: [{"dia": k[0], "hora": k[1], "prom": round(v[0] / v[1])} for k, v in sorted(d.items())] for cat, d in acc2.items()})
        res = leer(f"resumen/{p}.json", {})
        res[hoy] = resumir_dia(dia)
        escribir(f"resumen/{p}.json", dict(sorted(res.items())[-400:]))
        # mapa de calor: promedio 30 dias por dia de semana y hora
        acc = {}
        for f, serie in list(tot.items())[-30:]:
            for tt, n in serie:
                dt = datetime.fromtimestamp(tt * 60, AR)
                a = acc.setdefault((dt.weekday(), dt.hour), [0, 0]); a[0] += n; a[1] += 1
        escribir(f"heatmap/{p}.json", [{"dia": k[0], "hora": k[1], "prom": round(v[0] / v[1])} for k, v in sorted(acc.items())])
        carpeta = os.path.join(DATOS, "dia", p)
        dias = sorted(f[:-5] for f in os.listdir(carpeta) if f.endswith(".json"))
        for viejo in dias[:-DIAS_GUARDADOS]: os.remove(os.path.join(carpeta, viejo + ".json"))
    indice = {}
    for p in PAISES:
        carpeta = os.path.join(DATOS, "dia", p)
        if os.path.isdir(carpeta):
            indice[p] = sorted(f[:-5] for f in os.listdir(carpeta) if f.endswith(".json"))
    escribir("dias.json", indice)
    escribir("canales.json", canales)
    escribir("paises.json", {k: v["nombre"] for k, v in PAISES.items()})

# ---------------------------------------------------------------- git
def subir():
    token = os.environ.get("GH_TOKEN"); repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        log("(sin token: no se sube)"); return
    url = f"https://x-access-token:{token}@github.com/{repo}.git"
    def g(*a, check=True):
        return subprocess.run(["git", *a], cwd=DATOS, capture_output=True, text=True, check=check)
    if not os.path.isdir(os.path.join(DATOS, ".git")):
        g("init", "-q"); g("checkout", "-q", "-b", "datos")
    g("config", "user.name", "vivosar-bot"); g("config", "user.email", "vivosar-bot@users.noreply.github.com")
    g("add", "-A")
    tiene = g("rev-parse", "--verify", "HEAD", check=False).returncode == 0
    msg = "datos " + ahora_ar().strftime("%Y-%m-%d %H:%M")
    if tiene: g("commit", "-q", "--amend", "-m", msg, check=False)
    else: g("commit", "-q", "-m", msg)
    for i in range(3):
        r = subprocess.run(["git", "push", "-q", "-f", url, "HEAD:datos"], cwd=DATOS, capture_output=True, text=True)
        if r.returncode == 0: return
        log("error al subir, reintento", r.stderr[-200:]); time.sleep(5)

# ---------------------------------------------------------------- ciclo
def preparar():
    os.makedirs(DATOS, exist_ok=True)
    try: v = open(os.path.join(DATOS, "version.txt")).read().strip()
    except Exception: v = ""
    if v != VERSION_DATOS:
        log("formato de datos nuevo: se empieza de cero")
        for f in os.listdir(DATOS):
            if f != ".git": subprocess.run(["rm", "-rf", os.path.join(DATOS, f)])
        open(os.path.join(DATOS, "version.txt"), "w").write(VERSION_DATOS)

def vuelta_completa(canales):
    t = tmin_ahora()
    ctrl = leer("ciclos.json", {"desc_ar": 0, "desc_otros": 0, "stats": 0})
    if time.time() - ctrl["desc_ar"] > 1800:
        try: descubrir(canales, ["AR"])
        except Exception: traceback.print_exc()
        ctrl["desc_ar"] = time.time()
    if time.time() - ctrl["desc_otros"] > 7200:
        try: descubrir(canales, [p for p in PAISES if p != "AR"])
        except Exception: traceback.print_exc()
        ctrl["desc_otros"] = time.time()
    recortar_paises(canales, leer("records.json", {}))
    hoy = fecha(ahora_ar())
    st = leer(f"stats/{hoy}.json", {})
    faltan = [c for c in canales if c not in st]
    try:
        if time.time() - ctrl["stats"] > 6 * 3600 or not st:
            actualizar_estadisticas(canales, hoy); ctrl["stats"] = time.time()
        elif faltan:
            actualizar_estadisticas(canales, hoy, solo=faltan[:40])
    except Exception: traceback.print_exc()
    if time.time() - ctrl.get("deriv", 0) > 3600:
        try: generar_derivados(canales); ctrl["deriv"] = time.time()
        except Exception: traceback.print_exc()
    escribir("ciclos.json", ctrl)
    vivos, errores, n = escanear(canales)
    if errores > n * 0.5:
        log("demasiados errores, muestra descartada"); return
    activos = actualizar_activos(vivos, t, True)
    try: actualizar_megustas(activos, canales, t)
    except Exception: traceback.print_exc()
    escribir("activos.json", activos)
    guardar_muestra(canales, vivos, t)
    guardar_rapido(canales, activos, t)

def vuelta_rapida(canales):
    t = tmin_ahora()
    activos = leer("activos.json", {})
    ar = [{"vid": a["vid"], "cid": a["cid"], "titulo": a["titulo"]} for a in activos.values() if canales.get(a["cid"], {}).get("pais") == "AR"]
    det = completar(ar)
    activos = actualizar_activos(det, t, False)
    escribir("activos.json", activos)
    guardar_rapido(canales, activos, t)
    log("rapida:", len(det), "vivos AR")

def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "0"
    if modo in MODOS_PRUEBA: return MODOS_PRUEBA[modo]()
    minutos = float(modo)
    fin = time.time() + minutos * 60
    preparar()
    n = 0
    while True:
        inicio = time.time()
        try:
            canales = asegurar_canales()
            if n % (MUESTRA_MIN // TICK_MIN) == 0:
                vuelta_completa(canales)
            else:
                vuelta_rapida(canales)
            subir()
        except Exception:
            traceback.print_exc()
        n += 1
        espera = TICK_MIN * 60 - (time.time() - inicio)
        if time.time() + max(espera, 0) > fin: break
        time.sleep(max(espera, 5))

# ---------------------------------------------------------------- pruebas
def prueba():
    for h in ("@LuzuTV", "@c5n"):
        cid = resolver_handle(h); log("resolver", h, cid)
        if not cid: continue
        log("info", info_canal(cid))
        vs = vivos_del_canal(cid); log("vivos", vs)
        for v in vs[:2]:
            log("detalle", detalle_vivo(v["vid"]), "mg", megustas(v["vid"]))

MODOS_PRUEBA = {"prueba": prueba}

if __name__ == "__main__":
    main()
