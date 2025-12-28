import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateEventSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  courseId: z.string(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const where = courseId
      ? { userId: session.userId, courseId }
      : { userId: session.userId }

    const events = await prisma.event.findMany({
      where,
      include: { course: true },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({ events })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch events" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()
    const data = CreateEventSchema.parse(json)

    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: data.courseId, userId: session.userId }
    })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        source: 'MANUAL',
        userId: session.userId,
      },
      include: { course: true }
    })

    return NextResponse.json({ event })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create event" },
      { status: 500 }
    )
  }
}
