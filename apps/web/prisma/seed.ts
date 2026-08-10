import { PrismaClient, ContentCategory, ContentStatus, LocationType, OperationStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const LAM_DONG_CODE = 68;

type ProvinceApiWard = {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  province_code: number;
};

type ProvinceApiProvince = {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  wards: ProvinceApiWard[];
};

async function fetchLamDongProvince(): Promise<ProvinceApiProvince> {
  const res = await fetch(`https://provinces.open-api.vn/api/v2/p/${LAM_DONG_CODE}?depth=2`);
  if (!res.ok) {
    throw new Error(`Khong the lay du lieu Lam Dong tu API: ${res.status}`);
  }
  return res.json() as Promise<ProvinceApiProvince>;
}

async function main() {
  await prisma.deviceCommand.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.scheduleTarget.deleteMany();
  await prisma.broadcastItem.deleteMany();
  await prisma.broadcastSchedule.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.locationMedia.deleteMany();
  await prisma.location.deleteMany();
  await prisma.locationTypeDef.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.content.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.device.deleteMany();
  await prisma.deviceCluster.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const subtypeSeed: { groupType: LocationType; code: string; name: string; sortOrder: number }[] = [
    { groupType: LocationType.cultural_site, code: "di_tich", name: "Di tích lịch sử", sortOrder: 1 },
    { groupType: LocationType.cultural_site, code: "nha_co", name: "Nhà cổ", sortOrder: 2 },
    { groupType: LocationType.cultural_site, code: "bao_tang", name: "Bảo tàng / nhà trưng bày", sortOrder: 3 },
    { groupType: LocationType.cultural_site, code: "other", name: "Khác", sortOrder: 99 },
    { groupType: LocationType.religious_site, code: "dinh_lang", name: "Đình làng", sortOrder: 1 },
    { groupType: LocationType.religious_site, code: "chua", name: "Chùa", sortOrder: 2 },
    { groupType: LocationType.religious_site, code: "den", name: "Đền / miếu", sortOrder: 3 },
    { groupType: LocationType.religious_site, code: "other", name: "Khác", sortOrder: 99 },
    { groupType: LocationType.communication_device, code: "truyen_thanh_thong_minh", name: "Truyền thanh thông minh", sortOrder: 1 },
    { groupType: LocationType.communication_device, code: "other", name: "Khác", sortOrder: 99 },
    { groupType: LocationType.billboard, code: "bang_vay", name: "Bảng vẫy", sortOrder: 1 },
    { groupType: LocationType.billboard, code: "bang_2_chan", name: "Bảng 2 chân", sortOrder: 2 },
    { groupType: LocationType.billboard, code: "digital_sign", name: "Bảng điện tử / LED", sortOrder: 3 },
    { groupType: LocationType.billboard, code: "other", name: "Khác", sortOrder: 99 },
    { groupType: LocationType.wind_banner, code: "bat_gio", name: "Bạt gió đứng", sortOrder: 1 },
    { groupType: LocationType.wind_banner, code: "bat_mai_che", name: "Bạt mái che", sortOrder: 2 },
    { groupType: LocationType.wind_banner, code: "banner_ngang", name: "Banner ngang", sortOrder: 3 },
    { groupType: LocationType.wind_banner, code: "other", name: "Khác", sortOrder: 99 },
  ];
  await prisma.locationTypeDef.createMany({ data: subtypeSeed });

  const lamDong = await fetchLamDongProvince();
  const province = await prisma.organization.create({
    data: {
      code: String(lamDong.code),
      name: lamDong.name,
      type: "province",
      path: `/${lamDong.codename}`,
    },
  });

  const communeMap = new Map<string, { id: string; name: string; code: string; path: string }>();
  for (const ward of lamDong.wards) {
    const org = await prisma.organization.create({
      data: {
        code: String(ward.code),
        name: ward.name,
        type: "commune",
        parentId: province.id,
        path: `/${lamDong.codename}/${ward.codename}`,
      },
    });
    communeMap.set(ward.name, {
      id: org.id,
      name: ward.name,
      code: String(ward.code),
      path: `/${lamDong.codename}/${ward.codename}`,
    });
  }

  const xa1 =
    communeMap.get("Xã Lạc Dương") ||
    communeMap.get("Phường Xuân Hương - Đà Lạt") ||
    Array.from(communeMap.values())[0];
  const xa2 =
    communeMap.get("Xã Đơn Dương") ||
    communeMap.get("Phường Cam Ly - Đà Lạt") ||
    Array.from(communeMap.values())[1];

  if (!xa1 || !xa2) {
    throw new Error("Khong tim thay du lieu xa/phuong Lam Dong de gan cho tai khoan demo");
  }

  const passwordHash = await bcrypt.hash("Demo@123", 10);
  const mustChangePassword =
    process.env.SEED_MUST_CHANGE_PASSWORD === "1" ||
    process.env.SEED_MUST_CHANGE_PASSWORD === "true";

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash,
      fullName: "Quản trị viên Demo",
      role: UserRole.ADMIN,
      orgId: province.id,
      email: "admin@mpcis.demo",
      mustChangePassword,
    },
  });

  const userXa1 = await prisma.user.create({
    data: {
      username: "user.xa1",
      passwordHash,
      fullName: `Cán bộ ${xa1.name}`,
      role: UserRole.USER,
      orgId: xa1.id,
      email: "user.xa1@mpcis.demo",
      mustChangePassword,
    },
  });

  await prisma.user.create({
    data: {
      username: "user.xa2",
      passwordHash,
      fullName: `Cán bộ ${xa2.name}`,
      role: UserRole.USER,
      orgId: xa2.id,
      mustChangePassword,
    },
  });

  const cluster1 = await prisma.deviceCluster.create({
    data: {
      orgId: xa1.id,
      code: `CUM_${xa1.code}`,
      name: `Cụm truyền thông ${xa1.name}`,
      description: `Cụm thiết bị truyền thông trung tâm ${xa1.name}`,
    },
  });

  const cluster2 = await prisma.deviceCluster.create({
    data: {
      orgId: xa2.id,
      code: `CUM_${xa2.code}`,
      name: `Cụm truyền thông ${xa2.name}`,
    },
  });

  // Tọa độ thực tế: trung tâm Lạc Dương ~12.004/108.419; Thạnh Mỹ (Đơn Dương) ~11.807/108.547
  const lacDuongCenter = { lat: 12.00405, lng: 108.41905 };
  const donDuongCenter = { lat: 11.80722, lng: 108.54667 };

  const deviceDefs = [
    {
      code: "COM-XA1-01",
      name: `Thiết bị truyền thông — nhà văn hóa ${xa1.name}`,
      orgId: xa1.id,
      clusterId: cluster1.id,
      lat: lacDuongCenter.lat + 0.0012,
      lng: lacDuongCenter.lng - 0.0008,
      online: true,
      type: "communication_device" as const,
    },
    {
      code: "COM-XA1-02",
      name: `Thiết bị truyền thông — chợ ${xa1.name}`,
      orgId: xa1.id,
      clusterId: cluster1.id,
      lat: lacDuongCenter.lat - 0.0006,
      lng: lacDuongCenter.lng + 0.0015,
      online: true,
      type: "communication_device" as const,
    },
    {
      code: "COM-XA1-03",
      name: `Thiết bị truyền thông — trung tâm ${xa1.name}`,
      orgId: xa1.id,
      clusterId: cluster1.id,
      lat: lacDuongCenter.lat,
      lng: lacDuongCenter.lng,
      online: false,
      type: "communication_device" as const,
    },
    {
      code: "COM-XA2-01",
      name: `Thiết bị truyền thông — UBND ${xa2.name}`,
      orgId: xa2.id,
      clusterId: cluster2.id,
      lat: donDuongCenter.lat + 0.0008,
      lng: donDuongCenter.lng - 0.0011,
      online: true,
      type: "communication_device" as const,
    },
    {
      code: "BH-XA1-01",
      name: `Bảng hiệu cổng chào ${xa1.name}`,
      orgId: xa1.id,
      clusterId: cluster1.id,
      lat: lacDuongCenter.lat + 0.002,
      lng: lacDuongCenter.lng + 0.0022,
      online: false,
      type: "billboard" as const,
    },
    {
      code: "BG-XA2-01",
      name: `Bạt gió trường học ${xa2.name}`,
      orgId: xa2.id,
      clusterId: cluster2.id,
      lat: donDuongCenter.lat - 0.0014,
      lng: donDuongCenter.lng + 0.0009,
      online: false,
      type: "wind_banner" as const,
    },
  ];

  for (const d of deviceDefs) {
    const mqttPass = `dev-${d.code}`;
    const mqttPasswordHash = await bcrypt.hash(mqttPass, 10);
    await prisma.device.create({
      data: {
        deviceCode: d.code,
        name: d.name,
        orgId: d.orgId,
        clusterId: d.clusterId,
        lat: d.lat,
        lng: d.lng,
        online: d.online,
        lastSeenAt: d.online ? new Date() : null,
        type: d.type,
        rssi: d.online ? -70 : null,
        mqttPasswordHash,
        mqttPasswordSetAt: new Date(),
      },
    });
  }

  const locations = [
    {
      name: "Bảng hiệu quán cafe Trung tâm",
      locationType: LocationType.billboard,
      locationSubtype: "bang_vay",
      lat: lacDuongCenter.lat - 0.0009,
      lng: lacDuongCenter.lng + 0.0011,
      licenseNumber: "GP-2024-001",
      licenseConditions: "Không che khuất tầm nhìn giao thông",
      licenseDate: new Date("2024-01-15"),
      expiryDate: new Date("2026-01-15"),
      operationStatus: OperationStatus.active,
      address: `Gần chợ ${xa1.name}`,
    },
    {
      name: `Đình làng ${xa1.name}`,
      locationType: LocationType.religious_site,
      locationSubtype: "dinh_lang",
      lat: lacDuongCenter.lat + 0.0018,
      lng: lacDuongCenter.lng - 0.0015,
      operationStatus: OperationStatus.active,
      address: "Thôn Trung",
    },
    {
      name: "Di tích nhà cổ họ Nguyễn",
      locationType: LocationType.cultural_site,
      lat: lacDuongCenter.lat - 0.0021,
      lng: lacDuongCenter.lng + 0.0024,
      operationStatus: OperationStatus.active,
      address: "Thôn Đông",
    },
    {
      name: "Bạt gió sân vận động",
      locationType: LocationType.wind_banner,
      locationSubtype: "bat_mai_che",
      lat: lacDuongCenter.lat + 0.0005,
      lng: lacDuongCenter.lng + 0.003,
      licenseNumber: "GP-2023-088",
      licenseDate: new Date("2023-06-01"),
      expiryDate: new Date("2025-06-01"),
      operationStatus: OperationStatus.expired,
      address: `Sân vận động ${xa1.name}`,
    },
    {
      name: `Thiết bị truyền thông thông minh — cổng UBND ${xa1.name}`,
      locationType: LocationType.communication_device,
      locationSubtype: "truyen_thanh_thong_minh",
      lat: lacDuongCenter.lat + 0.0003,
      lng: lacDuongCenter.lng - 0.0004,
      operationStatus: OperationStatus.active,
      address: `Cổng UBND ${xa1.name}`,
    },
  ];

  for (const loc of locations) {
    await prisma.location.create({
      data: {
        ...loc,
        orgId: xa1.id,
        provinceOrgId: province.id,
        createdById: userXa1.id,
      },
    });
  }

  const media = await prisma.mediaAsset.create({
    data: {
      storageKey: "mock/ban-tin-sang.mp3",
      cdnUrl: "https://example.com/mock/ban-tin-sang.mp3",
      durationSec: 90,
      signature: "demo-signature",
      checksum: "demo-checksum",
    },
  });

  const content = await prisma.content.create({
    data: {
      orgId: province.id,
      authorId: admin.id,
      title: "Bản tin sáng — An toàn giao thông",
      bodyPlain:
        "Kính thưa bà con, hôm nay UBND huyện nhắc nhở chấp hành luật giao thông đường bộ, đội mũ bảo hiểm khi tham gia giao thông.",
      category: ContentCategory.admin_notice,
      status: ContentStatus.ready_to_air,
      mediaAssetId: media.id,
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      orgId: province.id,
      name: "Chiến dịch demo buổi sáng",
      type: "oneshot",
    },
  });

  const schedule = await prisma.broadcastSchedule.create({
    data: {
      campaignId: campaign.id,
      name: "Bản tin sáng demo",
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "scheduled",
      createdById: admin.id,
      items: {
        create: [{ contentId: content.id, mediaAssetId: media.id, sortOrder: 1 }],
      },
      targets: {
        create: [{ clusterId: cluster1.id, include: true }],
      },
    },
  });

  console.log("Seed OK");
  console.log({
    province: `${province.name} (${lamDong.wards.length} xa/phuong/dac khu)`,
    demoCommunes: [xa1.name, xa2.name],
    accounts: "admin / user.xa1 / user.xa2 — password Demo@123",
    scheduleId: schedule.id,
    contentId: content.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
