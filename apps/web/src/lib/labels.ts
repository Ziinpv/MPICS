export const LOCATION_TYPE_LABELS: Record<string, string> = {
  cultural_site: "Địa điểm văn hóa",
  religious_site: "Cơ sở tín ngưỡng",
  signboard: "Biển hiệu / bảng / bạt",
  smart_device: "Thiết bị thông minh",
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
  signboard: [
    { value: "bang_vay", label: "Bảng vẫy" },
    { value: "bang_2_chan", label: "Bảng 2 chân" },
    { value: "bat_mai_che", label: "Bạt mái che" },
    { value: "other", label: "Khác" },
  ],
  smart_device: [
    { value: "loa", label: "Loa thông minh" },
    { value: "led", label: "Màn hình LED" },
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
