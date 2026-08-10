# Staging deploy — MPCIS

> Host thật: điền IP/SSH sau khi artifact sẵn sàng.  
> Stack: [`docker-compose.staging.yml`](../docker-compose.staging.yml)

## Trên máy local (chuẩn bị)

```powershell
# Cert MQTT + passwd/ACL
powershell -ExecutionPolicy Bypass -File .\scripts\gen-mqtt-certs.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\gen-mqtt-passwd.ps1

# Copy env
copy apps\web\.env.staging.example apps\web\.env.staging
# Sửa POSTGRES_PASSWORD, JWT_SECRET, S3_*, APP_PUBLIC_URL, CRON_SECRET, MEDIA_SIGNING_SECRET
```

## Trên host (sau khi có SSH)

```bash
git clone https://github.com/Ziinpv/MPICS.git && cd MPICS
# scp apps/web/.env.staging + certs/passwd nếu không gen trên host
powershell không có → dùng bash tương đương gen-mqtt-*.sh hoặc chạy Docker openssl/mosquitto_passwd

export POSTGRES_PASSWORD=... S3_ACCESS_KEY=... S3_SECRET_KEY=...
docker compose -f docker-compose.staging.yml --env-file apps/web/.env.staging up -d --build

docker compose -f docker-compose.staging.yml exec web npx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec web npx tsx --env-file=.env prisma/seed.ts   # lần đầu

curl -s https://$STAGING_HOST/api/health
```

## Smoke (checklist)

Theo [05_Staging_Checklist.md](./05_Staging_Checklist.md) §4–5.

## MQTT staging

- MQTTS `:8883` (self-signed lab) · MQTT `:1883` nội bộ
- Bridge: `MQTT_URL=mqtts://host:8883 MQTT_TLS_INSECURE=1 MQTT_USERNAME=bridge MQTT_PASSWORD=...`
- Device: username = `deviceCode`, password = `dev-{code}` (đổi bằng Admin → MQTT pass + gen-mqtt-passwd)

## TTS

- Image web có `edge-tts` (Python)
- `TTS_DRIVER=edge` · fallback `TTS_FALLBACK_MOCK=1`
- Duyệt nội dung Admin → MP3 MinIO → preview
