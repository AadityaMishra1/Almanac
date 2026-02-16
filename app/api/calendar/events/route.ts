import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get query params for date range if provided
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    // Build query
    const whereClause: any = {
      userId: user.id,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Fetch events with course information
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        course: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Transform to unified event format expected by calendar
    const unifiedEvents = events.map((event) => ({
      id: event.id,
      type: "assignment" as const,
      title: event.title,
      description: event.description,
      start_time: event.time
        ? `${event.date}T${event.time}:00`
        : `${event.date}T00:00:00`,
      end_time: event.time
        ? `${event.date}T${event.time}:00`
        : `${event.date}T23:59:59`,
      course_name: event.course?.name ?? "No Course",
      course_code: event.course?.code ?? "",
      course_id: event.courseId || undefined,
      course_color: event.course?.color || null,
      assignment_type: event.type,
      is_synced_to_calendar: !!event.googleEventId,
      google_event_id: event.googleEventId,
      source: "database" as const,
    }));

    return NextResponse.json(unifiedEvents);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
