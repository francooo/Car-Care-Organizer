import { Request, Response, NextFunction } from "express";
import { sql } from "../lib/db";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  try {
    const rows = await sql`SELECT user_id FROM sessions WHERE token = ${token}`;
    if (rows.length === 0) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.userId = String(rows[0]["user_id"]);
    next();
  } catch {
    res.status(500).json({ error: "Auth check failed" });
  }
}
