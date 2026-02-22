import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the user's account and all associated data.
 * GDPR/CCPA compliance: Right to deletion.
 *
 * This is a destructive action and cannot be undone.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 },
      );
    }

    // Rate limit: 1 req/hour for account deletion
    const rateLimited = await checkRateLimit("accountDelete", session.user.id);
    if (rateLimited) return rateLimited;

    const userId = session.user.id;

    // Atomic deletion: all-or-nothing to prevent partial state on crash
    await prisma.$transaction([
      prisma.event.deleteMany({ where: { userId } }),
      prisma.course.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Account and all data permanently deleted",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account. Please try again or contact support.",
      },
      { status: 500 },
    );
  }
}
