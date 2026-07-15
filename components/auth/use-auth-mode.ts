"use client";

import { useSession } from "next-auth/react";

export function useAuthMode() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;
  const isDemo = !isLoading && !isAuthenticated;

  return {
    session,
    isLoading,
    isAuthenticated,
    isDemo,
    user: session?.user ?? null,
  };
}