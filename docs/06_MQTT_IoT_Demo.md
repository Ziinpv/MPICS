# MQTT IoT (TLS + credential theo device)

## Thành phần

| Thành phần | Vai trò |
|------------|---------|
| Mosquitto `:1883` | MQTT + auth + ACL |
| Mosquitto `:8883` | MQTTS (staging / lab cert) |
| `mqtt:bridge` | user `bridge` — full `mpcis/devices/#` |
| `sim:mqtt` | mỗi `deviceCode` một connection |
| Admin → MQTT pass | rotate password (plaintext 1 lần) |

## Credential

| User | Password demo local | ACL |
|------|---------------------|-----|
| `bridge` | `mpcisbridge` | `mpcis/devices/#` readwrite |
| `COM-XA1-01` … | `dev-{deviceCode}` | chỉ topic của device đó |

```powershell
powershell -File .\scripts\gen-mqtt-passwd.ps1
powershell -File .\scripts\gen-mqtt-certs.ps1   # cho :8883
docker compose up -d --force-recreate mosquitto
```

## Chạy

```bash
npm.cmd run mqtt:bridge
# MQTT_USERNAME=bridge MQTT_PASSWORD=mpcisbridge

npm.cmd run sim:mqtt
# mỗi device: user=deviceCode pass=dev-{code}

# TLS lab
MQTT_URL=mqtts://127.0.0.1:8883 MQTT_TLS_INSECURE=1 npm.cmd run mqtt:bridge
```

## Topics

- `mpcis/devices/{deviceCode}/heartbeat|command|ack`
