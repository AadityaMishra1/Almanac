import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Delete all user data in the correct order (respecting foreign key constraints)
    // 1. Delete events (references userId and courseId)
    await prisma.event.deleteMany({
      where: { userId },
    });

    // 2. Delete courses (references userId)
    await prisma.course.deleteMany({
      where: { userId },
    });

    // 3. Delete user account (includes OAuth tokens)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Account and all data permanently deleted",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
