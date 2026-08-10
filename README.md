# MPCIS Demo — Hướng dẫn chạy

> **Trạng thái (10 Aug 2026):** Demo MVP + TTVH P1–P3 + **P0 Hardening** đã ship (`main` @ GitHub).  
> Lộ trình tiếp: P1 GIS sản xuất — [`docs/04_TienDo_Va_Roadmap_SanXuat.md`](docs/04_TienDo_Va_Roadmap_SanXuat.md).

Demo MVP theo [`docs/03_Plan_MVP_Demo.md`](docs/03_Plan_MVP_Demo.md).

## Yêu cầu

- Node.js 20+
- Docker Desktop (PostgreSQL)
- npm

> **Windows PowerShell:** nếu gặp lỗi Execution Policy với `npm.ps1`, dùng `npm.cmd` (ví dụ `npm.cmd run dev`).

## Chạy lần đầu

```bash
# 1. Bật Postgres (port 5433)
docker compose up -d

# 2. Cài dependency
cd apps/web && npm install

# 3. Schema + seed
npm run db:generate
npm run db:push
npm run db:seed

# 4. Chạy web
npm run dev
```

Hoặc từ root: `npm run db:setup` rồi `npm run dev`.

Mở http://localhost:3000

## Tài khoản seed

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Demo@123` | Admin (huyện) |
| `user.xa1` | `Demo@123` | User xã 1 |
| `user.xa2` | `Demo@123` | User xã 2 |

## Walkthrough demo

### Path A — User GIS
1. Login `user.xa1`
2. **Bản đồ tra cứu** — xem marker địa điểm seed
3. **Thêm địa điểm** — form + pick GPS + upload ảnh → Lưu
4. **Danh sách** — icon sửa → chỉnh sửa địa điểm

### Path B — Admin phát sóng
1. Login `admin`
2. **Nội dung** — tạo bài → Duyệt (`ready_to_air`)
3. **Lịch phát** — chọn bài + cụm → Publish
4. Terminal: `npm run sim` (trong `apps/web`) — heartbeat + ack `play`
5. **Dashboard IoT** (`/admin/iot`) — lệnh gần đây `acked`

### Admin TTVH-like (đã có)
- Overview map/KPI, biểu đồ, list VH / TTTM / tín ngưỡng
- Danh mục Tỉnh / Xã / **CRUD loại ĐĐ**
- **Quản lý user**, **Xuất CSV** báo cáo địa điểm

### Báo sự cố
- User: **Báo sự cố** → Admin: **Sự cố** → Resolve

## Simulator

```bash
cd apps/web && npm run sim
```

## Cấu trúc

```
mpics/
  apps/web/                 # Next.js UI + API + prisma
  apps/web/prisma/          # schema + seed
  apps/web/scripts/device-sim.ts
  docker-compose.yml        # Postgres :5433
  docs/
```

## Biến môi trường (`apps/web/.env`)

```
DATABASE_URL=postgresql://mpcis:mpcis@127.0.0.1:5433/mpcis?schema=public
JWT_SECRET=mpcis-demo-secret-change-me
```

> Port **5433** tránh xung đột Postgres local trên 5432.  
> Trên staging/prod: **đổi** `JWT_SECRET` và mật khẩu DB — xem [`docs/04_TienDo_Va_Roadmap_SanXuat.md`](docs/04_TienDo_Va_Roadmap_SanXuat.md) (P0).

## P0 Hardening (đã có)

- Đổi mật khẩu: header **Đổi MK** hoặc `/account/password` (bắt buộc sau tạo user / reset)
- Rate-limit login · JWT expiry (`JWT_EXPIRES_IN`) · AuditLog
- Health: `GET /api/health`
- Backup: `npm.cmd run db:backup` (hoặc `scripts/backup-db.ps1`)
- Staging env mẫu: `apps/web/.env.staging.example`

## P1 Media & Audit (đang có)

- MinIO: `docker compose up -d` → API `:9000`, console http://localhost:9001 (`mpcis` / `mpcisminio`)
- `.env`: `STORAGE_DRIVER=s3` + `NEXT_PUBLIC_STORAGE_DRIVER=s3` (xem `.env.example`)
- Upload ảnh → MinIO (hoặc local `public/uploads`); sửa địa điểm gắn media khi Lưu
- Admin **Nhật ký hệ thống**: `/admin/audit`
- Validate tọa độ theo bbox xã (Lạc Dương / Đơn Dương) — tắt bằng `GEO_VALIDATION=0`

