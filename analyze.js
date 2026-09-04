// analyze.js
// Toma data/noticias.json y genera un borrador de análisis por categoría
// usando la API de Claude. Guarda el resultado en data/analisis.json
// marcado como "borrador" — pendiente de tu revisión antes de publicar.
//
// Requiere la variable de entorno ANTHROPIC_API_KEY.
// Uso: ANTHROPIC_API_KEY=sk-ant-... node analyze.js

import { readFile, writeFile } from "fs/promises";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const NOTICIAS_FILE = "./data/noticias.json";
const OUT_FILE = "./data/analisis.json";

if (!API_KEY) {
  console.error("❌ Falta ANTHROPIC_API_KEY. Corre así:\n   ANTHROPIC_API_KEY=sk-ant-... node analyze.js");
  process.exit(1);
}

function agruparPorCategoria(noticias) {
  const grupos = {};
  for (const n of noticias) {
    const cat = (n.categoria || "General").trim() || "General";
    grupos[cat] = grupos[cat] || [];
    grupos[cat].push(n);
  }
  return grupos;
}

async function generarAnalisis(categoria, notas) {
  // Solo mandamos título + resumen + fuente + link — no el artículo completo,
  // para minimizar cuánto texto ajeno entra al prompt.
  const contexto = notas
    .slice(0, 8)
    .map((n, i) => `[${i + 1}] (${n.fuente}) ${n.titulo}\nResumen: ${n.resumen}\nLink: ${n.link}`)
    .join("\n\n");

  const prompt = `Eres editor de un sitio de noticias guatemalteco. Con base en estos titulares y resúmenes de HOY sobre "${categoria}", escribe un análisis breve (150-220 palabras) en español que:

- Compare o conecte lo que reportan las distintas fuentes (no te limites a una sola).
- Aporte contexto o una pregunta abierta que el lector debería tener en mente.
- NO copies frases textuales de los resúmenes — reformula todo con tus propias palabras.
- Al final, incluye una línea "Fuentes: " listando qué medios citaste.
- Si la información es insuficiente para un análisis real, dilo honestamente en vez de inventar conexiones.

Notas de hoy:
${contexto}

Responde SOLO con el análisis, sin preámbulo ni comillas.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const texto = data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return texto;
}

async function main() {
  const raw = await readFile(NOTICIAS_FILE, "utf-8").catch(() => {
    console.error(`❌ No encontré ${NOTICIAS_FILE}. Corre primero: node fetch-feeds.js`);
    process.exit(1);
  });
  const { noticias, actualizado } = JSON.parse(raw);

  if (!noticias?.length) {
    console.error("❌ noticias.json está vacío. Corre fetch-feeds.js primero.");
    process.exit(1);
  }

  const grupos = agruparPorCategoria(noticias);
  const categorias = Object.keys(grupos).filter((c) => grupos[c].length >= 2); // solo temas con >=2 notas

  console.log(`📊 ${categorias.length} categorías con suficiente material: ${categorias.join(", ")}`);

  const analisis = [];
  for (const cat of categorias) {
    console.log(`✍️  Generando análisis: ${cat}...`);
    try {
      const texto = await generarAnalisis(cat, grupos[cat]);
      analisis.push({
        categoria: cat,
        texto,
        notas_usadas: grupos[cat].slice(0, 8).map((n) => ({ titulo: n.titulo, fuente: n.fuente, link: n.link })),
        estado: "borrador", // <- pendiente de revisión humana antes de publicar
        generado: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`   ❌ Falló "${cat}": ${err.message}`);
    }
  }

  await writeFile(
    OUT_FILE,
    JSON.stringify({ basado_en: actualizado, generado: new Date().toISOString(), analisis }, null, 2),
    "utf-8"
  );

  console.log(`\n📦 Guardado en ${OUT_FILE} — ${analisis.length} borradores generados.`);
  console.log(`⚠️  Revísalos antes de publicar: cambia "estado" a "aprobado" en cada uno que apruebes.`);
}

main();
