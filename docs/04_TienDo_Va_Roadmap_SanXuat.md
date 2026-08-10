# Tiến độ & lộ trình sản xuất — MPCIS

> Cập nhật: **10 Aug 2026**  
> Trạng thái: **Demo + TTVH P1–P3 + P0 + P1 media/audit (code)** · Next: validate tọa độ / staging deploy / P2 IoT.  
> Repo: https://github.com/Ziinpv/MPICS · Commit gần nhất trên remote có thể chưa gồm P1 — commit local khi sẵn sàng.

---

## 1. Kết luận hiện tại

| Hạng mục | Kết quả |
|----------|---------|
| Demo MVP (Path A + Path B) | ✅ Đóng |
| Hội tụ UI TTVH P1–P3 | ✅ Đóng |
| P0 Hardening (auth/audit/migrate/backup/staging env) | ✅ Code xong (~90%; còn quên MK + deploy staging máy chủ) |
| Push GitHub `main` | ✅ |
| Sẵn sàng production kỹ thuật | **~35%** |

**Verdict:** Walkthrough demo ổn định local. Nền tảng hardening đủ để bắt đầu staging; chưa đủ go-live (thiếu object storage, IoT thật, CI/CD, UAT).

Local: http://localhost:3000 · Seed: `admin` / `user.xa1` / `user.xa2` · `Demo@123`  
Windows: dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

---

## 2. Đã đóng (tóm tắt)

### MVP demo
- Auth JWT role Admin/User, org Lâm Đồng seed
- User: bản đồ, danh sách, thêm/sửa địa điểm, GPS, ảnh, báo sự cố
- Admin: overview map/KPI, charts, list VH/TTTM/tín ngưỡng, IoT devices/map, content, lịch, sự cố
- Device simulator HTTP poll + ack `play`

### Hội tụ TTVH
| Phase | Nội dung | Status |
|-------|----------|--------|
| P1 | Sidebar nhóm, Search→Kết quả, bản đồ hình ảnh + KPI, IoT tách `/admin/iot` | Done |
| P2 | List theo loại, biểu đồ, danh mục Tỉnh/Xã | Done |
| P3 | User management, export CSV, CRUD `LocationTypeDef`, UI sửa địa điểm | Done |

### P0 Hardening (6–10 Aug 2026)
| Hạng mục | Status |
|----------|--------|
| Đổi mật khẩu + bắt buộc đổi (user mới / reset) — `/account/password` | ✅ |
| JWT expiry (`JWT_EXPIRES_IN`) | ✅ |
| Rate-limit login (10 / 15 phút / IP) | ✅ |
| Cấm JWT_SECRET demo trên staging/prod | ✅ |
| AuditLog (login, user, loại ĐĐ, publish) | ✅ |
| Prisma migrate `20260806090000_p0_hardening` | ✅ |
| Script backup `scripts/backup-db.ps1` / `.sh` | ✅ |
| `.env.staging.example` + tắt demo hints | ✅ |
| Healthcheck `GET /api/health` | ✅ |
| Quên mật khẩu / email reset | ✅ Token + `/forgot-password` (SMTP backlog; demo trả link) |
| Deploy staging trên máy chủ thật | ⏳ Checklist sẵn — [05_Staging_Checklist.md](./05_Staging_Checklist.md) |

---

## 3. Demo / P0 ≠ Production đầy đủ

| Hạng mục | Hiện trạng | Cần tiếp |
|----------|------------|----------|
| Bảo mật | Đổi MK, rate-limit, secret check, audit | Quên MK, HTTPS terminate, secret rotation ops |
| DB | Migrate + backup script | Restore drill, monitoring disk |
| Media | File/local key | **S3/MinIO** (P1) |
| IoT | Simulator HTTP | MQTT/broker (P2) |
| Quan sát | Health endpoint | Structured logs, metrics, alert |
| Môi trường | `.env.staging.example` | Staging host + CI/CD + UAT |

---

## 4. Lộ trình còn lại

### P1 — Dữ liệu & GIS sản xuất (2–3 tuần) ← **next**
1. Object storage ảnh địa điểm (MinIO/S3); gắn media khi PATCH
2. UI Admin xem AuditLog
3. Validate tọa độ trong phạm vi xã (optional lịch sử sửa)
4. Phân quyền list/export đúng subtree org (siết thêm nếu cần)

**Milestone:** User xã thao tác GIS ổn định trên staging với upload ảnh thật.

### P2 — IoT & phát sóng thật (4–6 tuần)
1. MQTT (hoặc gateway) thay simulator poll
2. Device auth + heartbeat + lệnh 2 chiều
3. Pipeline media/TTS; lịch định kỳ; ModerationReview đầy đủ

**Milestone:** Path B với thiết bị lab / cụm thí điểm.

### P3 — Vận hành & UAT
1. CI/CD, runbook; UAT cán bộ địa phương
2. Training; checklist go-live; SLA online thiết bị

**Milestone:** Go-live pilot 1–2 xã.

---

## 5. Sprint đề xuất ngay

### P1 (đang làm / đã có trong code — 10 Aug 2026)

| Hạng mục | Status |
|----------|--------|
| Storage abstraction local + MinIO/S3 (`STORAGE_DRIVER`) | ✅ |
| MinIO trong `docker-compose` (:9000 API, :9001 console) | ✅ |
| Upload qua `lib/storage` + proxy `/api/media/raw` | ✅ |
| PATCH location gắn `photoKeys` → LocationMedia | ✅ |
| Admin AuditLog UI `/admin/audit` + `GET /api/audit` | ✅ |
| Validate tọa độ theo địa bàn xã | ✅ bbox Lạc Dương / Đơn Dương + fallback Lâm Đồng |

**Bật MinIO local:**

```bash
docker compose up -d
# apps/web/.env:
# STORAGE_DRIVER=s3
# NEXT_PUBLIC_STORAGE_DRIVER=s3
# S3_ENDPOINT=http://127.0.0.1:9000
# S3_ACCESS_KEY=mpcis
# S3_SECRET_KEY=mpcisminio
# S3_BUCKET=mpcis-media
```

Console MinIO: http://localhost:9001 (mpcis / mpcisminio)

### Việc còn lại

1. Deploy staging theo [05_Staging_Checklist.md](./05_Staging_Checklist.md)  
2. SMTP gửi email quên MK thật  
3. P2 MQTT — **đã có broker + bridge + sim MQTT** (auth thiết bị / TLS còn lại)  
4. TTS/media pipeline + lịch định kỳ  

Áp dụng local sau pull:

```bash
docker compose up -d
npm.cmd run db:push   # hoặc db:migrate
npm.cmd run db:generate
npm.cmd run dev
```

---

## 6. Tham chiếu

- Plan demo: [03_Plan_MVP_Demo.md](./03_Plan_MVP_Demo.md)
- Chạy local: [../README.md](../README.md)
- Nghiệp vụ: [nghiepvu/README.md](./nghiepvu/README.md)
- Canvas: `canvases/mpics-progress-2026-08.canvas.tsx`
