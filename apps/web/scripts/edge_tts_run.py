# Edge TTS helper — tránh lỗi CLI/encoding trên Windows
# Usage: python edge_tts_run.py <text_file> <voice> <out.mp3>
import asyncio
import sys
from pathlib import Path

import edge_tts


async def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit("usage: edge_tts_run.py <text_file> <voice> <out.mp3>")
    text_path = Path(sys.argv[1])
    voice = sys.argv[2]
    out = Path(sys.argv[3])
    text = text_path.read_text(encoding="utf-8").strip()
    if not text:
        raise SystemExit("empty text")
    await edge_tts.Communicate(text, voice).save(str(out))
    if not out.exists() or out.stat().st_size < 100:
        raise SystemExit("no audio written")


if __name__ == "__main__":
    asyncio.run(main())
