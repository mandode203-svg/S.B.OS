import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { startLive, stopLive, getLiveStatus } from "../services/tiktokService.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// POST /tiktok/start — start listening to the store's TikTok Live
router.post("/tiktok/start", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const result = await startLive(businessId);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true });
});

// POST /tiktok/stop — stop the TikTok Live listener
router.post("/tiktok/stop", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const result = stopLive(businessId);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true });
});

// GET /tiktok/status — get current connection status
router.get("/tiktok/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const status = getLiveStatus(businessId);
  res.json(status);
});

export default router;
