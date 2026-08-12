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

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  const [locationType, setLocationType] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [communes, setCommunes] = useState<any[]>([]);
  const [cmdStatus, setCmdStatus] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [incidentStatus, setIncidentStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [uptimeSummary, setUptimeSummary] = useState<any>(null);
  const [incidentSummary, setIncidentSummary] = useState<any>(null);
  const [broadcastSummary, setBroadcastSummary] = useState<any>(null);
  const [funnelSummary, setFunnelSummary] = useState<any>(null);

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

  async function loadUptime() {
    setMsg("");
    const q = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    const res = await fetch(`/api/reports/device-uptime?${q}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Uptime lỗi");
    else {
      setUptimeSummary(data.summary);
      setMsg(`Uptime: TB ${data.summary?.avgUptimePct}% · ${data.summary?.onlineNow}/${data.summary?.deviceCount} online`);
    }
  }

  async function exportUptime() {
    setMsg("");
    const q = new URLSearchParams({
      format: "csv",
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    try {
      await downloadCsv(`/api/reports/device-uptime?${q}`, `bao-cao-uptime-${Date.now()}.csv`);
      setMsg("Đã tải CSV uptime");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  async function loadIncidents() {
    setMsg("");
    const q = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    if (incidentStatus) q.set("status", incidentStatus);
    const res = await fetch(`/api/reports/incidents?${q}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Incidents lỗi");
    else {
      setIncidentSummary(data.summary);
      setMsg(
        `Sự cố: ${data.summary?.total} · MTTR ${data.summary?.mttrMinutes ?? "—"} phút`,
      );
    }
  }

  async function exportIncidents() {
    setMsg("");
    const q = new URLSearchParams({
      format: "csv",
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    if (incidentStatus) q.set("status", incidentStatus);
    try {
      await downloadCsv(`/api/reports/incidents?${q}`, `bao-cao-su-co-${Date.now()}.csv`);
      setMsg("Đã tải CSV sự cố");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  async function loadBroadcasts() {
    setMsg("");
    const q = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    const res = await fetch(`/api/reports/broadcasts?${q}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Broadcast lỗi");
    else {
      setBroadcastSummary(data.summary);
      setMsg(
        `Phát sóng: ${data.summary?.totalPlays ?? 0} lượt · success ${data.summary?.successRatePct ?? "—"}%`,
      );
    }
  }

  async function exportBroadcasts() {
    setMsg("");
    const q = new URLSearchParams({
      format: "csv",
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    try {
      await downloadCsv(`/api/reports/broadcasts?${q}`, `bao-cao-phat-song-${Date.now()}.csv`);
      setMsg("Đã tải CSV phát sóng");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  async function loadFunnel() {
    setMsg("");
    const q = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    const res = await fetch(`/api/reports/content-funnel?${q}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Funnel lỗi");
    else {
      setFunnelSummary(data.summary);
      setMsg(`Content funnel: ${data.summary?.total ?? 0} bài trong khoảng`);
    }
  }

  async function exportFunnel() {
    setMsg("");
    const q = new URLSearchParams({
      format: "csv",
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    try {
      await downloadCsv(`/api/reports/content-funnel?${q}`, `bao-cao-content-funnel-${Date.now()}.csv`);
      setMsg("Đã tải CSV content funnel");
    } catch (e: any) {
      setMsg(e?.message || "Xuất lỗi");
    }
  }

  return (
    <div>
      <PageHeader
        title="Báo cáo vận hành"
        subtitle="CSV UTF-16 · GIS · lệnh IoT · uptime · sự cố · audit"
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <Card className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label>Từ ngày</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label>Đến ngày</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="text-xs text-slate-500">Áp dụng cho báo cáo uptime & sự cố</p>
      </Card>

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
            Xem live tại{" "}
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

        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">3. Device uptime</h2>
          <p className="text-sm text-slate-500">
            Ước lượng từ cảnh báo offline trong khoảng ngày
          </p>
          {uptimeSummary && (
            <p className="text-sm text-slate-700">
              TB uptime <strong>{uptimeSummary.avgUptimePct}%</strong> · online{" "}
              {uptimeSummary.onlineNow}/{uptimeSummary.deviceCount}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={loadUptime}>
              Xem tóm tắt
            </Btn>
            <Btn onClick={exportUptime}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV uptime
            </Btn>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">4. Sự cố (incidents)</h2>
          <div>
            <label>Trạng thái</label>
            <select value={incidentStatus} onChange={(e) => setIncidentStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {["open", "assigned", "in_progress", "resolved", "closed"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {incidentSummary && (
            <p className="text-sm text-slate-700">
              Tổng <strong>{incidentSummary.total}</strong> · MTTR{" "}
              {incidentSummary.mttrMinutes ?? "—"} phút
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={loadIncidents}>
              Xem tóm tắt
            </Btn>
            <Btn onClick={exportIncidents}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV sự cố
            </Btn>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">5. Phát sóng (play logs)</h2>
          <p className="text-sm text-slate-500">
            Ghi khi device ack lệnh <code className="text-xs">play</code> (sim/MQTT)
          </p>
          {broadcastSummary && (
            <p className="text-sm text-slate-700">
              {broadcastSummary.totalPlays} lượt · OK {broadcastSummary.ok} · lỗi{" "}
              {broadcastSummary.error} · success{" "}
              <strong>{broadcastSummary.successRatePct ?? "—"}%</strong>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={loadBroadcasts}>
              Xem tóm tắt
            </Btn>
            <Btn onClick={exportBroadcasts}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV phát sóng
            </Btn>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">6. Content funnel</h2>
          <p className="text-sm text-slate-500">draft → duyệt → TTS → ready / rejected</p>
          {funnelSummary && (
            <p className="text-xs text-slate-600">
              Tổng {funnelSummary.total} · ready {funnelSummary.byStatus?.ready_to_air ?? 0} ·
              rejected {funnelSummary.byStatus?.rejected ?? 0} · pending{" "}
              {funnelSummary.byStatus?.pending ?? 0}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={loadFunnel}>
              Xem tóm tắt
            </Btn>
            <Btn onClick={exportFunnel}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV funnel
            </Btn>
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">7. Nhật ký hệ thống (Audit)</h2>
          <p className="text-sm text-slate-500">
            Lọc chi tiết tại{" "}
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
