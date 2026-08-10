/**
 * Device simulator qua MQTT (P2)
 *
 * Usage:
 *   npm run sim:mqtt
 *   MQTT_URL=mqtt://127.0.0.1:1883 npm run sim:mqtt
 */

import mqtt from "mqtt";
import {
  mqttAckTopic,
  mqttCommandTopic,
  mqttHeartbeatTopic,
} from "../src/lib/mqttTopics";

const MQTT_URL = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
const CODES = (process.env.DEVICE_CODES || "COM-XA1-01,COM-XA1-02,COM-XA2-01")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
const HB_MS = Number(process.env.MQTT_HB_MS || 8000);

console.log(`MPCIS MQTT device sim → ${MQTT_URL}`);
console.log(`Devices: ${CODES.join(", ")}`);

const client = mqtt.connect(MQTT_URL, {
  clientId: `mpcis-devsim-${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 3000,
});

function subscribeCommands() {
  for (const code of CODES) {
    client.subscribe(mqttCommandTopic(code), { qos: 1 });
  }
  console.log("[sim-mqtt] subscribed command topics");
}

function sendHeartbeats() {
  for (const code of CODES) {
    const payload = JSON.stringify({
      rssi: -65 - Math.floor(Math.random() * 20),
      ts: new Date().toISOString(),
    });
    client.publish(mqttHeartbeatTopic(code), payload, { qos: 0 });
    console.log(`[sim-mqtt] HB ${code}`);
  }
}

client.on("connect", () => {
  console.log("[sim-mqtt] connected");
  subscribeCommands();
  sendHeartbeats();
});

client.on("message", (topic, buf) => {
  try {
    const msg = JSON.parse(buf.toString("utf8")) as {
      id?: string;
      commandType?: string;
      payload?: unknown;
    };
    const code = CODES.find((c) => topic === mqttCommandTopic(c));
    if (!code || !msg.id) return;
    console.log(`[sim-mqtt] CMD ${code} ← ${msg.commandType}`, msg.payload || {});
    // Giả lập xử lý ngắn rồi ack
    setTimeout(() => {
      client.publish(
        mqttAckTopic(code),
        JSON.stringify({ commandId: msg.id, status: "acked" }),
        { qos: 1 },
      );
      console.log(`[sim-mqtt] ACK ${code} ${msg.commandType}`);
    }, 400);
  } catch (err) {
    console.error("[sim-mqtt] bad message", err);
  }
});

client.on("error", (err) => console.error("[sim-mqtt] error", err.message));

setInterval(() => {
  if (client.connected) sendHeartbeats();
}, HB_MS);
