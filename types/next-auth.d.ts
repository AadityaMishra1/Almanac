import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshAccessTokenError";
    user?: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: "RefreshAccessTokenError";
  }
}

