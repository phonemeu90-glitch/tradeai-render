import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { initDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve React SPA in production
const frontendDist = path.resolve(__dirname, "..", "..", "tradeai-pro", "dist");
app.use(express.static(frontendDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

initDb().then(() => {
  logger.info("Database initialized");
}).catch((err) => {
  logger.error({ err }, "Failed to initialize database");
  process.exit(1);
});

export default app;
