import { Router } from "express";
import { analyzeMotorImage, streamMechanicResponse } from "../services/groqService";
import { sql } from "../lib/db";

const router = Router();

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Auth ──────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password: _pw } = req.body as { name?: string; email?: string; password?: string };
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const existing = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      res.status(409).json({ error: "Email já cadastrado" });
      return;
    }

    const id = uid();
    const userName = name ?? email.split("@")[0];
    await sql`INSERT INTO users (id, name, email) VALUES (${id}, ${userName}, ${email})`;

    const token = "jwt-" + uid();
    res.status(201).json({ token, user: { id, name: userName, email } });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", detail: String(err) });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const rows = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
    let user: { id: string; name: string; email: string };
    if (rows.length === 0) {
      const id = uid();
      const name = email.split("@")[0];
      await sql`INSERT INTO users (id, name, email) VALUES (${id}, ${name}, ${email})`;
      user = { id, name, email };
    } else {
      user = { id: String(rows[0]["id"]), name: String(rows[0]["name"]), email: String(rows[0]["email"]) };
    }
    const token = "jwt-" + uid();
    res.json({ token, user: { id: user["id"], name: user["name"], email: user["email"] } });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: String(err) });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// ── Scan / Diagnóstico ────────────────────────────────────────
router.post("/scan", async (req, res) => {
  try {
    const { image, vehicleId, userId } = req.body as { image?: string; vehicleId?: string; userId?: string };
    if (!image) { res.status(400).json({ error: "image (base64) required" }); return; }

    const result = await analyzeMotorImage(image);
    const scanId = uid();
    const resolvedVehicleId = vehicleId ?? "unknown";
    const resolvedUserId = userId ?? "anonymous";

    const fluidsJson = JSON.stringify(result.fluids);
    await sql`
      INSERT INTO scans (id, vehicle_id, user_id, overall_status, vehicle_detected, confidence, summary, fluids, scanned_at)
      VALUES (
        ${scanId}, ${resolvedVehicleId}, ${resolvedUserId},
        ${result.overallStatus}, ${result.vehicleDetected},
        ${result.confidence}, ${result.summary},
        ${fluidsJson}::jsonb,
        NOW()
      )
    `;

    res.json({ scanId, vehicleId: resolvedVehicleId, ...result, scannedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Scan failed", detail: String(err) });
  }
});

router.get("/scan/:id", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM scans WHERE id = ${req.params["id"]}`;
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
router.post("/chat", async (req, res) => {
  try {
    const { messages, vehicleContext, conversationId, userId } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      vehicleContext?: string;
      conversationId?: string;
      userId?: string;
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

    // Persist conversation asynchronously
    if (userId) {
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
    }
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
router.get("/chat/history", async (req, res) => {
  try {
    const userId = req.query["userId"] as string | undefined;
    if (!userId) { res.json([]); return; }
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
router.get("/vehicles", async (req, res) => {
  try {
    const userId = req.query["userId"] as string | undefined;
    const rows = userId
      ? await sql`SELECT * FROM vehicles WHERE user_id = ${userId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM vehicles ORDER BY created_at DESC`;
    res.json(rows.map(v => ({
      id: v["id"], userId: v["user_id"], make: v["make"], model: v["model"],
      year: v["year"], plate: v["plate"], photoUri: v["photo_uri"], createdAt: v["created_at"],
    })));
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

router.post("/vehicles", async (req, res) => {
  try {
    const { userId, make, model, year, plate, photoUri } = req.body as {
      userId?: string; make?: string; model?: string; year?: number; plate?: string; photoUri?: string;
    };
    if (!make || !model || !year) { res.status(400).json({ error: "make, model and year required" }); return; }

    const id = uid();
    const resolvedUserId = userId ?? "anonymous";
    await sql`
      INSERT INTO vehicles (id, user_id, make, model, year, plate, photo_uri)
      VALUES (${id}, ${resolvedUserId}, ${make}, ${model}, ${year}, ${plate ?? null}, ${photoUri ?? null})
    `;
    res.status(201).json({ id, userId: resolvedUserId, make, model, year, plate, photoUri, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Create failed", detail: String(err) });
  }
});

router.put("/vehicles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, plate, photoUri } = req.body as {
      make?: string; model?: string; year?: number; plate?: string; photoUri?: string;
    };
    const rows = await sql`
      UPDATE vehicles SET
        make      = COALESCE(${make ?? null}, make),
        model     = COALESCE(${model ?? null}, model),
        year      = COALESCE(${year ?? null}, year),
        plate     = COALESCE(${plate ?? null}, plate),
        photo_uri = COALESCE(${photoUri ?? null}, photo_uri)
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0) { res.status(404).json({ error: "not found" }); return; }
    const v = rows[0];
    res.json({ id: v["id"], userId: v["user_id"], make: v["make"], model: v["model"], year: v["year"], plate: v["plate"], photoUri: v["photo_uri"], createdAt: v["created_at"] });
  } catch (err) {
    res.status(500).json({ error: "Update failed", detail: String(err) });
  }
});

router.delete("/vehicles/:id", async (req, res) => {
  try {
    await sql`DELETE FROM vehicles WHERE id = ${req.params["id"]}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed", detail: String(err) });
  }
});

// ── History (scan history per user) ──────────────────────────
router.get("/history", async (req, res) => {
  try {
    const userId = req.query["userId"] as string | undefined;
    const rows = userId
      ? await sql`SELECT * FROM scans WHERE user_id = ${userId} ORDER BY scanned_at DESC LIMIT 100`
      : await sql`SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 100`;
    res.json(rows.map(s => ({
      id: s["id"], vehicleId: s["vehicle_id"], overallStatus: s["overall_status"],
      vehicleDetected: s["vehicle_detected"], confidence: s["confidence"],
      summary: s["summary"], fluids: s["fluids"], scannedAt: s["scanned_at"],
    })));
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", detail: String(err) });
  }
});

export default router;
