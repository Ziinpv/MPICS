"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./MapView";
import { buildLeafletMarkerHtml } from "@/lib/iconMap";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pickIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function PickHandler({ onPick }: { onPick?: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      // Bỏ qua nếu click vào marker/control (target không phải map pane)
      const t = e.originalEvent?.target as HTMLElement | null;
      if (t?.closest?.(".leaflet-marker-icon, .leaflet-control, a")) return;
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapCursor({ pickMode }: { pickMode?: boolean }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (pickMode) el.classList.add("mpcis-map-pick");
    else el.classList.remove("mpcis-map-pick");
    return () => el.classList.remove("mpcis-map-pick");
  }, [map, pickMode]);
  return null;
}

function Recenter({
  center,
  zoom,
  token,
}: {
  center: LatLngExpression;
  zoom: number;
  /** Chỉ recenter khi token đổi (GPS / nhập tay / mount) — tránh nhảy khi click map */
  token: number;
}) {
  const map = useMap();
  const lat = Array.isArray(center) ? Number(center[0]) : (center as L.LatLng).lat;
  const lng = Array.isArray(center) ? Number(center[1]) : (center as L.LatLng).lng;
  const lastToken = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lastToken.current === token) return;
    lastToken.current = token;
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, token, map]);
  return null;
}

function typeIcon(type?: string, online?: boolean) {
  if (!type) return defaultIcon;
  return L.divIcon({
    className: "mpcis-device-marker",
    html: buildLeafletMarkerHtml(type, online),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}

function FitBounds({
  markers,
  enabled,
}: {
  markers: MapMarker[];
  enabled?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 15, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 16 });
  }, [markers, enabled, map]);
  return null;
}

function MarkerPopup({ m }: { m: MapMarker }) {
  return (
    <Popup>
      <strong>{m.label}</strong>
      {m.popup && <div className="mt-1 text-sm">{m.popup}</div>}
      {m.href && (
        <div className="mt-2">
          <a href={m.href} className="text-sm font-medium text-teal-700 underline">
            Xem / Sửa →
          </a>
        </div>
      )}
    </Popup>
  );
}

type Props = {
  markers?: MapMarker[];
  center?: LatLngExpression;
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  pickPosition?: { lat: number; lng: number } | null;
  onPick?: (pos: { lat: number; lng: number }) => void;
  /** Tăng khi cần ép map nhảy tới center (GPS / sửa lat lng) */
  recenterToken?: number;
  /** Tự fitBounds theo markers (tra cứu) */
  fitBoundsToMarkers?: boolean;
  onError?: (msg: string) => void;
};

export default function MapInner({
  markers = [],
  center = [11.9404, 108.4583],
  zoom = 13,
  height = "420px",
  pickMode,
  pickPosition,
  onPick,
  recenterToken = 0,
  fitBoundsToMarkers,
  onError,
}: Props) {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [onError]);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon | L.Icon>();
    for (const m of markers) {
      const key = `${m.type || "default"}:${m.online === false ? "0" : "1"}`;
      if (!map.has(key)) map.set(key, typeIcon(m.type, m.online));
    }
    return map;
  }, [markers]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", minHeight: height, width: "100%" }}
      scrollWheelZoom
    >
      {!fitBoundsToMarkers && <Recenter center={center} zoom={zoom} token={recenterToken} />}
      {fitBoundsToMarkers && <FitBounds markers={markers} enabled />}
      <MapCursor pickMode={pickMode} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickMode && <PickHandler onPick={onPick} />}
      {markers.map((m) => {
        if (m.type) {
          const key = `${m.type}:${m.online === false ? "0" : "1"}`;
          const icon = icons.get(key) || typeIcon(m.type, m.online);
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
              <MarkerPopup m={m} />
            </Marker>
          );
        }
        if (m.color) {
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={9}
              pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.85, weight: 2 }}
            >
              <MarkerPopup m={m} />
            </CircleMarker>
          );
        }
        return (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
            <MarkerPopup m={m} />
          </Marker>
        );
      })}
      {pickMode && pickPosition && (
        <Marker
          position={[pickPosition.lat, pickPosition.lng]}
          icon={pickIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const ll = e.target.getLatLng();
              onPick?.({ lat: ll.lat, lng: ll.lng });
            },
          }}
        >
          <Popup autoClose={false} closeOnClick={false}>
            Kéo marker hoặc click bản đồ để chọn vị trí
          </Popup>
        </Marker>
      )}
      {!pickMode && pickPosition && (
        <CircleMarker
          center={[pickPosition.lat, pickPosition.lng]}
          radius={10}
          pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}
