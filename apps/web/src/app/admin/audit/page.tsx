"use client";

import { useEffect, useState } from "react";
import { PageHeader, Btn } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { ActionIcon } from "@/components/ActionIcon";

type Log = {
  id: string;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: unknown;
  ip: string | null;
  createdAt: string;
};

const ACTION_PRESETS = [
  "",
  "auth.login",
  "auth.change_password",
  "user.create",
  "user.update",
  "schedule.publish",
  "content.approve",
  "content.reject",
  "content.run_tts",
  "content.approve_tts",
  "alert.ack",
  "alert.resolve",
  "location.update",
  "device.mqtt_rotate",
];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ action: "", q: "" });
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (applied.action) params.set("action", applied.action);
    if (applied.q) params.set("q", applied.q);
    params.set("limit", "150");
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setMsg(d.error);
        else {
          setMsg("");
          setLogs(d.logs || []);
        }
      })
      .catch(() => setMsg("Không tải được audit log"));
  }, [applied]);

  async function exportCsv() {
    const params = new URLSearchParams({ format: "csv", limit: "2000" });
    if (applied.action) params.set("action", applied.action);
    if (applied.q) params.set("q", applied.q);
    const res = await fetch(`/api/audit?${params}`);
    if (!res.ok) {
      setMsg("Xuất CSV lỗi");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Đã tải audit CSV");
  }

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        subtitle="AuditLog — đăng nhập, user, TTS, publish, GIS, MQTT"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={() => setApplied({ action, q })}>
              <ActionIcon action="search" size="sm" />
              Làm mới
            </Btn>
            <Btn variant="secondary" onClick={exportCsv}>
              <ActionIcon action="download" size="sm" />
              Xuất CSV
            </Btn>
          </div>
        }
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}

      <SearchPanel onSearch={() => setApplied({ action, q })}>
        <div>
          <label>Action (preset hoặc gõ)</label>
          <select
            value={ACTION_PRESETS.includes(action) ? action : ""}
            onChange={(e) => setAction(e.target.value)}
            className="mb-2"
          >
            <option value="">— chọn preset —</option>
            {ACTION_PRESETS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="VD: auth.login, schedule.publish…"
            onKeyDown={(e) => e.key === "Enter" && setApplied({ action, q })}
          />
        </div>
        <div>
          <label>Tìm (user / entity)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username hoặc entity id…"
            onKeyDown={(e) => e.key === "Enter" && setApplied({ action, q })}
          />
        </div>
      </SearchPanel>

      <ResultsPanel title="Sự kiện gần đây" count={logs.length} empty={!logs.length}>
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-slate-500">
                  {new Date(l.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="font-mono text-sm">{l.actorUsername || "—"}</td>
                <td>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                    {l.action}
                  </span>
                </td>
                <td className="text-sm text-slate-600">
                  {l.entityType || "—"}
                  {l.entityId ? (
                    <div className="font-mono text-[10px] text-slate-400">{l.entityId}</div>
                  ) : null}
                </td>
                <td className="font-mono text-xs text-slate-400">{l.ip || "—"}</td>
                <td className="max-w-[260px]">
                  {l.meta ? (
                    <button
                      type="button"
                      className="w-full truncate text-left font-mono text-[10px] text-slate-500 hover:text-brand-700"
                      onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                      title="Xem meta"
                    >
                      {expanded === l.id
                        ? JSON.stringify(l.meta, null, 2)
                        : JSON.stringify(l.meta)}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
