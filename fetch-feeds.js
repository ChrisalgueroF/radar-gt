// fetch-feeds.js
// Lee los feeds RSS configurados y guarda los items en data/noticias.json
// Uso: node fetch-feeds.js
// Requiere Node 18+ (usa fetch nativo, sin dependencias externas)

import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";

const FEEDS = [
  { fuente: "Prensa Libre", url: "https://www.prensalibre.com/feed" },
  { fuente: "Guatemala.com", url: "https://guatemala.com/feed" },
  // Agrega más feeds aquí conforme los vayas confirmando:
  // { fuente: "Soy502", url: "https://www.soy502.com/feed" },
];

const OUT_DIR = "./data";
const OUT_FILE = `${OUT_DIR}/noticias.json`;

// --- Extracción simple de <item> de un RSS 2.0 sin dependencias externas ---
function extraerTag(bloque, tag) {
  const regexCdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, "is");
  const regexPlano = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "is");
  const m = bloque.match(regexCdata) || bloque.match(regexPlano);
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "") // quita HTML embebido
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "’")
    .trim();
}

function parseRSS(xml, fuente) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((bloque) => ({
    fuente,
    titulo: extraerTag(bloque, "title"),
    link: extraerTag(bloque, "link"),
    fecha: extraerTag(bloque, "pubDate"),
    categoria: extraerTag(bloque, "category"),
    resumen: (extraerTag(bloque, "description") || extraerTag(bloque, "content:encoded")).slice(0, 600),
  }));
}

async function leerFeed({ fuente, url }) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RadarGT/1.0 (+agregador de noticias con atribucion)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRSS(xml, fuente);
    console.log(`✅ ${fuente}: ${items.length} notas`);
    return items;
  } catch (err) {
    console.error(`❌ ${fuente} (${url}): ${err.message}`);
    return [];
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const resultados = await Promise.all(FEEDS.map(leerFeed));
  const todas = resultados.flat();

  // Deduplicar por link, por si un feed se vuelve a leer con notas repetidas
  const vistos = new Set();
  const unicas = todas.filter((n) => {
    if (vistos.has(n.link)) return false;
    vistos.add(n.link);
    return true;
  });

  // Ordenar más reciente primero (best effort con pubDate)
  unicas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const payload = {
    actualizado: new Date().toISOString(),
    total: unicas.length,
    noticias: unicas,
  };

  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`\n📦 Guardado en ${OUT_FILE} — ${unicas.length} notas totales`);
}

main();
