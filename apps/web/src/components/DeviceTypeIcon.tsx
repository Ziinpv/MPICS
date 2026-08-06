"use client";

import {
  DEVICE_TYPE_COLORS,
  DEVICE_TYPE_ICONS,
  resolveIconSize,
  type IconSize,
} from "@/lib/iconMap";

type Props = {
  type: string;
  size?: IconSize;
  className?: string;
  /** Dùng màu brand của loại thiết bị */
  colored?: boolean;
  title?: string;
};

export function DeviceTypeIcon({
  type,
  size = "button",
  className = "",
  colored = true,
  title,
}: Props) {
  const Icon = DEVICE_TYPE_ICONS[type] || DEVICE_TYPE_ICONS.communication_device;
  const px = resolveIconSize(size);
  const color = colored ? DEVICE_TYPE_COLORS[type] : undefined;

  return (
    <span title={title} className="inline-flex">
      <Icon
        size={px}
        className={`shrink-0 ${className}`}
        style={color ? { color } : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
      />
    </span>
  );
}
