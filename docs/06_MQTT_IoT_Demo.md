# MQTT IoT demo (P2)

## Thành phần

| Thành phần | Vai trò |
|------------|---------|
| `mosquitto` (Docker :1883) | Broker MQTT local, anonymous demo |
| `npm run mqtt:bridge` | Heartbeat/ack MQTT → `/api/sim/*`; pending commands → MQTT |
| `npm run sim:mqtt` | Giả lập thiết bị publish HB + nhận lệnh + ack |
| `npm run sim` | Simulator HTTP poll (vẫn dùng được) |

## Topics

- `mpcis/devices/{deviceCode}/heartbeat`
- `mpcis/devices/{deviceCode}/command`
- `mpcis/devices/{deviceCode}/ack`

Prefix đổi bằng `MQTT_TOPIC_PREFIX`.

## Chạy

```bash
docker compose up -d
npm.cmd run dev

# terminal riêng
npm.cmd run mqtt:bridge
npm.cmd run sim:mqtt
```

Sau đó Admin → Lịch phát → Publish → lệnh `pending` → bridge `sent` → device ack `acked` trên Dashboard IoT.

## Biến môi trường

```
MQTT_URL=mqtt://127.0.0.1:1883
BASE_URL=http://localhost:3000
DEVICE_CODES=COM-XA1-01,COM-XA1-02,COM-XA2-01
MQTT_BRIDGE_POLL_MS=4000
```

## Backlog production

- User/password hoặc mTLS trên Mosquitto
- Device credential theo `deviceCode`
- Bridge chạy service riêng (không chỉ script)
- QoS/retry/timeout `CommandStatus.timeout`
