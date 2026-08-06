"use client";

import {
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_OPTIONS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_OPTIONS,
  LOCATION_TYPE_VISUAL,
} from "@/lib/labels";
import { DeviceTypeIcon } from "@/components/DeviceTypeIcon";
import { ActionIcon } from "@/components/ActionIcon";

type BaseProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  variant?: "select" | "chips";
};

function TypeSelectRow({
  options,
  value,
  onChange,
  id,
  className,
  allowAll,
  allLabel,
  disabled,
}: BaseProps & { options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
        {value ? (
          <DeviceTypeIcon type={value} size="button" />
        ) : (
          <ActionIcon action="list" size="button" className="text-brand-700" />
        )}
      </div>
      <select
        id={id}
        className={`flex-1 ${className || ""}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowAll && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TypeChipFilter({
  options,
  value,
  onChange,
  allowAll,
  allLabel,
  disabled,
}: BaseProps & { options: { value: string; label: string }[] }) {
  const chips = allowAll
    ? [{ value: "", label: allLabel || "Tất cả" }, ...options]
    : options;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`chip ${active ? "chip-active" : "chip-idle"} disabled:opacity-50`}
          >
            {o.value ? (
              <DeviceTypeIcon type={o.value} size="inline" colored={!active} />
            ) : (
              <ActionIcon action="list" size="inline" />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function DeviceTypeSelect(props: BaseProps) {
  if (props.variant === "chips") {
    return (
      <TypeChipFilter {...props} options={DEVICE_TYPE_OPTIONS} allLabel={props.allLabel || "Tất cả loại"} />
    );
  }
  return (
    <TypeSelectRow
      {...props}
      options={DEVICE_TYPE_OPTIONS}
      allLabel={props.allLabel || "Tất cả loại thiết bị"}
    />
  );
}

export function LocationTypeSelect(props: BaseProps) {
  if (props.variant === "chips") {
    return <TypeChipFilter {...props} options={LOCATION_TYPE_OPTIONS} allLabel={props.allLabel || "Tất cả"} />;
  }
  return (
    <TypeSelectRow
      {...props}
      options={LOCATION_TYPE_OPTIONS}
      allLabel={props.allLabel || "Tất cả"}
    />
  );
}

export function TypeBadge({ type, label }: { type: string; label?: string }) {
  const visual = LOCATION_TYPE_VISUAL[type];
  const text =
    label || LOCATION_TYPE_LABELS[type] || DEVICE_TYPE_LABELS[type] || type;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-white shadow-soft"
      style={{ backgroundColor: visual?.color || "#64748b" }}
      title={text}
    >
      <DeviceTypeIcon type={type} size="inline" colored={false} className="text-white" />
      <span className="truncate">{text}</span>
    </span>
  );
}
