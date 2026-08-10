"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Btn } from "@/components/ui";
import { OPERATION_STATUS_LABELS, LOCATION_TYPE_LABELS } from "@/lib/labels";
import { LocationTypeSelect, TypeBadge } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function UserLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("location_type", type);
    if (status) params.set("operation_status", status);
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/locations?${params}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
  }, [type, status, q]);

  async function exportCsv() {
    setMsg("");
    const params = new URLSearchParams({ format: "csv" });
    if (type) params.set("location_type", type);
    if (status) params.set("operation_status", status);
    try {
      const res = await fetch(`/api/reports/locations?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error || "Xuất lỗi");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dia-diem-xa-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Đã tải CSV (phạm vi xã của bạn)");
    } catch {
      setMsg("Không tải được file");
    }
  }

  return (
    <div>
      <PageHeader
        title="Danh sách địa điểm / tài sản"
        subtitle="Chỉ dữ liệu trong xã của bạn"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={exportCsv}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV
            </Btn>
            <Link href="/user/locations/new">
              <Btn>
                <ActionIcon action="add" size="sm" />
                Thêm mới
              </Btn>
            </Link>
          </div>
        }
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}
      <Card className="mb-4 space-y-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5">
            <ActionIcon action="search" size="sm" />
            Phân loại
          </label>
          <LocationTypeSelect value={type} onChange={setType} allowAll variant="chips" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5">
              <StatusIcon operationStatus={status || "active"} size="sm" />
              Tình trạng
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tìm tên / địa chỉ</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nhập từ khóa…"
            />
          </div>
        </div>
      </Card>
      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Phân loại</th>
              <th>Giấy phép</th>
              <th>Hết hạn</th>
              <th>Tình trạng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-slate-400">
                    {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
                  </div>
                </td>
                <td>
                  <TypeBadge
                    type={l.locationType}
                    label={LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                  />
                  {l.locationSubtype ? (
                    <div className="mt-1 text-xs text-slate-400">{l.locationSubtype}</div>
                  ) : null}
                </td>
                <td>{l.licenseNumber || "—"}</td>
                <td>{l.expiryDate ? new Date(l.expiryDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td>
                  <StatusIcon
                    operationStatus={l.operationStatus}
                    showLabel
                    label={OPERATION_STATUS_LABELS[l.operationStatus]}
                    size="sm"
                  />
                </td>
                <td>
                  <Link
                    href={`/user/locations/${l.id}`}
                    className="inline-flex text-brand-700 hover:text-brand-900"
                    title="Sửa"
                  >
                    <ActionIcon action="edit" size="inline" />
                  </Link>
                </td>
              </tr>
            ))}
            {!locations.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không có địa điểm
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
