"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { mediaUrl } from "@/lib/mediaUrl";

export default function UserIncidentsPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [d, i] = await Promise.all([
      fetch("/api/devices").then((r) => r.json()),
      fetch("/api/incidents").then((r) => r.json()),
    ]);
    setDevices(d.devices || []);
    setIncidents(i.incidents || []);
    if (!deviceId && d.devices?.[0]) setDeviceId(d.devices[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || "Upload lỗi");
      else setPhotoKeys((prev) => [...prev, data.storageKey]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, title, description, photoKeys }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Đã gửi báo sự cố");
      setTitle("");
      setDescription("");
      setPhotoKeys([]);
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Báo sự cố thiết bị" subtitle="Kèm ảnh hiện trường (tuỳ chọn)" />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <Card className="mb-6">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label>Thiết bị</label>
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.deviceCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Thiết bị truyền thông mất sóng / bảng hiệu nghiêng…"
            />
          </div>
          <div>
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Ảnh hiện trường</label>
            <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} />
            {photoKeys.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photoKeys.map((k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={k}
                    src={mediaUrl(k)}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                ))}
              </div>
            )}
          </div>
          <Btn type="submit" disabled={uploading}>
            Gửi báo cáo
          </Btn>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Sự cố đã gửi</h2>
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Thiết bị</th>
              <th>Ảnh</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td>{i.device?.name}</td>
                <td className="text-xs">{(i.photoKeys || []).length || 0}</td>
                <td>{i.status}</td>
                <td>{new Date(i.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
