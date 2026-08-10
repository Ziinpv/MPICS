"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Stat, Card, Btn } from "@/components/ui";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

const STATUS_FILTERS = ["", "pending", "sent", "acked", "timeout", "failed"] as const;

function statusKind(status: string) {
  if (status === "acked") return "active" as const;
  if (status === "sent" || status === "pending") return "inactive" as const;
  return "error" as const;
}

/** Dashboard IoT / lệnh — timeout · acked · jobs */
export default function AdminIotDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => {
        setMsg("Không tải được stats");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const list = stats?.recentCommands || [];
    if (!status) return list;
    return list.filter((c: any) => c.status === status);
  }, [stats, status]);

  const counts = stats?.commandCounts || {};

  async function runJobs() {
    setMsg("Đang chạy jobs (timeout + periodic)…");
    const res = await fetch("/api/cron/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Jobs lỗi");
      return;
    }
    setMsg(
      `Jobs OK · timeout=${data.timeout?.timedOut ?? 0} · periodic=${data.periodic?.length ?? 0} · offlineAlerts=${data.offline?.alertsCreated ?? 0}`,
    );
    load();
  }

  async function alertAction(id: string, action: "ack" | "resolve") {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Alert lỗi");
      return;
    }
    setMsg(action === "ack" ? "Đã ack cảnh báo" : "Đã đóng cảnh báo");
    load();
  }

  async function exportCommands() {
    const q = new URLSearchParams({ format: "csv" });
    if (status) q.set("status", status);
    const res = await fetch(`/api/reports/commands?${q}`);
    if (!res.ok) {
      setMsg("Xuất lệnh lỗi");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lenh-iot-${status || "all"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Đã tải CSV lệnh IoT");
  }

  return (
    <div>
      <PageHeader
        title="Dashboard IoT"
        subtitle="Online / offline SLA · cảnh báo · lệnh pending/sent/acked/timeout · jobs"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={load} disabled={loading}>
              Làm mới
            </Btn>
            <Btn variant="secondary" onClick={runJobs}>
              Chạy jobs
            </Btn>
            <Btn variant="secondary" onClick={exportCommands}>
              <ActionIcon action="download" size="sm" />
              Xuất lệnh
            </Btn>
            <Link href="/admin/devices">
              <Btn>Thiết bị</Btn>
            </Link>
          </div>
        }
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <Card className="mb-4 border border-brand-100 bg-brand-50/50 p-3 text-sm text-brand-900">
        <p className="font-medium">MQTT / simulator</p>
        <p className="mt-1 text-brand-800/90">
          <code className="font-mono text-xs">npm.cmd run mqtt:bridge</code> ·{" "}
          <code className="font-mono text-xs">npm.cmd run sim:mqtt</code> · HTTP:{" "}
          <code className="font-mono text-xs">npm.cmd run sim</code>
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Thiết bị online"
          value={stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "…"}
        />
        <Stat
          label="Cảnh báo mở"
          value={stats?.alertsOpen ?? "…"}
          accent="danger"
        />
        <Stat label="Timeout (tổng)" value={counts.timeout ?? "…"} accent="danger" />
        <Stat
          label="Pending + Sent"
          value={stats ? (counts.pending || 0) + (counts.sent || 0) : "…"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Acked (tổng)" value={counts.acked ?? "…"} />
        <Stat label="Lệnh hôm nay" value={stats?.commandsToday ?? "…"} />
        <Stat label="Lịch hôm nay" value={stats?.schedulesToday ?? "…"} />
        <Stat label="Sự cố mở" value={stats?.incidentsOpen ?? "…"} accent="danger" />
      </div>

      <Card className="mt-6 overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cảnh báo thiết bị</h2>
            <p className="text-xs text-slate-500">
              Offline &gt; {stats?.offlineMinutes ?? 15} phút → tạo alert (SLA online)
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Loại</th>
              <th>Mức</th>
              <th>Trạng thái</th>
              <th>Nội dung</th>
              <th>Tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentAlerts || []).map((a: any) => (
              <tr key={a.id}>
                <td className="font-medium">
                  {a.device?.name}
                  <div className="font-mono text-[10px] text-slate-400">{a.device?.deviceCode}</div>
                </td>
                <td className="text-xs">{a.type}</td>
                <td className="text-xs">{a.severity}</td>
                <td>
                  <StatusIcon
                    status={a.status === "open" ? "error" : a.status === "acked" ? "inactive" : "active"}
                    showLabel
                    label={a.status}
                    size="inline"
                  />
                </td>
                <td className="max-w-xs text-xs text-slate-600">{a.message}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="whitespace-nowrap space-x-1">
                  {a.status === "open" && (
                    <Btn
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => alertAction(a.id, "ack")}
                    >
                      Ack
                    </Btn>
                  )}
                  {a.status !== "resolved" && (
                    <Btn className="!px-2 !py-1 text-xs" onClick={() => alertAction(a.id, "resolve")}>
                      Đóng
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {!stats?.recentAlerts?.length && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Không có cảnh báo mở — chạy jobs để quét offline
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ActionIcon action="list" size="header" className="text-brand-700" />
            <h2 className="text-base font-semibold text-slate-900">Lệnh thiết bị gần đây</h2>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  status === s
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s || "Tất cả"}
                {s && counts[s] != null ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Mã</th>
              <th>Lệnh</th>
              <th>Trạng thái</th>
              <th>Tạo</th>
              <th>Sent / Ack</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id}>
                <td className="font-medium">
                  {c.device?.name}
                  {c.device?.online ? (
                    <span className="ml-1 text-[10px] text-teal-600">●</span>
                  ) : null}
                </td>
                <td className="font-mono text-xs">{c.device?.deviceCode}</td>
                <td className="font-mono text-xs">{c.commandType}</td>
                <td>
                  <StatusIcon
                    status={statusKind(c.status)}
                    showLabel
                    label={c.status}
                    size="inline"
                  />
                </td>
                <td className="whitespace-nowrap text-slate-500">
                  {new Date(c.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="text-xs text-slate-500">
                  {c.sentAt ? new Date(c.sentAt).toLocaleTimeString("vi-VN") : "—"}
                  {" / "}
                  {c.ackedAt ? new Date(c.ackedAt).toLocaleTimeString("vi-VN") : "—"}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không có lệnh — publish lịch hoặc chạy simulator
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
