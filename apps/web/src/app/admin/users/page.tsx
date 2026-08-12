"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Btn } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { ActionIcon } from "@/components/ActionIcon";
import { StatusIcon } from "@/components/StatusIcon";

type Org = { id: string; name: string; type: string; code: string };
type UserRow = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "USER";
  status: string;
  orgId: string;
  org: Org | null;
};

const emptyForm = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  password: "Demo@123",
  role: "USER" as "ADMIN" | "USER",
  orgId: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const communes = useMemo(
    () => orgs.filter((o) => o.type === "commune" || o.type === "province" || o.type === "system"),
    [orgs],
  );

  async function load() {
    const params = new URLSearchParams();
    if (appliedQ) params.set("q", appliedQ);
    const [uRes, mRes] = await Promise.all([
      fetch(`/api/users?${params}`),
      fetch("/api/meta"),
    ]);
    const uData = await uRes.json();
    const mData = await mRes.json();
    if (uRes.ok) setUsers(uData.users || []);
    else setMsg(uData.error || "Không tải được users");
    setOrgs(mData.orgs || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      orgId: communes.find((o) => o.type === "commune")?.id || communes[0]?.id || "",
    });
    setShowForm(true);
    setMsg("");
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      role: u.role,
      orgId: u.orgId,
    });
    setShowForm(true);
    setMsg("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      if (editing) {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email || null,
            phone: form.phone || null,
            role: form.role,
            orgId: form.orgId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cập nhật lỗi");
        setMsg(`Đã cập nhật ${editing.username}`);
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Tạo lỗi");
        setMsg(data.message || `Đã tạo user ${form.username}`);
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setMsg(err.message || "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(u: UserRow) {
    if (!confirm(`Reset mật khẩu ${u.username} về Demo@123?`)) return;
    const res = await fetch(`/api/users/${u.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "Demo@123" }),
    });
    const data = await res.json();
    setMsg(res.ok ? data.message : data.error || "Reset lỗi");
  }

  async function deactivate(u: UserRow) {
    if (!confirm(`Vô hiệu hóa tài khoản ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    setMsg(res.ok ? `Đã vô hiệu hóa ${u.username}` : data.error || "Lỗi");
    if (res.ok) await load();
  }

  async function reactivate(u: UserRow) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    const data = await res.json();
    setMsg(res.ok ? `Đã kích hoạt lại ${u.username}` : data.error || "Lỗi");
    if (res.ok) await load();
  }

  return (
    <div>
      <PageHeader
        title="Quản lý người dùng"
        subtitle="Tạo / sửa tài khoản, gán xã, reset mật khẩu"
        actions={
          <Btn onClick={openCreate}>
            <ActionIcon action="add" size="sm" />
            Thêm user
          </Btn>
        }
      />
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}

      <SearchPanel onSearch={() => setAppliedQ(q)}>
        <div>
          <label>Tìm kiếm</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username / họ tên / email…"
            onKeyDown={(e) => e.key === "Enter" && setAppliedQ(q)}
          />
        </div>
      </SearchPanel>

      {showForm && (
        <Card className="mb-4 space-y-3">
          <h2 className="font-medium">{editing ? `Sửa: ${editing.username}` : "Tạo user mới"}</h2>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {!editing && (
              <div>
                <label>Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
            )}
            <div>
              <label>Họ tên</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label>Email cá nhân (bắt buộc khi tạo — nhận username + MK tạm)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required={!editing}
                placeholder="vd. canboxa@gmail.com"
              />
            </div>
            <div>
              <label>Điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label>Vai trò</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "USER" }))}
              >
                <option value="USER">USER (xã)</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label>Tổ chức</label>
              <select
                value={form.orgId}
                onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))}
                required
              >
                {communes.map((o) => (
                  <option key={o.id} value={o.id}>
                    [{o.type}] {o.name}
                  </option>
                ))}
              </select>
            </div>
            {!editing && (
              <div>
                <label>Mật khẩu ban đầu</label>
                <input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            )}
            <div className="flex items-end gap-2 sm:col-span-2">
              <Btn type="submit" disabled={loading}>
                {loading ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo"}
              </Btn>
              <Btn type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Hủy
              </Btn>
            </div>
          </form>
        </Card>
      )}

      <ResultsPanel title="Người dùng" count={users.length} empty={!users.length}>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Tổ chức</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-mono text-sm">{u.username}</td>
                <td>
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-slate-400">{u.email || u.phone || "—"}</div>
                </td>
                <td>{u.role}</td>
                <td>{u.org?.name || "—"}</td>
                <td>
                  <StatusIcon
                    status={u.status === "active" ? "active" : "inactive"}
                    showLabel
                    label={u.status === "active" ? "Hoạt động" : "Vô hiệu"}
                    size="inline"
                  />
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded p-1 text-brand-700 hover:bg-brand-50"
                      title="Sửa"
                      onClick={() => openEdit(u)}
                    >
                      <ActionIcon action="edit" size="inline" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      title="Reset MK"
                      onClick={() => resetPassword(u)}
                    >
                      <ActionIcon action="reset" size="inline" />
                    </button>
                    {u.status === "active" ? (
                      <button
                        type="button"
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        title="Vô hiệu hóa"
                        onClick={() => deactivate(u)}
                      >
                        <ActionIcon action="delete" size="inline" />
                      </button>
                    ) : (
                      <Btn variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => reactivate(u)}>
                        Kích hoạt
                      </Btn>
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
