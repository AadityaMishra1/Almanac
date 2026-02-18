import type { JWT } from "next-auth/jwt";
import { google } from "googleapis";
import { prisma } from "@/lib/db";

export async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Missing Google OAuth env vars.");
    if (!token.refreshToken) throw new Error("Missing refresh token.");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken
      })
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Fetch the Google access token for a user from the database.
 * Used by server actions instead of exposing the token via the session.
 */
export async function getGoogleAccessTokenForUser(
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true },
  });
  return user?.googleAccessToken ?? null;
}

