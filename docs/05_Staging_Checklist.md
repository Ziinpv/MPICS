# Staging deploy — MPCIS

> Mục tiêu: môi trường staging nội bộ, **không** dùng password/secret demo công khai.  
> Hướng dẫn đầy đủ: [08_Staging_Deploy.md](./08_Staging_Deploy.md)

## 1. Hạ tầng

- [ ] Máy chủ / VM với Docker + Node 20+ (hoặc chỉ Docker + compose staging)
- [ ] Postgres riêng (container staging) + volume backup
- [ ] MinIO (hoặc S3) cho ảnh địa điểm + TTS MP3
- [ ] HTTPS reverse proxy (Caddy trong `docker-compose.staging.yml`) — `COOKIE_SECURE=1`
- [ ] Mosquitto MQTTS `:8883` + ACL theo deviceCode

## 2. Cấu hình

Copy `apps/web/.env.staging.example` → `apps/web/.env.staging` và điền:

- [ ] `APP_ENV=staging`
- [ ] `JWT_SECRET` ngẫu nhiên ≥32 ký tự
- [ ] `POSTGRES_PASSWORD` / `DATABASE_URL`
- [ ] `STORAGE_DRIVER=s3` + MinIO keys
- [ ] `NEXT_PUBLIC_SHOW_DEMO_HINTS=0`
- [ ] `SEED_MUST_CHANGE_PASSWORD=1`
- [ ] `APP_PUBLIC_URL=https://...`
- [ ] `EXPOSE_RESET_LINK=0`
- [ ] `GEO_VALIDATION=1`
- [ ] `CRON_SECRET`, `MEDIA_SIGNING_SECRET`
- [ ] `MQTT_BRIDGE_PASSWORD`, TTS_* 

## 3. Database

```bash
docker compose -f docker-compose.staging.yml --env-file apps/web/.env.staging up -d
docker compose -f docker-compose.staging.yml exec web npx prisma migrate deploy
# seed lần đầu nếu cần
```

- [ ] Backup trước migrate: `npm.cmd run db:backup`

## 4. Chạy app / smoke

- [ ] `GET /api/health` → `ok: true`
- [ ] Login admin → đổi MK nếu seed flag
- [ ] Upload ảnh → MinIO
- [ ] Duyệt nội dung → TTS MP3 + preview
- [ ] Quên MK / SMTP hoặc Mailpit

## 5. Bảo mật smoke

- [ ] Login sai ≥10 → 429
- [ ] User không gọi `/api/users`, `/api/audit`
- [ ] JWT demo bị từ chối khi `APP_ENV=staging`
- [ ] Không có quick-login trên `/login`

## 6. Vận hành

- [ ] Backup Postgres hàng ngày
- [ ] `jobs:run` / cron tick định kỳ
- [ ] Giám sát disk MinIO / Postgres
- [ ] Runbook restore

## Đã có trong repo (artifact)

- CI GitHub Actions
- `docker-compose.staging.yml` + Dockerfile + Caddy
- MQTT TLS conf + ACL + gen scripts
- edge-tts pipeline + mock fallback

## Chờ host

- [ ] Nhận IP/SSH từ ops → chạy [08_Staging_Deploy.md](./08_Staging_Deploy.md)
