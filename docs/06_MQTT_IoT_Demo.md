# MQTT IoT demo (P2)

## Thành phần

| Thành phần | Vai trò |
|------------|---------|
| `mosquitto` (Docker :1883) | Broker MQTT local, **basic auth** (`mpcis` / `mpcismqtt`) |
| `npm run mqtt:bridge` | Heartbeat/ack MQTT → `/api/sim/*`; pending commands → MQTT |
| `npm run sim:mqtt` | Giả lập thiết bị publish HB + nhận lệnh + ack |
| `npm run sim` | Simulator HTTP poll (vẫn dùng được) |
| `npm run jobs:run` | Timeout lệnh stale + chạy lịch periodic đến hạn |

## Topics

- `mpcis/devices/{deviceCode}/heartbeat`
- `mpcis/devices/{deviceCode}/command`
- `mpcis/devices/{deviceCode}/ack`

Prefix đổi bằng `MQTT_TOPIC_PREFIX`.

## Auth Mosquitto

- `allow_anonymous false`
- Password file: `infra/mosquitto/passwd` (demo: user `mpcis`, pass `mpcismqtt`)
- Đổi mật khẩu: `docker run --rm -v "$PWD/infra/mosquitto:/out" eclipse-mosquitto:2 mosquitto_passwd -b /out/passwd USER PASS`

## Chạy

```bash
docker compose up -d
npm.cmd run dev

# terminal riêng
npm.cmd run mqtt:bridge
npm.cmd run sim:mqtt

# jobs (timeout + periodic) — không cần HTTP
npm.cmd run jobs:run
# hoặc HTTP: CRON_SECRET=... npm.cmd run cron:tick
```

Sau đó Admin → Lịch phát → Publish → lệnh `pending` → bridge `sent` → device ack `acked` trên Dashboard IoT.

Lịch **định kỳ**: chọn loại Định kỳ + chu kỳ phút → Publish lần đầu hoặc để `jobs:run` / nút **Chạy jobs ngay**.

## Biến môi trường

```
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_USERNAME=mpcis
MQTT_PASSWORD=mpcismqtt
BASE_URL=http://localhost:3000
DEVICE_CODES=COM-XA1-01,COM-XA1-02,COM-XA2-01
MQTT_BRIDGE_POLL_MS=4000
COMMAND_TIMEOUT_MINUTES=5
CRON_SECRET=change-me-cron-secret
```

## Backlog production

- TLS trên Mosquitto + credential theo `deviceCode`
- Bridge chạy service riêng (không chỉ script)
- ACL topic theo device
