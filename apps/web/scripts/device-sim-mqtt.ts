/**
 * Device simulator qua MQTT — mỗi deviceCode một connection (credential riêng)
 *
 * Usage:
 *   npm run sim:mqtt
 *   MQTT_URL=mqtts://127.0.0.1:8883 MQTT_TLS_INSECURE=1 npm run sim:mqtt
 *
 * Password mặc định: dev-{deviceCode} (khớp scripts/gen-mqtt-passwd.ps1)
 */

import mqtt from "mqtt";
import {
  mqttAckTopic,
  mqttCommandTopic,
  mqttHeartbeatTopic,
} from "../src/lib/mqttTopics";

const MQTT_URL = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
const MQTT_TLS_INSECURE = process.env.MQTT_TLS_INSECURE === "1";
const CODES = (process.env.DEVICE_CODES || "COM-XA1-01,COM-XA1-02,COM-XA2-01")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
const HB_MS = Number(process.env.MQTT_HB_MS || 8000);

function passFor(code: string) {
  return process.env[`MQTT_PASS_${code}`] || process.env.MQTT_DEVICE_PASSWORD || `dev-${code}`;
}

console.log(`MPCIS MQTT device sim → ${MQTT_URL}`);
console.log(`Devices: ${CODES.join(", ")} (user=deviceCode)`);

for (const code of CODES) {
  const client = mqtt.connect(MQTT_URL, {
    clientId: `mpcis-dev-${code}-${Math.random().toString(16).slice(2, 6)}`,
    username: code,
    password: passFor(code),
    reconnectPeriod: 3000,
    rejectUnauthorized: !MQTT_TLS_INSECURE,
  });

  function sendHb() {
    const payload = JSON.stringify({
      rssi: -65 - Math.floor(Math.random() * 20),
      ts: new Date().toISOString(),
    });
    client.publish(mqttHeartbeatTopic(code), payload, { qos: 0 });
    console.log(`[sim-mqtt] HB ${code}`);
  }

  client.on("connect", () => {
    console.log(`[sim-mqtt] connected ${code}`);
    client.subscribe(mqttCommandTopic(code), { qos: 1 });
    sendHb();
  });

  client.on("message", (topic, buf) => {
    try {
      if (topic !== mqttCommandTopic(code)) return;
      const msg = JSON.parse(buf.toString("utf8")) as { id?: string; commandType?: string };
      if (!msg.id) return;
      console.log(`[sim-mqtt] CMD ${code} ← ${msg.commandType}`);
      setTimeout(() => {
        client.publish(
          mqttAckTopic(code),
          JSON.stringify({ commandId: msg.id, status: "acked" }),
          { qos: 1 },
        );
        console.log(`[sim-mqtt] ACK ${code}`);
      }, 400);
    } catch (err) {
      console.error(`[sim-mqtt] bad message ${code}`, err);
    }
  });

  client.on("error", (err) => console.error(`[sim-mqtt] ${code}`, err.message));

  setInterval(() => {
    if (client.connected) sendHb();
  }, HB_MS);
}
