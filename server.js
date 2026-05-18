/**
 * ============================================================
 *  SERVIDOR BACKEND — Curso de Guitarra · Simón Mejías
 *  Stack: Node.js + Express
 *  Archivo: server.js
 * ============================================================
 *
 *  Para iniciar en desarrollo:
 *    npm install
 *    node server.js          (producción)
 *    npx nodemon server.js   (desarrollo con auto-reload)
 *
 *  Variables de entorno disponibles (.env):
 *    PORT         → Puerto del servidor  (default: 3000)
 *    NODE_ENV     → "development" | "production"
 *    ALLOWED_ORIGIN → URL del frontend permitida para CORS
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────
   1. DEPENDENCIAS
───────────────────────────────────────── */
const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');

/* Cargar variables de entorno desde .env si existe */
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

/* ─────────────────────────────────────────
   2. CONFIGURACIÓN INICIAL
───────────────────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';

/* Ruta al archivo de leads (simulación de base de datos en JSON) */
const DB_PATH = path.join(__dirname, 'data', 'leads.json');

/* ─────────────────────────────────────────
   3. HELPERS DE BASE DE DATOS (JSON en disco)
   En producción, reemplazar por PostgreSQL / MongoDB / MySQL
───────────────────────────────────────── */

/**
 * Lee todos los leads almacenados.
 * @returns {Array} Array de objetos lead
 */
function readLeads() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Escribe el array de leads al archivo JSON.
 * @param {Array} leads
 */
function writeLeads(leads) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2), 'utf8');
}

/**
 * Guarda un nuevo lead y retorna el objeto guardado.
 * @param {Object} data - { nombre, email, nivel }
 * @returns {Object} Lead guardado con id y timestamp
 */
function saveLead(data) {
  const leads = readLeads();

  const lead = {
    id:         crypto.randomUUID(),
    nombre:     data.nombre.trim(),
    email:      data.email.trim().toLowerCase(),
    nivel:      data.nivel,
    fecha:      new Date().toISOString(),
    ip:         data.ip || null,
    fuente:     data.fuente || 'landing-page',
    pagado:     false,   /* Se actualiza desde la pasarela de pagos */
    etapa:      'lead'   /* lead → pago_pendiente → alumno */
  };

  leads.push(lead);
  writeLeads(leads);
  return lead;
}

/* ─────────────────────────────────────────
   4. UTILIDADES DE VALIDACIÓN
───────────────────────────────────────── */

const NIVELES_VALIDOS = ['acustica', 'clasica', 'electrica', 'ninguna'];

/**
 * Valida el formato de un email.
 * @param {string} email
 * @returns {boolean}
 */
function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Sanitiza texto: elimina HTML, limita longitud.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function sanitizar(str, max = 100) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, max);
}

/**
 * Valida el body de una solicitud de inscripción.
 * @param {Object} body
 * @returns {{ ok: boolean, errores: string[] }}
 */
function validarInscripcion(body) {
  const errores = [];

  const nombre = sanitizar(body.nombre, 80);
  const email  = sanitizar(body.email, 120);
  const nivel  = sanitizar(body.nivel, 30);

  if (!nombre || nombre.length < 2)
    errores.push('El nombre debe tener al menos 2 caracteres.');

  if (!email || !esEmailValido(email))
    errores.push('El correo electrónico no tiene un formato válido.');

  if (!nivel || !NIVELES_VALIDOS.includes(nivel))
    errores.push(`El nivel/guitarra debe ser uno de: ${NIVELES_VALIDOS.join(', ')}.`);

  return { ok: errores.length === 0, errores, nombre, email, nivel };
}

/* ─────────────────────────────────────────
   5. MIDDLEWARES GLOBALES
───────────────────────────────────────── */

/* Parseo de JSON y formularios HTML */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Archivos estáticos (index.html, CSS, imágenes, etc.) */
app.use(express.static(path.join(__dirname, 'public')));

/* Seguridad básica: cabeceras HTTP */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  /* CORS: permite sólo el origen configurado (o cualquiera en dev) */
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* Logger simple de peticiones */
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

/* ─────────────────────────────────────────
   6. RUTAS
───────────────────────────────────────── */

/* ── 6.1  GET /  →  Sirve la landing page ── */
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  if (!fs.existsSync(indexPath)) {
    return res.status(404).send(`
      <h2>index.html no encontrado</h2>
      <p>Coloca el archivo <strong>index.html</strong> dentro de la carpeta <code>public/</code>.</p>
    `);
  }

  res.sendFile(indexPath);
});

/* ── 6.2  POST /api/inscripcion  →  Captura de leads ── */
/**
 * Recibe los datos del formulario de inscripción.
 *
 * Body esperado (JSON o form-urlencoded):
 *   { nombre: string, email: string, nivel: string }
 *
 * Respuestas:
 *   201 → Inscripción exitosa
 *   400 → Errores de validación
 *   409 → Email ya registrado
 *   500 → Error interno del servidor
 */
app.post('/api/inscripcion', (req, res) => {
  try {
    /* ── Validación ── */
    const { ok, errores, nombre, email, nivel } = validarInscripcion(req.body);

    if (!ok) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'Por favor corrige los siguientes errores.',
        errores
      });
    }

    /* ── Verificar duplicados por email ── */
    const leads      = readLeads();
    const duplicado  = leads.find(l => l.email === email.toLowerCase());

    if (duplicado) {
      return res.status(409).json({
        exito:   false,
        mensaje: `El correo ${email} ya está registrado. ¡Te esperamos en el curso!`,
        errores: []
      });
    }

    /* ── Guardar lead ── */
    const lead = saveLead({
      nombre,
      email,
      nivel,
      ip:     req.ip || req.headers['x-forwarded-for'] || null,
      fuente: req.headers['referer'] || 'direct'
    });

    /* ── [HOOK] Integración de Pasarela de Pagos ──────────────────────
     *
     *  Aquí se conectaría la API de pagos para procesar la compra.
     *  Descomentar y adaptar según el proveedor elegido:
     *
     *  ─ STRIPE ──────────────────────────────────────────────────────
     *  const stripe     = require('stripe')(process.env.STRIPE_SECRET_KEY);
     *  const session    = await stripe.checkout.sessions.create({
     *    payment_method_types: ['card'],
     *    line_items: [{
     *      price_data: {
     *        currency:     'usd',
     *        product_data: { name: 'Curso de Guitarra — Simón Mejías' },
     *        unit_amount:  9700,   // $97.00 USD en centavos
     *      },
     *      quantity: 1,
     *    }],
     *    mode:        'payment',
     *    customer_email: email,
     *    success_url: `${process.env.BASE_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
     *    cancel_url:  `${process.env.BASE_URL}/#inscripcion`,
     *  });
     *  return res.status(201).json({ exito: true, checkout_url: session.url });
     *
     *  ─ WEBPAY (Transbank — Chile) ───────────────────────────────────
     *  const { WebpayPlus } = require('transbank-sdk');
     *  const tx     = new WebpayPlus.Transaction();
     *  const result = await tx.create(
     *    lead.id,                   // orden de compra
     *    lead.id,                   // session id
     *    9700,                      // monto en CLP
     *    `${process.env.BASE_URL}/api/webpay/retorno`
     *  );
     *  return res.status(201).json({ exito: true, checkout_url: result.url + '?token_ws=' + result.token });
     *
     *  ─ PAYPAL ───────────────────────────────────────────────────────
     *  // Usar @paypal/checkout-server-sdk o la REST API de PayPal
     *
     * ───────────────────────────────────────────────────────────────── */

    /* ── [HOOK] Envío de Email de Bienvenida ─────────────────────────
     *
     *  En producción, enviar un email transaccional al nuevo alumno.
     *  Providers sugeridos: Resend, SendGrid, Nodemailer + SMTP.
     *
     *  Ejemplo con Resend:
     *  const resend = new Resend(process.env.RESEND_API_KEY);
     *  await resend.emails.send({
     *    from:    'Simón Mejías <hola@simonmejias.cl>',
     *    to:      email,
     *    subject: '¡Bienvenido al curso de guitarra! 🎸',
     *    html:    `<p>Hola ${nombre}, gracias por inscribirte...</p>`,
     *  });
     *
     * ───────────────────────────────────────────────────────────────── */

    /* ── Respuesta exitosa ── */
    return res.status(201).json({
      exito:   true,
      mensaje: `¡Bienvenido al curso, ${nombre}! 🎸 Simón Mejías te contactará en menos de 24 horas con los próximos pasos. Revisa tu correo ${email}.`,
      lead: {
        id:     lead.id,
        nombre: lead.nombre,
        email:  lead.email,
        nivel:  lead.nivel,
        fecha:  lead.fecha
      }
    });

  } catch (error) {
    console.error('[POST /api/inscripcion] Error interno:', error);
    return res.status(500).json({
      exito:   false,
      mensaje: 'Ocurrió un error interno. Por favor inténtalo más tarde.',
      errores: []
    });
  }
});

/* ── 6.3  GET /api/leads  →  Admin: listar leads (protegido) ── */
/**
 * Endpoint administrativo para ver todos los leads registrados.
 * IMPORTANTE: en producción, proteger con autenticación JWT / API Key.
 *
 * Ejemplo de protección mínima:
 *   Authorization: Bearer <ADMIN_TOKEN>
 */
app.get('/api/leads', (req, res) => {
  /* Protección básica por token en cabecera */
  const adminToken = process.env.ADMIN_TOKEN;
  const authHeader = req.headers['authorization'] || '';

  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return res.status(401).json({
      exito:   false,
      mensaje: 'No autorizado. Incluye el token de administración.'
    });
  }

  try {
    const leads = readLeads();
    return res.status(200).json({
      exito:  true,
      total:  leads.length,
      leads
    });
  } catch (error) {
    console.error('[GET /api/leads] Error:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error al leer los datos.' });
  }
});

/* ── 6.4  GET /api/health  →  Health check ── */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    estado:    'ok',
    servidor:  'Simón Mejías — Curso de Guitarra',
    entorno:   ENV,
    timestamp: new Date().toISOString()
  });
});

/* ── 6.5  GET /gracias  →  Página de confirmación post-pago ── */
app.get('/gracias', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Inscripción confirmada! · Simón Mejías</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0d1117;
          color: #f0ede8;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          text-align: center;
        }
        .card {
          max-width: 540px;
          background: #161e28;
          border: 1px solid rgba(230,126,34,0.25);
          border-radius: 20px;
          padding: 3rem 2.5rem;
        }
        .icon { font-size: 3.5rem; margin-bottom: 1.2rem; }
        h1 {
          font-family: 'Montserrat', sans-serif;
          font-size: 1.8rem;
          color: #e67e22;
          margin-bottom: 1rem;
        }
        p { color: #a09080; line-height: 1.7; margin-bottom: 1.5rem; }
        a {
          display: inline-block;
          padding: 0.9rem 2rem;
          background: #e67e22;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          transition: background 0.2s;
        }
        a:hover { background: #f39c12; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">🎸</div>
        <h1>¡Bienvenido al curso!</h1>
        <p>Tu inscripción fue confirmada exitosamente. Simón Mejías se pondrá en contacto contigo en menos de 24 horas con todos los detalles de acceso.</p>
        <p>Mientras tanto, revisa tu correo electrónico — te enviamos un mensaje de bienvenida.</p>
        <a href="/">← Volver al inicio</a>
      </div>
    </body>
    </html>
  `);
});

/* ─────────────────────────────────────────
   7. MANEJO DE RUTAS NO ENCONTRADAS (404)
───────────────────────────────────────── */
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>404 — Página no encontrada</title>
        <style>
          body { background:#0d1117; color:#f0ede8; font-family:sans-serif;
                 display:flex; align-items:center; justify-content:center;
                 min-height:100vh; text-align:center; }
          h1 { font-size:4rem; color:#e67e22; }
          a  { color:#e67e22; }
        </style>
      </head>
      <body>
        <div>
          <h1>404</h1>
          <p>La página que buscas no existe.</p>
          <p><a href="/">← Volver al inicio</a></p>
        </div>
      </body>
      </html>
    `);
  }
  res.status(404).json({ exito: false, mensaje: 'Ruta no encontrada.' });
});

/* ─────────────────────────────────────────
   8. MANEJO DE ERRORES GLOBAL (500)
───────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR GLOBAL]', err);
  res.status(500).json({
    exito:   false,
    mensaje: ENV === 'development' ? err.message : 'Error interno del servidor.'
  });
});

/* ─────────────────────────────────────────
   9. INICIO DEL SERVIDOR
───────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('');
  console.log('  🎸  Servidor — Curso de Guitarra · Simón Mejías');
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Entorno  : ${ENV}`);
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  Leads DB : ${DB_PATH}`);
  console.log('  ─────────────────────────────────────────────────');
  console.log('  Endpoints disponibles:');
  console.log(`    GET  /                  → Landing page`);
  console.log(`    POST /api/inscripcion   → Captura de leads`);
  console.log(`    GET  /api/leads         → Listar leads (admin)`);
  console.log(`    GET  /api/health        → Health check`);
  console.log(`    GET  /gracias           → Confirmación post-pago`);
  console.log('');
});

module.exports = app; /* Exportar para testing con Jest/Supertest */
