import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/account/export
 *
 * Exports all user data as JSON.
 * GDPR/CCPA compliance: Right to data portability.
 *
 * Returns: JSON file containing profile, events, and courses.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch all user data
    const [user, events, courses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          // Exclude sensitive OAuth tokens from export
        },
      }),
      prisma.event.findMany({
        where: { userId },
        include: {
          course: true,
        },
      }),
      prisma.course.findMany({
        where: { userId },
      }),
    ]);

    // Construct export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        source: event.source,
        googleEventId: event.googleEventId,
        googleUpdatedAt: event.googleUpdatedAt,
        editable: event.editable,
        course: event.course
          ? {
              name: event.course.name,
              code: event.course.code,
              color: event.course.color,
              semester: event.course.semester,
            }
          : null,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })),
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        color: course.color,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      })),
      summary: {
        totalEvents: events.length,
        totalCourses: courses.length,
      },
    };

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="almanac-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data. Please try again or contact support." },
      { status: 500 }
    );
  }
}
