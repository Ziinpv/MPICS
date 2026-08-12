# SMTP — quên mật khẩu & tạo tài khoản

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
BASE_URL=http://localhost:3000
```

- SMTP: `:1025`
- UI xem mail: http://localhost:8025

### Thử

1. **Tạo user** — Admin → Người dùng → tạo USER xã + **email cá nhân** + MK tạm  
   → Mailpit nhận mail: username + mật khẩu tạm + link `/login`
2. **Quên MK** — `/forgot-password` với user có email (seed: `admin@mpcis.demo`)
3. **Reset MK** — Admin bấm Reset → gửi lại MK tạm nếu user có email

## Staging / production

Điền `SMTP_*` provider thật trong `.env` / `.env.staging`. Đặt `EXPOSE_RESET_LINK=0`.

Nếu tạo user mà SMTP lỗi: tài khoản vẫn được tạo; API trả `notified.emailed=false` + lý do.
