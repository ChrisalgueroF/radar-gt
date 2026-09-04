// run-all.js
// Corre la cadena completa: recolectar -> analizar -> generar sitio.
// OJO: analyze.js genera BORRADORES, no los publica solos — después de
// correr esto, revisa data/analisis.json y cambia "estado" a "aprobado"
// en los que quieras publicar, y vuelve a correr generate-site.js.
//
// Uso: ANTHROPIC_API_KEY=sk-ant-... node run-all.js

import { spawn } from "child_process";

function correr(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Ejecutando ${script}...\n`);
    const p = spawn("node", [script], { stdio: "inherit", env: process.env });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} salió con código ${code}`))));
  });
}

async function main() {
  await correr("fetch-feeds.js");
  await correr("analyze.js");
  await correr("generate-site.js");
  console.log(`\n✅ Listo. Revisa data/analisis.json, aprueba los borradores que quieras publicar,`);
  console.log(`   y corre "node generate-site.js" de nuevo para que el sitio los incluya.`);
}

main();
