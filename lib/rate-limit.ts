import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Rate limiting utility using Upstash Redis.
 * Falls back to no-op if env vars are missing (dev without Redis).
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function createLimiter(requests: number, window: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      requests,
      window as Parameters<typeof Ratelimit.slidingWindow>[1],
    ),
    analytics: true,
  });
}

/** Per-route rate limiters */
const limiters = {
  parse: createLimiter(5, "1 m"),
  chat: createLimiter(20, "1 m"),
  calendarEvents: createLimiter(60, "1 m"),
  accountDelete: createLimiter(1, "1 h"),
  accountExport: createLimiter(3, "1 h"),
} as const;

type LimiterKey = keyof typeof limiters;

/**
 * Check rate limit for a route. Returns a 429 Response if exceeded, or null if allowed.
 * @param key - The route limiter key
 * @param identifier - userId or IP address
 */
export async function checkRateLimit(
  key: LimiterKey,
  identifier: string,
): Promise<NextResponse | null> {
  const limiter = limiters[key];
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[rate-limit] Redis not configured — skipping rate limit for "${key}"`,
      );
    }
    return null;
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
        },
      },
    );
  }

  return null;
}
