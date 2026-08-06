"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { DEVICE_TYPE_LABELS } from "@/lib/labels";
import { DeviceTypeSelect, TypeBadge } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [type, setType] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const q = new URLSearchParams();
    if (type) q.set("device_type", type);
    const res = await fetch(`/api/devices?${q}`);
    const data = await res.json();
    setDevices(data.devices || []);
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
    else setMsg(`Đã tạo lệnh ${commandType} (${data.command.status}) — simulator sẽ ack`);
  }

  return (
    <div>
      <PageHeader title="Thiết bị IoT" />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}
      <Card className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5">
          <ActionIcon action="search" size="sm" />
          Lọc theo loại thiết bị
        </label>
        <DeviceTypeSelect value={type} onChange={setType} allowAll variant="chips" />
      </Card>
      <Card>
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Cụm</th>
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
                <td>{d.cluster?.name}</td>
                <td>
                  <StatusIcon
                    online={d.online}
                    showLabel
                    label={d.online ? "Online" : "Offline"}
                    size="sm"
                  />
                </td>
                <td>{d.volume}</td>
                <td className="space-x-2">
                  <Btn variant="secondary" onClick={() => sendCommand(d.id, "set_volume", { volume: 50 })}>
                    Vol 50
                  </Btn>
                  <Btn variant="secondary" onClick={() => sendCommand(d.id, "reboot")}>
                    Reboot
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
