import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()
    const course = await prisma.course.update({
      where: {
        id: params.courseId,
        userId: session.userId, // Ensure ownership
      },
      data: json,
    })

    return NextResponse.json({ course })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update course" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.course.delete({
      where: {
        id: params.courseId,
        userId: session.userId,
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete course" },
      { status: 500 }
    )
  }
}
