import { Router, type Request, type Response } from "express";
import { getAllHistory, getAssetHistory, chartEmitter, type ServerCandle } from "../chartEngine.js";

const router = Router();

router.get("/charts/history", (_req: Request, res: Response) => {
  res.json(getAllHistory());
});

router.get("/charts/history/:symbol", (req: Request, res: Response): void => {
  const symbol = decodeURIComponent(String(req.params.symbol));
  const candles = getAssetHistory(symbol);
  if (!candles) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.json({ symbol, candles });
});

router.get("/charts/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const onCandle = (data: { symbol: string; candle: ServerCandle }) => {
    res.write(`data: ${JSON.stringify({ type: "candle", ...data })}\n\n`);
  };

  chartEmitter.on("candle", onCandle);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    chartEmitter.off("candle", onCandle);
    clearInterval(heartbeat);
  });
});

export default router;
