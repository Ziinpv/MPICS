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
  await prisma.content.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.device.deleteMany();
  await prisma.deviceCluster.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

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

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash,
      fullName: "Quản trị viên Demo",
      role: UserRole.ADMIN,
      orgId: province.id,
      email: "admin@mpcis.demo",
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
    },
  });

  await prisma.user.create({
    data: {
      username: "user.xa2",
      passwordHash,
      fullName: `Cán bộ ${xa2.name}`,
      role: UserRole.USER,
      orgId: xa2.id,
    },
  });

  const cluster1 = await prisma.deviceCluster.create({
    data: {
      orgId: xa1.id,
      code: `CUM_${xa1.code}`,
      name: `Cụm loa ${xa1.name}`,
      description: `Cụm phát thanh trung tâm ${xa1.name}`,
    },
  });

  const cluster2 = await prisma.deviceCluster.create({
    data: {
      orgId: xa2.id,
      code: `CUM_${xa2.code}`,
      name: `Cụm loa ${xa2.name}`,
    },
  });

  const deviceDefs = [
    { code: "SPK-XA1-01", name: `Loa nhà văn hóa ${xa1.name}`, orgId: xa1.id, clusterId: cluster1.id, lat: 11.9485, lng: 108.4419, online: true },
    { code: "SPK-XA1-02", name: `Loa chợ ${xa1.name}`, orgId: xa1.id, clusterId: cluster1.id, lat: 11.9491, lng: 108.443, online: true },
    { code: "SPK-XA1-03", name: `Loa trung tâm ${xa1.name}`, orgId: xa1.id, clusterId: cluster1.id, lat: 11.9478, lng: 108.4405, online: false },
    { code: "SPK-XA2-01", name: `Loa UBND ${xa2.name}`, orgId: xa2.id, clusterId: cluster2.id, lat: 11.756, lng: 108.373, online: true },
    { code: "SPK-XA2-02", name: `Loa trường học ${xa2.name}`, orgId: xa2.id, clusterId: cluster2.id, lat: 11.757, lng: 108.3742, online: false },
    { code: "LED-XA1-01", name: `LED cổng chào ${xa1.name}`, orgId: xa1.id, clusterId: cluster1.id, lat: 11.948, lng: 108.4426, online: false, type: "led_screen" as const },
  ];

  for (const d of deviceDefs) {
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
        type: d.type ?? "smart_speaker",
        rssi: d.online ? -70 : null,
      },
    });
  }

  const locations = [
    {
      name: "Bảng vẫy quán cafe Trung tâm",
      locationType: LocationType.signboard,
      locationSubtype: "bang_vay",
      lat: 21.0287,
      lng: 105.8545,
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
      lat: 11.9475,
      lng: 108.4402,
      operationStatus: OperationStatus.active,
      address: "Thôn Trung",
    },
    {
      name: "Di tích nhà cổ họ Nguyễn",
      locationType: LocationType.cultural_site,
      lat: 11.9495,
      lng: 108.444,
      operationStatus: OperationStatus.active,
      address: "Thôn Đông",
    },
    {
      name: "Bạt mái che sân vận động",
      locationType: LocationType.signboard,
      locationSubtype: "bat_mai_che",
      lat: 11.9482,
      lng: 108.445,
      licenseNumber: "GP-2023-088",
      licenseDate: new Date("2023-06-01"),
      expiryDate: new Date("2025-06-01"),
      operationStatus: OperationStatus.expired,
      address: `Sân vận động ${xa1.name}`,
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
