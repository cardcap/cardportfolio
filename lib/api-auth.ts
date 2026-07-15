import { auth } from "@/auth";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireSessionUserId(): Promise<string | null> {
  return getSessionUserId();
}