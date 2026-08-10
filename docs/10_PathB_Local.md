# Path B local — TTS + lịch định kỳ + MQTT ACL

> Chạy trên máy dev trước khi deploy staging.

## 0. Hạ tầng

```powershell
docker compose up -d
powershell -ExecutionPolicy Bypass -File .\scripts\gen-mqtt-passwd.ps1
docker compose up -d --force-recreate mosquitto
npm.cmd run db:migrate
npm.cmd run db:generate
npm.cmd run dev
```

## 1. TTS (edge-tts)

```powershell
# Python hệ thống (không dùng venv Hermes)
& "$env:LOCALAPPDATA\Python\bin\python.exe" -m pip install edge-tts
```

Trong `apps/web/.env`:

```
TTS_DRIVER=edge
TTS_VOICE=vi-VN-HoaiMyNeural
TTS_PYTHON=C:\Users\PC\AppData\Local\Python\bin\python.exe
TTS_FALLBACK_MOCK=1
```

Flow: Admin → Nội dung → **Duyệt + TTS** → MP3 (MinIO/local) → `ready_to_air` → Nghe thử.

Không có mạng/edge-tts → tự fallback mock nếu `TTS_FALLBACK_MOCK=1`.

```powershell
npm.cmd run tts:worker -- --once
```

## 2. Lịch định kỳ

1. Tạo bài + duyệt TTS → `ready_to_air`
2. Admin → Lịch phát → loại **Định kỳ** + phút → Publish
3. Jobs:

```powershell
npm.cmd run jobs:run
# hoặc nút "Chạy jobs ngay" trên UI (cần login admin)
```

## 3. MQTT ACL

| User | Pass | Quyền |
|------|------|--------|
| `bridge` | `mpcisbridge` | `mpcis/devices/#` |
| `COM-XA1-01` … | `dev-{code}` | chỉ topic device đó |

```powershell
# Terminal 1
npm.cmd run mqtt:bridge

# Terminal 2
npm.cmd run sim:mqtt
```

Publish lịch → bridge `sent` → sim `acked` trên `/admin/iot`.

## 4. Checklist nhanh

- [ ] `GET /api/health`
- [ ] Duyệt TTS → có file MP3 / preview
- [ ] Lịch oneshot + periodic + `jobs:run`
- [ ] MQTT bridge + sim không `ECONNREFUSED`
- [ ] Device chỉ pub được topic của mình (ACL)
