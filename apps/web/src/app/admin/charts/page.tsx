"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import { ResultsPanel } from "@/components/SearchResults";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { DEVICE_TYPE_COLORS } from "@/lib/iconMap";
import { TypeBadge } from "@/components/DeviceTypeSelect";

const MONTHS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

export default function AdminChartsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const months: number[] = stats?.locationsByMonth || Array(12).fill(0);
  const maxMonth = Math.max(1, ...months);
  const byType: { type: string; label: string; count: number }[] = stats?.byType || [];
  const totalType = byType.reduce((s, x) => s + x.count, 0) || 1;

  const donut = useMemo(() => {
    let acc = 0;
    return byType.map((t) => {
      const start = acc;
      const pct = (t.count / totalType) * 100;
      acc += pct;
      return { ...t, start, pct, color: DEVICE_TYPE_COLORS[t.type] || "#64748b" };
    });
  }, [byType, totalType]);

  const gradient = donut.length
    ? `conic-gradient(${donut
        .map((d) => `${d.color} ${d.start}% ${d.start + d.pct}%`)
        .join(", ")})`
    : "#e2e8f0";

  return (
    <div>
      <PageHeader
        title="Biểu đồ"
        subtitle="Báo cáo thống kê tình hình hoạt động và quản lý địa điểm văn hóa"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Số lượng địa điểm thêm mới trong năm
          </h2>
          <div className="flex h-56 items-end gap-1.5 sm:gap-2">
            {months.map((v, i) => (
              <div key={MONTHS[i]} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-brand-600/90 transition"
                  style={{ height: `${Math.max(4, (v / maxMonth) * 100)}%` }}
                  title={`${MONTHS[i]}: ${v}`}
                />
                <span className="text-[10px] text-slate-500">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Tỷ lệ theo phân loại</h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div
              className="h-40 w-40 shrink-0 rounded-full"
              style={{
                background: gradient,
                mask: "radial-gradient(circle, transparent 48%, #000 50%)",
                WebkitMask: "radial-gradient(circle, transparent 48%, #000 50%)",
              }}
            />
            <ul className="w-full space-y-2 text-sm">
              {donut.map((d) => (
                <li key={d.type} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: d.color }}
                    />
                    {d.label}
                  </span>
                  <span className="font-medium text-slate-700">
                    {d.count} ({Math.round(d.pct)}%)
                  </span>
                </li>
              ))}
              {!donut.length && <li className="text-slate-400">Chưa có dữ liệu</li>}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <ResultsPanel
          title="Danh sách địa điểm mới nhất"
          count={stats?.recentLocations?.length || 0}
          empty={!stats?.recentLocations?.length}
        >
          <table>
            <thead>
              <tr>
                <th>Tên địa điểm</th>
                <th>Phường/Xã</th>
                <th>Phân loại</th>
                <th>Ngày thêm</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentLocations || []).map((l: any) => (
                <tr key={l.id}>
                  <td className="font-medium text-brand-800">{l.name}</td>
                  <td>{l.orgName}</td>
                  <td>
                    <TypeBadge
                      type={l.locationType}
                      label={LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                    />
                  </td>
                  <td>{new Date(l.createdAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultsPanel>
      </div>
    </div>
  );
}
