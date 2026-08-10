/**
 * Chạy jobs trực tiếp (không cần HTTP/admin cookie)
 * Usage: npm run jobs:run
 */
import { runDuePeriodicSchedules, timeoutStaleCommands } from "../src/lib/scheduleJobs";
import { scanDeviceOfflineAlerts } from "../src/lib/telemetryAlerts";

async function main() {
  const timeout = await timeoutStaleCommands();
  const periodic = await runDuePeriodicSchedules();
  const offline = await scanDeviceOfflineAlerts();
  console.log(
    JSON.stringify({ timeout, periodic, offline, ranAt: new Date().toISOString() }, null, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
