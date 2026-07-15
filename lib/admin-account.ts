export const ADMIN_ACCOUNT_EMAIL = "admin@cardportfolio.de";
export const ADMIN_ACCOUNT_NAME = "Admin";

export function resolveAdminLoginIdentifier(input: string): string {
  const value = input.trim().toLowerCase();
  const gateUser = process.env.SITE_GATE_USER?.trim().toLowerCase() || "admin";

  if (value === gateUser || value === "admin") {
    return ADMIN_ACCOUNT_EMAIL;
  }

  return input.trim().toLowerCase();
}