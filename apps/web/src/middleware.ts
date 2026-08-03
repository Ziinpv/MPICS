import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "mpcis_token";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "mpcis-demo-secret");

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
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/user");

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && (isProtected || isAuthPage || pathname === "/")) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const role = payload.role as string;

      if (isAuthPage || pathname === "/") {
        return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/user", req.url));
      }
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/user", req.url));
      }
      if (pathname.startsWith("/user") && role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    } catch {
      // Token hỏng / hết hạn: xóa cookie rồi về login
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
  matcher: ["/", "/login", "/admin/:path*", "/user/:path*"],
};
