"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { CONTENT_STATUS_LABELS } from "@/lib/labels";
import { mediaPreviewUrl } from "@/lib/mediaUrl";

const VOICES = [
  { value: "vi-VN-HoaiMyNeural", label: "Nữ — Hoài My" },
  { value: "vi-VN-NamMinhNeural", label: "Nam — Nam Minh" },
];

export default function AdminContentsPage() {
  const [contents, setContents] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [bodyPlain, setBodyPlain] = useState("");
  const [voice, setVoice] = useState(VOICES[0].value);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [region, setRegion] = useState<"north" | "central" | "south">("north");
  const [speed, setSpeed] = useState(1);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/contents");
    const data = await res.json();
    setContents(data.contents || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createContent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, bodyPlain, category: "admin_notice" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error);
      return;
    }
    setTitle("");
    setBodyPlain("");
    setMsg("Đã tạo nháp — gửi duyệt trước khi TTS");
    load();
  }

  async function moderate(id: string, action: string, extra?: Record<string, unknown>) {
    setBusyId(id);
    const labels: Record<string, string> = {
      submit: "Đang gửi duyệt…",
      approve: "Đang duyệt nội dung…",
      reject: "Đang từ chối…",
      run_tts: "Đang chạy TTS…",
      retry_tts: "Đang retry TTS…",
    };
    setMsg(labels[action] || "");
    try {
      const res = await fetch(`/api/contents/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          voice,
          voiceGender,
          region,
          speed,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error);
      else {
        setMsg(data.message || "OK");
        if (data.content?.mediaAsset?.storageKey) setPreviewId(id);
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function rejectWithReason(id: string) {
    const reason = window.prompt("Lý do từ chối (bắt buộc):");
    if (reason == null) return;
    if (!reason.trim()) {
      setMsg("Cần lý do từ chối");
      return;
    }
    await moderate(id, "reject", { reason: reason.trim() });
  }

  function canSubmit(status: string) {
    return status === "draft" || status === "rejected";
  }

  function canApprove(status: string) {
    return status === "draft" || status === "pending";
  }

  function canRunTts(status: string) {
    return status === "approved" || status === "tts_processing";
  }

  function canRetry(c: any) {
    const st = c.status;
    const last = c.ttsJobs?.[0];
    if (st === "ready_to_air" || st === "tts_processing" || st === "approved") return true;
    if (last?.status === "failed") return true;
    return false;
  }

  return (
    <div>
      <PageHeader
        title="Nội dung phát thanh"
        subtitle="Nháp → chờ duyệt → duyệt → TTS → nghe thử · Ghi người duyệt + lý do từ chối"
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Tạo bài mới (Admin)</h2>
        <form onSubmit={createContent} className="space-y-3">
          <div>
            <label>Tiêu đề</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label>Nội dung (text → TTS sau khi duyệt)</label>
            <textarea
              rows={4}
              value={bodyPlain}
              onChange={(e) => setBodyPlain(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label>Giọng TTS (edge)</label>
              <select
                value={voice}
                onChange={(e) => {
                  setVoice(e.target.value);
                  setVoiceGender(e.target.value.includes("NamMinh") ? "male" : "female");
                }}
              >
                {VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Giới tính (map giọng)</label>
              <select
                value={voiceGender}
                onChange={(e) => {
                  const g = e.target.value as "female" | "male";
                  setVoiceGender(g);
                  setVoice(g === "male" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural");
                }}
              >
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
              </select>
            </div>
            <div>
              <label>Vùng miền</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as "north" | "central" | "south")}
              >
                <option value="north">Bắc</option>
                <option value="central">Trung</option>
                <option value="south">Nam</option>
              </select>
            </div>
            <div>
              <label>Tốc độ ({speed.toFixed(1)}×)</label>
              <input
                type="range"
                min={0.8}
                max={1.5}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>
          </div>
          <Btn type="submit">Lưu nháp</Btn>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Duyệt / từ chối</th>
              <th>Nghe thử</th>
              <th>TTS job</th>
              <th>Tác giả</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contents.map((c) => {
              const lastJob = c.ttsJobs?.[0];
              const audioSrc = mediaPreviewUrl(c.mediaAsset?.storageKey);
              const showPlayer = Boolean(audioSrc) && (previewId === c.id || c.status === "ready_to_air");
              return (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.title}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-xs text-xs text-slate-500">
                      {c.bodyPlain}
                    </div>
                  </td>
                  <td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                      {CONTENT_STATUS_LABELS[c.status] || c.status}
                    </span>
                    {c.mediaAsset?.durationSec ? (
                      <div className="mt-1 text-[10px] text-slate-400">
                        ~{c.mediaAsset.durationSec}s · {c.mediaAsset.mimeType || "audio"}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[200px] text-xs text-slate-600">
                    {c.reviewedBy?.fullName ? (
                      <div>
                        <div>{c.reviewedBy.fullName}</div>
                        {c.reviewedAt ? (
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.reviewedAt).toLocaleString("vi-VN")}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {c.rejectionReason ? (
                      <div className="mt-1 text-rose-600" title={c.rejectionReason}>
                        Từ chối: {c.rejectionReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="min-w-[200px]">
                    {audioSrc ? (
                      <div className="space-y-1">
                        {showPlayer ? (
                          <audio
                            controls
                            preload="metadata"
                            className="h-8 w-full max-w-[220px]"
                            src={audioSrc}
                          >
                            Trình duyệt không hỗ trợ audio
                          </audio>
                        ) : (
                          <Btn
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => setPreviewId(c.id)}
                          >
                            Nghe thử
                          </Btn>
                        )}
                        <a
                          className="block text-[10px] text-teal-700 underline"
                          href={audioSrc}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở file
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa có MP3</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-600">
                    {lastJob ? (
                      <div>
                        <div>
                          {lastJob.status}
                          {lastJob.driver ? ` · ${lastJob.driver}` : ""}
                        </div>
                        <div className="text-[10px] text-slate-400">{lastJob.voice}</div>
                        {lastJob.error ? (
                          <div className="mt-0.5 max-w-[180px] truncate text-rose-600" title={lastJob.error}>
                            {lastJob.error}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{c.author?.fullName}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {canSubmit(c.status) && (
                      <Btn
                        variant="secondary"
                        disabled={busyId === c.id}
                        onClick={() => moderate(c.id, "submit")}
                      >
                        Gửi duyệt
                      </Btn>
                    )}
                    {canApprove(c.status) && (
                      <>
                        <Btn disabled={busyId === c.id} onClick={() => moderate(c.id, "approve")}>
                          {busyId === c.id ? "…" : "Duyệt"}
                        </Btn>
                        <Btn
                          variant="danger"
                          disabled={busyId === c.id}
                          onClick={() => rejectWithReason(c.id)}
                        >
                          Từ chối
                        </Btn>
                      </>
                    )}
                    {canRunTts(c.status) && (
                      <Btn
                        disabled={busyId === c.id}
                        onClick={() => moderate(c.id, "run_tts")}
                      >
                        {busyId === c.id ? "…" : "Chạy TTS"}
                      </Btn>
                    )}
                    {canRetry(c) && c.status === "ready_to_air" && (
                      <Btn
                        variant="secondary"
                        disabled={busyId === c.id}
                        onClick={() => moderate(c.id, "retry_tts")}
                      >
                        {busyId === c.id ? "…" : "Retry TTS"}
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
            {!contents.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Chưa có nội dung
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
