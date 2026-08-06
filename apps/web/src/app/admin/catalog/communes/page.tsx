"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { SearchPanel, ResultsPanel } from "@/components/SearchResults";
import { StatusIcon } from "@/components/StatusIcon";

export default function CommunesCatalogPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ provinceId: "", q: "" });

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        const list = d.orgs || [];
        setOrgs(list);
        const province = list.find((o: any) => o.type === "province");
        if (province) {
          setProvinceId(province.id);
          setApplied((a) => ({ ...a, provinceId: province.id }));
        }
      });
  }, []);

  const provinces = orgs.filter((o) => o.type === "province");
  const communes = useMemo(() => {
    let list = orgs.filter((o) => o.type === "commune");
    if (applied.provinceId) {
      list = list.filter((o) => o.parentId === applied.provinceId);
    }
    const n = applied.q.trim().toLowerCase();
    if (n) list = list.filter((o) => o.name.toLowerCase().includes(n) || o.code.includes(n));
    return list;
  }, [orgs, applied]);

  return (
    <div>
      <PageHeader
        title="Danh mục Phường/Xã"
        subtitle="Danh sách xã/phường/đặc khu Lâm Đồng (seed)"
      />
      <SearchPanel
        onSearch={() => setApplied({ provinceId, q })}
      >
        <div>
          <label>Tỉnh</label>
          <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Tên Phường/Xã</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên…"
            onKeyDown={(e) => e.key === "Enter" && setApplied({ provinceId, q })}
          />
        </div>
      </SearchPanel>

      <ResultsPanel title="Kết quả" count={communes.length} empty={!communes.length}>
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên Phường/Xã</th>
              <th>Trạng thái hoạt động</th>
            </tr>
          </thead>
          <tbody>
            {communes.slice(0, 100).map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs">{c.code}</td>
                <td className="font-medium text-brand-800">{c.name}</td>
                <td>
                  <StatusIcon status="active" showLabel label="Đang hoạt động" size="inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {communes.length > 100 && (
          <p className="mt-3 text-xs text-slate-400">Hiển thị 100 / {communes.length} — thu hẹp tìm kiếm</p>
        )}
      </ResultsPanel>
    </div>
  );
}
