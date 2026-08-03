"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [name, setName] = useState("Lịch phát demo");
  const [contentId, setContentId] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [s, c, m] = await Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/meta").then((r) => r.json()),
    ]);
    setSchedules(s.schedules || []);
    const ready = (c.contents || []).filter((x: any) => x.status === "ready_to_air");
    setContents(ready);
    setClusters(m.clusters || []);
    if (!contentId && ready[0]) setContentId(ready[0].id);
    if (!clusterId && m.clusters?.[0]) setClusterId(m.clusters[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contentId, clusterId }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Đã tạo lịch");
      load();
    }
  }

  async function publish(id: string) {
    const res = await fetch(`/api/schedules/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`Publish OK — tạo ${data.commandsCreated} lệnh play (chờ simulator ack)`);
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Lịch phát sóng" />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Tạo lịch oneshot</h2>
        <form onSubmit={createSchedule} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label>Tên lịch</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label>Bài ready_to_air</label>
            <select value={contentId} onChange={(e) => setContentId(e.target.value)} required>
              <option value="">— chọn —</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Cụm đích</label>
            <select value={clusterId} onChange={(e) => setClusterId(e.target.value)} required>
              <option value="">— chọn —</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.org?.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Btn type="submit">Tạo lịch</Btn>
          </div>
        </form>
      </Card>

      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Cụm</th>
              <th>Bắt đầu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.status}</td>
                <td>{s.targets?.map((t: any) => t.cluster?.name).join(", ")}</td>
                <td>{new Date(s.startAt).toLocaleString("vi-VN")}</td>
                <td>
                  {s.status === "scheduled" && <Btn onClick={() => publish(s.id)}>Publish</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
