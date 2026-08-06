"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";

export default function UserIncidentsPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, title, description }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Đã gửi báo sự cố");
      setTitle("");
      setDescription("");
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Báo sự cố thiết bị" />
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
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Thiết bị truyền thông mất sóng / bảng hiệu nghiêng…" />
          </div>
          <div>
            <label>Mô tả</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <Btn type="submit">Gửi báo cáo</Btn>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Sự cố đã gửi</h2>
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Thiết bị</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td>{i.device?.name}</td>
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
