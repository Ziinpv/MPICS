"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-lg bg-slate-100 text-slate-500" style={{ height: "420px" }}>
      Đang tải bản đồ…
    </div>
  ),
});

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: string;
  popup?: string;
  /** DeviceType / LocationType — dùng custom Leaflet icon */
  type?: string;
  online?: boolean;
};

type Props = {
  markers?: MapMarker[];
  center?: LatLngExpression;
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  pickPosition?: { lat: number; lng: number } | null;
  onPick?: (pos: { lat: number; lng: number }) => void;
};

export default function MapView(props: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(true);
  }, []);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-rose-50 px-4 text-center text-sm text-rose-700"
        style={{ height: props.height || "420px" }}
      >
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-100 text-slate-500"
        style={{ height: props.height || "420px" }}
      >
        Đang tải bản đồ…
      </div>
    );
  }

  return (
    <div style={{ height: props.height || "420px" }} className="overflow-hidden rounded-lg">
      <MapInner
        {...props}
        onError={(msg) => setError(msg || "Không tải được bản đồ Leaflet")}
      />
    </div>
  );
}
