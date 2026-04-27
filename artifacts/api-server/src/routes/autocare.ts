import { Router } from "express";
import { analyzeMotorImage, streamMechanicResponse } from "../services/groqService";

const router = Router();

// ── Auth (mock) ──────────────────────────────────────────────
router.post("/auth/register", (req, res) => {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const token = "mock-jwt-" + Date.now().toString(36);
  res.json({
    token,
    user: { id: Date.now().toString(36), name: name ?? email.split("@")[0], email },
  });
});

router.post("/auth/login", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const token = "mock-jwt-" + Date.now().toString(36);
  res.json({
    token,
    user: { id: "user-1", name: email.split("@")[0], email },
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// ── Scan / Diagnóstico ────────────────────────────────────────
router.post("/scan", async (req, res) => {
  try {
    const { image, vehicleId } = req.body as { image?: string; vehicleId?: string };

    if (!image) {
      res.status(400).json({ error: "image (base64) required" });
      return;
    }

    const result = await analyzeMotorImage(image);
    res.json({
      scanId: Date.now().toString(36),
      vehicleId: vehicleId ?? "unknown",
      ...result,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Scan failed", detail: String(err) });
  }
});

// ── Chat streaming (SSE) ──────────────────────────────────────
router.post("/chat", async (req, res) => {
  try {
    const { messages, vehicleContext } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      vehicleContext?: string;
    };

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }

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
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed", detail: String(err) });
    } else {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }
});

// ── Vehicles (in-memory for now) ──────────────────────────────
const vehiclesDb: Record<string, object> = {};

router.get("/vehicles", (_req, res) => {
  res.json(Object.values(vehiclesDb));
});

router.post("/vehicles", (req, res) => {
  const vehicle = { ...req.body, id: Date.now().toString(36), createdAt: new Date().toISOString() };
  vehiclesDb[vehicle.id] = vehicle;
  res.status(201).json(vehicle);
});

router.put("/vehicles/:id", (req, res) => {
  const { id } = req.params;
  if (!vehiclesDb[id]) { res.status(404).json({ error: "not found" }); return; }
  vehiclesDb[id] = { ...vehiclesDb[id], ...req.body, id };
  res.json(vehiclesDb[id]);
});

router.delete("/vehicles/:id", (req, res) => {
  const { id } = req.params;
  delete vehiclesDb[id];
  res.json({ success: true });
});

// ── History ───────────────────────────────────────────────────
const historyDb: object[] = [];

router.get("/history", (_req, res) => {
  res.json(historyDb);
});

router.post("/history", (req, res) => {
  const record = { ...req.body, id: Date.now().toString(36), createdAt: new Date().toISOString() };
  historyDb.unshift(record);
  res.status(201).json(record);
});

export default router;
