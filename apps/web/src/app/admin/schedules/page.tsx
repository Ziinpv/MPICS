"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtWindow(start: number | null | undefined, end: number | null | undefined) {
  if (start == null || end == null) return "Cả ngày";
  return `${pad(Math.floor(start / 60))}:${pad(start % 60)}–${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [name, setName] = useState("Lịch phát demo");
  const [contentId, setContentId] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [mode, setMode] = useState<"oneshot" | "periodic" | "emergency">("oneshot");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [windowStart, setWindowStart] = useState("06:00");
  const [windowEnd, setWindowEnd] = useState("22:00");
  const [useWindow, setUseWindow] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
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

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAnchor);
      d.setDate(weekAnchor.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const day of weekDays) {
      map.set(day.toDateString(), []);
    }
    for (const s of schedules) {
      const start = new Date(s.startAt);
      for (const day of weekDays) {
        if (!sameDay(start, day)) continue;
        map.get(day.toDateString())!.push(s);
      }
      // periodic / multi-day: also show if endAt covers day and start before week end
      if (s.endAt) {
        const end = new Date(s.endAt);
        for (const day of weekDays) {
          if (start <= day && end >= day && !sameDay(start, day)) {
            const list = map.get(day.toDateString())!;
            if (!list.find((x) => x.id === s.id)) list.push(s);
          }
        }
      }
    }
    return map;
  }, [schedules, weekDays]);

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
        emergency: mode === "emergency",
        preempt: mode === "emergency",
        startAt: startAt || undefined,
        windowStart: useWindow ? windowStart : null,
        windowEnd: useWindow ? windowEnd : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(
        mode === "emergency"
          ? "Đã tạo lịch khẩn cấp (preempt)"
          : mode === "periodic"
            ? "Đã tạo lịch định kỳ"
            : "Đã tạo lịch oneshot",
      );
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
          : `Publish OK — ${data.commandsCreated} lệnh play${data.preempted ? ` · preempt ${data.preempted}` : ""}`,
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
        `Jobs: timeout=${data.timeout?.timedOut ?? 0} · periodic=${data.periodic?.length ?? 0} · offlineAlerts=${data.offline?.alertsCreated ?? 0}`,
      );
      load();
    }
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + delta * 7);
    setWeekAnchor(startOfWeek(d));
  }

  return (
    <div>
      <PageHeader
        title="Lịch phát sóng"
        subtitle="Khung giờ trong ngày · khẩn cấp preempt · calendar tuần · jobs timeout/periodic/offline"
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
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "oneshot" | "periodic" | "emergency")}
            >
              <option value="oneshot">Oneshot (1 lần)</option>
              <option value="periodic">Định kỳ</option>
              <option value="emergency">Khẩn cấp (preempt)</option>
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
            <label>Bắt đầu (tuỳ chọn)</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useWindow}
                onChange={(e) => setUseWindow(e.target.checked)}
              />
              Khung giờ trong ngày
            </label>
            {useWindow && (
              <>
                <div>
                  <label>Từ</label>
                  <input
                    type="time"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Đến</label>
                  <input
                    type="time"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
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

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Calendar tuần</h2>
          <div className="flex gap-2">
            <Btn variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => shiftWeek(-1)}>
              ← Tuần trước
            </Btn>
            <Btn
              variant="secondary"
              className="!px-2 !py-1 text-xs"
              onClick={() => setWeekAnchor(startOfWeek(new Date()))}
            >
              Hôm nay
            </Btn>
            <Btn variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => shiftWeek(1)}>
              Tuần sau →
            </Btn>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDays.map((day) => {
            const items = byDay.get(day.toDateString()) || [];
            const isToday = sameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] rounded border p-1.5 ${
                  isToday ? "border-teal-400 bg-teal-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-1 font-medium text-slate-700">
                  {day.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </div>
                <div className="space-y-1">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded px-1 py-0.5 ${
                        s.campaign?.type === "emergency" || s.preempt
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      title={`${s.name} · ${fmtWindow(s.windowStartMin, s.windowEndMin)}`}
                    >
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-[10px] opacity-80">
                        {s.campaign?.type}
                        {s.preempt ? " · preempt" : ""} · {fmtWindow(s.windowStartMin, s.windowEndMin)}
                      </div>
                    </div>
                  ))}
                  {!items.length && <div className="text-slate-300">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Loại</th>
              <th>Khung giờ</th>
              <th>Trạng thái</th>
              <th>Cụm</th>
              <th>Lịch</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">
                  {s.name}
                  {s.preempt ? (
                    <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">
                      preempt
                    </span>
                  ) : null}
                </td>
                <td className="text-xs">
                  {s.campaign?.type || "—"}
                  {s.intervalMinutes ? ` · ${s.intervalMinutes}p` : ""}
                </td>
                <td className="text-xs text-slate-600">{fmtWindow(s.windowStartMin, s.windowEndMin)}</td>
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
                    (s.campaign?.type === "periodic" && s.status !== "cancelled") ||
                    (s.campaign?.type === "emergency" && s.status === "scheduled")) && (
                    <Btn className="!px-2 !py-1 text-xs" onClick={() => publish(s.id)}>
                      Publish
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {!schedules.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
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
