"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { CONTENT_STATUS_LABELS } from "@/lib/labels";
import { mediaUrl } from "@/lib/mediaUrl";

export default function AdminContentsPage() {
  const [contents, setContents] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [bodyPlain, setBodyPlain] = useState("");
  const [msg, setMsg] = useState("");

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
    setMsg("Đã tạo nháp");
    load();
  }

  async function moderate(id: string, action: string) {
    setMsg(action === "approve" ? "Đang duyệt + TTS…" : "");
    const res = await fetch(`/api/contents/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(data.message || (action === "approve" ? "OK" : "Đã từ chối"));
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Nội dung phát thanh"
        subtitle="Duyệt → edge-tts (hoặc mock) → MP3 MinIO/local → ready_to_air"
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
            <label>Nội dung (text → TTS khi duyệt)</label>
            <textarea rows={4} value={bodyPlain} onChange={(e) => setBodyPlain(e.target.value)} required />
          </div>
          <Btn type="submit">Lưu nháp</Btn>
        </form>
      </Card>

      <Card>
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Audio</th>
              <th>Tác giả</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contents.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{CONTENT_STATUS_LABELS[c.status] || c.status}</td>
                <td className="text-xs">
                  {c.mediaAsset?.storageKey ? (
                    <a
                      className="text-teal-700 underline"
                      href={mediaUrl(c.mediaAsset.storageKey)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Nghe thử
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{c.author?.fullName}</td>
                <td className="space-x-2">
                  {(c.status === "draft" || c.status === "pending" || c.status === "approved") && (
                    <>
                      <Btn onClick={() => moderate(c.id, "approve")}>Duyệt + TTS</Btn>
                      <Btn variant="danger" onClick={() => moderate(c.id, "reject")}>
                        Từ chối
                      </Btn>
                    </>
                  )}
                  {(c.status === "approved" || c.status === "tts_processing") && (
                    <Btn variant="secondary" onClick={() => moderate(c.id, "retry_tts")}>
                      Retry TTS
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
