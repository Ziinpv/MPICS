import { sendMail, smtpConfigured } from "@/lib/mail";

function appBaseUrl() {
  return (process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export type CredentialMailResult =
  | { emailed: true }
  | { emailed: false; reason: "no_email" | "smtp_not_configured" | "mail_error"; detail?: string };

/** Gửi username + mật khẩu tạm tới email cá nhân (Mailpit local / SMTP staging). */
export async function sendAccountCredentialsMail(input: {
  to: string | null | undefined;
  fullName: string;
  username: string;
  temporaryPassword: string;
  orgName?: string | null;
  kind: "created" | "password_reset";
}): Promise<CredentialMailResult> {
  const to = input.to?.trim();
  if (!to) return { emailed: false, reason: "no_email" };
  if (!smtpConfigured()) return { emailed: false, reason: "smtp_not_configured" };

  const loginUrl = `${appBaseUrl()}/login`;
  const isCreate = input.kind === "created";
  const subject = isCreate
    ? `[MPCIS] Tài khoản đã được tạo — ${input.username}`
    : `[MPCIS] Mật khẩu tạm đã được cấp lại — ${input.username}`;

  const text = [
    `Xin chào ${input.fullName || input.username},`,
    "",
    isCreate
      ? "Admin đã tạo tài khoản MPCIS cho bạn."
      : "Admin đã reset mật khẩu tài khoản MPCIS của bạn.",
    input.orgName ? `Đơn vị: ${input.orgName}` : "",
    "",
    `Tên đăng nhập (username): ${input.username}`,
    `Mật khẩu tạm: ${input.temporaryPassword}`,
    "",
    `Đăng nhập tại: ${loginUrl}`,
    "Lần đăng nhập đầu bạn sẽ được yêu cầu đổi mật khẩu.",
    "",
    "Không chia sẻ mật khẩu tạm cho người khác.",
    "",
    "— Hệ thống MPCIS",
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    await sendMail({ to, subject, text });
    return { emailed: true };
  } catch (e: any) {
    console.error("[account-mail]", e);
    return {
      emailed: false,
      reason: "mail_error",
      detail: e?.message || "mail_error",
    };
  }
}
