"use client";

import { useEffect, useState } from "react";
import { PageHeader, Stat, Card } from "@/components/ui";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Thiết bị online" value={stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "…"} />
        <Stat label="Địa điểm GIS" value={stats?.locationsCount ?? "…"} />
        <Stat label="Lịch hôm nay" value={stats?.schedulesToday ?? "…"} />
        <Stat label="Sự cố mở" value={stats?.incidentsOpen ?? "…"} />
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-medium">Lệnh thiết bị gần đây</h2>
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
                <td>{c.device?.name}</td>
                <td>{c.commandType}</td>
                <td>{c.status}</td>
                <td>{new Date(c.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {!stats?.recentCommands?.length && (
              <tr>
                <td colSpan={4} className="text-slate-400">
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
