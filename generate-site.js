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

function renderDestacado(analisis) {
  if (!analisis.length) {
    return `<div class="destacado"><p>Aún no hay análisis aprobados para hoy. Corre <code>analyze.js</code> y aprueba al menos uno en <code>data/analisis.json</code>.</p></div>`;
  }
  return analisis
    .map(
      (a) => `
    <div class="destacado">
      <div class="tag">Análisis del día · ${escapeHtml(a.categoria)}</div>
      <h2>${escapeHtml(a.categoria)}: lo que dicen las fuentes hoy</h2>
      <p>${escapeHtml(a.texto).replace(/\n/g, "<br>")}</p>
      <div class="fuentes">
        Fuentes: ${a.notas_usadas.map((n) => `<span>${escapeHtml(n.fuente)}</span>`).join(", ")}
      </div>
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
    .map(
      ([cat, notas]) => `
    <div class="categoria">
      <h4>${escapeHtml(cat.toUpperCase())}</h4>
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
    </div>`
    )
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
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600&display=swap');
  :root {
    --paper: #EFEDE6; --paper-raised: #F7F5F0; --ink: #1F2421; --ink-soft: #565750;
    --line: #C9C4B5; --quetzal: #0F5C4A; --copal: #C77B2E;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 0 20px 60px; }
  header.masthead { padding: 28px 0 18px; border-bottom: 2px solid var(--ink); display: flex; justify-content: space-between; align-items: baseline; }
  header.masthead h1 { font-family: 'Newsreader', serif; font-size: 30px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  header.masthead .fecha { font-size: 13px; color: var(--ink-soft); }
  .destacado { margin-top: 28px; padding: 22px; background: var(--paper-raised); border-left: 3px solid var(--quetzal); }
  .destacado .tag { font-size: 12px; color: var(--quetzal); font-weight: 600; margin-bottom: 10px; }
  .destacado h2 { font-family: 'Newsreader', serif; font-size: 24px; line-height: 1.25; font-weight: 600; margin: 0 0 12px; }
  .destacado p { font-size: 15px; line-height: 1.6; margin: 0 0 10px; }
  .fuentes { font-size: 12.5px; color: var(--ink-soft); margin-top: 14px; }
  .fuentes span { color: var(--ink); font-weight: 500; }
  section.radar { margin-top: 40px; }
  section.radar > h3 { font-family: 'Newsreader', serif; font-size: 19px; font-weight: 600; margin: 0 0 4px; }
  section.radar > p.sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 18px; }
  .categoria { margin-bottom: 26px; }
  .categoria h4 { font-size: 12px; font-weight: 600; color: var(--copal); margin: 0 0 10px; }
  .item { padding: 12px 0; border-top: 1px solid var(--line); }
  .item:last-child { border-bottom: 1px solid var(--line); }
  .item a { color: var(--ink); text-decoration: none; font-size: 15px; line-height: 1.4; display: block; }
  .item a:hover { color: var(--quetzal); }
  .item .meta { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }
  footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 12px; color: var(--ink-soft); line-height: 1.6; }
</style>
</head>
<body>
  <div class="wrap">
    <header class="masthead">
      <h1>Radar GT</h1>
      <div class="fecha">${escapeHtml(fecha)}</div>
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
