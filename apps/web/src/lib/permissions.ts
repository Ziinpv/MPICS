import { SessionUser } from "./auth";
import { UserRole } from "@prisma/client";

export function canCreateContent(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

export function canModerateContent(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

export function canControlDevice(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

export function canManageSchedule(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

export function canCreateLocation(user: SessionUser) {
  return user.role === UserRole.USER || user.role === UserRole.ADMIN;
}

export function canUpdateLocation(user: SessionUser) {
  return user.role === UserRole.USER || user.role === UserRole.ADMIN;
}

export function canManageUsers(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

export function canManageLocationTypes(user: SessionUser) {
  return user.role === UserRole.ADMIN;
}

/** User chỉ thấy org của mình; Admin thấy subtree path */
export function orgFilterForList(user: SessionUser): { orgId?: string; orgPathPrefix?: string } {
  if (user.role === UserRole.ADMIN) {
    return { orgPathPrefix: user.orgPath };
  }
  return { orgId: user.orgId };
}

/** Prisma where cho Location — dùng chung list / map / export */
export function locationWhereForUser(user: SessionUser): Record<string, unknown> {
  if (user.role === UserRole.USER) {
    return { orgId: user.orgId };
  }
  return { org: { path: { startsWith: user.orgPath } } };
}

/** Org query cho meta/catalog — USER chỉ org mình (+ parent province nếu cần hiển thị) */
export function orgWhereForUser(user: SessionUser): Record<string, unknown> {
  if (user.role === UserRole.USER) {
    return {
      OR: [{ id: user.orgId }, { path: user.orgPath }, { children: { some: { id: user.orgId } } }],
    };
  }
  return { path: { startsWith: user.orgPath } };
}

export function canAccessLocation(
  user: SessionUser,
  loc: { orgId: string; org?: { path: string } | null },
): boolean {
  if (user.role === UserRole.USER) return loc.orgId === user.orgId;
  const path = loc.org?.path;
  if (!path) return false;
  return path.startsWith(user.orgPath);
}

/** Admin chỉ gán org trong subtree; User chỉ org mình */
export function canAssignOrgId(user: SessionUser, org: { id: string; path: string }): boolean {
  if (user.role === UserRole.USER) return org.id === user.orgId;
  return org.path.startsWith(user.orgPath);
}

/** User được export CSV phạm vi xã mình; Admin export subtree */
export function canExportLocations(user: SessionUser) {
  return user.role === UserRole.USER || user.role === UserRole.ADMIN;
}
