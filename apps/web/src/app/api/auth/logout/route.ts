import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

/** Xóa session cookie rồi về login — dùng từ Server Component (layout) vì không được cookies().set ở đó. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
