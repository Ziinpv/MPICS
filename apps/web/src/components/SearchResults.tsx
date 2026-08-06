"use client";

import { Card, Btn } from "@/components/ui";
import { ActionIcon } from "@/components/ActionIcon";

/** Card tìm kiếm kiểu TTVH */
export function SearchPanel({
  title = "Tìm kiếm",
  actions,
  children,
  onSearch,
  searchLabel = "Tìm kiếm",
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onSearch?: () => void;
  searchLabel?: string;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {onSearch && (
        <div className="mt-4">
          <Btn type="button" onClick={onSearch}>
            <ActionIcon action="search" size="button" />
            {searchLabel}
          </Btn>
        </div>
      )}
    </Card>
  );
}

/** Card kết quả kiểu TTVH */
export function ResultsPanel({
  title = "Kết quả",
  actions,
  children,
  empty,
  count,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  count?: number;
}) {
  return (
    <Card className="overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {typeof count === "number" && (
            <p className="mt-0.5 text-xs text-slate-500">{count} bản ghi</p>
          )}
        </div>
        {actions}
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
      ) : (
        children
      )}
    </Card>
  );
}
