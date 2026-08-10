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

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ action: "", q: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (applied.action) params.set("action", applied.action);
    if (applied.q) params.set("q", applied.q);
    params.set("limit", "100");
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

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        subtitle="AuditLog — đăng nhập, user, loại ĐĐ, publish, sửa địa điểm"
        actions={
          <Btn
            variant="secondary"
            onClick={() => setApplied({ action, q })}
          >
            <ActionIcon action="search" size="sm" />
            Làm mới
          </Btn>
        }
      />
      {msg && <p className="mb-3 text-sm text-rose-600">{msg}</p>}

      <SearchPanel onSearch={() => setApplied({ action, q })}>
        <div>
          <label>Action</label>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="VD: auth.login, user.create, schedule.publish…"
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
                <td className="max-w-[220px] truncate font-mono text-[10px] text-slate-400">
                  {l.meta ? JSON.stringify(l.meta) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
