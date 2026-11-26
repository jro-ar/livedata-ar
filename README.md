# vivosAR

Panel de audiencias de los vivos de YouTube (Argentina + 15 países).

- **Panel:** https://jro-ar.github.io/livedata-ar/
- **Recolector:** `.github/workflows/recolector.yml` — cada 2 minutos actualiza los vivos argentinos, cada 10 minutos revisa todos los canales, cada 30 minutos busca canales nuevos. Guarda todo en la rama `datos`.
- **Canales fijos de Argentina:** `canales.json` (el resto se descubre solo).
