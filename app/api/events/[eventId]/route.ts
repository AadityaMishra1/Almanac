import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()

    // Convert date strings to Date objects if present
    const data = {
      ...json,
      ...(json.startDate && { startDate: new Date(json.startDate) }),
      ...(json.endDate && { endDate: new Date(json.endDate) }),
    }

    const event = await prisma.event.update({
      where: {
        id: params.eventId,
        userId: session.userId,
      },
      data,
      include: { course: true }
    })

    return NextResponse.json({ event })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update event" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.event.delete({
      where: {
        id: params.eventId,
        userId: session.userId,
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete event" },
      { status: 500 }
    )
  }
}
