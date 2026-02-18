import { NextResponse } from "next/server";

/**
 * TEMPORARY debug endpoint — DELETE after fixing the OAuth issue.
 * Shows partial env var values so you can verify Vercel has the right config.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "(not set)";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "(not set)";
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? "(not set)";
  const vercelUrl = process.env.VERCEL_URL ?? "(not set)";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? "(not set)";

  const mask = (val: string, showStart = 8, showEnd = 6) => {
    if (val === "(not set)") return val;
    if (val.length < showStart + showEnd + 4) return `[${val.length} chars]`;
    return `${val.slice(0, showStart)}...${val.slice(-showEnd)} [${val.length} chars]`;
  };

  return NextResponse.json({
    GOOGLE_CLIENT_ID: mask(clientId, 12, 10),
    GOOGLE_CLIENT_SECRET: mask(clientSecret, 8, 6),
    NEXTAUTH_URL: nextAuthUrl,
    VERCEL_URL: vercelUrl,
    NEXTAUTH_SECRET: mask(nextAuthSecret),
    node_env: process.env.NODE_ENV,
    hasQuotesInClientId: clientId.includes('"') || clientId.includes("'"),
    clientIdLength: clientId.length,
    clientSecretLength: clientSecret.length,
  });
}
