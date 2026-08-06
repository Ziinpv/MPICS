"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_OPTIONS } from "@/lib/labels";
import { DeviceTypeIcon } from "@/components/DeviceTypeIcon";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";

type Item = {
  id: string;
  groupType: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export default function LocationTypesCatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [nameQ, setNameQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [applied, setApplied] = useState({ name: "", group: "" });
  const [showInactive, setShowInactive] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ groupType: "billboard", name: "", code: "" });
  const [editing, setEditing] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/location-types?${showInactive ? "active=0" : "active=1"}`);
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
    else setMsg(data.error || "Không tải được loại ĐĐ");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const filtered = useMemo(() => {
    const n = applied.name.trim().toLowerCase();
    return items.filter((r) => {
      if (applied.group && r.groupType !== applied.group) return false;
      if (!n) return true;
      return (
        r.name.toLowerCase().includes(n) ||
        r.code.includes(n) ||
        (LOCATION_TYPE_LABELS[r.groupType] || "").toLowerCase().includes(n)
      );
    });
  }, [items, applied]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/location-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupType: form.groupType,
        name: form.name,
        code: form.code || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Tạo lỗi");
      return;
    }
    setForm((f) => ({ ...f, name: "", code: "" }));
    setMsg("Đã thêm loại chi tiết");
    await load();
  }

  async function saveEdit() {
    if (!editing) return;
    setLoading(true);
    const res = await fetch(`/api/location-types/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Sửa lỗi");
      return;
    }
    setEditing(null);
    setMsg("Đã cập nhật");
    await load();
  }

  async function toggleActive(item: Item) {
    const res = await fetch(`/api/location-types/${item.id}`, {
      method: item.active ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: item.active ? undefined : JSON.stringify({ active: true }),
    });
    const data = await res.json();
    setMsg(res.ok ? (item.active ? "Đã vô hiệu hóa" : "Đã kích hoạt lại") : data.error || "Lỗi");
    if (res.ok) await load();
  }

  return (
    <div>
      <PageHeader
        title="Loại địa điểm"
        subtitle="CRUD chi tiết loại theo nhóm phân loại"
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <Card className="mb-4 space-y-3">
        <h2 className="font-medium">Thêm loại chi tiết</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label>Nhóm</label>
            <select
              value={form.groupType}
              onChange={(e) => setForm((f) => ({ ...f, groupType: e.target.value }))}
            >
              {LOCATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tên hiển thị</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="VD: Bảng treo tường"
            />
          </div>
          <div>
            <label>Code (tuỳ chọn)</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="auto từ tên"
            />
          </div>
          <div className="flex items-end">
            <Btn type="submit" disabled={loading}>
              <ActionIcon action="add" size="sm" />
              Thêm
            </Btn>
          </div>
        </form>
      </Card>

      <SearchPanel
        onSearch={() => setApplied({ name: nameQ, group: groupFilter })}
      >
        <div>
          <label>Tên / code</label>
          <input
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
            placeholder="VD: Truyền thanh, bảng vẫy…"
            onKeyDown={(e) =>
              e.key === "Enter" && setApplied({ name: nameQ, group: groupFilter })
            }
          />
        </div>
        <div>
          <label>Nhóm</label>
          <LocationTypeSelect value={groupFilter} onChange={setGroupFilter} allowAll />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Hiện cả loại đã tắt
          </label>
        </div>
      </SearchPanel>

      <ResultsPanel title="Kết quả" count={filtered.length} empty={!filtered.length}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Tên loại (chi tiết)</th>
              <th>Code</th>
              <th>Nhóm phân loại</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <DeviceTypeIcon type={r.groupType} size="button" />
                  </div>
                </td>
                <td className="font-medium">
                  {editing?.id === r.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    r.name
                  )}
                </td>
                <td className="font-mono text-xs text-slate-500">{r.code}</td>
                <td className="text-slate-600">
                  {LOCATION_TYPE_LABELS[r.groupType] || r.groupType}
                </td>
                <td>
                  <StatusIcon
                    status={r.active ? "active" : "inactive"}
                    showLabel
                    label={r.active ? "Đang dùng" : "Đã tắt"}
                    size="inline"
                  />
                </td>
                <td>
                  <div className="flex gap-1">
                    {editing?.id === r.id ? (
                      <>
                        <Btn
                          className="!px-2 !py-1 text-xs"
                          disabled={loading}
                          onClick={saveEdit}
                        >
                          Lưu
                        </Btn>
                        <Btn
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => setEditing(null)}
                        >
                          Hủy
                        </Btn>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="rounded p-1 text-brand-700 hover:bg-brand-50"
                          title="Sửa tên"
                          onClick={() => {
                            setEditing(r);
                            setEditName(r.name);
                          }}
                        >
                          <ActionIcon action="edit" size="inline" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-600 hover:bg-slate-100"
                          title={r.active ? "Vô hiệu hóa" : "Kích hoạt"}
                          onClick={() => toggleActive(r)}
                        >
                          <ActionIcon action={r.active ? "delete" : "add"} size="inline" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
