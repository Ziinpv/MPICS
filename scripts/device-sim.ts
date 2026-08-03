/**
 * Device simulator — heartbeat + poll lệnh play/reboot/volume
 *
 * Usage:
 *   npm run sim
 *   BASE_URL=http://localhost:3000 npm run sim
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CODES = (process.env.DEVICE_CODES || "SPK-XA1-01,SPK-XA1-02,SPK-XA2-01").split(",");

async function heartbeat(deviceCode: string) {
  const res = await fetch(`${BASE}/api/sim/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode, rssi: -65 - Math.floor(Math.random() * 20) }),
  });
  const data = await res.json();
  if (!res.ok) console.error(`[HB] ${deviceCode}`, data);
  else console.log(`[HB] ${deviceCode} online`);
  return data.device?.id as string | undefined;
}

async function pollAndAck(deviceCode: string) {
  const res = await fetch(`${BASE}/api/sim/commands?device_code=${encodeURIComponent(deviceCode)}`);
  const data = await res.json();
  if (!res.ok) {
    console.error(`[POLL] ${deviceCode}`, data);
    return;
  }
  for (const cmd of data.commands || []) {
    console.log(`[CMD] ${deviceCode} ← ${cmd.commandType}`, cmd.payload || {});
    const ack = await fetch(`${BASE}/api/sim/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: cmd.id }),
    });
    const ackData = await ack.json();
    console.log(`[ACK] ${deviceCode} ${cmd.commandType} → ${ackData.command?.status}`);
  }
}

async function tick() {
  for (const code of CODES) {
    await heartbeat(code.trim());
    await pollAndAck(code.trim());
  }
}

console.log(`MPCIS device simulator → ${BASE}`);
console.log(`Devices: ${CODES.join(", ")}`);
tick();
setInterval(tick, 8000);
