"use client";

import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { ActionIcon } from "@/components/ActionIcon";
import { StatusIcon } from "@/components/StatusIcon";

const links = [
  {
    href: "/user/map",
    title: "Bản đồ tra cứu",
    desc: "Xem địa điểm/tài sản trên GIS",
    icon: <ActionIcon action="map" size="card" className="text-brand-700" />,
  },
  {
    href: "/user/locations/new",
    title: "Thêm địa điểm",
    desc: "Form + pick GPS + ảnh hiện trạng",
    icon: <ActionIcon action="add" size="card" className="text-accent-600" />,
  },
  {
    href: "/user/incidents",
    title: "Báo sự cố",
    desc: "Báo lỗi thiết bị IoT địa bàn",
    icon: <StatusIcon status="error" size="card" />,
  },
];

export default function UserHomePage() {
  return (
    <div>
      <PageHeader
        title="Tổng quan User"
        subtitle="Số hóa địa điểm GIS và báo cáo sự cố trên địa bàn phụ trách"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="group block">
            <Card className="h-full transition duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-card-hover">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                {item.icon}
              </div>
              <div className="text-base font-semibold text-slate-900">{item.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
