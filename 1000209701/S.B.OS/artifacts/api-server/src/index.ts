import { createServer } from "http";
import app from "./app";
import { initSocket } from "./lib/socket";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrations.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
  runMigrations().catch((err: unknown) => {
    logger.warn({ err }, "[migrations] startup migration failed non-fatally");
  });
});
