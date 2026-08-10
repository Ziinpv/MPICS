/** MQTT topic helpers — demo P2 */

export const MQTT_PREFIX = process.env.MQTT_TOPIC_PREFIX || "mpcis";

export function mqttHeartbeatTopic(deviceCode: string) {
  return `${MQTT_PREFIX}/devices/${deviceCode}/heartbeat`;
}

export function mqttCommandTopic(deviceCode: string) {
  return `${MQTT_PREFIX}/devices/${deviceCode}/command`;
}

export function mqttAckTopic(deviceCode: string) {
  return `${MQTT_PREFIX}/devices/${deviceCode}/ack`;
}

export function mqttHeartbeatSubscribe() {
  return `${MQTT_PREFIX}/devices/+/heartbeat`;
}

export function mqttAckSubscribe() {
  return `${MQTT_PREFIX}/devices/+/ack`;
}

/** Extract deviceCode from mpcis/devices/{code}/… */
export function deviceCodeFromTopic(topic: string): string | null {
  const parts = topic.split("/");
  // prefix / devices / code / …
  const idx = parts.indexOf("devices");
  if (idx < 0 || !parts[idx + 1]) return null;
  return parts[idx + 1];
}
