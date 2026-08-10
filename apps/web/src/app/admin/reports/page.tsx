"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Btn } from "@/components/ui";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { ActionIcon } from "@/components/ActionIcon";
import { OPERATION_STATUS_LABELS } from "@/lib/labels";

async function downloadCsv(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Xuất lỗi");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(cd);
  const name = match?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function AdminReportsPage() {
  const [locationType, setLocationType] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [communes, setCommunes] = useState<any[]>([]);
  const [cmdStatus, setCmdStatus] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setCommunes((d.orgs || []).filter((o: any) => o.type === "commune")));
  }, []);

  async function exportLocations() {
    setMsg("");
    const q = new URLSearchParams({ format: "csv" });
    if (locationType) q.set("location_type", locationType);
    if (status) q.set("operation_status", status);
    if (orgId) q.set("org_id", orgId);
    try {
      await downloadCsv(`/api/reports/locations?${q}`, `bao-cao-dia-diem-${Date.now()}.csv`);
      setMsg("Đã tải CSV địa điểm GIS");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  async function exportCommands() {
    setMsg("");
    const q = new URLSearchParams({ format: "csv" });
    if (cmdStatus) q.set("status", cmdStatus);
    try {
      await downloadCsv(`/api/reports/commands?${q}`, `bao-cao-lenh-iot-${Date.now()}.csv`);
      setMsg("Đã tải CSV lệnh IoT");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  async function exportAudit() {
    setMsg("");
    try {
      await downloadCsv(`/api/audit?format=csv&limit=2000`, `audit-${Date.now()}.csv`);
      setMsg("Đã tải CSV nhật ký");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  return (
    <div>
      <PageHeader
        title="Báo cáo vận hành"
        subtitle="Xuất CSV UTF-16 (Tab) — GIS · lệnh IoT · audit · phạm vi orgPath Admin"
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">1. Địa điểm GIS</h2>
          <div>
            <label>Xã / phường</label>
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
            <label>Phân loại</label>
            <LocationTypeSelect value={locationType} onChange={setLocationType} allowAll />
          </div>
          <div>
            <label>Tình trạng</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Btn onClick={exportLocations}>
            <ActionIcon action="download" size="sm" />
            Xuất CSV địa điểm
          </Btn>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">2. Lệnh IoT</h2>
          <p className="text-sm text-slate-500">
            pending / sent / acked / timeout / failed — xem live tại{" "}
            <Link href="/admin/iot" className="text-teal-700 underline">
              Dashboard IoT
            </Link>
          </p>
          <div>
            <label>Trạng thái lệnh</label>
            <select value={cmdStatus} onChange={(e) => setCmdStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {["pending", "sent", "acked", "timeout", "failed"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Btn onClick={exportCommands}>
            <ActionIcon action="download" size="sm" />
            Xuất CSV lệnh
          </Btn>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">3. Nhật ký hệ thống (Audit)</h2>
          <p className="text-sm text-slate-500">
            Xuất tối đa 2000 sự kiện gần nhất. Lọc chi tiết tại{" "}
            <Link href="/admin/audit" className="text-teal-700 underline">
              Nhật ký hệ thống
            </Link>
            .
          </p>
          <Btn onClick={exportAudit}>
            <ActionIcon action="download" size="sm" />
            Xuất CSV audit
          </Btn>
          <p className="text-xs text-slate-400">
            File UTF-16 + Tab — mở Excel/WPS đúng tiếng Việt và cột.
          </p>
        </Card>
      </div>
    </div>
  );
}
