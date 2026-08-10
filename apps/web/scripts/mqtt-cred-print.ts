/**
 * Generate Mosquitto passwd + acl from seed device codes + bridge.
 * Does not need DB — uses DEVICE_CODES + MQTT_BRIDGE_PASSWORD env.
 *
 * Usage (from repo root, Docker):
 *   powershell -File scripts/gen-mqtt-passwd.ps1
 */
const BRIDGE_USER = process.env.MQTT_BRIDGE_USER || "bridge";
const BRIDGE_PASS = process.env.MQTT_BRIDGE_PASSWORD || "mpcisbridge";
const PREFIX = process.env.MQTT_TOPIC_PREFIX || "mpcis";
const CODES = (process.env.DEVICE_CODES || "COM-XA1-01,COM-XA1-02,COM-XA1-03,COM-XA2-01")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

/** Default device password pattern for local demo */
function devicePass(code: string) {
  return process.env[`MQTT_PASS_${code}`] || `dev-${code}`;
}

console.log("Mosquitto users to provision:");
console.log(`  ${BRIDGE_USER} / (bridge)`);
for (const c of CODES) console.log(`  ${c} / ${devicePass(c)}`);
console.log("\nACL sketch:");
console.log(`user ${BRIDGE_USER}`);
console.log(`topic readwrite ${PREFIX}/devices/#`);
for (const c of CODES) {
  console.log(`user ${c}`);
  console.log(`topic readwrite ${PREFIX}/devices/${c}/#`);
}
console.log("\nRun: powershell -File scripts/gen-mqtt-passwd.ps1");
