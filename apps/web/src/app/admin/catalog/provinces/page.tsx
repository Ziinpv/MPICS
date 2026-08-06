"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function ProvincesCatalogPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [unit, setUnit] = useState("");
  const [appliedUnit, setAppliedUnit] = useState("");

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setOrgs(d.orgs || []));
  }, []);

  const provinces = useMemo(
    () => orgs.filter((o) => o.type === "province"),
    [orgs],
  );

  const filtered = useMemo(() => {
    if (!appliedUnit) return provinces;
    return provinces.filter((p) => p.id === appliedUnit || p.name.includes(appliedUnit));
  }, [provinces, appliedUnit]);

  return (
    <div>
      <PageHeader title="Danh mục Tỉnh" subtitle="Danh mục hành chính (đọc từ seed Organization)" />
      <SearchPanel
        onSearch={() => setAppliedUnit(unit)}
        actions={
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <ActionIcon action="list" size="inline" /> Read-only
          </span>
        }
      >
        <div>
          <label>Đơn vị / Tỉnh</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Tất cả</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </SearchPanel>

      <ResultsPanel title="Kết quả" count={filtered.length} empty={!filtered.length}>
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên Tỉnh</th>
              <th>Trạng thái hoạt động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.code}</td>
                <td className="font-medium text-brand-800">{p.name}</td>
                <td>
                  <StatusIcon status="active" showLabel label="Đang hoạt động" size="inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
