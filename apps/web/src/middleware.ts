import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "mpcis_token";

function getSecret() {
  const value = process.env.JWT_SECRET?.trim();
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";
  if (!value) {
    if (appEnv === "production" || appEnv === "staging") {
      throw new Error("JWT_SECRET required");
    }
    return new TextEncoder().encode("mpcis-demo-secret");
  }
  return new TextEncoder().encode(value);
}

function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;

  const isAuthPage = pathname.startsWith("/login");
  const isPasswordPage = pathname.startsWith("/account/password");
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/account");

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && (isProtected || isAuthPage || pathname === "/")) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const role = payload.role as string;
      const mustChange = Boolean(payload.mustChangePassword);

      if (mustChange && !isPasswordPage) {
        return NextResponse.redirect(new URL("/account/password", req.url));
      }

      if (isAuthPage || pathname === "/") {
        if (mustChange) {
          return NextResponse.redirect(new URL("/account/password", req.url));
        }
        return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/user", req.url));
      }
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/user", req.url));
      }
      if (pathname.startsWith("/user") && role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    } catch {
      if (isProtected) {
        return clearSession(NextResponse.redirect(new URL("/login", req.url)));
      }
      if (isAuthPage || pathname === "/") {
        return clearSession(NextResponse.next());
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/user/:path*", "/account/:path*"],
};
