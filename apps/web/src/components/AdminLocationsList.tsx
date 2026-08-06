"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";
import { LocationTypeSelect, TypeBadge } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

type Props = {
  title: string;
  subtitle?: string;
  fixedType?: string;
  allowTypeFilter?: boolean;
};

export function AdminLocationsList({
  title,
  subtitle,
  fixedType,
  allowTypeFilter = true,
}: Props) {
  const [locations, setLocations] = useState<any[]>([]);
  const [nameQ, setNameQ] = useState("");
  const [type, setType] = useState(fixedType || "");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ name: "", type: fixedType || "", status: "" });

  useEffect(() => {
    const q = new URLSearchParams();
    const t = applied.type || fixedType;
    if (t) q.set("location_type", t);
    if (applied.status) q.set("operation_status", applied.status);
    fetch(`/api/locations?${q}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
  }, [applied, fixedType]);

  const filtered = useMemo(() => {
    const n = applied.name.trim().toLowerCase();
    if (!n) return locations;
    return locations.filter(
      (l) =>
        l.name?.toLowerCase().includes(n) ||
        l.address?.toLowerCase().includes(n) ||
        l.org?.name?.toLowerCase().includes(n),
    );
  }, [locations, applied.name]);

  function search() {
    setApplied({
      name: nameQ,
      type: fixedType || type,
      status,
    });
  }

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <SearchPanel onSearch={search}>
        <div>
          <label>Tên địa điểm</label>
          <input
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
            placeholder="Nhập tên / địa chỉ…"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        {allowTypeFilter && !fixedType && (
          <div>
            <label>Loại địa điểm</label>
            <LocationTypeSelect value={type} onChange={setType} allowAll />
          </div>
        )}
        <div>
          <label>Tình trạng</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </SearchPanel>

      <ResultsPanel title="Thông tin địa điểm" count={filtered.length} empty={!filtered.length}>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên địa điểm</th>
              <th>Phường/Xã</th>
              <th>Phân loại</th>
              <th>Trạng thái</th>
              <th>Thời gian tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, idx) => (
              <tr key={l.id}>
                <td className="text-slate-400">{idx + 1}</td>
                <td>
                  <div className="font-medium text-brand-800">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.address || "—"}</div>
                </td>
                <td>{l.org?.name}</td>
                <td>
                  <TypeBadge
                    type={l.locationType}
                    label={LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                  />
                </td>
                <td>
                  <StatusIcon
                    operationStatus={l.operationStatus}
                    showLabel
                    label={OPERATION_STATUS_LABELS[l.operationStatus]}
                    size="inline"
                  />
                </td>
                <td className="text-slate-500">
                  {new Date(l.createdAt).toLocaleString("vi-VN")}
                </td>
                <td>
                  <Link
                    href={`/admin/locations/${l.id}`}
                    className="inline-flex text-brand-700 hover:text-brand-900"
                    title="Xem / sửa"
                  >
                    <ActionIcon action="edit" size="inline" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
