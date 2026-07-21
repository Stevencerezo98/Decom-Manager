import express from "express";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

    // Create table if not exists
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        state_json LONGTEXT
      )
    `);
    
    // Check if initial row exists
    const [rows] = await connection.query('SELECT id FROM app_state WHERE id = 1');
    if ((rows as any[]).length === 0) {
      await connection.query('INSERT INTO app_state (id, state_json) VALUES (1, ?)', ['{}']);
    }

    connection.release();
    console.log('✅ MySQL Database connected and table verified.');
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
    console.log('⚠️ Running in disconnected mode (state will not persist to DB)');
    pool = null;
  }
}

// API Routes FIRST
app.get("/api/state", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "No database connection" });
  }
  try {
    const [rows] = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if ((rows as any[]).length > 0) {
      res.json(JSON.parse((rows as any[])[0].state_json));
    } else {
      res.json({});
    }
  } catch (error) {
    console.error("GET /api/state error:", error);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

app.post("/api/state", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "No database connection" });
  }
  try {
    const stateString = JSON.stringify(req.body);
    await pool.query('UPDATE app_state SET state_json = ? WHERE id = 1', [stateString]);
    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/state error:", error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

async function startServer() {
  await initDB();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
