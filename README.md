# Radar GT — Recolector de noticias

Script sin dependencias externas (usa `fetch` nativo de Node 18+) que lee
feeds RSS de medios guatemaltecos y guarda los titulares en `data/noticias.json`.

## Cómo correrlo

```bash
node fetch-feeds.js
```

Esto crea/actualiza `data/noticias.json` con esta forma:

```json
{
  "actualizado": "2026-09-03T18:00:00.000Z",
  "total": 42,
  "noticias": [
    {
      "fuente": "Prensa Libre",
      "titulo": "...",
      "link": "https://...",
      "fecha": "...",
      "categoria": "...",
      "resumen": "..."
    }
  ]
}
```

**Importante:** este contenedor de prueba no tiene acceso a internet, así que
el script no se pudo ejecutar aquí. Pruébalo en tu máquina o servidor — la
sintaxis ya está verificada (`node --check`).

## Automatizarlo (que corra solo cada hora)

En tu servidor (Linux), agrega esto a tu crontab (`crontab -e`):

```
0 * * * * cd /ruta/a/radar-gt && node fetch-feeds.js >> log.txt 2>&1
```

Eso lo corre cada hora en punto. Si tu hosting no da acceso a cron
(ej. hosting compartido básico), la alternativa es un servicio como
**cron-job.org** que le pega a un endpoint tuyo cada hora.

## Agregar más fuentes

Edita el arreglo `FEEDS` en `fetch-feeds.js`. Verifica primero que el feed
exista visitando la URL en el navegador — debe verse XML, no un error 404.

## Cadena completa (los 3 pasos)

```
fetch-feeds.js  → data/noticias.json   (recolecta RSS)
analyze.js      → data/analisis.json   (genera borradores de análisis con IA)
generate-site.js → public/index.html   (arma el sitio final)
```

Corre todo de un jalón:

```bash
ANTHROPIC_API_KEY=sk-ant-tu-llave-aqui node run-all.js
```

**El punto de control humano está en `data/analisis.json`.** Cada análisis
que genera la IA sale con `"estado": "borrador"`. El sitio (`generate-site.js`)
**solo publica los que tengan `"estado": "aprobado"`** — así que después de
correr `run-all.js`:

1. Abre `data/analisis.json`
2. Lee cada borrador, edítalo si hace falta
3. Cambia `"estado": "borrador"` → `"estado": "aprobado"` en los que quieras publicar
4. Corre `node generate-site.js` otra vez para regenerar `public/index.html` con esos análisis incluidos

Este paso manual es intencional — es lo que te protege de publicar algo que
se parezca demasiado al artículo original de otro medio, o que la IA haya
entendido mal.

### ¿Y de dónde saco una API key?

En console.anthropic.com, sección API Keys. Tiene costo por uso (no es gratis
ilimitado) — para este volumen de texto por día debería ser bajo, pero
revisa los precios actuales en la consola antes de dejarlo corriendo en cron.

## Publicación automática con GitHub + Netlify (recomendado)

Esto deja **todo corriendo solo**, excepto el paso de aprobar análisis
(que es tu candado de calidad/legal — ver más abajo cómo lo haces en 30
segundos desde el celular).

### Configuración (una sola vez)

1. **Crea un repo en GitHub** y sube esta carpeta completa:
   ```bash
   cd radar-gt
   git init
   git add .
   git commit -m "Setup inicial Radar GT"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/radar-gt.git
   git push -u origin main
   ```

2. **Agrega tu API key como secreto de GitHub** (no la subas nunca al código):
   - En tu repo → Settings → Secrets and variables → Actions → New repository secret
   - Nombre: `ANTHROPIC_API_KEY` — Valor: tu llave de console.anthropic.com

3. **Conecta Netlify al repo**:
   - netlify.com → Add new site → Import from Git → elige tu repo
   - Netlify va a leer `netlify.toml` solo (ya configurado: publica la carpeta `public/`)
   - Cada vez que el repo cambie, Netlify republica solo — sin que hagas nada

### Qué corre solo, y cuándo

- **`.github/workflows/collect.yml`** — cada hora: recolecta RSS, genera
  borradores de análisis con IA, y los guarda en el repo (`git push` automático)
- **`.github/workflows/build.yml`** — cada vez que cambian los datos:
  regenera `public/index.html` y lo sube → Netlify lo publica solo

El radar de titulares se actualiza 100% solo, cada hora, sin que toques nada.

### Lo único manual: aprobar análisis (2-3 min al día)

1. Abre `data/analisis.json` directo en GitHub (en el navegador, sin clonar nada)
2. Dale "Editar" (ícono de lápiz), lee el borrador
3. Cambia `"estado": "borrador"` → `"estado": "aprobado"` en el que quieras publicar
4. Commit directo desde el navegador de GitHub

Ese commit dispara `build.yml` solo, que regenera el sitio y Netlify lo
publica en minutos. Puedes hacer este paso desde el celular, sin terminal.

### Corrida local para probar antes de subir a GitHub

```bash
ANTHROPIC_API_KEY=sk-ant-... node run-all.js
```
