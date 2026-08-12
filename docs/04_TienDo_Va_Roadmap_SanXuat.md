# Tiến độ & lộ trình sản xuất — MPCIS

> Cập nhật: **12 Aug 2026**  
> Trạng thái: NV02/08/10 vận hành local + play logs / broadcast report / notify resolve.  
> Repo: https://github.com/Ziinpv/MPICS

---

## 1. Kết luận hiện tại

| Hạng mục | Kết quả |
|----------|---------|
| Demo MVP (Path A + Path B) | ✅ Đóng |
| Hội tụ UI TTVH P1–P3 | ✅ Đóng |
| P0 Hardening (auth/audit/migrate/backup/staging env) | ✅ Code xong (~90%; còn quên MK + deploy staging máy chủ) |
| Push GitHub `main` | ✅ |
| Sẵn sàng production kỹ thuật | **~42%** |

**Verdict:** Walkthrough demo ổn định local. P1 media/audit + P2 MQTT demo + CI/jobs đã có trong code; còn staging host, TLS device, UAT.

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
| Media | MinIO/S3 abstraction | Lifecycle/CDN prod |
| IoT | MQTT broker + bridge + sim + basic auth | TLS, device credential, ACL |
| Jobs | `jobs:run` timeout + periodic | Scheduler production (systemd/cron) |
| Quan sát | Health endpoint + GitHub Actions CI | Structured logs, metrics, alert |
| Môi trường | `.env.staging.example` | Staging host + UAT |

---

## 4. Lộ trình còn lại

### P1 — Dữ liệu & GIS sản xuất ← **đã đóng phần lớn trong code**
1. Object storage ảnh địa điểm (MinIO/S3); gắn media khi PATCH ✅
2. UI Admin xem AuditLog ✅
3. Validate tọa độ trong phạm vi xã ✅
4. Phân quyền list/export đúng subtree org (siết thêm nếu cần) ⏳

**Milestone:** User xã thao tác GIS ổn định trên staging với upload ảnh thật.

### P2 — IoT & phát sóng (đang chạy demo)
1. MQTT Mosquitto + bridge + sim ✅ (basic auth demo)
2. Command timeout + lịch định kỳ + CI ✅
3. TLS / device credential; pipeline media/TTS; ModerationReview đầy đủ ⏳

**Milestone:** Path B với thiết bị lab / cụm thí điểm.

### P3 — Vận hành & UAT
1. Deploy staging + runbook; UAT cán bộ địa phương
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
2. SMTP — cấu hình `SMTP_*` trên staging (Mailpit local đã có)  
3. MQTT TLS + credential theo device — [06_MQTT_IoT_Demo.md](./06_MQTT_IoT_Demo.md)  
4. TTS/media pipeline  

**Đã ship thêm (10 Aug):** CI GitHub Actions · MQTT basic auth · command timeout · lịch định kỳ · `npm run jobs:run`

Áp dụng local sau pull:

```bash
docker compose up -d
npm.cmd run db:migrate   # hoặc db:push
npm.cmd run db:generate
npm.cmd run dev
# optional: npm.cmd run mqtt:bridge · npm.cmd run sim:mqtt · npm.cmd run jobs:run
```

---

## 6. Tham chiếu

- Plan demo: [03_Plan_MVP_Demo.md](./03_Plan_MVP_Demo.md)
- Chạy local: [../README.md](../README.md)
- Nghiệp vụ: [nghiepvu/README.md](./nghiepvu/README.md)
- Staging: [08_Staging_Deploy.md](./08_Staging_Deploy.md)
- TTS: [09_TTS_Media_Pipeline.md](./09_TTS_Media_Pipeline.md)
- Path B local: [10_PathB_Local.md](./10_PathB_Local.md)
- Canvas: `canvases/mpics-progress-2026-08.canvas.tsx`
