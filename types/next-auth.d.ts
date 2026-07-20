import "next-auth";
import "next-auth/jwt";

export type AppUserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: AppUserRole;
    };
  }

  interface User {
    role?: AppUserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppUserRole;
  }
}
