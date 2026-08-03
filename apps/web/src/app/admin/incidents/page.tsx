"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/incidents");
    const data = await res.json();
    setIncidents(data.incidents || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string) {
    const res = await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    if (res.ok) {
      setMsg("Đã resolve");
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Sự cố thiết bị" />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}
      <Card>
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Thiết bị</th>
              <th>Người báo</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-slate-500">{i.description}</div>
                </td>
                <td>{i.device?.name}</td>
                <td>{i.reporter?.fullName}</td>
                <td>{i.status}</td>
                <td>
                  {i.status === "open" && (
                    <Btn onClick={() => resolve(i.id)}>Resolve</Btn>
                  )}
                </td>
              </tr>
            ))}
            {!incidents.length && (
              <tr>
                <td colSpan={5} className="text-slate-400">
                  Chưa có sự cố
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
