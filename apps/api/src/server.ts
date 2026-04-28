import http from "http";
import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initSocketServer } from "./socket";

async function bootstrap() {
  await connectDatabase();

  const httpServer = http.createServer(app);
  initSocketServer(httpServer, env.CLIENT_URL);

  httpServer.listen(env.PORT, () => {
    logger.info(`CampusOS API running on http://localhost:${env.PORT}`);
    logger.info(`Socket.IO signaling server ready`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to bootstrap server.", error);
  process.exit(1);
});
