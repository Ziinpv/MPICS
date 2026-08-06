"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ICON_SIZE_PX } from "@/lib/iconMap";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Không đổi được mật khẩu");
      return;
    }
    router.push(data.redirectTo || "/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,111,71,0.14),_transparent_50%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white/95 p-6 shadow-card-hover sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <KeyRound size={ICON_SIZE_PX.header} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tài khoản mới hoặc vừa được reset cần đổi mật khẩu trước khi tiếp tục.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label>Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-slate-400">Tối thiểu 8 ký tự, có chữ và số</p>
          </div>
          <div>
            <label>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? "Đang lưu…" : "Lưu mật khẩu mới"}
          </button>
        </form>
      </div>
    </div>
  );
}
