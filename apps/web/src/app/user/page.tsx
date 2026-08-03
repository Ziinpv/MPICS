"use client";

import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

export default function UserHomePage() {
  return (
    <div>
      <PageHeader title="Tổng quan User" />
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/user/map">
          <Card className="transition hover:border-teal-300">
            <div className="font-medium">Bản đồ tra cứu</div>
            <p className="mt-1 text-sm text-slate-500">Xem địa điểm/tài sản trên GIS</p>
          </Card>
        </Link>
        <Link href="/user/locations/new">
          <Card className="transition hover:border-teal-300">
            <div className="font-medium">Thêm địa điểm</div>
            <p className="mt-1 text-sm text-slate-500">Form + pick GPS + ảnh hiện trạng</p>
          </Card>
        </Link>
        <Link href="/user/incidents">
          <Card className="transition hover:border-teal-300">
            <div className="font-medium">Báo sự cố</div>
            <p className="mt-1 text-sm text-slate-500">Báo lỗi thiết bị IoT địa bàn</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
