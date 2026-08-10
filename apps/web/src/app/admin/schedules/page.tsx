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
  const [mode, setMode] = useState<"oneshot" | "periodic">("oneshot");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
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
      body: JSON.stringify({
        name,
        contentId,
        clusterId,
        intervalMinutes: mode === "periodic" ? intervalMinutes : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(mode === "periodic" ? "Đã tạo lịch định kỳ" : "Đã tạo lịch oneshot");
      load();
    }
  }

  async function publish(id: string) {
    const res = await fetch(`/api/schedules/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(
        data.isPeriodic
          ? `Publish OK — ${data.commandsCreated} lệnh · lần tới ${data.nextRunAt ? new Date(data.nextRunAt).toLocaleString("vi-VN") : "—"}`
          : `Publish OK — tạo ${data.commandsCreated} lệnh play (chờ simulator ack)`,
      );
      load();
    }
  }

  async function runJobs() {
        const res = await fetch("/api/cron/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Cron lỗi (cần đăng nhập admin)");
    else {
      setMsg(
        `Jobs: timeout=${data.timeout?.timedOut ?? 0} · periodic=${data.periodic?.length ?? 0}`,
      );
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Lịch phát sóng"
        subtitle="Oneshot hoặc định kỳ (phút) · Jobs: timeout lệnh + chạy lịch đến hạn"
        actions={
          <Btn variant="secondary" onClick={runJobs}>
            Chạy jobs ngay
          </Btn>
        }
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Tạo lịch</h2>
        <form onSubmit={createSchedule} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label>Tên lịch</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label>Loại</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as "oneshot" | "periodic")}>
              <option value="oneshot">Oneshot (1 lần)</option>
              <option value="periodic">Định kỳ</option>
            </select>
          </div>
          {mode === "periodic" && (
            <div>
              <label>Chu kỳ (phút)</label>
              <input
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                required
              />
            </div>
          )}
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
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Cụm</th>
              <th>Lịch</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-xs">
                  {s.campaign?.type || "—"}
                  {s.intervalMinutes ? ` · ${s.intervalMinutes}p` : ""}
                </td>
                <td>{s.status}</td>
                <td className="text-sm text-slate-600">
                  {(s.targets || [])
                    .filter((t: any) => t.include)
                    .map((t: any) => t.cluster?.name)
                    .join(", ") || "—"}
                </td>
                <td className="text-xs text-slate-500">
                  {s.nextRunAt
                    ? `next ${new Date(s.nextRunAt).toLocaleString("vi-VN")}`
                    : new Date(s.startAt).toLocaleString("vi-VN")}
                </td>
                <td>
                  {(s.status === "scheduled" ||
                    (s.campaign?.type === "periodic" && s.status !== "cancelled")) && (
                    <Btn className="!px-2 !py-1 text-xs" onClick={() => publish(s.id)}>
                      Publish
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {!schedules.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Chưa có lịch
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
