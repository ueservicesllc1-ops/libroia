# LibroAI Web App

Editor de libros con asistente IA, **planes y facturacion por uso** (Anthropic), sesiones de usuario y SQLite para uso listo para Stripe.

## Funcionalidades

- Plan basico **US$15/mes** (referencia de negocio): **3.000.000 tokens/mes** del modelo **economico** (Haiku u otro vía `ANTHROPIC_DRAFT_MODEL`). Contador **input + output**.
- **Sonnet PRO** no consume cupo incluido: **pago por uso** con precio al usuario **US$6 / 1M input** y **US$30 / 1M output** (2x sobre coste proveedor 3/15).
- Alerta al **80%** del cupo incluido; bloqueo al **100%** del modelo economico hasta el siguiente ciclo.
- Registro en **`ai_usage_logs`** y **`billing_events`** (Sonnet).
- Webhook Stripe: ruta reservada `POST /api/stripe/webhook` (cuerpo `raw`); implementar `constructEvent` en produccion.

## Requisitos

- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)

## Modo prueba (sin login ni cobros)

En `.env`:

```env
SKIP_AUTH=true
BILLING_RELAXED=true
DEV_USER_ID=1
```

- **`SKIP_AUTH`**: no hace falta iniciar sesion; el backend usa el usuario `DEV_USER_ID` (por defecto `1`, el de la semilla).
- **`BILLING_RELAXED`**: no se aplican cupos ni pago por uso; **no se guarda** consumo en BD (solo respuesta de Anthropic para probar).

Para produccion: `SKIP_AUTH=false`, `BILLING_RELAXED=false` y configura sesion + Stripe.

## Cuentas (email + contrasena y Google)

Con `SKIP_AUTH=false`:

1. **Crear cuenta**: pestana "Crear cuenta", correo y contrasena (minimo 8 caracteres).
2. **Entrar**: correo y contrasena.
3. **Google**: en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea un **ID de cliente OAuth** (aplicacion web). En **Origenes autorizados de JavaScript** añade `http://localhost:3000` (y tu dominio en produccion). Copia el **ID de cliente** en `.env` como `GOOGLE_CLIENT_ID=...`. Tras reiniciar el servidor veras el boton "Continuar con Google".

Si un usuario antiguo solo tenia email sin contrasena, puede **registrarse** con el mismo email para definir contrasena (solo si esa cuenta no uso Google antes).

## Ejecutar

```bash
npm install
cp .env.example .env
# edita .env
npm start
```

Abre [http://localhost:3000](http://localhost:3000). Con `SKIP_AUTH=false`, **registrate** o **inicia sesion** (correo + contrasena o Google si configuraste `GOOGLE_CLIENT_ID`). El primer usuario sembrado en BD vacia usa `DEFAULT_SEED_EMAIL` (sin contrasena hasta que alguien se registre con ese email).

## API principal

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Body `{ "email", "password" }`. Crea cuenta o asigna contrasena a cuenta legacy sin password ni Google. |
| POST | `/api/auth/login` | Body `{ "email", "password" }`. Crea sesion. |
| POST | `/api/auth/google` | Body `{ "credential" }` (JWT del boton Google). Crea o vincula cuenta. |
| POST | `/api/auth/logout` | Cierra sesion. |
| GET | `/api/auth/me` | Siempre **200**: `{ "user": null }` sin sesion, o `{ "user": { ... } }` si hay sesion (evita 401 en consola del navegador). |
| GET | `/api/config/public` | `skipAuth`, `billingRelaxed`, `googleClientId` (para el cliente). |
| GET | `/api/billing/usage` | Cupo incluido, %, flags Sonnet, gasto Sonnet del ciclo. |
| PUT | `/api/billing/sonnet-payg` | Body `{ "enabled": boolean, "monthlyLimitUsd": number \| null }`. |
| POST | `/api/ai/estimate-cost` | Body `{ prompt, modelMode, chapterText?, bookTitle? }`. |
| POST | `/api/ai/generate` | Body `{ prompt, modelMode: "included"\|"sonnet", requestType, chapterText?, bookTitle? }`. **Unico** camino servidor para Anthropic con registro de uso. |
| GET | `/api/books` | Libros del usuario (cookie sesion). |

Export Markdown: `GET /api/books/:bookId/export.md`

## Datos

- `data/books.json` — libros por `user_id`.
- `data/app.db` — usuarios, logs de IA, eventos de facturacion.

## Constantes de negocio

Definidas en `lib/billing/constants.js` (tambien aplicadas en `usageService`).

## Seguridad

- No expongas `ANTHROPIC_API_KEY` ni `SESSION_SECRET`.
- El registro de uso ocurre **solo** en el servidor tras respuesta OK de Anthropic; no hay otro endpoint que consuma el plan sin auditar.
