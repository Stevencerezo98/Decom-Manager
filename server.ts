import express from "express";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth, Buttons } = pkg;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Interfaces for TypeScript Safety
export interface OpcionConfig {
  key: string;            // e.g. "1", "2", "CONFIRMAR", "CANCELAR"
  label: string;          // e.g. "Confirmar Asistencia"
  target_status: "CONFIRMADO" | "CANCELADO" | "PENDIENTE";
  bot_response: string;   // e.g. "¡Gracias por confirmar tu servicio!"
}

export interface PlantillaConfig {
  id?: number;
  tipo_interaccion: "BUTTONS" | "NUMBERS";
  mensaje_encabezado: string;
  opciones: OpcionConfig[];
}

export interface ConfirmacionRecord {
  id?: number;
  telefono: string;
  nombre: string;
  asignacion: string;
  fecha: string;
  mensaje_enviado: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO";
  respuesta_recibida?: string | null;
  fecha_respuesta?: string | null;
  created_at?: string;
}

// In-Memory Fallbacks in case MySQL service is not reachable
let defaultPlantillaConfig: PlantillaConfig = {
  id: 1,
  tipo_interaccion: "NUMBERS",
  mensaje_encabezado: "Hola *{nombre}* 👋\n\nTe recordamos tu servicio asignado en el *Comité de Comunicaciones*:\n\n📌 *Asignación:* {asignacion}\n\nPor favor selecciona una opción para confirmar tu disponibilidad:",
  opciones: [
    {
      key: "1",
      label: "Confirmar Asistencia",
      target_status: "CONFIRMADO",
      bot_response: "¡Excelente *{nombre}*! Tu asistencia ha sido confirmada en el sistema. Nos vemos 30 minutos antes. 🙏✨"
    },
    {
      key: "2",
      label: "No Podré Asistir",
      target_status: "CANCELADO",
      bot_response: "Entendido *{nombre}*. Agradecemos tu aviso previo. Notificaremos al coordinador para gestionar tu reemplazo. Bendiciones. ❤️"
    }
  ]
};

let inMemoryConfirmaciones: ConfirmacionRecord[] = [];

// MySQL Pool Connection
let pool: mysql.Pool | null = null;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'decom_manager',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();

    // 1. Existing app_state table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        state_json LONGTEXT
      )
    `);

    // 2. Tabla plantilla_config
    await connection.query(`
      CREATE TABLE IF NOT EXISTS plantilla_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tipo_interaccion VARCHAR(20) NOT NULL DEFAULT 'NUMBERS',
        mensaje_encabezado TEXT NOT NULL,
        opciones JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabla confirmaciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS confirmaciones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        telefono VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        asignacion VARCHAR(100) NOT NULL,
        fecha VARCHAR(50) NOT NULL,
        mensaje_enviado TEXT NOT NULL,
        estado ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO') DEFAULT 'PENDIENTE',
        respuesta_recibida TEXT NULL,
        fecha_respuesta TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default plantilla_config if empty
    const [rows] = await connection.query('SELECT id FROM plantilla_config WHERE id = 1');
    if ((rows as any[]).length === 0) {
      await connection.query(
        'INSERT INTO plantilla_config (id, tipo_interaccion, mensaje_encabezado, opciones) VALUES (1, ?, ?, ?)',
        [defaultPlantillaConfig.tipo_interaccion, defaultPlantillaConfig.mensaje_encabezado, JSON.stringify(defaultPlantillaConfig.opciones)]
      );
    }

    // Seed app_state initial row
    const [appRows] = await connection.query('SELECT id FROM app_state WHERE id = 1');
    if ((appRows as any[]).length === 0) {
      await connection.query('INSERT INTO app_state (id, state_json) VALUES (1, ?)', ['{}']);
    }

    connection.release();
    console.log('✅ MySQL Database & Tables (plantilla_config, confirmaciones) initialized.');
  } catch (error) {
    console.error('⚠️ MySQL Connection Error (running in fallback state mode):', (error as Error).message);
    pool = null;
  }
}

// WhatsApp Web Client Setup
let waStatus: "DISCONNECTED" | "QR_READY" | "AUTHENTICATED" | "READY" = "DISCONNECTED";
let qrCodeData: string | null = null;
let client: any = null;

function initWhatsAppClient() {
  try {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ]
      }
    });

    client.on("qr", (qr: string) => {
      waStatus = "QR_READY";
      qrCodeData = qr;
      console.log("📲 ESCANEA ESTE CÓDIGO QR PARA VINCULAR WHATSAPP AUTOMATION:");
      qrcode.generate(qr, { small: true });
    });

    client.on("authenticated", () => {
      waStatus = "AUTHENTICATED";
      qrCodeData = null;
      console.log("✅ Sesión de WhatsApp autenticada correctamente.");
    });

    client.on("ready", () => {
      waStatus = "READY";
      console.log("🚀 Cliente de WhatsApp Automation listo para enviar y recibir mensajes.");
    });

    client.on("disconnected", (reason: string) => {
      waStatus = "DISCONNECTED";
      console.log("⚠️ Cliente de WhatsApp desconectado:", reason);
    });

    // 📩 LISTENER CLIENTE: Escuchar respuestas entrantes y actualizar confirmaciones en MySQL
    client.on("message", async (msg: any) => {
      try {
        const fromNumber = msg.from.replace("@c.us", "").replace(/[^0-9]/g, "");
        const textBody = (msg.body || "").trim();
        console.log(`📩 Mensaje entrante de WhatsApp [${fromNumber}]: "${textBody}"`);

        // Get active configuration from MySQL or fallback
        let config = await getActivePlantillaConfig();

        // Find pending confirmation for this phone in MySQL or memory
        let pendingRecord = await findPendingConfirmation(fromNumber);

        if (!pendingRecord) {
          console.log(`ℹ️ No se encontró confirmación PENDIENTE para el número ${fromNumber}`);
          return;
        }

        // Match response against options
        let matchedOption = config.opciones.find(opt => {
          const keyMatch = opt.key.toLowerCase() === textBody.toLowerCase();
          const labelMatch = opt.label.toLowerCase() === textBody.toLowerCase();
          const numberMatch = textBody.startsWith(opt.key);
          return keyMatch || labelMatch || numberMatch;
        });

        // Default to option 1 if thumbs up emoji or "sí"
        if (!matchedOption) {
          if (["si", "sí", "confirmo", "👍", "ok"].includes(textBody.toLowerCase())) {
            matchedOption = config.opciones.find(o => o.target_status === "CONFIRMADO") || config.opciones[0];
          } else if (["no", "cancelar", "rechazar", "👎"].includes(textBody.toLowerCase())) {
            matchedOption = config.opciones.find(o => o.target_status === "CANCELADO") || config.opciones[1];
          }
        }

        if (matchedOption) {
          // Update record in MySQL
          await updateConfirmationStatus(
            pendingRecord.id!,
            matchedOption.target_status,
            textBody
          );

          // Reply back via WhatsApp
          const replyText = matchedOption.bot_response.replace(/{nombre}/gi, pendingRecord.nombre);
          await msg.reply(replyText);
          console.log(`✅ Respuesta automática enviada a ${pendingRecord.nombre}: "${replyText}"`);
        }
      } catch (err) {
        console.error("❌ Error en listener client.on('message'):", err);
      }
    });

    client.initialize().catch((err: any) => {
      console.log("ℹ️ WhatsApp Web Client initialize standby:", err.message || err);
    });
  } catch (err) {
    console.log("ℹ️ Standard Puppeteer launch skipped in sandbox mode. Automation API endpoints ready.");
  }
}

// Database Helper Functions
async function getActivePlantillaConfig(): Promise<PlantillaConfig> {
  if (pool) {
    try {
      const [rows] = await pool.query("SELECT * FROM plantilla_config WHERE id = 1");
      if ((rows as any[]).length > 0) {
        const row = (rows as any[])[0];
        return {
          id: row.id,
          tipo_interaccion: row.tipo_interaccion,
          mensaje_encabezado: row.mensaje_encabezado,
          opciones: typeof row.opciones === "string" ? JSON.parse(row.opciones) : row.opciones
        };
      }
    } catch (e) {
      console.error("Error fetching plantilla_config from MySQL:", e);
    }
  }
  return defaultPlantillaConfig;
}

async function savePlantillaConfig(config: PlantillaConfig): Promise<PlantillaConfig> {
  defaultPlantillaConfig = { ...config, id: 1 };
  if (pool) {
    try {
      const opcionesJson = JSON.stringify(config.opciones);
      await pool.query(
        `INSERT INTO plantilla_config (id, tipo_interaccion, mensaje_encabezado, opciones) 
         VALUES (1, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE tipo_interaccion = VALUES(tipo_interaccion), mensaje_encabezado = VALUES(mensaje_encabezado), opciones = VALUES(opciones)`,
        [config.tipo_interaccion, config.mensaje_encabezado, opcionesJson]
      );
    } catch (e) {
      console.error("Error saving plantilla_config to MySQL:", e);
    }
  }
  return defaultPlantillaConfig;
}

async function findPendingConfirmation(phone: string): Promise<ConfirmacionRecord | null> {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (pool) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM confirmaciones WHERE REPLACE(REPLACE(telefono, '+', ''), ' ', '') LIKE ? AND estado = 'PENDIENTE' ORDER BY id DESC LIMIT 1",
        [`%${cleanPhone.slice(-8)}%`]
      );
      if ((rows as any[]).length > 0) {
        return (rows as any[])[0] as ConfirmacionRecord;
      }
    } catch (e) {
      console.error("Error querying confirmaciones in MySQL:", e);
    }
  }
  return inMemoryConfirmaciones.find(
    c => c.estado === "PENDIENTE" && c.telefono.replace(/[^0-9]/g, "").includes(cleanPhone.slice(-8))
  ) || null;
}

async function updateConfirmationStatus(id: number, estado: "CONFIRMADO" | "CANCELADO" | "PENDIENTE", respuesta: string) {
  if (pool) {
    try {
      await pool.query(
        "UPDATE confirmaciones SET estado = ?, respuesta_recibida = ?, fecha_respuesta = NOW() WHERE id = ?",
        [estado, respuesta, id]
      );
    } catch (e) {
      console.error("Error updating confirmacion in MySQL:", e);
    }
  }
  const rec = inMemoryConfirmaciones.find(c => c.id === id);
  if (rec) {
    rec.estado = estado;
    rec.respuesta_recibida = respuesta;
    rec.fecha_respuesta = new Date().toISOString();
  }
}

// Helper to format WhatsApp Message Body
function formatReminderMessage(config: PlantillaConfig, nombre: string, asignacion: string): string {
  let text = config.mensaje_encabezado
    .replace(/\{nombre\}/gi, nombre)
    .replace(/\{asignacion\}/gi, asignacion);

  if (config.tipo_interaccion === "NUMBERS") {
    text += "\n\n";
    config.opciones.forEach(opt => {
      text += `${opt.key}️⃣ *${opt.label}*\n`;
    });
    text += "\n✍️ *Responde enviando el número de tu opción (1 o 2)*";
  }

  return text;
}

// API Routes

// 1. GET /api/configuracion-plantilla
app.get("/api/configuracion-plantilla", async (req, res) => {
  try {
    const config = await getActivePlantillaConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Failed to load plantilla_config" });
  }
});

// 2. PUT /api/configuracion-plantilla
app.put("/api/configuracion-plantilla", async (req, res) => {
  try {
    const { tipo_interaccion, mensaje_encabezado, opciones } = req.body;
    if (!tipo_interaccion || !mensaje_encabezado || !Array.isArray(opciones)) {
      return res.status(400).json({ error: "Datos incompletos. Se requiere tipo_interaccion, mensaje_encabezado y opciones (Array)." });
    }

    const updated = await savePlantillaConfig({
      tipo_interaccion,
      mensaje_encabezado,
      opciones
    });

    res.json({ success: true, message: "Configuración de plantilla guardada en MySQL.", config: updated });
  } catch (err) {
    console.error("PUT /api/configuracion-plantilla error:", err);
    res.status(500).json({ error: "Error guardando configuración de plantilla" });
  }
});

// 3. POST /api/recordatorio-comite
app.post("/api/recordatorio-comite", async (req, res) => {
  try {
    const { miembros } = req.body;
    if (!Array.isArray(miembros) || miembros.length === 0) {
      return res.status(400).json({ error: "Se requiere un arreglo 'miembros' con { nombre, telefono, asignacion, fecha }." });
    }

    const config = await getActivePlantillaConfig();
    const createdRecords: ConfirmacionRecord[] = [];

    for (const m of miembros) {
      const messageBody = formatReminderMessage(config, m.nombre, m.asignacion);
      const cleanPhone = (m.telefono || "").replace(/[^0-9]/g, "");

      // Insert record in MySQL
      let insertedId = Date.now() + Math.floor(Math.random() * 1000);
      if (pool) {
        try {
          const [result] = await pool.query(
            "INSERT INTO confirmaciones (telefono, nombre, asignacion, fecha, mensaje_enviado, estado) VALUES (?, ?, ?, ?, ?, 'PENDIENTE')",
            [m.telefono, m.nombre, m.asignacion, m.fecha || new Date().toISOString().split("T")[0], messageBody]
          );
          insertedId = (result as any).insertId;
        } catch (e) {
          console.error("MySQL Insert confirmaciones error:", e);
        }
      }

      const rec: ConfirmacionRecord = {
        id: insertedId,
        telefono: m.telefono,
        nombre: m.nombre,
        asignacion: m.asignacion,
        fecha: m.fecha || new Date().toISOString().split("T")[0],
        mensaje_enviado: messageBody,
        estado: "PENDIENTE",
        created_at: new Date().toISOString()
      };
      inMemoryConfirmaciones.push(rec);
      createdRecords.push(rec);

      // Send message via whatsapp-web.js if client is ready
      if (client && waStatus === "READY" && cleanPhone) {
        const chatId = `${cleanPhone}@c.us`;
        if (config.tipo_interaccion === "BUTTONS" && Buttons) {
          try {
            const buttonList = config.opciones.map(opt => ({ id: opt.key, body: opt.label }));
            const buttonMsg = new Buttons(
              messageBody,
              buttonList,
              "DECOM Módulo de Servicio",
              "Responde seleccionando un botón"
            );
            await client.sendMessage(chatId, buttonMsg);
          } catch (btnErr) {
            // Fallback to text format if buttons fail
            await client.sendMessage(chatId, messageBody);
          }
        } else {
          await client.sendMessage(chatId, messageBody);
        }
      }
    }

    res.json({
      success: true,
      sentCount: createdRecords.length,
      tipo_interaccion: config.tipo_interaccion,
      confirmaciones: createdRecords
    });
  } catch (err) {
    console.error("POST /api/recordatorio-comite error:", err);
    res.status(500).json({ error: "Error enviando recordatorios al comité" });
  }
});

// 4. GET /api/confirmaciones (bitácora de mensajes y respuestas)
app.get("/api/confirmaciones", async (req, res) => {
  try {
    if (pool) {
      const [rows] = await pool.query("SELECT * FROM confirmaciones ORDER BY id DESC LIMIT 100");
      return res.json(rows);
    }
    res.json(inMemoryConfirmaciones);
  } catch (err) {
    res.status(500).json({ error: "Error cargando bitácora de confirmaciones" });
  }
});

// 5. POST /api/simular-respuesta (para pruebas del bot sin teléfono físico)
app.post("/api/simular-respuesta", async (req, res) => {
  try {
    const { telefono, respuesta } = req.body;
    if (!telefono || !respuesta) {
      return res.status(400).json({ error: "Se requiere telefono y respuesta" });
    }

    const cleanPhone = telefono.replace(/[^0-9]/g, "");
    const pendingRecord = await findPendingConfirmation(cleanPhone);
    if (!pendingRecord) {
      return res.status(404).json({ error: "No hay confirmación PENDIENTE para este número" });
    }

    const config = await getActivePlantillaConfig();
    let matchedOption = config.opciones.find(opt => {
      return opt.key.toLowerCase() === respuesta.trim().toLowerCase() ||
             opt.label.toLowerCase() === respuesta.trim().toLowerCase() ||
             respuesta.trim().startsWith(opt.key);
    });

    if (!matchedOption) {
      if (["si", "sí", "confirmo", "👍", "1"].includes(respuesta.toLowerCase())) {
        matchedOption = config.opciones.find(o => o.target_status === "CONFIRMADO") || config.opciones[0];
      } else {
        matchedOption = config.opciones.find(o => o.target_status === "CANCELADO") || config.opciones[1];
      }
    }

    await updateConfirmationStatus(pendingRecord.id!, matchedOption.target_status, respuesta);
    const botReply = matchedOption.bot_response.replace(/{nombre}/gi, pendingRecord.nombre);

    res.json({
      success: true,
      confirmacionId: pendingRecord.id,
      nombre: pendingRecord.nombre,
      nuevoEstado: matchedOption.target_status,
      respuestaRegistrada: respuesta,
      respuestaBot: botReply
    });
  } catch (err) {
    console.error("POST /api/simular-respuesta error:", err);
    res.status(500).json({ error: "Error simulando respuesta" });
  }
});

// 6. GET /api/whatsapp-status
app.get("/api/whatsapp-status", (req, res) => {
  res.json({
    status: waStatus,
    qrCode: qrCodeData,
    connected: waStatus === "READY"
  });
});

// Existing State Routes
app.get("/api/state", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "No database connection" });
  }
  try {
    const [rows] = await pool.query("SELECT state_json FROM app_state WHERE id = 1");
    if ((rows as any[]).length > 0) {
      res.json(JSON.parse((rows as any[])[0].state_json));
    } else {
      res.json({});
    }
  } catch (error) {
    console.error("GET /api/state error:", error);
    res.status(500).json({ error: "Failed to fetch state" });
  }
});

app.post("/api/state", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "No database connection" });
  }
  try {
    const stateString = JSON.stringify(req.body);
    await pool.query("UPDATE app_state SET state_json = ? WHERE id = 1", [stateString]);
    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/state error:", error);
    res.status(500).json({ error: "Failed to save state" });
  }
});

async function startServer() {
  await initDB();
  initWhatsAppClient();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
