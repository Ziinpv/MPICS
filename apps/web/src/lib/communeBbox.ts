/** Bounding box đơn giản để validate tọa độ theo xã (demo / staging). Không thay GIS ranh giới chính thức. */

export type BBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type OrgGeoRef = {
  name: string;
  code?: string | null;
  path?: string | null;
  type?: string | null;
};

/** Phạm vi rộng tỉnh Lâm Đồng (fallback khi chưa có bbox xã) */
export const LAM_DONG_BBOX: BBox = {
  minLat: 11.25,
  maxLat: 12.75,
  minLng: 107.15,
  maxLng: 108.95,
};

/** Bbox demo cho các xã seed chính (xấp xỉ quanh tâm) */
export const COMMUNE_BBOX_BY_KEY: Record<string, BBox> = {
  lac_duong: {
    minLat: 11.88,
    maxLat: 12.22,
    minLng: 108.28,
    maxLng: 108.58,
  },
  don_duong: {
    minLat: 11.62,
    maxLat: 11.98,
    minLng: 108.38,
    maxLng: 108.72,
  },
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function resolveCommuneBboxKey(org: OrgGeoRef): string | null {
  const blob = normalize([org.name, org.path || "", org.code || ""].join(" "));
  if (blob.includes("lac_duong")) return "lac_duong";
  if (blob.includes("don_duong")) return "don_duong";
  return null;
}

export function resolveOrgBbox(org: OrgGeoRef): { bbox: BBox; label: string; strictCommune: boolean } {
  const key = resolveCommuneBboxKey(org);
  if (key && COMMUNE_BBOX_BY_KEY[key]) {
    return {
      bbox: COMMUNE_BBOX_BY_KEY[key],
      label: org.name || key,
      strictCommune: true,
    };
  }
  return {
    bbox: LAM_DONG_BBOX,
    label: org.name || "Lâm Đồng",
    strictCommune: false,
  };
}

export function pointInBbox(lat: number, lng: number, bbox: BBox) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lng >= bbox.minLng &&
    lng <= bbox.maxLng
  );
}

export type GeoCheckResult =
  | { ok: true; bbox: BBox; label: string; strictCommune: boolean }
  | { ok: false; error: string; bbox: BBox; label: string; strictCommune: boolean };

/** Kiểm tra tọa độ thuộc phạm vi org (xã nếu biết, không thì tỉnh). */
export function checkLatLngForOrg(org: OrgGeoRef, lat: number, lng: number): GeoCheckResult {
  const resolved = resolveOrgBbox(org);
  if (!pointInBbox(lat, lng, resolved.bbox)) {
    const scope = resolved.strictCommune ? "xã/phường" : "tỉnh";
    return {
      ok: false,
      error: `Tọa độ nằm ngoài phạm vi ${scope} «${resolved.label}». Hãy chọn vị trí trên bản đồ trong địa bàn.`,
      ...resolved,
    };
  }
  return { ok: true, ...resolved };
}

/** Tắt bằng GEO_VALIDATION=0 | off | false */
export function isGeoValidationEnabled() {
  const v = (process.env.GEO_VALIDATION || "1").toLowerCase();
  return v !== "0" && v !== "off" && v !== "false";
}
