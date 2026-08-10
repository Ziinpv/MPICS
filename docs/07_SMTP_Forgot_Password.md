# SMTP quên mật khẩu

## Local (Mailpit)

```bash
docker compose up -d mailpit
```

Cấu hình `apps/web/.env`:

```
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=0
SMTP_FROM=MPCIS <noreply@mpcis.local>
```

- SMTP: `:1025`
- UI xem mail: http://localhost:8025

Thử: `/forgot-password` với `admin` (seed có `admin@mpcis.demo`) → xem mail trong Mailpit.

## Staging / production

Điền `SMTP_*` trong `.env` (host provider thật). Đặt `EXPOSE_RESET_LINK=0`.

Nếu user không có email: token vẫn tạo, chỉ log server / (dev) trả link JSON.
