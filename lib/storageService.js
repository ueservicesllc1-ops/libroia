const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();

const b2Client = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME;

/**
 * Sube un archivo a B2 en una ruta específica
 * @param {Buffer | string} fileBody 
 * @param {string} b2Path Ruta en el bucket (ej: books/123/cover.jpg)
 * @param {string} contentType 
 */
async function uploadToB2(fileBody, b2Path, contentType = "application/octet-stream") {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: b2Path,
    Body: fileBody,
    ContentType: contentType,
  });

  await b2Client.send(command);
  
  // URL pública (si el bucket es público) o proxy
  return `https://${BUCKET_NAME}.${process.env.B2_ENDPOINT}/${b2Path}`;
}

/**
 * Obtiene una URL firmada para descargar un archivo (bypass CORS/Privacidad)
 * @param {string} b2Path 
 */
async function getDownloadUrl(b2Path) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: b2Path,
  });

  // URL válida por 1 hora
  return await getSignedUrl(b2Client, command, { expiresIn: 3600 });
}

module.exports = {
  uploadToB2,
  getDownloadUrl,
  b2Client,
  BUCKET_NAME,
};
