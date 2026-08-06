export const LOCATION_TYPE_LABELS: Record<string, string> = {
  cultural_site: "Địa điểm văn hóa",
  religious_site: "Cơ sở tín ngưỡng",
  communication_device: "Thiết bị truyền thông thông minh",
  billboard: "Bảng hiệu",
  wind_banner: "Bạt gió",
};

/** Loại thiết bị ngoài trời (subset của LocationType / DeviceType) */
export const DEVICE_TYPE_LABELS: Record<string, string> = {
  communication_device: "Thiết bị truyền thông thông minh",
  billboard: "Bảng hiệu",
  wind_banner: "Bạt gió",
};

export const DEVICE_TYPE_OPTIONS = Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const LOCATION_TYPE_OPTIONS = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Màu / nhãn ngắn cho marker map & badge (không dùng emoji) */
export const LOCATION_TYPE_VISUAL: Record<string, { short: string; color: string }> = {
  cultural_site: { short: "VH", color: "#0f5839" },
  religious_site: { short: "TN", color: "#b74106" },
  communication_device: { short: "TT", color: "#146f47" },
  billboard: { short: "BH", color: "#dd6102" },
  wind_banner: { short: "BG", color: "#0ea5e9" },
};

/** Loại cần hồ sơ giấy phép / văn bản liên quan */
export const LICENSE_REQUIRED_TYPES = new Set(["cultural_site", "religious_site"]);

export function requiresLicenseDocs(locationType: string) {
  return LICENSE_REQUIRED_TYPES.has(locationType);
}

export const LOCATION_SUBTYPES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  cultural_site: [
    { value: "di_tich", label: "Di tích lịch sử" },
    { value: "nha_co", label: "Nhà cổ" },
    { value: "bao_tang", label: "Bảo tàng / nhà trưng bày" },
    { value: "other", label: "Khác" },
  ],
  religious_site: [
    { value: "dinh_lang", label: "Đình làng" },
    { value: "chua", label: "Chùa" },
    { value: "den", label: "Đền / miếu" },
    { value: "other", label: "Khác" },
  ],
  communication_device: [
    { value: "truyen_thanh_thong_minh", label: "Truyền thanh thông minh" },
    { value: "other", label: "Khác" },
  ],
  billboard: [
    { value: "bang_vay", label: "Bảng vẫy" },
    { value: "bang_2_chan", label: "Bảng 2 chân" },
    { value: "digital_sign", label: "Bảng điện tử / LED" },
    { value: "other", label: "Khác" },
  ],
  wind_banner: [
    { value: "bat_gio", label: "Bạt gió đứng" },
    { value: "bat_mai_che", label: "Bạt mái che" },
    { value: "banner_ngang", label: "Banner ngang" },
    { value: "other", label: "Khác" },
  ],
};

export const LOCATION_SUBTYPES = Object.values(LOCATION_SUBTYPES_BY_TYPE).flat();

export const OPERATION_STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  suspended: "Tạm đình chỉ",
  expired: "Hết hạn GP",
};

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  ready_to_air: "Sẵn sàng phát",
  rejected: "Từ chối",
  scheduled: "Đã lên lịch",
  aired: "Đã phát",
};
