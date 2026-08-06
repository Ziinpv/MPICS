import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  Church,
  Download,
  Edit,
  Eye,
  Flag,
  KeyRound,
  Landmark,
  LayoutDashboard,
  List,
  Map,
  MapPin,
  Mic,
  Plus,
  Radio,
  Search,
  SignpostBig,
  Trash2,
  Users,
  Volume2,
  XCircle,
} from "lucide-react";

export type IconSize = "inline" | "button" | "header" | "card" | "sm" | "md" | "lg" | number;

/** 16 inline · 20 button · 24 header · 32 card */
export const ICON_SIZE_PX: Record<"inline" | "button" | "header" | "card" | "sm" | "md" | "lg", number> = {
  inline: 16,
  button: 20,
  header: 24,
  card: 32,
  sm: 16,
  md: 20,
  lg: 24,
};

export function resolveIconSize(size: IconSize = "button"): number {
  return typeof size === "number" ? size : ICON_SIZE_PX[size];
}

/** Device / location type → Lucide icon */
export const DEVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  communication_device: Mic,
  billboard: SignpostBig,
  wind_banner: Flag,
  cultural_site: Landmark,
  religious_site: Church,
};

/** Alternate icons (reference / future variants) */
export const DEVICE_TYPE_ICON_VARIANTS: Record<string, LucideIcon[]> = {
  communication_device: [Mic, Radio, Volume2],
  billboard: [SignpostBig],
  wind_banner: [Flag],
};

export const DEVICE_TYPE_COLORS: Record<string, string> = {
  communication_device: "#146f47",
  billboard: "#dd6102",
  wind_banner: "#0ea5e9",
  cultural_site: "#0f5839",
  religious_site: "#b74106",
};

export type StatusKind = "active" | "inactive" | "error" | "suspended" | "expired";

/** Operation / device status → icon */
export const STATUS_ICONS: Record<StatusKind, LucideIcon> = {
  active: Check,
  inactive: XCircle,
  error: AlertTriangle,
  suspended: AlertTriangle,
  expired: XCircle,
};

export const STATUS_COLORS: Record<StatusKind, string> = {
  active: "#15803d",
  inactive: "#64748b",
  error: "#dc2626",
  suspended: "#d97706",
  expired: "#64748b",
};

/** Map operationStatus / online boolean → StatusKind */
export function resolveStatusKind(input: {
  operationStatus?: string | null;
  online?: boolean | null;
  error?: boolean;
}): StatusKind {
  if (input.error) return "error";
  if (input.operationStatus === "active") return "active";
  if (input.operationStatus === "inactive") return "inactive";
  if (input.operationStatus === "suspended") return "suspended";
  if (input.operationStatus === "expired") return "expired";
  if (input.online === true) return "active";
  if (input.online === false) return "inactive";
  return "inactive";
}

export type ActionKind =
  | "view"
  | "edit"
  | "delete"
  | "add"
  | "search"
  | "map"
  | "list"
  | "gps"
  | "dashboard"
  | "download"
  | "reset";

export const ACTION_ICONS: Record<ActionKind, LucideIcon> = {
  view: Eye,
  edit: Edit,
  delete: Trash2,
  add: Plus,
  search: Search,
  map: Map,
  list: List,
  gps: MapPin,
  dashboard: LayoutDashboard,
  download: Download,
  reset: KeyRound,
};

/** Nav href → action icon (sidebar / mobile) */
export function navIconForHref(href: string): LucideIcon {
  if (href === "/admin") return Map;
  if (href.includes("/charts")) return LayoutDashboard;
  if (href.includes("/catalog/provinces")) return Landmark;
  if (href.includes("/catalog/communes")) return List;
  if (href.includes("/catalog/location-types")) return Flag;
  if (href.includes("/cultural")) return Landmark;
  if (href.includes("/tttm") || href.includes("/broadcast-assets")) return Mic;
  if (href.includes("/religious")) return Church;
  if (href.includes("/iot") || href.endsWith("/commands")) return Radio;
  if (href.endsWith("/map") || href.includes("/devices/map")) return Map;
  if (href.includes("/locations/new")) return Plus;
  if (href.includes("/locations")) return List;
  if (href.includes("/devices")) return Radio;
  if (href.includes("/incidents")) return AlertTriangle;
  if (href.includes("/contents")) return Volume2;
  if (href.includes("/schedules")) return List;
  if (href.includes("/reports")) return Download;
  if (href.includes("/users")) return Users;
  if (href === "/user") return LayoutDashboard;
  return List;
}

/** Inline SVG path for Leaflet DivIcon (lucide-style simplified) */
export const DEVICE_TYPE_SVG_PATHS: Record<string, string> = {
  // Mic
  communication_device:
    "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8",
  // Signpost
  billboard:
    "M12 3v18 M8 3h8l-1 5H9L8 3z M9 13h6l1 5H8l1-5z",
  // Flag
  wind_banner: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22V15",
  cultural_site:
    "M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6",
  religious_site:
    "M10 9h4 M12 7v5 M12 22V12 M8 22h8 M6 12h12v10H6z",
};

export function buildLeafletMarkerHtml(type: string, online?: boolean): string {
  const color = DEVICE_TYPE_COLORS[type] || "#64748b";
  const path = DEVICE_TYPE_SVG_PATHS[type] || DEVICE_TYPE_SVG_PATHS.communication_device;
  const ring = online === false ? "#94a3b8" : color;
  return `
    <div style="
      width:32px;height:32px;border-radius:9999px;
      background:${color};border:2px solid ${ring};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(15,23,42,.35);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}" />
      </svg>
    </div>
  `;
}
