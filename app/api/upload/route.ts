import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseSyllabusPdfToText } from "@/lib/pdf"
import { extractEventsFromSyllabusText } from "@/lib/groq"
import { normalizeAndValidateEvents } from "@/lib/events"
import { uploadPdfToBlob } from "@/lib/blob"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const courseId = formData.get("courseId")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing PDF file' }, { status: 400 })
    }

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
    }

    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: session.userId }
    })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const fileUrl = await uploadPdfToBlob(file, courseId)

    // Parse PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await parseSyllabusPdfToText(buffer)
    const aiEvents = await extractEventsFromSyllabusText(text)
    const parsedEvents = normalizeAndValidateEvents(aiEvents)

    // Save syllabus upload record
    const syllabusUpload = await prisma.syllabusUpload.create({
      data: {
        fileName: file.name,
        fileUrl,
        courseId,
      }
    })

    // Deduplication: fetch existing events for this course
    const existingEvents = await prisma.event.findMany({
      where: { courseId },
      select: { title: true, type: true, startDate: true }
    })

    // Filter out duplicate events (same title, type, and date within 1 day)
    const eventsToCreate = parsedEvents.filter(newEvent => {
      const newDate = new Date(newEvent.date)
      const isDuplicate = existingEvents.some(existing => {
        const daysDiff = Math.abs(
          (existing.startDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        // Consider it a duplicate if same title, type, and within 1 day
        return (
          existing.title.toLowerCase() === newEvent.title.toLowerCase() &&
          existing.type.toLowerCase() === newEvent.type.toLowerCase() &&
          daysDiff < 1
        )
      })
      return !isDuplicate
    })

    const duplicatesSkipped = parsedEvents.length - eventsToCreate.length

    // Save only non-duplicate events to database
    if (eventsToCreate.length > 0) {
      await prisma.event.createMany({
        data: eventsToCreate.map(event => ({
          title: event.title,
          type: event.type,
          startDate: new Date(event.date),
          description: event.description,
          source: 'PDF' as const,
          courseId,
          userId: session.userId!,
        }))
      })
    }

    // Fetch all events to return
    const allEvents = await prisma.event.findMany({
      where: { courseId },
      include: { course: true },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({
      syllabusUpload,
      events: allEvents,
      stats: {
        parsed: parsedEvents.length,
        created: eventsToCreate.length,
        duplicatesSkipped
      }
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to upload syllabus" },
      { status: 500 }
    )
  }
}
