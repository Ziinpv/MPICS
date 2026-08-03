"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/devices");
    const data = await res.json();
    setDevices(data.devices || []);
  }

  useEffect(() => {
    load();
  }, []);

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
      <Card>
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
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
                <td>{d.cluster?.name}</td>
                <td>
                  <span className={d.online ? "text-teal-700" : "text-slate-400"}>
                    {d.online ? "Online" : "Offline"}
                  </span>
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
