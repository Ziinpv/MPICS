# TTS / media pipeline (edge-tts)

## Luồng

1. Admin **Duyệt + TTS** → `TtsJob` + content `tts_processing`
2. Worker/`processTtsJob`: edge-tts → MP3 → `putMediaObject` (MinIO/local)
3. `MediaAsset` (checksum SHA-256 + HMAC signature) → content `ready_to_air`

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

- `POST /api/contents/:id/moderate` `{ "action": "approve" | "reject" | "retry_tts" }`
