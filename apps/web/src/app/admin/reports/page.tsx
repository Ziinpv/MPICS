"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { ActionIcon } from "@/components/ActionIcon";
import { OPERATION_STATUS_LABELS } from "@/lib/labels";

export default function AdminReportsPage() {
  const [locationType, setLocationType] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [communes, setCommunes] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setCommunes((d.orgs || []).filter((o: any) => o.type === "commune")));
  }, []);

  function exportCsv() {
    setMsg("");
    const q = new URLSearchParams({ format: "csv" });
    if (locationType) q.set("location_type", locationType);
    if (status) q.set("operation_status", status);
    if (orgId) q.set("org_id", orgId);
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
        setMsg("Đã tải CSV (phạm vi orgPath Admin · UTF-16 Tab)");
      } catch {
        setMsg("Không tải được file");
      }
    })();
  }

  return (
    <div>
      <PageHeader
        title="Xuất báo cáo địa điểm"
        subtitle="CSV theo subtree Admin (có thể thu hẹp 1 xã)"
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <Card className="max-w-xl space-y-4">
        <div>
          <label>Xã / phường (tuỳ chọn)</label>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">Toàn phạm vi Admin</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Lọc theo phân loại (tuỳ chọn)</label>
          <LocationTypeSelect value={locationType} onChange={setLocationType} allowAll />
        </div>
        <div>
          <label>Tình trạng (tuỳ chọn)</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Cột export</p>
          <p className="mt-1">
            STT, Tên, Địa chỉ, Phường/Xã, Phân loại, Chi tiết loại, Trạng thái, Giấy phép, Ngày tạo,
            Người tạo, Số ảnh, Lat, Lng
          </p>
          <p className="mt-2 text-xs text-slate-400">
            File CSV <strong>UTF-16</strong> + <strong>Tab</strong> — Excel/WPS mở đúng tiếng Việt và cột.
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
