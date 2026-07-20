import { auth } from "@/auth";
import { isAdminRole, type AppUserRole } from "@/lib/user-roles";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireSessionUserId(): Promise<string | null> {
  return getSessionUserId();
}

export async function getSessionUser(): Promise<{
  id: string;
  email?: string | null;
  name?: string | null;
  role: AppUserRole;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user.role as AppUserRole) || "USER",
  };
}

export async function requireAdminUserId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) return null;
  return user.id;
}
