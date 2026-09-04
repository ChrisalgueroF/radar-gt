# Radar GT — Guía completa (léeme primero)

Todo el código ya está listo dentro de esta misma carpeta. No necesitas
programar nada ni tocar el código. Solo necesitas seguir los pasos de abajo,
en orden, usando tus propias cuentas.

---

## ¿Qué es cada archivo? (no necesitas abrirlos, solo para que sepas qué es qué)

| Archivo | Qué hace |
|---|---|
| `fetch-feeds.js` | Recolecta noticias de Prensa Libre y Guatemala.com |
| `analyze.js` | Le pide a la IA que escriba un borrador de análisis |
| `generate-site.js` | Arma la página web final (`public/index.html`) |
| `run-all.js` | Corre los tres anteriores en orden, de un jalón |
| `netlify.toml` | Le dice a Netlify cómo publicar el sitio |
| `.github/workflows/collect.yml` | Hace que `fetch-feeds.js` + `analyze.js` corran solos cada hora |
| `.github/workflows/build.yml` | Hace que `generate-site.js` corra solo cuando hay noticias/análisis nuevos |
| `package.json` | Configuración técnica de Node.js (no la toques) |
| `data/` (se crea sola) | Aquí se van guardando las noticias y análisis del día |
| `public/` (se crea sola) | Aquí queda la página web final |

**Lo único que vas a tocar tú, día a día:** el archivo `data/analisis.json`,
para aprobar qué análisis se publican (paso 7 de abajo).

---

## Pasos, en orden

### 1. Crea cuenta en GitHub
Ve a **github.com** → regístrate gratis. (Si ya tienes cuenta, sigue al paso 2)

### 2. Crea el repositorio y sube esta carpeta
- En GitHub, botón verde **"New"** → nombre: `radar-gt` → puede ser privado → **Create repository**
- En la página del repo, dale click a **"uploading an existing file"**
- Arrastra **todos** los archivos y carpetas de este ZIP (incluida la carpeta `.github`) a esa ventana
- Abajo, dale **"Commit changes"**

⚠️ Importante: la carpeta `.github` a veces no se ve fácil en tu explorador de
archivos porque empieza con un punto. Actívala en Configuración de tu sistema
si al descomprimir el ZIP no la ves ("mostrar archivos ocultos").

### 3. Consigue tu llave de la API de Claude
- Ve a **console.anthropic.com** → crea cuenta si no tienes → sección **API Keys**
- Crea una llave nueva, cópiala (empieza con `sk-ant-...`)
- Guárdala en un lugar seguro — no la vuelves a ver después

### 4. Guarda esa llave como secreto en GitHub
- En tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- Name: `ANTHROPIC_API_KEY` (exactamente así)
- Value: pega tu llave
- **Add secret**

### 5. Conecta tu repositorio a Netlify
- Ve a **netlify.com** → crea cuenta gratis
- **Add new site** → **Import an existing project** → conecta tu cuenta de GitHub
- Elige el repositorio `radar-gt`
- Dale **Deploy** (Netlify ya sabe qué hacer, viene configurado en `netlify.toml`)

### 6. Verifica que esté corriendo
- En tu repositorio de GitHub, pestaña **Actions**
- Deberías ver "Recolectar noticias y generar borradores" corriendo cada hora
- ✅ palomita verde = bien · ❌ X roja = algo falló (mándame captura si pasa esto)

### 7. Aprueba los análisis (lo único manual, 2-3 min al día)
- En GitHub, abre `data/analisis.json`
- Ícono de lápiz (editar) → busca `"estado": "borrador"`
- Cámbialo a `"estado": "aprobado"` en los que quieras publicar
- **Commit changes** — el sitio se actualiza solo en minutos

---

## Si algo falla

Copia el mensaje de error exacto (de la pestaña Actions en GitHub, o de
Netlify) y pégamelo — con eso te digo exactamente qué corregir.
