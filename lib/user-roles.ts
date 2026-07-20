export type AppUserRole = "USER" | "ADMIN";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}
