import { app } from "./app";
import { config } from "./config";
import { prisma } from "./db";
import { startNotificationWorker } from "./notifications";
import { startOperationsWorker } from "./operations";
import { startSettlementWorker } from "./investment-settlements";
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(`Aureon API listening on port ${config.port}`),
);
const stopWorker = startNotificationWorker();
const stopOperations = startOperationsWorker();
const stopSettlements = startSettlementWorker();
function shutdown() {
  stopWorker();
  stopOperations();
  stopSettlements();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
