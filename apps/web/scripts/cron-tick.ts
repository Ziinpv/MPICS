/**
 * Cron local: timeout lệnh + lịch periodic
 * Usage: npm run cron:tick
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET || "";

async function main() {
  const res = await fetch(`${BASE}/api/cron/tick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-cron-secret": secret } : {}),
    },
    body: JSON.stringify({}),
  });
  // Không có cookie admin — cần CRON_SECRET
  const data = await res.json();
  if (!res.ok) {
    console.error("[cron]", data);
    // Fallback: chạy trực tiếp qua tsx nếu secret thiếu — dùng prisma script
    process.exit(1);
  }
  console.log("[cron]", JSON.stringify(data, null, 2));
}

main();
