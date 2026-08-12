"use client";

import { Fragment, useEffect, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { mediaUrl } from "@/lib/mediaUrl";

const NEXT: Record<string, { status: string; label: string }[]> = {
  open: [
    { status: "assigned", label: "Assign" },
    { status: "in_progress", label: "Đang xử lý" },
    { status: "resolved", label: "Resolve" },
  ],
  assigned: [
    { status: "in_progress", label: "Đang xử lý" },
    { status: "resolved", label: "Resolve" },
  ],
  in_progress: [
    { status: "resolved", label: "Resolve" },
    { status: "closed", label: "Đóng" },
  ],
  resolved: [{ status: "closed", label: "Đóng" }],
  closed: [],
};

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/incidents");
    const data = await res.json();
    setIncidents(data.incidents || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        comment: note[id]?.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Lỗi");
    else {
      setMsg(`Đã chuyển → ${status}`);
      setNote((n) => ({ ...n, [id]: "" }));
      load();
    }
  }

  async function addComment(id: string) {
    const body = note[id]?.trim();
    if (!body) {
      setMsg("Nhập ghi chú trước");
      return;
    }
    const res = await fetch(`/api/incidents/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Comment lỗi");
    else {
      setMsg("Đã thêm ghi chú");
      setNote((n) => ({ ...n, [id]: "" }));
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Sự cố thiết bị"
        subtitle="Workflow open → assigned → in_progress → resolved → closed · ảnh + ghi chú"
      />
      {msg && <p className="mb-3 text-sm text-teal-700">{msg}</p>}
      <Card className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Thiết bị</th>
              <th>Người báo</th>
              <th>Assignee</th>
              <th>Trạng thái</th>
              <th>Ảnh</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <Fragment key={i.id}>
                <tr>
                  <td>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-xs text-slate-500">{i.description}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(i.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </td>
                  <td>{i.device?.name}</td>
                  <td>{i.reporter?.fullName}</td>
                  <td className="text-xs">{i.assignee?.fullName || "—"}</td>
                  <td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{i.status}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(i.photoKeys || []).slice(0, 3).map((k: string) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={k}
                          src={mediaUrl(k)}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ))}
                      {!i.photoKeys?.length && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="min-w-[220px] space-y-1">
                    <input
                      className="w-full text-xs"
                      placeholder="Ghi chú…"
                      value={note[i.id] || ""}
                      onChange={(e) => setNote((n) => ({ ...n, [i.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-1">
                      {(NEXT[i.status] || []).map((a) => (
                        <Btn
                          key={a.status}
                          className="!px-2 !py-1 text-xs"
                          variant={
                            a.status === "resolved" || a.status === "closed"
                              ? undefined
                              : "secondary"
                          }
                          onClick={() => setStatus(i.id, a.status)}
                        >
                          {a.label}
                        </Btn>
                      ))}
                      <Btn
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => addComment(i.id)}
                      >
                        Note
                      </Btn>
                      <Btn
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => setExpanded(expanded === i.id ? null : i.id)}
                      >
                        {expanded === i.id ? "Ẩn" : "Chi tiết"}
                      </Btn>
                    </div>
                  </td>
                </tr>
                {expanded === i.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 text-xs text-slate-600">
                      <div className="space-y-1 p-2">
                        <div>Severity: {i.severity}</div>
                        {(i.comments || []).length ? (
                          <ul className="list-disc pl-4">
                            {i.comments.map((c: any) => (
                              <li key={c.id}>
                                <strong>{c.author?.fullName}</strong>: {c.body}{" "}
                                <span className="text-slate-400">
                                  ({new Date(c.createdAt).toLocaleString("vi-VN")})
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-400">Chưa có ghi chú</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!incidents.length && (
              <tr>
                <td colSpan={7} className="text-slate-400">
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
