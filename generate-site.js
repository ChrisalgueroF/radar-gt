// generate-site.js
// Lee data/noticias.json y data/analisis.json y genera public/index.html
// Solo incluye análisis con estado "aprobado" — así te aseguras de revisar
// antes de que algo salga publicado.
//
// Uso: node generate-site.js

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const NOTICIAS_FILE = "./data/noticias.json";
const ANALISIS_FILE = "./data/analisis.json";
const OUT_DIR = "./public";
const OUT_FILE = `${OUT_DIR}/index.html`;

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tiempoRelativo(fechaStr) {
  const fecha = new Date(fechaStr);
  if (isNaN(fecha)) return "";
  const horas = Math.round((Date.now() - fecha.getTime()) / 3600000);
  if (horas < 1) return "hace unos minutos";
  if (horas === 1) return "hace 1h";
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${Math.round(horas / 24)}d`;
}

// --- Íconos originales por categoría (SVG propio, sin depender de fotos ajenas) ---
const ICONOS = {
  economia: `<path d="M4 20V10M11 20V4M18 20v-7"/>`,
  economía: `<path d="M4 20V10M11 20V4M18 20v-7"/>`,
  seguridad: `<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>`,
  tecnologia: `<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/>`,
  tecnología: `<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/>`,
  deportes: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/>`,
  cultura: `<path d="M4 19V7l8-4 8 4v12M4 19h16M9 19v-6h6v6"/>`,
  salud: `<path d="M12 21s-7-4.5-9-9c-1.3-3 1-6 4-6 2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3 0 5.3 3 4 6-2 4.5-9 9-9 9z"/>`,
  politica: `<path d="M4 21h16M6 21V10l6-5 6 5v11M10 21v-6h4v6"/>`,
  política: `<path d="M4 21h16M6 21V10l6-5 6 5v11M10 21v-6h4v6"/>`,
  general: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>`,
};
const ICONO_DEFAULT = `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>`;

function normalizar(str = "") {
  return str.trim().toLowerCase();
}

function iconoPara(categoria) {
  return ICONOS[normalizar(categoria)] || ICONO_DEFAULT;
}

// Categorías que se resaltan con el acento cochinilla en vez de jade (uso limitado a temas sensibles)
const CATS_ENFASIS = new Set(["seguridad", "política", "politica"]);

function renderDestacado(analisis) {
  if (!analisis.length) {
    return `<div class="destacado"><p>Aún no hay análisis aprobados para hoy. Corre <code>analyze.js</code> y aprueba al menos uno en <code>data/analisis.json</code>.</p></div>`;
  }
  return analisis
    .map(
      (a) => `
    <div class="destacado">
      <svg class="marca-agua" viewBox="0 0 160 160">
        <circle cx="150" cy="150" r="30" fill="none" stroke="#3FAE83" stroke-width="1"/>
        <circle cx="150" cy="150" r="55" fill="none" stroke="#3FAE83" stroke-width="1"/>
        <circle cx="150" cy="150" r="80" fill="none" stroke="#3FAE83" stroke-width="1"/>
      </svg>
      <div class="categoria-pill"><span class="dot"></span> Análisis del día · ${escapeHtml(a.categoria)}</div>
      <h2>${escapeHtml(a.categoria)}: lo que dicen las fuentes hoy</h2>
      <p>${escapeHtml(a.texto).replace(/\n/g, "<br>")}</p>
      <div class="fuentes">Fuentes: ${a.notas_usadas.map((n) => `<b>${escapeHtml(n.fuente)}</b>`).join(", ")}</div>
    </div>`
    )
    .join("\n");
}

function renderRadar(noticias) {
  const grupos = {};
  for (const n of noticias) {
    const cat = n.categoria || "General";
    grupos[cat] = grupos[cat] || [];
    grupos[cat].push(n);
  }
  return Object.entries(grupos)
    .map(([cat, notas]) => {
      const esEnfasis = CATS_ENFASIS.has(normalizar(cat));
      return `
    <div class="categoria${esEnfasis ? " enfasis" : ""}">
      <div class="cat-header">
        <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconoPara(cat)}</svg></span>
        <h4>${escapeHtml(cat)}</h4>
      </div>
      ${notas
        .slice(0, 6)
        .map(
          (n) => `
      <div class="item">
        <a href="${escapeHtml(n.link)}" target="_blank" rel="noopener">${escapeHtml(n.titulo)}</a>
        <div class="meta">${escapeHtml(n.fuente)} · ${tiempoRelativo(n.fecha)}</div>
      </div>`
        )
        .join("")}
    </div>`;
    })
    .join("\n");
}

async function main() {
  const noticiasRaw = await readFile(NOTICIAS_FILE, "utf-8").catch(() => null);
  if (!noticiasRaw) {
    console.error(`❌ Falta ${NOTICIAS_FILE}. Corre: node fetch-feeds.js`);
    process.exit(1);
  }
  const { noticias, actualizado } = JSON.parse(noticiasRaw);

  const analisisRaw = await readFile(ANALISIS_FILE, "utf-8").catch(() => null);
  const analisisTodos = analisisRaw ? JSON.parse(analisisRaw).analisis : [];
  const analisisAprobados = analisisTodos.filter((a) => a.estado === "aprobado");

  const fecha = new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Radar GT — Noticias con contexto</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Public+Sans:wght@400;500;600&display=swap');

  :root {
    --ink: #16211C; --ink-raised: #1E2C25; --ivory: #F0EBDE; --ivory-soft: #B9C1B8;
    --jade: #3FAE83; --jade-dim: #2C7A5C; --cochinilla: #C4364B; --line: #2E3A33;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ink); color: var(--ivory); font-family: 'Public Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 0 22px 70px; }

  header.masthead { position: relative; padding: 40px 0 30px; overflow: hidden; border-bottom: 1px solid var(--line); }
  .radar-rings { position: absolute; top: -60px; right: -80px; width: 260px; height: 260px; pointer-events: none; }
  .radar-rings circle { fill: none; stroke: var(--jade); opacity: 0.16; }
  .radar-rings .sweep { stroke: var(--jade); opacity: 0.35; stroke-width: 1.5; transform-origin: 130px 130px; animation: girar 6s linear infinite; }
  @keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .radar-rings .sweep { animation: none; } }
  .masthead-content { position: relative; z-index: 1; }
  header.masthead h1 { font-family: 'Fraunces', serif; font-size: 34px; font-weight: 600; margin: 0; letter-spacing: -0.01em; color: var(--ivory); }
  header.masthead .fecha { font-size: 14px; color: var(--ivory-soft); margin-top: 6px; }

  .destacado { margin-top: 34px; padding: 28px 26px; background: var(--ink-raised); border-radius: 4px; position: relative; overflow: hidden; }
  .destacado .marca-agua { position: absolute; right: -30px; bottom: -40px; width: 160px; height: 160px; opacity: 0.5; pointer-events: none; }
  .destacado::before { content: ""; position: absolute; left: 0; top: 20px; bottom: 20px; width: 3px; background: var(--jade); border-radius: 2px; }
  .destacado .categoria-pill, .destacado h2, .destacado p, .destacado .fuentes { position: relative; z-index: 1; }
  .destacado .categoria-pill { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--jade); font-weight: 500; margin-bottom: 14px; }
  .destacado .categoria-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--jade); }
  .destacado h2 { font-family: 'Fraunces', serif; font-size: 26px; line-height: 1.28; font-weight: 500; margin: 0 0 14px; color: var(--ivory); }
  .destacado p { font-size: 15.5px; line-height: 1.65; color: #DCD6C8; margin: 0 0 12px; }
  .fuentes { font-size: 13px; color: var(--ivory-soft); margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }
  .fuentes b { color: var(--ivory); font-weight: 500; }

  section.radar { margin-top: 46px; }
  section.radar > h3 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 500; margin: 0 0 4px; color: var(--ivory); }
  section.radar > p.sub { font-size: 13px; color: var(--ivory-soft); margin: 0 0 22px; }

  .categoria { margin-bottom: 30px; }
  .categoria .cat-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .categoria .cat-header .icon { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--ink-raised); flex-shrink: 0; }
  .categoria .cat-header .icon svg { width: 15px; height: 15px; }
  .categoria .cat-header h4 { font-size: 14.5px; font-weight: 500; color: var(--ivory); margin: 0; text-transform: capitalize; }
  .categoria.enfasis .icon svg { stroke: var(--cochinilla); }
  .categoria:not(.enfasis) .icon svg { stroke: var(--jade); }

  .item { padding: 14px 0 14px 16px; border-bottom: 1px solid var(--line); }
  .item a { color: #E3DED0; text-decoration: none; font-size: 15px; line-height: 1.45; display: block; }
  .item a:hover { color: var(--jade); }
  .item .meta { font-size: 12.5px; color: var(--ivory-soft); margin-top: 5px; }

  footer { margin-top: 46px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--ivory-soft); line-height: 1.7; }
</style>
</head>
<body>
  <div class="wrap">
    <header class="masthead">
      <svg class="radar-rings" viewBox="0 0 260 260">
        <circle cx="130" cy="130" r="40"/>
        <circle cx="130" cy="130" r="80"/>
        <circle cx="130" cy="130" r="120"/>
        <line class="sweep" x1="130" y1="130" x2="130" y2="10"/>
      </svg>
      <div class="masthead-content">
        <h1>Radar GT</h1>
        <div class="fecha">${escapeHtml(fecha)}</div>
      </div>
    </header>

    ${renderDestacado(analisisAprobados)}

    <section class="radar">
      <h3>Radar de titulares</h3>
      <p class="sub">Actualizado: ${escapeHtml(new Date(actualizado).toLocaleString("es-GT"))}</p>
      ${renderRadar(noticias)}
    </section>

    <footer>
      Radar GT recopila titulares públicos vía RSS con enlace directo a la fuente original.
      Los análisis son generados a partir de fuentes citadas y revisados antes de publicar.
    </footer>
  </div>
</body>
</html>`;

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`📦 Sitio generado en ${OUT_FILE}`);
  console.log(`   ${noticias.length} noticias, ${analisisAprobados.length} análisis aprobados incluidos.`);
}

main();
