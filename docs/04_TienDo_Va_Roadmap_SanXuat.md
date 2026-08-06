# Tiến độ & lộ trình sản xuất — MPCIS

> Cập nhật: **6 Aug 2026**  
> Trạng thái: **Demo MVP thành công** · Bắt đầu chuyển sang phase sẵn sàng thực tế (P0).

---

## 1. Kết luận demo

| Tiêu chí (docs/03_Plan_MVP_Demo.md §9) | Kết quả |
|----------------------------------------|---------|
| Chạy local: Docker Postgres + seed + `npm run dev` | ✅ |
| Path A — User tạo địa điểm (form + GPS + ảnh) → map/list | ✅ |
| Path B — Admin content → lịch → simulator play → log | ✅ |
| User không tạo được content (UI/API) | ✅ |
| README tài khoản + walkthrough | ✅ |
| Hội tụ UI TTVH P1–P3 (sidebar, list, charts, users, export, CRUD loại ĐĐ, sửa ĐĐ) | ✅ |

**Verdict:** Demo walkthrough 10–15 phút đủ 2 happy path; Admin shell kiểu TTVH + module IoT/phát sóng ổn định trên localhost.

Local: http://localhost:3000 · Seed: `admin` / `user.xa1` / `user.xa2` · `Demo@123`

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

---

## 3. Demo ≠ Production

Còn thiếu / rủi ro nếu đưa thẳng ra thực tế:

| Hạng mục | Hiện trạng demo | Cần cho production |
|----------|-----------------|-------------------|
| Bảo mật | JWT secret cố định, password seed | Secret rotation, HTTPS, đổi MK, rate-limit |
| DB | `db push` + reseed | Prisma migrate, backup/restore, không mất data |
| Media | File/local key | S3/MinIO, virus scan, quota |
| IoT | Simulator HTTP | MQTT/broker, device credential, telemetry |
| Auth/RBAC | 2 role đơn giản | Đổi MK, phân quyền theo cấp tỉnh/huyện/xã |
| Quan sát | Log console | Structured logs, metrics, alert |
| Môi trường | 1 máy local | Staging + UAT + prod, CI/CD |

Ước lượng sẵn sàng production kỹ thuật hiện tại: **~20–25%** (demo + UI nền).

---

## 4. Lộ trình đưa ra thực tế

### P0 — Hardening (ưu tiên ngay, 1–2 tuần)
1. Biến môi trường production (`JWT_SECRET`, `DATABASE_URL`, CORS)
2. Đổi mật khẩu / bắt buộc đổi lần đầu đăng nhập
3. Rate-limit login; session/JWT expiry rõ ràng
4. Prisma **migrate** thay vì chỉ `db push`; backup Postgres định kỳ
5. Staging environment tách khỏi máy demo
6. Audit tối thiểu: ai tạo/sửa user, loại ĐĐ, publish lịch

**Milestone:** Deploy staging nội bộ, không dùng password seed công khai.

### P1 — Dữ liệu & GIS sản xuất (2–3 tuần)
1. Import/đồng bộ danh mục xã đầy đủ theo địa bàn triển khai
2. Object storage ảnh địa điểm; gắn media khi PATCH
3. Validate tọa độ trong phạm vi xã; lịch sử chỉnh sửa (optional)
4. Phân quyền list/export đúng subtree org

**Milestone:** User xã thao tác GIS ổn định trên staging với data thật (mẫu).

### P2 — IoT & phát sóng thật (4–6 tuần)
1. MQTT (hoặc gateway) thay simulator poll
2. Device auth + heartbeat + lệnh 2 chiều
3. Pipeline media/TTS (hoặc tích hợp dịch vụ sẵn có)
4. Lịch định kỳ + báo cáo phát; ModerationReview đầy đủ

**Milestone:** Path B chạy với thiết bị lab / cụm thí điểm.

### P3 — Vận hành & UAT (song song / sau P1)
1. CI/CD, healthcheck, runbook sự cố
2. UAT với cán bộ địa phương (Lâm Đồng hoặc địa bàn pilot)
3. Training Admin/User; checklist go-live
4. Giám sát SLA online thiết bị

**Milestone:** Go-live pilot 1–2 xã.

---

## 5. Việc nên làm tiếp ngay (sprint đề xuất)

### P0 Hardening — **đã triển khai code (6 Aug 2026)**

| Hạng mục | Trạng thái |
|----------|------------|
| Đổi mật khẩu + bắt buộc đổi (user mới / reset) | ✅ `/account/password` |
| JWT expiry cấu hình (`JWT_EXPIRES_IN`, mặc định 8h) | ✅ |
| Rate-limit login (10 / 15 phút / IP) | ✅ |
| Cấm JWT_SECRET demo trên staging/prod | ✅ |
| AuditLog (login, user, loại ĐĐ, publish) | ✅ |
| Prisma migrate `20260806090000_p0_hardening` | ✅ |
| Script backup `scripts/backup-db.ps1` / `.sh` | ✅ |
| `.env.staging.example` + tắt demo hints | ✅ |
| Healthcheck `GET /api/health` | ✅ |

**Áp dụng local sau pull:**

```bash
npm.cmd run db:push
# hoặc: npm.cmd run db:migrate  (sau khi đã baseline)
npm.cmd run db:generate
```

Staging checklist: copy `.env.staging.example` → `.env`, đổi `JWT_SECRET` + DB password, `NEXT_PUBLIC_SHOW_DEMO_HINTS=0`, `SEED_MUST_CHANGE_PASSWORD=1`, backup định kỳ.

### Sprint tiếp (P1)

1. Object storage ảnh (MinIO/S3)  
2. Validate tọa độ theo địa bàn  
3. UI xem AuditLog (Admin)  

Các hạng mục polish demo còn lại (không chặn production start): ảnh trên incident form.

---

## 6. Tham chiếu

- Plan demo: [03_Plan_MVP_Demo.md](./03_Plan_MVP_Demo.md)
- Chạy local: [../README.md](../README.md)
- Nghiệp vụ: [nghiepvu/README.md](./nghiepvu/README.md)
- Canvas tiến độ: `canvases/mpics-progress-2026-08.canvas.tsx` (Cursor)
