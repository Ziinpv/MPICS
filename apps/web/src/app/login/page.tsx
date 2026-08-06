"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, UserRound } from "lucide-react";
import { ICON_SIZE_PX } from "@/lib/iconMap";

const showDemoHints = process.env.NEXT_PUBLIC_SHOW_DEMO_HINTS !== "0";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(showDemoHints ? "admin" : "");
  const [password, setPassword] = useState(showDemoHints ? "Demo@123" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => process.env.NEXT_PUBLIC_APP_NAME || "MPCIS",
    [],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Đăng nhập thất bại");
      return;
    }
    if (data.mustChangePassword || data.user?.mustChangePassword) {
      router.push("/account/password");
    } else {
      router.push(data.user.role === "ADMIN" ? "/admin" : "/user");
    }
    router.refresh();
  }

  function quick(user: string) {
    setUsername(user);
    setPassword("Demo@123");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,111,71,0.18),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(249,133,7,0.16),_transparent_45%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white/95 p-6 shadow-card-hover backdrop-blur sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-card">
            M
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">MobiFone</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">Quản lý văn hóa & truyền thông cơ sở</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label>Tài khoản</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            <LogIn size={ICON_SIZE_PX.button} />
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        {showDemoHints && (
          <div className="mt-6 space-y-3 border-t border-brand-100 pt-5">
            <p className="text-xs font-medium text-slate-500">Đăng nhập nhanh (seed · chỉ môi trường demo)</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => quick("admin")} className="chip chip-idle">
                <ShieldCheck size={ICON_SIZE_PX.inline} className="text-brand-700" />
                admin
              </button>
              <button type="button" onClick={() => quick("user.xa1")} className="chip chip-idle">
                <UserRound size={ICON_SIZE_PX.inline} className="text-accent-700" />
                user.xa1
              </button>
              <button type="button" onClick={() => quick("user.xa2")} className="chip chip-idle">
                <UserRound size={ICON_SIZE_PX.inline} className="text-accent-700" />
                user.xa2
              </button>
            </div>
            <p className="text-xs text-slate-400">Mật khẩu: Demo@123</p>
          </div>
        )}
      </div>
    </div>
  );
}
