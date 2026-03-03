import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    // Mask the hostname in the error to avoid leaking credentials
    const masked = message.replace(
      /\/\/[^@]+@[^/]+/,
      "//***:***@***"
    );

    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        error: masked,
      },
      { status: 500 }
    );
  }
}
