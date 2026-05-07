const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const { uploadToB2, getDownloadUrl } = require("../lib/storageService");

// Configurar multer para memoria (no guardar en disco local)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite 10MB
  },
});

/**
 * Endpoint para subir archivos
 * POST /api/media/upload
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    // Generar un nombre único o usar el original con prefijo de tiempo
    const safeOriginal = String(req.file.originalname || "archivo")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");
    const fileName = `books/covers/${Date.now()}-${safeOriginal}`;
    const contentType = req.file.mimetype;
    let publicUrl = "";
    let storedAs = fileName;
    try {
      publicUrl = await uploadToB2(req.file.buffer, fileName, contentType);
    } catch (b2Err) {
      // Fallback local para no bloquear el flujo si B2 falla (credenciales/CORS/etc).
      const mediaDir = path.join(__dirname, "..", "data", "media");
      await fs.mkdir(mediaDir, { recursive: true });
      const localName = `${Date.now()}-${safeOriginal}`;
      const localPath = path.join(mediaDir, localName);
      await fs.writeFile(localPath, req.file.buffer);
      storedAs = `local/${localName}`;
      publicUrl = `/data/media/${localName}`;
      console.warn("[Media] B2 falló, usando almacenamiento local:", b2Err.message);
    }

    res.json({
      message: "Archivo subido con éxito",
      fileName: storedAs,
      url: publicUrl,
    });
  } catch (error) {
    console.error("[Media] Error al subir:", error);
    res.status(500).json({ error: "Error al procesar el archivo" });
  }
});

/**
 * Proxy para servir archivos y evitar problemas de CORS
 * GET /api/media/serve/:fileName
 */
router.get("/serve/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;
    if (fileName.startsWith("local/")) {
      const localName = fileName.slice("local/".length);
      return res.redirect(`/data/media/${localName}`);
    }
    const signedUrl = await getDownloadUrl(fileName);
    
    // Redirigir a la URL firmada de B2
    // Esto funciona como proxy ya que la URL firmada permite el acceso directo
    res.redirect(signedUrl);
  } catch (error) {
    console.error("[Media] Error al servir:", error);
    res.status(404).json({ error: "Archivo no encontrado" });
  }
});

module.exports = router;
