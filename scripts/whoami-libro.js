/**
 * Comprueba qué proceso responde en /api/auth/me (debe ser LibroAI: libroai:true y cabecera X-LibroAI).
 * Uso: npm run libro:who   (con el servidor LibroAI ya arrancado)
 */
const http = require("http");

const port = Number(process.env.PORT) || 3000;

const req = http.get(
  {
    hostname: "127.0.0.1",
    port,
    path: "/api/auth/me",
    headers: { Accept: "application/json" },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => {
      body += c;
    });
    res.on("end", () => {
      console.log("Puerto:", port);
      console.log("HTTP:", res.statusCode);
      console.log("Cabecera X-LibroAI:", res.headers["x-libroai"] || "(ausente)");
      console.log("Cuerpo:", body);
      let j;
      try {
        j = JSON.parse(body);
      } catch {
        console.error("\nNo es JSON valido: probablemente no es LibroAI.");
        process.exit(1);
        return;
      }
      if (!j.libroai) {
        console.error(
          '\nEsta respuesta NO es de LibroAI (falta "libroai":true). Otro programa usa el puerto o la URL no apunta a este proyecto.'
        );
        console.error("Solucion: en .env pon PORT=3100 (u otro libre), reinicia npm run dev y abre esa URL.");
        process.exit(1);
      }
      console.log("\nOK: es LibroAI.");
    });
  }
);

req.on("error", (e) => {
  console.error("No se pudo conectar:", e.message);
  console.error("Arranca antes el servidor (npm run dev) en el puerto", port);
  process.exit(1);
});
