const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadFile, getDownloadUrl } = require("../lib/storageService");

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
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
    const contentType = req.file.mimetype;

    const publicUrl = await uploadToB2(req.file.buffer, fileName, contentType);

    res.json({
      message: "Archivo subido con éxito",
      fileName,
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
