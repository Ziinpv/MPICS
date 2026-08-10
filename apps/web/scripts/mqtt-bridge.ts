/**
 * MQTT ↔ HTTP bridge
 * - Device heartbeat/ack MQTT → POST /api/sim/*
 * - Pending DeviceCommand → publish MQTT command + mark sent
 *
 * Usage:
 *   npm run mqtt:bridge
 *   MQTT_URL=mqtt://127.0.0.1:1883 BASE_URL=http://localhost:3000 npm run mqtt:bridge
 */

import mqtt from "mqtt";
import {
  deviceCodeFromTopic,
  mqttAckSubscribe,
  mqttCommandTopic,
  mqttHeartbeatSubscribe,
} from "../src/lib/mqttTopics";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const MQTT_URL = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
const POLL_MS = Number(process.env.MQTT_BRIDGE_POLL_MS || 4000);

type PendingCmd = {
  id: string;
  commandType: string;
  payload: unknown;
  device: { deviceCode: string };
};

async function httpJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function handleHeartbeat(deviceCode: string, raw: string) {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    body = {};
  }
  const { ok, data } = await httpJson("/api/sim/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      deviceCode,
      rssi: body.rssi ?? -70,
      volume: body.volume,
    }),
  });
  if (!ok) console.error(`[bridge] HB fail ${deviceCode}`, data);
  else console.log(`[bridge] HB ${deviceCode} online`);
}

async function handleAck(deviceCode: string, raw: string) {
  let body: { commandId?: string } = {};
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    body = {};
  }
  if (!body.commandId) {
    console.error(`[bridge] ACK ${deviceCode} thiếu commandId`);
    return;
  }
  const { ok, data } = await httpJson("/api/sim/commands", {
    method: "POST",
    body: JSON.stringify({ commandId: body.commandId }),
  });
  if (!ok) console.error(`[bridge] ACK fail ${deviceCode}`, data);
  else console.log(`[bridge] ACK ${deviceCode} → ${data.command?.status}`);
}

async function pushPendingCommands(client: mqtt.MqttClient) {
  // Dùng API list theo từng device known từ env, hoặc endpoint tổng hợp
  const codes = (process.env.DEVICE_CODES || "COM-XA1-01,COM-XA1-02,COM-XA2-01")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  for (const code of codes) {
    const { ok, data } = await httpJson(
      `/api/sim/commands?device_code=${encodeURIComponent(code)}`,
    );
    if (!ok) continue;
    for (const cmd of (data.commands || []) as PendingCmd[]) {
      const mark = await httpJson("/api/sim/commands/sent", {
        method: "POST",
        body: JSON.stringify({ commandId: cmd.id }),
      });
      if (!mark.ok) {
        console.error(`[bridge] mark sent fail`, mark.data);
        continue;
      }
      if (mark.data.skipped) continue;

      const topic = mqttCommandTopic(code);
      const payload = JSON.stringify({
        id: cmd.id,
        commandType: cmd.commandType,
        payload: cmd.payload,
      });
      client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) console.error(`[bridge] publish fail ${code}`, err.message);
        else console.log(`[bridge] CMD → ${code} ${cmd.commandType} (${cmd.id})`);
      });
    }
  }
}

console.log(`MPCIS MQTT bridge`);
console.log(`  MQTT ${MQTT_URL}`);
console.log(`  API  ${BASE}`);

const client = mqtt.connect(MQTT_URL, {
  clientId: `mpcis-bridge-${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 3000,
});

client.on("connect", () => {
  console.log("[bridge] connected");
  client.subscribe([mqttHeartbeatSubscribe(), mqttAckSubscribe()], { qos: 1 }, (err) => {
    if (err) console.error("[bridge] subscribe", err);
    else console.log("[bridge] subscribed heartbeat + ack");
  });
});

client.on("message", (topic, buf) => {
  const code = deviceCodeFromTopic(topic);
  if (!code) return;
  const raw = buf.toString("utf8");
  if (topic.endsWith("/heartbeat")) void handleHeartbeat(code, raw);
  else if (topic.endsWith("/ack")) void handleAck(code, raw);
});

client.on("error", (err) => console.error("[bridge] error", err.message));

setInterval(() => {
  if (client.connected) void pushPendingCommands(client);
}, POLL_MS);

// first push soon
setTimeout(() => {
  if (client.connected) void pushPendingCommands(client);
}, 1500);
