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
    window.location.href = `/api/reports/locations?${q}`;
    setMsg("Đang tải file CSV…");
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
            File CSV UTF-8, cột tách bằng dấu <strong>;</strong> (chuẩn Excel Việt Nam). Mở trực tiếp bằng
            Excel — không cần Text Import.
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
