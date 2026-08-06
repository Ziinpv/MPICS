"use client";

import {
  ACTION_ICONS,
  resolveIconSize,
  type ActionKind,
  type IconSize,
} from "@/lib/iconMap";

type Props = {
  action: ActionKind;
  size?: IconSize;
  className?: string;
  title?: string;
};

export function ActionIcon({ action, size = "button", className = "", title }: Props) {
  const Icon = ACTION_ICONS[action];
  const px = resolveIconSize(size);
  return (
    <span title={title} className="inline-flex">
      <Icon
        size={px}
        className={`shrink-0 ${className}`}
        aria-hidden={title ? undefined : true}
        aria-label={title}
      />
    </span>
  );
}
