import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";

const { Client, LocalAuth, Buttons } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ==========================================
// 1. INTERFACES Y TIPOS TypeScript
// ==========================================
export interface OpcionConfig {
  key: string;            // Ej: "1", "2", "CONFIRMAR", "CANCELAR"
  label: string;          // Ej: "Confirmar Asistencia"
  target_status: "CONFIRMADO" | "CANCELADO" | "PENDIENTE";
  bot_response: string;   // Ej: "¡Gracias por confirmar tu servicio!"
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

// Configuración por defecto en memoria
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

// ==========================================
// 2. CONEXIÓN MYSQL Y ESQUEMAS TABLAS SQL
// ==========================================
let pool: mysql.Pool | null = null;

async function initDB(): Promise<void> {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "sql_decom",
      password: process.env.DB_PASSWORD || "06129812",
      database: process.env.DB_NAME || "decom_manager",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();

    // Tabla 1: app_state
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        state_json LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabla 2: plantilla_config
    await connection.query(`
      CREATE TABLE IF NOT EXISTS plantilla_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tipo_interaccion VARCHAR(20) NOT NULL DEFAULT 'NUMBERS',
        mensaje_encabezado TEXT NOT NULL,
        opciones JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabla 3: confirmaciones
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Semilla inicial plantilla_config
    const [rows] = await connection.query("SELECT id FROM plantilla_config WHERE id = 1");
    if ((rows as any[]).length === 0) {
      await connection.query(
        "INSERT INTO plantilla_config (id, tipo_interaccion, mensaje_encabezado, opciones) VALUES (1, ?, ?, ?)",
        [defaultPlantillaConfig.tipo_interaccion, defaultPlantillaConfig.mensaje_encabezado, JSON.stringify(defaultPlantillaConfig.opciones)]
      );
    }

    // Semilla inicial app_state
    const [appRows] = await connection.query("SELECT id FROM app_state WHERE id = 1");
    if ((appRows as any[]).length === 0) {
      await connection.query("INSERT INTO app_state (id, state_json) VALUES (1, ?)", ["{}"]);
    }

    connection.release();
    console.log("✅ MySQL Database y Tablas SQL ('plantilla_config', 'confirmaciones') inicializadas correctamente.");
  } catch (error) {
    console.error("⚠️ Error conectando a MySQL (Modo fallback activo):", (error as Error).message);
    pool = null;
  }
}

// ==========================================
// 3. FUNCIONES AUXILIARES DE BASE DE DATOS
// ==========================================
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
      console.error("Error obteniendo plantilla_config de MySQL:", e);
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
         ON DUPLICATE KEY UPDATE 
           tipo_interaccion = VALUES(tipo_interaccion), 
           mensaje_encabezado = VALUES(mensaje_encabezado), 
           opciones = VALUES(opciones)`,
        [config.tipo_interaccion, config.mensaje_encabezado, opcionesJson]
      );
    } catch (e) {
      console.error("Error guardando plantilla_config en MySQL:", e);
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
      console.error("Error buscando confirmación PENDIENTE en MySQL:", e);
    }
  }
  return inMemoryConfirmaciones.find(
    c => c.estado === "PENDIENTE" && c.telefono.replace(/[^0-9]/g, "").includes(cleanPhone.slice(-8))
  ) || null;
}

async function updateConfirmationStatus(id: number, estado: "CONFIRMADO" | "CANCELADO" | "PENDIENTE", respuesta: string): Promise<void> {
  if (pool) {
    try {
      await pool.query(
        "UPDATE confirmaciones SET estado = ?, respuesta_recibida = ?, fecha_respuesta = NOW() WHERE id = ?",
        [estado, respuesta, id]
      );
    } catch (e) {
      console.error("Error actualizando confirmación en MySQL:", e);
    }
  }
  const rec = inMemoryConfirmaciones.find(c => c.id === id);
  if (rec) {
    rec.estado = estado;
    rec.respuesta_recibida = respuesta;
    rec.fecha_respuesta = new Date().toISOString();
  }
}

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

// ==========================================
// 4. INICIALIZACIÓN WHATSAPP-WEB.JS CON LOCALAUTH
// ==========================================
let waStatus: "DISCONNECTED" | "QR_READY" | "AUTHENTICATED" | "READY" = "DISCONNECTED";
let qrCodeData: string | null = null;
let qrCodeRaw: string | null = null;
let client: any = null;

function initWhatsAppClient(): void {
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

    client.on("qr", async (qr: string) => {
      waStatus = "QR_READY";
      qrCodeRaw = qr;
      try {
        qrCodeData = await QRCode.toDataURL(qr);
      } catch (err) {
        qrCodeData = qr;
      }
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
      console.log("🚀 Cliente WhatsApp Automation listo para enviar y recibir mensajes.");
    });

    client.on("disconnected", (reason: string) => {
      waStatus = "DISCONNECTED";
      console.log("⚠️ Cliente de WhatsApp desconectado:", reason);
    });

    // ==========================================
    // 5. LISTENER CLIENT.ON('MESSAGE')
    // ==========================================
    client.on("message", async (msg: any) => {
      try {
        const fromNumber = msg.from.replace("@c.us", "").replace(/[^0-9]/g, "");
        const textBody = (msg.body || "").trim();
        console.log(`📩 Mensaje entrante de WhatsApp [${fromNumber}]: "${textBody}"`);

        // Obtenemos la configuración activa desde MySQL
        const config = await getActivePlantillaConfig();

        // Buscamos si el usuario tiene un recordatorio PENDIENTE en MySQL
        const pendingRecord = await findPendingConfirmation(fromNumber);

        if (!pendingRecord) {
          console.log(`ℹ️ No hay confirmación PENDIENTE para el teléfono ${fromNumber}`);
          return;
        }

        // Evaluar respuesta contra las opciones (botón o número "1", "2")
        let matchedOption = config.opciones.find(opt => {
          const keyMatch = opt.key.toLowerCase() === textBody.toLowerCase();
          const labelMatch = opt.label.toLowerCase() === textBody.toLowerCase();
          const numberMatch = textBody.startsWith(opt.key);
          return keyMatch || labelMatch || numberMatch;
        });

        // Coincidencia alternativa por palabras clave / emojis
        if (!matchedOption) {
          const cleanText = textBody.toLowerCase();
          if (["1", "si", "sí", "confirmo", "confirmar", "👍", "ok"].includes(cleanText)) {
            matchedOption = config.opciones.find(o => o.target_status === "CONFIRMADO") || config.opciones[0];
          } else if (["2", "no", "cancelar", "rechazar", "👎"].includes(cleanText)) {
            matchedOption = config.opciones.find(o => o.target_status === "CANCELADO") || config.opciones[1];
          }
        }

        if (matchedOption) {
          // Actualizar estado en MySQL de PENDIENTE a CONFIRMADO o CANCELADO
          await updateConfirmationStatus(
            pendingRecord.id!,
            matchedOption.target_status,
            textBody
          );

          // Responder al usuario vía WhatsApp con el mensaje formateado
          const replyText = matchedOption.bot_response.replace(/\{nombre\}/gi, pendingRecord.nombre);
          await msg.reply(replyText);
          console.log(`✅ Estado actualizado a '${matchedOption.target_status}'. Respuesta enviada a ${pendingRecord.nombre}`);
        }
      } catch (err) {
        console.error("❌ Error procesando mensaje en client.on('message'):", err);
      }
    });

    client.initialize().catch((err: any) => {
      console.log("ℹ️ WhatsApp Web Client initialize standby:", err.message || err);
    });
  } catch (err) {
    console.log("ℹ️ Puppeteer initialization in sandbox mode:", err);
  }
}

// ==========================================
// 6. ENDPOINTS RUTAS API (Express)
// ==========================================

// GET /api/configuracion-plantilla: Cargar plantilla activa
app.get("/api/configuracion-plantilla", async (req: Request, res: Response) => {
  try {
    const config = await getActivePlantillaConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar la plantilla de configuración." });
  }
});

// PUT /api/configuracion-plantilla: Guardar tipo ('BUTTONS' | 'NUMBERS') y opciones JSON
app.put("/api/configuracion-plantilla", async (req: Request, res: Response) => {
  try {
    const { tipo_interaccion, mensaje_encabezado, opciones } = req.body;
    if (!tipo_interaccion || !mensaje_encabezado || !Array.isArray(opciones)) {
      return res.status(400).json({ 
        error: "Se requiere tipo_interaccion ('BUTTONS' | 'NUMBERS'), mensaje_encabezado y arreglo 'opciones'." 
      });
    }

    const updatedConfig = await savePlantillaConfig({
      tipo_interaccion,
      mensaje_encabezado,
      opciones
    });

    res.json({
      success: true,
      message: "Configuración guardada exitosamente en MySQL.",
      config: updatedConfig
    });
  } catch (err) {
    console.error("PUT /api/configuracion-plantilla error:", err);
    res.status(500).json({ error: "Error guardando configuración de plantilla." });
  }
});

// POST /api/recordatorio-comite: Enviar recordatorio masivo/individual
app.post("/api/recordatorio-comite", async (req: Request, res: Response) => {
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

      // Insertar registro PENDIENTE en MySQL
      let insertedId = Date.now() + Math.floor(Math.random() * 1000);
      if (pool) {
        try {
          const [result] = await pool.query(
            "INSERT INTO confirmaciones (telefono, nombre, asignacion, fecha, mensaje_enviado, estado) VALUES (?, ?, ?, ?, ?, 'PENDIENTE')",
            [m.telefono, m.nombre, m.asignacion, m.fecha || new Date().toISOString().split("T")[0], messageBody]
          );
          insertedId = (result as any).insertId;
        } catch (e) {
          console.error("Error insertando confirmación en MySQL:", e);
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

      // Enviar mensaje por WhatsApp con Botones o Texto estructurado
      if (client && waStatus === "READY" && cleanPhone) {
        const chatId = `${cleanPhone}@c.us`;
        if (config.tipo_interaccion === "BUTTONS" && Buttons) {
          try {
            const buttonList = config.opciones.map(opt => ({ id: opt.key, body: opt.label }));
            const buttonMsg = new Buttons(
              messageBody,
              buttonList,
              "DECOM Módulo de Servicio",
              "Selecciona una opción"
            );
            await client.sendMessage(chatId, buttonMsg);
          } catch (btnErr) {
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
    res.status(500).json({ error: "Error enviando recordatorio del comité." });
  }
});

// GET /api/confirmaciones: Consultar bitácora
app.get("/api/confirmaciones", async (req: Request, res: Response) => {
  try {
    if (pool) {
      const [rows] = await pool.query("SELECT * FROM confirmaciones ORDER BY id DESC LIMIT 100");
      return res.json(rows);
    }
    res.json(inMemoryConfirmaciones);
  } catch (err) {
    res.status(500).json({ error: "Error consultando bitácora de confirmaciones." });
  }
});

// POST /api/simular-respuesta: Simulación local
app.post("/api/simular-respuesta", async (req: Request, res: Response) => {
  try {
    const { telefono, respuesta } = req.body;
    if (!telefono || !respuesta) {
      return res.status(400).json({ error: "Se requiere 'telefono' y 'respuesta'." });
    }

    const cleanPhone = telefono.replace(/[^0-9]/g, "");
    const pendingRecord = await findPendingConfirmation(cleanPhone);
    if (!pendingRecord) {
      return res.status(404).json({ error: "No hay confirmación PENDIENTE para este número." });
    }

    const config = await getActivePlantillaConfig();
    let matchedOption = config.opciones.find(opt => {
      return opt.key.toLowerCase() === respuesta.trim().toLowerCase() ||
             opt.label.toLowerCase() === respuesta.trim().toLowerCase() ||
             respuesta.trim().startsWith(opt.key);
    });

    if (!matchedOption) {
      if (["1", "si", "sí", "confirmo", "👍"].includes(respuesta.toLowerCase())) {
        matchedOption = config.opciones.find(o => o.target_status === "CONFIRMADO") || config.opciones[0];
      } else {
        matchedOption = config.opciones.find(o => o.target_status === "CANCELADO") || config.opciones[1];
      }
    }

    await updateConfirmationStatus(pendingRecord.id!, matchedOption.target_status, respuesta);
    const botReply = matchedOption.bot_response.replace(/\{nombre\}/gi, pendingRecord.nombre);

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
    res.status(500).json({ error: "Error simulando respuesta." });
  }
});

// GET /api/whatsapp-status: Estado de vinculación y código QR
app.get("/api/whatsapp-status", (req: Request, res: Response) => {
  res.json({
    status: waStatus,
    qrCode: qrCodeData,
    qrCodeRaw: qrCodeRaw,
    connected: waStatus === "READY"
  });
});

// POST /api/whatsapp-reconnect: Forzar reconexión y regeneración de QR
app.post("/api/whatsapp-reconnect", async (req: Request, res: Response) => {
  try {
    if (client) {
      try {
        await client.destroy();
      } catch (e) {
        console.warn("Destroying previous client warning:", e);
      }
    }
    waStatus = "DISCONNECTED";
    qrCodeData = null;
    qrCodeRaw = null;
    client = null;

    initWhatsAppClient();
    res.json({ success: true, message: "Reconexión de WhatsApp iniciada. Generando nuevo código QR." });
  } catch (err) {
    console.error("POST /api/whatsapp-reconnect error:", err);
    res.status(500).json({ error: "Error forzando la reconexión de WhatsApp." });
  }
});

// Rutas de estado global
app.get("/api/state", async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(500).json({ error: "No hay conexión a la base de datos." });
  }
  try {
    const [rows] = await pool.query("SELECT state_json FROM app_state WHERE id = 1");
    if ((rows as any[]).length > 0) {
      res.json(JSON.parse((rows as any[])[0].state_json));
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener estado." });
  }
});

app.post("/api/state", async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(500).json({ error: "No hay conexión a la base de datos." });
  }
  try {
    const stateString = JSON.stringify(req.body);
    await pool.query("UPDATE app_state SET state_json = ? WHERE id = 1", [stateString]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar estado." });
  }
});

// ==========================================
// 7. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
async function startServer(): Promise<void> {
  await initDB();
  initWhatsAppClient();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
