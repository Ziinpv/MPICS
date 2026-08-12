"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { DEVICE_TYPE_LABELS } from "@/lib/labels";
import { DeviceTypeSelect, TypeBadge } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [type, setType] = useState("");
  const [msg, setMsg] = useState("");

  const [devCode, setDevCode] = useState("");
  const [devName, setDevName] = useState("");
  const [devType, setDevType] = useState("communication_device");
  const [devOrgId, setDevOrgId] = useState("");
  const [devClusterId, setDevClusterId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [clCode, setClCode] = useState("");
  const [clName, setClName] = useState("");
  const [clOrgId, setClOrgId] = useState("");
  const [clCmdType, setClCmdType] = useState("reboot");
  const [clCmdId, setClCmdId] = useState("");

  async function load() {
    const q = new URLSearchParams();
    if (type) q.set("device_type", type);
    const [d, c, m] = await Promise.all([
      fetch(`/api/devices?${q}`).then((r) => r.json()),
      fetch("/api/clusters").then((r) => r.json()),
      fetch("/api/meta").then((r) => r.json()),
    ]);
    setDevices(d.devices || []);
    setClusters(c.clusters || []);
    const communes = (m.orgs || []).filter((o: any) => o.type === "commune");
    setOrgs(communes.length ? communes : m.orgs || []);
    if (!devOrgId && (communes[0] || m.orgs?.[0])) {
      setDevOrgId((communes[0] || m.orgs[0]).id);
    }
    if (!clOrgId && (communes[0] || m.orgs?.[0])) {
      setClOrgId((communes[0] || m.orgs[0]).id);
    }
    if (!clCmdId && c.clusters?.[0]) setClCmdId(c.clusters[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function sendCommand(id: string, commandType: string, payload?: object) {
    setMsg("");
    const res = await fetch(`/api/devices/${id}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandType, payload }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Lỗi");
    else setMsg(`Đã tạo lệnh ${commandType} (${data.command.status})`);
  }

  async function rotateMqtt(id: string, code: string) {
    setMsg("");
    const res = await fetch(`/api/devices/${id}/mqtt-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Lỗi");
    else {
      setMsg(
        `MQTT ${code}: user=${data.mqttUsername} pass=${data.mqttPassword} — chạy gen-mqtt-passwd rồi restart broker`,
      );
    }
  }

  async function saveDevice(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (editId) {
      const res = await fetch(`/api/devices/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: devName,
          type: devType,
          clusterId: devClusterId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || "Sửa lỗi");
      else {
        setMsg("Đã cập nhật thiết bị");
        setEditId(null);
        setDevCode("");
        setDevName("");
        load();
      }
      return;
    }
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceCode: devCode,
        name: devName,
        type: devType,
        orgId: devOrgId,
        clusterId: devClusterId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Tạo lỗi");
    else {
      setMsg("Đã tạo thiết bị");
      setDevCode("");
      setDevName("");
      load();
    }
  }

  function startEdit(d: any) {
    setEditId(d.id);
    setDevCode(d.deviceCode);
    setDevName(d.name);
    setDevType(d.type);
    setDevOrgId(d.orgId);
    setDevClusterId(d.clusterId || "");
  }

  async function setDeviceStatus(id: string, status: string) {
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Lỗi");
    else {
      setMsg(`Đã đặt status=${status}`);
      load();
    }
  }

  async function createCluster(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: clCode, name: clName, orgId: clOrgId }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Tạo cụm lỗi");
    else {
      setMsg("Đã tạo cụm");
      setClCode("");
      setClName("");
      load();
    }
  }

  async function deactivateCluster(id: string) {
    const res = await fetch(`/api/clusters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Xóa cụm lỗi");
    else {
      setMsg(data.softDeleted ? "Đã vô hiệu hóa cụm (còn device)" : "Đã xóa cụm");
      load();
    }
  }

  async function clusterCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!clCmdId) return;
    const payload = clCmdType === "set_volume" ? { volume: 50 } : {};
    const res = await fetch(`/api/clusters/${clCmdId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandType: clCmdType, payload }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Lệnh cụm lỗi");
    else setMsg(`Lệnh cụm ${clCmdType}: ${data.commandsCreated} thiết bị`);
  }

  return (
    <div>
      <PageHeader
        title="Thiết bị IoT"
        subtitle="CRUD thiết bị/cụm · lệnh đơn · fan-out theo cụm · MQTT credential"
      />
      {msg && <p className="mb-3 break-all text-sm text-teal-700">{msg}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">{editId ? "Sửa thiết bị" : "Tạo thiết bị"}</h2>
          <form onSubmit={saveDevice} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label>Mã (deviceCode)</label>
              <input
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
                required={!editId}
                disabled={Boolean(editId)}
                placeholder="COM-XA1-99"
              />
            </div>
            <div>
              <label>Tên</label>
              <input value={devName} onChange={(e) => setDevName(e.target.value)} required />
            </div>
            <div>
              <label>Loại</label>
              <select value={devType} onChange={(e) => setDevType(e.target.value)}>
                {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Xã / Org</label>
              <select
                value={devOrgId}
                onChange={(e) => setDevOrgId(e.target.value)}
                disabled={Boolean(editId)}
                required={!editId}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label>Cụm</label>
              <select value={devClusterId} onChange={(e) => setDevClusterId(e.target.value)}>
                <option value="">— không —</option>
                {clusters
                  .filter((c) => c.status !== "inactive")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Btn type="submit">{editId ? "Lưu" : "Tạo"}</Btn>
              {editId && (
                <Btn
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditId(null);
                    setDevCode("");
                    setDevName("");
                  }}
                >
                  Hủy
                </Btn>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Cụm thiết bị</h2>
          <form onSubmit={createCluster} className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label>Mã cụm</label>
              <input value={clCode} onChange={(e) => setClCode(e.target.value)} required />
            </div>
            <div>
              <label>Tên</label>
              <input value={clName} onChange={(e) => setClName(e.target.value)} required />
            </div>
            <div>
              <label>Org</label>
              <select value={clOrgId} onChange={(e) => setClOrgId(e.target.value)} required>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Btn type="submit">Tạo cụm</Btn>
            </div>
          </form>
          <form onSubmit={clusterCommand} className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <label>Gửi lệnh cả cụm</label>
              <select value={clCmdId} onChange={(e) => setClCmdId(e.target.value)}>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count?.devices ?? "?"} TB)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Lệnh</label>
              <select value={clCmdType} onChange={(e) => setClCmdType(e.target.value)}>
                <option value="reboot">reboot</option>
                <option value="set_volume">set_volume 50</option>
                <option value="power_on">power_on</option>
                <option value="power_off">power_off</option>
                <option value="stop">stop</option>
              </select>
            </div>
            <Btn type="submit">Gửi</Btn>
          </form>
          <ul className="space-y-1 text-sm">
            {clusters.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1">
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="font-mono text-xs text-slate-500">{c.code}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {c._count?.devices ?? 0} TB · {c.status}
                  </span>
                </span>
                {c.status !== "inactive" && (
                  <Btn
                    variant="danger"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => deactivateCluster(c.id)}
                  >
                    Xóa/Tắt
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5">
          <ActionIcon action="search" size="sm" />
          Lọc theo loại thiết bị
        </label>
        <DeviceTypeSelect value={type} onChange={setType} allowAll variant="chips" />
      </Card>
      <Card className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Cụm</th>
              <th>Status</th>
              <th>Online</th>
              <th>Volume</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td className="font-mono text-xs">{d.deviceCode}</td>
                <td>{d.name}</td>
                <td>
                  <TypeBadge type={d.type} label={DEVICE_TYPE_LABELS[d.type] || d.type} />
                </td>
                <td>{d.cluster?.name || "—"}</td>
                <td className="text-xs">{d.status}</td>
                <td>
                  <StatusIcon
                    online={d.online}
                    showLabel
                    label={d.online ? "Online" : "Offline"}
                    size="sm"
                  />
                </td>
                <td>{d.volume}</td>
                <td className="max-w-md space-x-1 whitespace-nowrap">
                  <Btn variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => startEdit(d)}>
                    Sửa
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => sendCommand(d.id, "set_volume", { volume: 50 })}
                  >
                    Vol 50
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => sendCommand(d.id, "reboot")}
                  >
                    Reboot
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => sendCommand(d.id, "power_on")}
                  >
                    On
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => sendCommand(d.id, "power_off")}
                  >
                    Off
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => sendCommand(d.id, "stop")}
                  >
                    Stop
                  </Btn>
                  <Btn
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => rotateMqtt(d.id, d.deviceCode)}
                  >
                    MQTT
                  </Btn>
                  {d.status === "active" ? (
                    <Btn
                      variant="danger"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => setDeviceStatus(d.id, "retired")}
                    >
                      Ngừng
                    </Btn>
                  ) : (
                    <Btn
                      className="!px-2 !py-1 text-xs"
                      onClick={() => setDeviceStatus(d.id, "active")}
                    >
                      Kích hoạt
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
