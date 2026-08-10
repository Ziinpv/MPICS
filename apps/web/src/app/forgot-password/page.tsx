"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ICON_SIZE_PX } from "@/lib/iconMap";

export default function ForgotPasswordPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => process.env.NEXT_PUBLIC_APP_NAME || "MPCIS", []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    setResetUrl("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Không gửi được yêu cầu");
      return;
    }
    setMsg(data.message || "Đã xử lý yêu cầu");
    if (data.resetUrl) setResetUrl(data.resetUrl);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,111,71,0.14),_transparent_50%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white/95 p-6 shadow-card-hover sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <KeyRound size={ICON_SIZE_PX.header} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Quên mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">{title} · nhập username hoặc email</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label>Username hoặc email</label>
            <input
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="admin hoặc admin@mpcis.demo"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {msg && (
            <p className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
              {msg}
            </p>
          )}
          {resetUrl && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-medium">Link demo (dev)</p>
              <Link href={resetUrl} className="mt-1 block break-all text-brand-700 underline">
                {resetUrl}
              </Link>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? "Đang xử lý…" : "Tạo link đặt lại"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/login" className="text-brand-700 hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
