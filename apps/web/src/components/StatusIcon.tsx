"use client";

import {
  STATUS_COLORS,
  STATUS_ICONS,
  resolveIconSize,
  resolveStatusKind,
  type IconSize,
  type StatusKind,
} from "@/lib/iconMap";

type Props = {
  status?: StatusKind;
  operationStatus?: string | null;
  online?: boolean | null;
  error?: boolean;
  size?: IconSize;
  className?: string;
  showLabel?: boolean;
  label?: string;
};

export function StatusIcon({
  status,
  operationStatus,
  online,
  error,
  size = "button",
  className = "",
  showLabel,
  label,
}: Props) {
  const kind =
    status ||
    resolveStatusKind({ operationStatus, online, error });
  const Icon = STATUS_ICONS[kind];
  const color = STATUS_COLORS[kind];
  const px = resolveIconSize(size);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={label || kind}>
      <Icon size={px} style={{ color }} className="shrink-0" aria-hidden />
      {showLabel && (
        <span className="text-sm" style={{ color }}>
          {label || kind}
        </span>
      )}
    </span>
  );
}
