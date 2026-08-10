"use client";

import { useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { ActionIcon } from "@/components/ActionIcon";

export default function AdminReportsPage() {
  const [locationType, setLocationType] = useState("");
  const [msg, setMsg] = useState("");

  function exportCsv() {
    setMsg("");
    const q = new URLSearchParams({ format: "csv" });
    if (locationType) q.set("location_type", locationType);
    // Blob download giữ nguyên encoding (tránh một số trình duyệt làm hỏng BOM)
    void (async () => {
      try {
        const res = await fetch(`/api/reports/locations?${q}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMsg(data.error || "Xuất lỗi");
          return;
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = /filename="([^"]+)"/.exec(cd);
        const name = match?.[1] || `bao-cao-dia-diem-${Date.now()}.csv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMsg("Đã tải CSV (UTF-16 — mở bằng Excel)");
      } catch {
        setMsg("Không tải được file");
      }
    })();
  }

  return (
    <div>
      <PageHeader
        title="Xuất báo cáo địa điểm"
        subtitle="Export CSV danh sách địa điểm GIS theo phạm vi Admin"
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <Card className="max-w-xl space-y-4">
        <div>
          <label>Lọc theo phân loại (tuỳ chọn)</label>
          <LocationTypeSelect value={locationType} onChange={setLocationType} allowAll />
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Cột export</p>
          <p className="mt-1">
            STT, Tên, Địa chỉ, Phường/Xã, Phân loại, Chi tiết loại, Trạng thái, Giấy phép, Ngày tạo,
            Người tạo, Số ảnh, Lat, Lng
          </p>
          <p className="mt-2 text-xs text-slate-400">
            File CSV <strong>UTF-16</strong>, cột tách bằng <strong>Tab</strong> — Excel/WPS mở ra đúng
            tiếng Việt và tách cột (không cần Data → Text to Columns).
          </p>
        </div>
        <Btn onClick={exportCsv}>
          <ActionIcon action="download" size="sm" />
          Xuất CSV
        </Btn>
      </Card>
    </div>
  );
}
