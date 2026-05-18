# 🎸 Curso de Guitarra — Simón Mejías
### Landing Page de Alta Conversión · Node.js + Express

---

## Estructura del proyecto

```
/
├── public/
│   └── index.html          ← Landing page (Frontend)
├── data/
│   └── leads.json          ← Base de datos local (auto-generado)
├── server.js               ← Backend Node.js + Express
├── package.json
├── .env.example            ← Plantilla de variables de entorno
├── .env                    ← Tu archivo real (no subir a Git)
└── .gitignore
```

---

## Requisitos

- **Node.js** v18 o superior
- **npm** v9 o superior

Verifica tu versión:
```bash
node --version
npm --version
```

---

## Instalación local (paso a paso)

### 1. Clona o descarga el proyecto

```bash
git clone https://github.com/tu-usuario/curso-guitarra-simon.git
cd curso-guitarra-simon
```

### 2. Instala las dependencias

```bash
npm install
```

### 3. Configura las variables de entorno

```bash
cp .env.example .env
```

Abre `.env` y ajusta los valores:

```env
PORT=3000
NODE_ENV=development
ADMIN_TOKEN=mi_token_secreto
BASE_URL=http://localhost:3000
```

### 4. Coloca el frontend

Crea la carpeta `public/` y mueve el `index.html` dentro:

```bash
mkdir public
mv index.html public/
```

### 5. Inicia el servidor

**Producción:**
```bash
npm start
```

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

Abre el navegador en **http://localhost:3000** y verás la landing page.

---

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Sirve la landing page |
| `POST` | `/api/inscripcion` | Captura un nuevo lead |
| `GET` | `/api/leads` | Lista todos los leads (admin) |
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/gracias` | Página de confirmación |

---

### POST `/api/inscripcion`

**Body (JSON o form-urlencoded):**
```json
{
  "nombre": "Carlos Méndez",
  "email":  "carlos@email.com",
  "nivel":  "acustica"
}
```

**Valores válidos para `nivel`:**
`acustica` | `clasica` | `electrica` | `ninguna`

**Respuesta exitosa (201):**
```json
{
  "exito":   true,
  "mensaje": "¡Bienvenido al curso, Carlos! 🎸 Simón Mejías te contactará en menos de 24 horas...",
  "lead": {
    "id":     "uuid-generado",
    "nombre": "Carlos Méndez",
    "email":  "carlos@email.com",
    "nivel":  "acustica",
    "fecha":  "2026-05-18T12:00:00.000Z"
  }
}
```

**Respuesta de error de validación (400):**
```json
{
  "exito":   false,
  "mensaje": "Por favor corrige los siguientes errores.",
  "errores": ["El correo electrónico no tiene un formato válido."]
}
```

---

### GET `/api/leads` (Admin)

Requiere cabecera de autorización:
```
Authorization: Bearer <ADMIN_TOKEN>
```

**Respuesta (200):**
```json
{
  "exito":  true,
  "total":  3,
  "leads":  [ ... ]
}
```

---

## Integración de pagos

El archivo `server.js` incluye bloques comentados listos para activar:

### Stripe
```bash
npm install stripe
```
Descomenta el bloque `STRIPE` en `server.js` y agrega al `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
```

### Webpay (Chile — Transbank)
```bash
npm install transbank-sdk
```
Descomenta el bloque `WEBPAY` en `server.js` y agrega al `.env`:
```env
WEBPAY_COMMERCE_CODE=597055555532
WEBPAY_API_KEY=tu_api_key
```

---

## Despliegue en producción

### Railway (recomendado — gratis para empezar)
1. Crea cuenta en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno en el panel de Railway
4. Railway detecta automáticamente `npm start`

### Render
1. Crea cuenta en [render.com](https://render.com)
2. Nuevo servicio → Web Service → conecta GitHub
3. Build command: `npm install`
4. Start command: `npm start`

### VPS / Hostinger (con PM2)
```bash
npm install -g pm2
pm2 start server.js --name "curso-simon"
pm2 save
pm2 startup
```

### Variables de entorno en producción
```env
PORT=3000
NODE_ENV=production
ADMIN_TOKEN=token_muy_seguro_aqui
BASE_URL=https://simonmejias.cl
ALLOWED_ORIGIN=https://simonmejias.cl
```

---

## Migración a base de datos real

El sistema usa un archivo JSON local (`data/leads.json`) para simplicidad.
Para producción, reemplaza las funciones `readLeads()` / `writeLeads()` / `saveLead()` por:

**PostgreSQL** con `pg` o `prisma`:
```bash
npm install pg
# o
npm install prisma @prisma/client
```

**MongoDB** con `mongoose`:
```bash
npm install mongoose
```

---

## Seguridad en producción

- [ ] Cambiar `ADMIN_TOKEN` por un valor aleatorio largo
- [ ] Activar HTTPS (obligatorio con Stripe/Webpay)
- [ ] Configurar `ALLOWED_ORIGIN` con el dominio real
- [ ] Agregar rate limiting: `npm install express-rate-limit`
- [ ] Agregar helmet: `npm install helmet`
- [ ] Nunca subir `.env` a Git

---

## Licencia

© 2026 Simón Mejías. Todos los derechos reservados.
