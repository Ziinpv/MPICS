# MPCIS Demo — Hướng dẫn chạy

Demo MVP theo [`docs/03_Plan_MVP_Demo.md`](docs/03_Plan_MVP_Demo.md).

## Yêu cầu

- Node.js 20+
- Docker Desktop (PostgreSQL)
- npm

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
4. Danh sách / map — thấy địa điểm mới

### Path B — Admin phát sóng
1. Login `admin`
2. **Nội dung** — tạo bài → Duyệt (`ready_to_air`)
3. **Lịch phát** — chọn bài + cụm → Publish
4. Terminal: `npm run sim` (trong `apps/web`) — heartbeat + ack `play`
5. **Dashboard** — lệnh gần đây `acked`

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
# MPICS
