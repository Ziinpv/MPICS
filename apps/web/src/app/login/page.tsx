"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    router.push(data.user.role === "ADMIN" ? "/admin" : "/user");
    router.refresh();
  }

  function quick(user: string) {
    setUsername(user);
    setPassword("Demo@123");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-teal-50 to-slate-200 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">MobiFone</div>
          <h1 className="mt-2 text-2xl font-semibold">MPCIS Demo</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý văn hóa & truyền thông cơ sở</p>
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
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Đăng nhập nhanh (seed):</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => quick("admin")} className="rounded-full border px-3 py-1 text-xs">
              admin
            </button>
            <button type="button" onClick={() => quick("user.xa1")} className="rounded-full border px-3 py-1 text-xs">
              user.xa1
            </button>
            <button type="button" onClick={() => quick("user.xa2")} className="rounded-full border px-3 py-1 text-xs">
              user.xa2
            </button>
          </div>
          <p className="text-xs text-slate-400">Mật khẩu: Demo@123</p>
        </div>
      </div>
    </div>
  );
}
