import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import tradeaiRouter from "./tradeai.js";
import chartsRouter from "./charts.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradeaiRouter);
router.use(chartsRouter);

export default router;
