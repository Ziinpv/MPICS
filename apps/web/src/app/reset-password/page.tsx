"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ICON_SIZE_PX } from "@/lib/iconMap";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const tokenFromUrl = search.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => process.env.NEXT_PUBLIC_APP_NAME || "MPCIS", []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Không đặt lại được mật khẩu");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white/95 p-6 shadow-card-hover sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
          <KeyRound size={ICON_SIZE_PX.header} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">{title}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {!tokenFromUrl && (
          <div>
            <label>Token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
        )}
        <div>
          <label>Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-slate-400">Tối thiểu 8 ký tự, có chữ và số</p>
        </div>
        <div>
          <label>Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || !token} className="btn-primary w-full !py-3">
          {loading ? "Đang lưu…" : "Đặt lại mật khẩu"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand-700 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,111,71,0.14),_transparent_50%)]" />
      <Suspense fallback={<p className="text-sm text-slate-500">Đang tải…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
