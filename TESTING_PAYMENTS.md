# Guía de Pruebas de Pagos - LibroAI 🏪

Sigue estos pasos para validar que el sistema de pagos y comisiones funciona correctamente en tu entorno local.

## 1. Requisitos Previos
*   Asegúrate de tener el archivo `stripe.exe` en la raíz del proyecto.
*   Tu archivo `.env` debe tener:
    *   `STRIPE_SECRET_KEY`
    *   `STRIPE_WEBHOOK_SECRET` (obtenido en el paso 2)
    *   `APP_BASE_URL=http://localhost:3000`

## 2. Iniciar el Túnel de Webhooks
Abre una terminal y ejecuta:
```bash
./stripe.exe listen --forward-to localhost:3000/api/payments/webhook
```
**Importante:** Mantén esta ventana abierta. Copia el `webhook signing secret` (whsec_...) al `.env` si cambió.

## 3. Casos de Prueba

### A. Compra de Libro con Precio
1.  Publica un libro con un precio (ej. $10.00).
2.  Inicia sesión con un usuario que **no sea el autor**.
3.  Ve al marketplace, entra al detalle del libro y haz clic en **Comprar**.
4.  Usa la tarjeta de prueba: `4242 4242 4242 4242`.
5.  Verifica que eres redirigido a `payment-success.html` y que el estado cambia a ✅.

### B. Evitar que el Autor se compre a sí mismo
1.  Inicia sesión como el autor del libro.
2.  Ve al detalle del libro.
3.  El botón debe decir **"Leer ahora"** o similar, y no permitir la compra. Si intentas forzar el API, el servidor devolverá un error 403.

### C. Libro Gratuito
1.  Publica un libro con precio `0`.
2.  Haz clic en el botón de lectura. El acceso debe ser instantáneo y crear un registro `free` en la tabla `purchases`.

### D. Idempotencia (Doble Webhook)
1.  El sistema está protegido contra eventos duplicados de Stripe. Puedes verificar los logs del servidor; si Stripe envía el mismo `session_id` dos veces, verás: `[Webhook] ℹ️ Evento duplicado ignorado`.

### E. Verificación de Ganancias
1.  Entra a `http://localhost:3000/sales.html` con la cuenta del autor.
2.  Verifica que el **Ingreso Neto** sea el 80% (si la comisión es 20%) y que los totales coincidan.

## 4. Tarjetas de Prueba Stripe
*   **Éxito:** `4242 4242 4242 4242`
*   **Fallo (Fondos insuficientes):** `4000 0000 0000 0225`
*   **Fallo (Tarjeta expirada):** `4000 0000 0000 0331`
