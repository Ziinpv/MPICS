"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MapView from "@/components/MapView";
import { PageHeader, Card, Btn } from "@/components/ui";
import {
  LOCATION_SUBTYPES_BY_TYPE,
  OPERATION_STATUS_LABELS,
  requiresLicenseDocs,
} from "@/lib/labels";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { GpsLocateButton } from "@/components/GpsLocateButton";
import { ActionIcon } from "@/components/ActionIcon";
import { DeviceTypeIcon } from "@/components/DeviceTypeIcon";
import { StatusIcon } from "@/components/StatusIcon";

const DA_LAT_CENTER = { lat: 11.9404, lng: 108.4583 };
const GPS_ZOOM = 16;

type Props = {
  locationId: string;
  backHref: string;
  /** Admin có thể đổi xã; User giữ org hiện tại */
  allowOrgChange?: boolean;
};

function toDateInput(v: string | Date | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function LocationEditor({ locationId, backHref, allowOrgChange = false }: Props) {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("billboard");
  const [locationSubtype, setLocationSubtype] = useState("bang_vay");
  const [address, setAddress] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseConditions, setLicenseConditions] = useState("");
  const [licenseDate, setLicenseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [operationStatus, setOperationStatus] = useState("active");
  const [note, setNote] = useState("");
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(DA_LAT_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [subtypesByType, setSubtypesByType] = useState(LOCATION_SUBTYPES_BY_TYPE);

  const needLicense = requiresLicenseDocs(locationType);
  const subtypes = useMemo(
    () => subtypesByType[locationType] || LOCATION_SUBTYPES_BY_TYPE.billboard,
    [locationType, subtypesByType],
  );

  const provinces = useMemo(() => orgs.filter((o) => o.type === "province"), [orgs]);
  const communes = useMemo(() => orgs.filter((o) => o.type === "commune"), [orgs]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMetaLoading(true);
      try {
        const [meRes, metaRes, locRes, typesRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/meta"),
          fetch(`/api/locations/${locationId}`),
          fetch("/api/location-types"),
        ]);
        const meData = await meRes.json();
        const metaData = await metaRes.json();
        const locData = await locRes.json();
        const typesData = await typesRes.json();
        if (cancelled) return;

        if (!locRes.ok) {
          setMsg(locData.error || "Không tải được địa điểm");
          setMetaLoading(false);
          return;
        }

        const user = meData.user;
        const loadedOrgs = metaData.orgs || [];
        setMe(user);
        setOrgs(loadedOrgs);

        if (typesData.byGroup && Object.keys(typesData.byGroup).length) {
          setSubtypesByType(typesData.byGroup);
        }

        const loc = locData.location;
        setName(loc.name || "");
        setLocationType(loc.locationType || "billboard");
        setLocationSubtype(loc.locationSubtype || "other");
        setAddress(loc.address || "");
        setLicenseNumber(loc.licenseNumber || "");
        setLicenseConditions(loc.licenseConditions || "");
        setLicenseDate(toDateInput(loc.licenseDate));
        setExpiryDate(toDateInput(loc.expiryDate));
        setOperationStatus(loc.operationStatus || "active");
        setNote(loc.note || "");
        setCommuneId(loc.orgId || "");
        setPick({ lat: loc.lat, lng: loc.lng });
        setMapZoom(GPS_ZOOM);
        setPhotoKeys((loc.media || []).map((m: any) => m.storageKey));

        const province = loadedOrgs.find((o: any) => o.type === "province");
        if (province) setProvinceId(province.id);
      } catch {
        if (!cancelled) setMsg("Lỗi tải dữ liệu");
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  useEffect(() => {
    if (metaLoading) return;
    const list = subtypesByType[locationType] || [];
    if (!list.some((s) => s.value === locationSubtype)) {
      setLocationSubtype(list[0]?.value || "other");
    }
    if (!requiresLicenseDocs(locationType)) {
      // keep existing license fields; don't wipe on edit when switching away then back
    }
  }, [locationType, subtypesByType, locationSubtype, metaLoading]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setPhotoKeys((prev) => [...prev, data.storageKey]);
    else setMsg(data.error || "Upload lỗi");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!pick) {
      setMsg("Hãy chọn tọa độ trên bản đồ");
      return;
    }
    if (!address.trim()) {
      setMsg("Vui lòng nhập địa chỉ");
      return;
    }
    if (needLicense) {
      if (!licenseNumber.trim()) {
        setMsg("Địa điểm văn hóa / tín ngưỡng bắt buộc có số giấy phép / văn bản");
        return;
      }
      if (!licenseDate) {
        setMsg("Vui lòng nhập ngày cấp giấy phép / văn bản");
        return;
      }
    }

    setLoading(true);
    const res = await fetch(`/api/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        locationType,
        locationSubtype,
        address: address.trim(),
        licenseNumber: needLicense ? licenseNumber.trim() : licenseNumber.trim() || null,
        licenseConditions: needLicense ? licenseConditions.trim() || null : null,
        licenseDate: needLicense && licenseDate ? licenseDate : null,
        expiryDate: needLicense && expiryDate ? expiryDate : null,
        operationStatus,
        note: note.trim() || null,
        lat: pick.lat,
        lng: pick.lng,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Lỗi");
      return;
    }
    router.push(backHref);
  }

  return (
    <div>
      <PageHeader
        title="Sửa địa điểm"
        subtitle={name || locationId}
        actions={
          <Link href={backHref}>
            <Btn variant="secondary">Quay lại</Btn>
          </Link>
        }
      />
      {msg && <p className="mb-3 text-sm text-rose-600">{msg}</p>}
      {metaLoading && <p className="mb-3 text-sm text-slate-500">Đang tải…</p>}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div>
            <label>Tỉnh</label>
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} disabled>
              {!provinces.length && <option value="">—</option>}
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Xã / phường</label>
            <select
              value={communeId}
              onChange={(e) => setCommuneId(e.target.value)}
              disabled={!allowOrgChange || metaLoading}
            >
              {communes.map((c) => {
                const allowed = allowOrgChange || !me || c.id === me.orgId || c.id === communeId;
                return (
                  <option key={c.id} value={c.id} disabled={!allowed}>
                    {c.name}
                  </option>
                );
              })}
            </select>
            {!allowOrgChange && (
              <p className="mt-1 text-xs text-slate-400">User không đổi xã khi sửa (giữ org đã tạo).</p>
            )}
          </div>
          <div>
            <label>Tên địa điểm</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="flex items-center gap-1.5">
              <DeviceTypeIcon type={locationType} size="sm" />
              Phân loại
            </label>
            <LocationTypeSelect value={locationType} onChange={setLocationType} />
          </div>
          <div>
            <label>Chi tiết loại</label>
            <select value={locationSubtype} onChange={(e) => setLocationSubtype(e.target.value)}>
              {subtypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>
              Địa chỉ mô tả <span className="text-rose-600">*</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Số nhà, thôn/xóm, đường…"
            />
          </div>

          {needLicense && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <div className="text-sm font-medium text-amber-900">Hồ sơ / văn bản liên quan</div>
              <div>
                <label>
                  Số giấy phép / văn bản <span className="text-rose-600">*</span>
                </label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required={needLicense}
                />
              </div>
              <div>
                <label>Điều kiện / nội dung kèm theo</label>
                <textarea
                  rows={2}
                  value={licenseConditions}
                  onChange={(e) => setLicenseConditions(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>
                    Ngày cấp <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={licenseDate}
                    onChange={(e) => setLicenseDate(e.target.value)}
                    required={needLicense}
                  />
                </div>
                <div>
                  <label>Ngày hết hạn</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5">
              <StatusIcon operationStatus={operationStatus} size="sm" />
              Tình trạng hoạt động
            </label>
            <select
              value={operationStatus}
              onChange={(e) => setOperationStatus(e.target.value)}
              required
            >
              {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Ghi chú</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <label>Ảnh hiện trạng</label>
            <input type="file" accept="image/*" onChange={onUpload} />
            {photoKeys.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photoKeys.map((k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={k} src={k} alt="" className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">Ảnh đã gắn khi tạo; upload thêm ở đây chỉ lưu file (chưa gắn lại vào bản ghi).</p>
          </div>
          <Btn type="submit" disabled={loading || metaLoading}>
            {loading ? "Đang lưu…" : "Lưu thay đổi"}
          </Btn>
        </Card>

        <Card>
          <h2 className="mb-2 font-medium">Tọa độ trên bản đồ</h2>
          <div className="mb-3">
            <GpsLocateButton
              onLocated={({ lat, lng, accuracy }) => {
                setPick({ lat, lng });
                setMapZoom(GPS_ZOOM);
                setGpsAccuracy(accuracy);
                setMsg("");
              }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5">
              <ActionIcon action="gps" size="sm" />
              Latitude / Longitude
            </label>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={pick?.lat ?? ""}
                  onChange={(e) => {
                    const lat = Number(e.target.value);
                    if (!Number.isFinite(lat)) return;
                    setPick((prev) => ({ lat, lng: prev?.lng ?? DA_LAT_CENTER.lng }));
                    setGpsAccuracy(null);
                  }}
                  required
                />
              </div>
              <div>
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={pick?.lng ?? ""}
                  onChange={(e) => {
                    const lng = Number(e.target.value);
                    if (!Number.isFinite(lng)) return;
                    setPick((prev) => ({ lat: prev?.lat ?? DA_LAT_CENTER.lat, lng }));
                    setGpsAccuracy(null);
                  }}
                  required
                />
              </div>
            </div>
          </div>
          <MapView
            pickMode
            pickPosition={pick}
            onPick={(pos) => {
              setPick(pos);
              setGpsAccuracy(null);
            }}
            height="420px"
            center={[pick?.lat ?? DA_LAT_CENTER.lat, pick?.lng ?? DA_LAT_CENTER.lng]}
            zoom={mapZoom}
          />
          {pick && (
            <p className="mt-2 font-mono text-xs text-slate-600">
              lat: {pick.lat.toFixed(6)} · lng: {pick.lng.toFixed(6)}
              {gpsAccuracy != null ? ` · ±${Math.round(gpsAccuracy)}m` : ""}
            </p>
          )}
        </Card>
      </form>
    </div>
  );
}
