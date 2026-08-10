"use client";

import { useEffect, useState } from "react";
import { PageHeader, Stat, Card } from "@/components/ui";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

/** Dashboard IoT / lệnh — tách khỏi overview TTVH */
export default function AdminIotDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard IoT"
        subtitle="Giám sát thiết bị online, lịch phát và lệnh gần đây · HTTP sim hoặc MQTT (P2)"
      />
      <Card className="mb-4 border border-brand-100 bg-brand-50/50 p-3 text-sm text-brand-900">
        <p className="font-medium">MQTT (demo)</p>
        <p className="mt-1 text-brand-800/90">
          Broker :1883 · Bridge: <code className="font-mono text-xs">npm.cmd run mqtt:bridge</code> ·
          Device: <code className="font-mono text-xs">npm.cmd run sim:mqtt</code> · HTTP cũ:{" "}
          <code className="font-mono text-xs">npm.cmd run sim</code>
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Thiết bị online"
          value={stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "…"}
        />
        <Stat label="Địa điểm GIS" value={stats?.locationsCount ?? "…"} />
        <Stat label="Lịch hôm nay" value={stats?.schedulesToday ?? "…"} />
        <Stat label="Sự cố mở" value={stats?.incidentsOpen ?? "…"} accent="danger" />
      </div>

      <Card className="mt-6 overflow-x-auto">
        <div className="mb-4 flex items-center gap-2">
          <ActionIcon action="list" size="header" className="text-brand-700" />
          <h2 className="text-base font-semibold text-slate-900">Lệnh thiết bị gần đây</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Lệnh</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentCommands || []).map((c: any) => (
              <tr key={c.id}>
                <td className="font-medium">{c.device?.name}</td>
                <td className="font-mono text-xs">{c.commandType}</td>
                <td>
                  <StatusIcon
                    status={
                      c.status === "acked" || c.status === "sent"
                        ? "active"
                        : c.status === "failed" || c.status === "timeout"
                          ? "error"
                          : "inactive"
                    }
                    showLabel
                    label={c.status}
                    size="inline"
                  />
                </td>
                <td className="text-slate-500">{new Date(c.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {!stats?.recentCommands?.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Chưa có lệnh — publish lịch hoặc chạy simulator
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
