# Checklist staging deploy — MPCIS

> Mục tiêu: môi trường staging nội bộ, **không** dùng password/secret demo công khai.

## 1. Hạ tầng

- [ ] Máy chủ / VM với Docker + Node 20+
- [ ] Postgres riêng (hoặc container) + volume backup
- [ ] MinIO (hoặc S3) cho ảnh địa điểm
- [ ] HTTPS reverse proxy (Caddy/Nginx) — `COOKIE_SECURE=1`

## 2. Cấu hình

Copy `apps/web/.env.staging.example` → `.env` và điền:

- [ ] `APP_ENV=staging`
- [ ] `JWT_SECRET` ngẫu nhiên ≥32 ký tự (không dùng giá trị demo)
- [ ] `DATABASE_URL` mật khẩu mạnh
- [ ] `STORAGE_DRIVER=s3` + credential MinIO/S3
- [ ] `NEXT_PUBLIC_SHOW_DEMO_HINTS=0`
- [ ] `SEED_MUST_CHANGE_PASSWORD=1` (nếu seed)
- [ ] `APP_PUBLIC_URL=https://staging.example.com` (link quên MK)
- [ ] `EXPOSE_RESET_LINK=0` (không trả reset URL trong JSON)
- [ ] `GEO_VALIDATION=1`

## 3. Database

```bash
docker compose up -d
cd apps/web
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate   # hoặc db:push lần đầu rồi migrate resolve
npm.cmd run db:seed      # chỉ lần đầu / khi chấp nhận mất data demo
```

- [ ] Backup trước mọi migrate: `npm.cmd run db:backup` (từ root)

## 4. Chạy app

```bash
npm.cmd run build
npm.cmd run start
# hoặc process manager (pm2 / systemd)
```

- [ ] `GET /api/health` trả `ok: true`
- [ ] Login admin → bắt buộc đổi MK nếu seed flag bật
- [ ] Upload ảnh địa điểm lên MinIO
- [ ] Quên MK: tạo token, đặt lại (SMTP sau — hiện log server)

## 5. Bảo mật smoke test

- [ ] Login sai ≥10 lần → 429
- [ ] User không gọi được `/api/users`, `/api/audit`
- [ ] JWT demo secret bị từ chối khi `APP_ENV=staging`
- [ ] Quick-login không hiện trên `/login`

## 6. Vận hành

- [ ] Lịch backup Postgres hàng ngày
- [ ] Giám sát disk MinIO / Postgres
- [ ] Runbook: restore backup, reset admin qua `/admin/users` (tài khoản ops)

## Chưa có trên staging (backlog)

- SMTP gửi email quên MK thật
- CI/CD pipeline
- MQTT / IoT thật (P2)
