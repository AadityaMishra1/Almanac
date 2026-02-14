import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshGoogleAccessToken } from "@/lib/google";
import { prisma } from "@/lib/db";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create or update User in database on sign-in
      if (!user.email) return false;

      try {
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            // Store Google OAuth tokens
            googleAccessToken: account?.access_token,
            googleRefreshToken: account?.refresh_token,
            googleTokenExpiry: account?.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
          update: {
            name: user.name,
            image: user.image,
            // Update tokens on re-authentication
            googleAccessToken: account?.access_token || undefined,
            googleRefreshToken: account?.refresh_token || undefined,
            googleTokenExpiry: account?.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          }
        });

        return true;
      } catch (error) {
        console.error("Error creating/updating user:", error);
        return false;
      }
    },
    async jwt({ token, account, user }) {
      // Initial sign-in: store user info in JWT
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
        token.userId = user.id;
      }

      // Fetch userId from database if not in token
      if (!token.userId && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true }
        });
        if (dbUser) token.userId = dbUser.id;
      }

      // Token still valid
      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
        return token;
      }

      // No expiry set (shouldn't happen, but handle gracefully)
      if (token.accessToken && !token.expiresAt) {
        return token;
      }

      // Token expired - refresh it
      if (token.refreshToken) {
        try {
          const refreshedToken = await refreshGoogleAccessToken(token);

          // Update database with new tokens
          if (token.email) {
            await prisma.user.update({
              where: { email: token.email },
              data: {
                googleAccessToken: refreshedToken.accessToken as string,
                googleTokenExpiry: refreshedToken.expiresAt
                  ? new Date(refreshedToken.expiresAt as number)
                  : null,
              }
            });
          }

          return refreshedToken;
        } catch (error) {
          console.error("Token refresh failed:", error);
          return { ...token, error: "RefreshAccessTokenError" as const };
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add userId to session
      if (session.user) {
        session.user.id = token.userId as string;
      }

      // Add accessToken and error
      session.accessToken = token.accessToken as string;
      session.error = token.error as "RefreshAccessTokenError" | undefined;

      return session;
    }
  }
};
