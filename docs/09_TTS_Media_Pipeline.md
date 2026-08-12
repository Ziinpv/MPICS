# TTS / media pipeline (edge-tts)

## Luồng

1. Admin **Duyệt** → `approved` → **Chạy TTS** (giọng / vùng / tốc độ) → `TtsJob` + `tts_processing`
2. Worker/`processTtsJob`: edge-tts → MP3 → `putMediaObject` (MinIO/local)
3. `MediaAsset` (checksum SHA-256 + HMAC signature) → content `ready_to_air`
4. Publish lịch → payload kèm `checksum` + `signature` → sim/device **từ chối** nếu sai chữ ký

## Cài edge-tts (dev local)

```bash
pip install edge-tts
# hoặc TTS_DRIVER=mock / TTS_FALLBACK_MOCK=1
```

## Env

```
TTS_DRIVER=edge
TTS_VOICE=vi-VN-HoaiMyNeural
TTS_PYTHON=python
TTS_FALLBACK_MOCK=1
TTS_ASYNC=0
MEDIA_SIGNING_SECRET=long-random
STORAGE_DRIVER=s3
```

## Scripts

```bash
npm.cmd run tts:worker -- --once
```

## API

- `POST /api/contents/:id/moderate` `{ action: run_tts|retry_tts, voiceGender, region, speed, voice }`
- `POST /api/tts/jobs` `{ contentId, voiceGender, region, speed }`
- `GET /api/tts/jobs?content_id=`
- `POST /api/tts/jobs/:id` — retry

### Tham số

| Param | Giá trị |
|-------|---------|
| voiceGender | male / female → NamMinh / Hoài My |
| region | north / central / south (lưu job; edge VN chưa đủ 3 giọng miền) |
| speed | 0.8 – 1.5 → edge-tts rate |
