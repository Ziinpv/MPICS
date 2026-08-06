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
