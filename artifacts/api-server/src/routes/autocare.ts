import { Router } from "express";
import { randomBytes } from "crypto";
import { analyzeMotorImage, streamMechanicResponse } from "../services/groqService";
import { sql } from "../lib/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function secureToken(): string {
  return randomBytes(32).toString("hex");
}

function mapVehicle(v: Record<string, unknown>) {
  return {
    id: v["id"],
    userId: v["user_id"],
    make: v["make"],
    model: v["model"],
    year: v["year"],
    version: v["version"] ?? null,
    nickname: v["nickname"] ?? null,
    plate: v["plate"] ?? null,
    photoUri: v["photo_uri"] ?? null,
    overallStatus: v["overall_status"] ?? null,
    fluids: v["fluids"] ?? null,
    createdAt: v["created_at"],
  };
}

// ── Auth ──────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    if (!password || password.length < 4) { res.status(400).json({ error: "password must be at least 4 characters" }); return; }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) { res.status(409).json({ error: "Email já cadastrado" }); return; }

    const id = uid();
    const userName = name ?? email.split("@")[0];
    const hash = hashPassword(password);
    await sql`INSERT INTO users (id, name, email, password_hash) VALUES (${id}, ${userName}, ${email}, ${hash})`;

    const token = secureToken();
    await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${id})`;
    res.status(201).json({ token, user: { id, name: userName, email } });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", detail: String(err) });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) { res.status(400).json({ error: "email and password required" }); return; }

    const rows = await sql`SELECT id, name, email, password_hash FROM users WHERE email = ${email}`;
    if (rows.length === 0) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const user = rows[0];
    const storedHash = user["password_hash"] as string | null;
    if (!storedHash || !verifyPassword(password, storedHash)) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = secureToken();
    await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${String(user["id"])})`;
    res.json({ token, user: { id: user["id"], name: user["name"], email: user["email"] } });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: String(err) });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.slice(7);
    if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// ── Scan / Diagnóstico ────────────────────────────────────────
router.post("/scan", requireAuth, async (req, res) => {
  try {
    const { image, vehicleId } = req.body as { image?: string; vehicleId?: string };
    if (!image) { res.status(400).json({ error: "image (base64) required" }); return; }

    const userId = req.userId!;
    const result = await analyzeMotorImage(image);
    const scanId = uid();
    const resolvedVehicleId = vehicleId ?? "unknown";

    const fluidsJson = JSON.stringify(result.fluids);
    await sql`
      INSERT INTO scans (id, vehicle_id, user_id, overall_status, vehicle_detected, confidence, summary, fluids, scanned_at)
      VALUES (
        ${scanId}, ${resolvedVehicleId}, ${userId},
        ${result.overallStatus}, ${result.vehicleDetected},
        ${result.confidence}, ${result.summary},
        ${fluidsJson}::jsonb, NOW()
      )
    `;

    if (vehicleId && vehicleId !== "unknown") {
      const vehicleFluidsJson = JSON.stringify(result.fluids);
      await sql`
        UPDATE vehicles SET overall_status = ${result.overallStatus}, fluids = ${vehicleFluidsJson}::jsonb
        WHERE id = ${vehicleId} AND user_id = ${userId}
      `.catch(() => {});
    }

    res.json({ scanId, vehicleId: resolvedVehicleId, ...result, scannedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Scan failed", detail: String(err) });
  }
});

router.get("/scan/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rows = await sql`SELECT * FROM scans WHERE id = ${req.params["id"]} AND user_id = ${userId}`;
    if (rows.length === 0) { res.status(404).json({ error: "scan not found" }); return; }
    const s = rows[0];
    res.json({
      scanId: s["id"], vehicleId: s["vehicle_id"],
      overallStatus: s["overall_status"], vehicleDetected: s["vehicle_detected"],
      confidence: s["confidence"], summary: s["summary"],
      fluids: s["fluids"], scannedAt: s["scanned_at"],
    });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

// ── Chat streaming (SSE) ──────────────────────────────────────
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { messages, vehicleContext, conversationId } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      vehicleContext?: string;
      conversationId?: string;
    };
    if (!messages || messages.length === 0) { res.status(400).json({ error: "messages required" }); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let fullContent = "";
    for await (const token of streamMechanicResponse(messages, vehicleContext)) {
      fullContent += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
    res.end();

    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const title = lastUser ? lastUser.content.slice(0, 60) : "Conversa";
    const convId = conversationId ?? uid();
    const allMsgs = [...messages, { role: "assistant", content: fullContent }];
    const msgsJson = JSON.stringify(allMsgs);
    sql`
      INSERT INTO chat_history (id, user_id, title, messages, created_at, updated_at)
      VALUES (${convId}, ${userId}, ${title}, ${msgsJson}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET messages = ${msgsJson}::jsonb, updated_at = NOW()
    `.catch(e => console.error("chat persist error:", e));
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed", detail: String(err) });
    } else {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }
});

// ── Chat History ──────────────────────────────────────────────
router.get("/chat/history", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rows = await sql`
      SELECT id, title, messages, created_at, updated_at
      FROM chat_history WHERE user_id = ${userId}
      ORDER BY updated_at DESC LIMIT 50
    `;
    res.json(rows.map(r => ({
      id: r["id"], title: r["title"], messages: r["messages"],
      createdAt: r["created_at"], updatedAt: r["updated_at"],
    })));
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

// ── Vehicles ──────────────────────────────────────────────────
router.get("/vehicles", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rows = await sql`SELECT * FROM vehicles WHERE user_id = ${userId} ORDER BY created_at DESC`;
    res.json(rows.map(v => mapVehicle(v as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

router.post("/vehicles", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { make, model, year, version, nickname, plate, photoUri } = req.body as {
      make?: string; model?: string; year?: number;
      version?: string; nickname?: string; plate?: string; photoUri?: string;
    };
    if (!make || !model || !year) { res.status(400).json({ error: "make, model and year required" }); return; }

    const id = uid();
    await sql`
      INSERT INTO vehicles (id, user_id, make, model, year, version, nickname, plate, photo_uri)
      VALUES (${id}, ${userId}, ${make}, ${model}, ${year},
              ${version ?? null}, ${nickname ?? null}, ${plate ?? null}, ${photoUri ?? null})
    `;
    res.status(201).json({ id, userId, make, model, year, version: version ?? null, nickname: nickname ?? null, plate: plate ?? null, photoUri: photoUri ?? null, overallStatus: null, fluids: null, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Create failed", detail: String(err) });
  }
});

router.put("/vehicles/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { make, model, year, version, nickname, plate, photoUri } = req.body as {
      make?: string; model?: string; year?: number;
      version?: string; nickname?: string; plate?: string; photoUri?: string;
    };
    const rows = await sql`
      UPDATE vehicles SET
        make       = COALESCE(${make ?? null}, make),
        model      = COALESCE(${model ?? null}, model),
        year       = COALESCE(${year ?? null}, year),
        version    = COALESCE(${version ?? null}, version),
        nickname   = COALESCE(${nickname ?? null}, nickname),
        plate      = COALESCE(${plate ?? null}, plate),
        photo_uri  = COALESCE(${photoUri ?? null}, photo_uri)
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) { res.status(404).json({ error: "not found or access denied" }); return; }
    res.json(mapVehicle(rows[0] as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: "Update failed", detail: String(err) });
  }
});

router.delete("/vehicles/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const result = await sql`DELETE FROM vehicles WHERE id = ${req.params["id"]} AND user_id = ${userId}`;
    if (result.count === 0) { res.status(404).json({ error: "not found or access denied" }); return; }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed", detail: String(err) });
  }
});

// ── History ───────────────────────────────────────────────────
router.get("/history", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rows = await sql`SELECT * FROM scans WHERE user_id = ${userId} ORDER BY scanned_at DESC LIMIT 100`;
    res.json(rows.map(s => ({
      id: s["id"], vehicleId: s["vehicle_id"], overallStatus: s["overall_status"],
      vehicleDetected: s["vehicle_detected"], confidence: s["confidence"],
      summary: s["summary"], fluids: s["fluids"], scannedAt: s["scanned_at"],
    })));
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

router.post("/history", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { vehicleId, overallStatus, vehicleDetected, confidence, summary, fluids } = req.body as {
      vehicleId?: string; overallStatus?: string; vehicleDetected?: string;
      confidence?: number; summary?: string; fluids?: unknown[];
    };
    const id = uid();
    const fluidsJson = JSON.stringify(fluids ?? []);
    await sql`
      INSERT INTO scans (id, vehicle_id, user_id, overall_status, vehicle_detected, confidence, summary, fluids, scanned_at)
      VALUES (
        ${id}, ${vehicleId ?? "unknown"}, ${userId},
        ${overallStatus ?? "ok"}, ${vehicleDetected ?? "Unknown"},
        ${confidence ?? 0}, ${summary ?? ""},
        ${fluidsJson}::jsonb, NOW()
      )
    `;
    res.status(201).json({ id, vehicleId, userId, overallStatus, vehicleDetected, confidence, summary, fluids, scannedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Create failed", detail: String(err) });
  }
});

export default router;
