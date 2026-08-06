"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ChevronDown, KeyRound, LogOut, Menu } from "lucide-react";
import { ICON_SIZE_PX, navIconForHref } from "@/lib/iconMap";

export type NavItem = {
  href: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/user") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  title,
  subtitle,
  nav,
  navGroups,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Flat nav (User) */
  nav?: NavItem[];
  /** Grouped nav (Admin TTVH-style) */
  navGroups?: NavGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initialOpen = useMemo(() => {
    const ids = new Set<string>();
    (navGroups || []).forEach((g) => {
      if (g.items.some((i) => isActive(pathname, i.href))) ids.add(g.id);
    });
    if (ids.size === 0 && navGroups?.[0]) ids.add(navGroups[0].id);
    return ids;
  }, [navGroups, pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      initialOpen.forEach((id) => next.add(id));
      return next;
    });
  }, [initialOpen]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pageTitle = useMemo(() => {
    const all = [
      ...(nav || []),
      ...((navGroups || []).flatMap((g) => g.items) || []),
    ];
    const hit = all.find((i) => isActive(pathname, i.href));
    return hit?.label || title;
  }, [nav, navGroups, pathname, title]);

  function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const active = isActive(pathname, item.href);
    const Icon = item.icon || navIconForHref(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
          active
            ? "bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-200"
            : "text-slate-600 hover:bg-brand-50/70 hover:text-brand-900"
        }`}
      >
        <Icon size={ICON_SIZE_PX.inline} className="shrink-0 opacity-90" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  function renderGrouped(onNavigate?: () => void) {
    return (navGroups || []).map((group) => {
      const open = openGroups.has(group.id);
      return (
        <div key={group.id} className="mb-2">
          <button
            type="button"
            onClick={() => toggleGroup(group.id)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
          >
            {group.label}
            <ChevronDown
              size={14}
              className={`transition ${open ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {open && (
            <div className="mt-1 space-y-0.5 border-l border-brand-100 pl-2 ml-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} onClick={onNavigate} />
              ))}
            </div>
          )}
        </div>
      );
    });
  }

  function renderFlat(onNavigate?: () => void) {
    return (nav || []).map((item) => (
      <NavLink key={item.href} item={item} onClick={onNavigate} />
    ));
  }

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-brand-700 text-white shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu size={ICON_SIZE_PX.button} />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100">
                MPCIS
              </div>
              <div className="truncate text-sm font-semibold sm:text-base">{pageTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {subtitle && (
              <div className="hidden max-w-[260px] truncate rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-brand-50 md:block">
                {subtitle}
              </div>
            )}
            <Link
              href="/account/password"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 sm:text-sm"
              title="Đổi mật khẩu"
            >
              <KeyRound size={ICON_SIZE_PX.inline} />
              <span className="hidden sm:inline">Đổi MK</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 disabled:opacity-50 sm:text-sm"
            >
              <LogOut size={ICON_SIZE_PX.inline} />
              <span className="hidden sm:inline">{loggingOut ? "Đang thoát…" : "Đăng xuất"}</span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="max-h-[70vh] space-y-1 overflow-y-auto border-t border-white/15 bg-white px-3 py-3 text-slate-900 lg:hidden">
            {navGroups ? renderGrouped(() => setMenuOpen(false)) : renderFlat(() => setMenuOpen(false))}
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              <LogOut size={ICON_SIZE_PX.inline} />
              {loggingOut ? "Đang thoát…" : "Đăng xuất"}
            </button>
          </nav>
        )}
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-65px)] max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-brand-100/80 bg-white p-3 lg:block">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              M
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-brand-900">{title}</div>
              {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
            </div>
          </div>
          <nav className="space-y-1 overflow-y-auto pb-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {navGroups ? renderGrouped() : renderFlat()}
          </nav>
          <p className="px-2 text-[10px] text-slate-400">P0 Hardening · Demo OK</p>
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`surface-card ${className}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "brand" | "accent" | "danger";
}) {
  const bar =
    accent === "accent"
      ? "border-b-4 border-accent-500"
      : accent === "danger"
        ? "border-b-4 border-danger"
        : "border-b-4 border-brand-600";
  return (
    <Card className={`relative overflow-hidden text-center ${bar}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function Btn({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "accent";
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "btn-danger"
        : variant === "accent"
          ? "btn-accent"
          : "btn-secondary";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${styles} ${className}`}>
      {children}
    </button>
  );
}
