"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { mediaUrl } from "@/lib/mediaUrl";
import { checkLatLngForOrg } from "@/lib/communeBbox";

const DA_LAT_CENTER = { lat: 11.9404, lng: 108.4583 };
const GPS_ZOOM = 16;

export default function NewLocationPage() {
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
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(DA_LAT_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [geoWarn, setGeoWarn] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  const needLicense = requiresLicenseDocs(locationType);
  const subtypes = useMemo(
    () => LOCATION_SUBTYPES_BY_TYPE[locationType] || LOCATION_SUBTYPES_BY_TYPE.billboard,
    [locationType]
  );

  const provinces = useMemo(() => orgs.filter((o) => o.type === "province"), [orgs]);
  const communes = useMemo(() => orgs.filter((o) => o.type === "commune"), [orgs]);
  const selectedCommune = useMemo(
    () => communes.find((c) => c.id === communeId) || null,
    [communes, communeId],
  );

  useEffect(() => {
    if (!pick || !selectedCommune) {
      setGeoWarn("");
      return;
    }
    const geo = checkLatLngForOrg(selectedCommune, pick.lat, pick.lng);
    setGeoWarn(geo.ok ? "" : geo.error);
  }, [pick, selectedCommune]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMetaLoading(true);
      try {
        const [meRes, metaRes] = await Promise.all([fetch("/api/me"), fetch("/api/meta")]);
        const meData = await meRes.json();
        const metaData = await metaRes.json();
        if (cancelled) return;

        const user = meData.user;
        const loadedOrgs = metaData.orgs || [];
        setMe(user);
        setOrgs(loadedOrgs);

        const province = loadedOrgs.find((o: any) => o.type === "province");
        if (province) setProvinceId(province.id);

        const communeList = loadedOrgs.filter((o: any) => o.type === "commune");
        const preferred =
          communeList.find((o: any) => o.id === user?.orgId) ||
          communeList.find((o: any) => o.name === user?.orgName) ||
          communeList[0];
        setCommuneId(preferred?.id || "");
      } catch {
        if (!cancelled) setMsg("Không tải được danh sách xã/phường Lâm Đồng");
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const first = LOCATION_SUBTYPES_BY_TYPE[locationType]?.[0]?.value || "other";
    setLocationSubtype(first);
    if (!requiresLicenseDocs(locationType)) {
      setLicenseNumber("");
      setLicenseConditions("");
      setLicenseDate("");
      setExpiryDate("");
    }
  }, [locationType]);

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
    if (!communeId) {
      setMsg("Vui lòng chọn xã/phường");
      return;
    }
    if (!pick) {
      setMsg("Hãy chọn tọa độ trên bản đồ");
      return;
    }
    if (selectedCommune) {
      const geo = checkLatLngForOrg(selectedCommune, pick.lat, pick.lng);
      if (!geo.ok) {
        setMsg(geo.error);
        return;
      }
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
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        orgId: communeId,
        locationType,
        locationSubtype,
        address: address.trim(),
        licenseNumber: needLicense ? licenseNumber.trim() : null,
        licenseConditions: needLicense ? licenseConditions.trim() || null : null,
        licenseDate: needLicense && licenseDate ? licenseDate : null,
        expiryDate: needLicense && expiryDate ? expiryDate : null,
        operationStatus,
        lat: pick.lat,
        lng: pick.lng,
        photoKeys,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Lỗi");
      return;
    }
    router.push("/user/locations");
  }

  return (
    <div>
      <PageHeader title="Thêm địa điểm / tài sản" />
      {msg && <p className="mb-3 text-sm text-rose-600">{msg}</p>}
      {geoWarn && !msg && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {geoWarn}
        </p>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div>
            <label>Tỉnh</label>
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} disabled>
              {!provinces.length && <option value="">Đang tải…</option>}
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Xã / phường (Lâm Đồng)</label>
            <select
              value={communeId}
              onChange={(e) => setCommuneId(e.target.value)}
              disabled={metaLoading || !communes.length}
              required
            >
              {!communes.length && <option value="">Đang tải danh sách…</option>}
              {communes.map((c) => {
                const allowed = !me || c.id === me.orgId;
                return (
                  <option key={c.id} value={c.id} disabled={!allowed}>
                    {c.name}
                    {!allowed ? " (ngoài phạm vi tài khoản)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {metaLoading
                ? "Đang tải danh sách xã/phường…"
                : `Đã seed ${communes.length} xã/phường/đặc khu của Lâm Đồng.`}
              {me?.orgName ? ` Tài khoản hiện chỉ được lưu vào: ${me.orgName}.` : ""}
            </p>
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
            <p className="mt-1 text-xs text-slate-500">
              {needLicense
                ? "Loại này yêu cầu hồ sơ giấy phép / văn bản liên quan."
                : "Bảng hiệu / bạt gió / thiết bị truyền thông: cần địa chỉ và tình trạng hoạt động."}
            </p>
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
                  placeholder="VD: GP-2024-001, QĐ công nhận di tích…"
                />
              </div>
              <div>
                <label>Điều kiện / nội dung kèm theo</label>
                <textarea
                  rows={2}
                  value={licenseConditions}
                  onChange={(e) => setLicenseConditions(e.target.value)}
                  placeholder="Điều kiện hoạt động, phạm vi được cấp…"
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
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5">
              <StatusIcon operationStatus={operationStatus} size="sm" />
              Tình trạng hoạt động <span className="text-rose-600">*</span>
            </label>
            <select value={operationStatus} onChange={(e) => setOperationStatus(e.target.value)} required>
              {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Ảnh hiện trạng</label>
            <input type="file" accept="image/*" onChange={onUpload} />
            {photoKeys.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photoKeys.map((k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={k} src={mediaUrl(k)} alt="" className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            )}
          </div>
          <Btn type="submit" disabled={loading || metaLoading}>
            {loading ? "Đang lưu…" : "Lưu địa điểm"}
          </Btn>
        </Card>

        <Card>
          <h2 className="mb-2 font-medium">Chọn tọa độ trên bản đồ</h2>
          <p className="mb-3 text-sm text-slate-500">
            Lấy GPS thiết bị hoặc click lên map để chọn vị trí
          </p>

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
