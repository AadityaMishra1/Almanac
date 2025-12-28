import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateCourseSchema = z.object({
  name: z.string().min(1),
  term: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
      where: { userId: session.userId },
      include: {
        _count: {
          select: { events: true, syllabusUploads: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ courses })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch courses" },
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
    const { name, term, color } = CreateCourseSchema.parse(json)

    const course = await prisma.course.create({
      data: {
        name,
        term,
        color: color || '#3b82f6',
        userId: session.userId,
      }
    })

    return NextResponse.json({ course })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create course" },
      { status: 500 }
    )
  }
}
