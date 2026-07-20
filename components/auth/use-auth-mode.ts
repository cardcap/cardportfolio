"use client";

import { useSession } from "next-auth/react";
import { isAdminRole, type AppUserRole } from "@/lib/user-roles";

export function useAuthMode() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;
  const isDemo = !isLoading && !isAuthenticated;
  const role = (session?.user?.role as AppUserRole | undefined) ?? "USER";
  const isAdmin = isAuthenticated && isAdminRole(role);

  return {
    session,
    isLoading,
    isAuthenticated,
    isDemo,
    isAdmin,
    role,
    user: session?.user ?? null,
  };
}