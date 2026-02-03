import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCalendarClient } from '@/lib/google';
import { prisma } from '@/lib/db';
import { EventSource } from '@prisma/client';
import { EventSnapshot } from '@/types/chat';

/**
 * Request body schema for execute endpoint.
 */
const ExecuteRequestSchema = z.discriminatedUnion('action', [
  // Modify event
  z.object({
    action: z.literal('modify'),
    eventId: z.string(),
    updates: z.object({
      title: z.string().optional(),
      date: z.string().optional(),
      time: z.string().nullable().optional(),
      type: z.string().optional(),
    }),
    beforeState: z.any().nullable().optional(),
    afterState: z.any().nullable().optional(),
  }),
  // Delete event
  z.object({
    action: z.literal('delete'),
    eventId: z.string(),
    beforeState: z.any().nullable().optional(),
    afterState: z.any().nullable().optional(),
  }),
  // Create event
  z.object({
    action: z.literal('create'),
    newEvent: z.object({
      title: z.string(),
      date: z.string(),
      time: z.string().nullable().optional(),
      type: z.string(),
      courseCode: z.string(),
    }),
    beforeState: z.any().nullable().optional(),
    afterState: z.any().nullable().optional(),
  }),
  // Bulk delete
  z.object({
    action: z.literal('bulk-delete'),
    eventIds: z.array(z.string()),
    beforeState: z.any().nullable().optional(),
    afterState: z.any().nullable().optional(),
  }),
]);

/**
 * Helper to add days to ISO date string.
 */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Execute confirmed chat operations.
 * POST /api/chat/execute
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = ExecuteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: `Invalid request: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const request = parsed.data;

    // Get session for Google Calendar access
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;

    // Execute based on action type
    switch (request.action) {
      case 'modify': {
        const { eventId, updates, beforeState, afterState } = request;

        // Fetch event from database
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { course: true },
        });

        if (!event) {
          return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 });
        }

        // Check source - only Almanac events can be modified
        if (event.source !== EventSource.ALMANAC) {
          return NextResponse.json(
            {
              ok: false,
              error: `Cannot modify external event "${event.title}". Only Almanac-created events can be modified.`,
            },
            { status: 403 }
          );
        }

        // Update local database
        const updatedEvent = await prisma.event.update({
          where: { id: eventId },
          data: updates,
          include: { course: true },
        });

        // If event has googleEventId, attempt to update Google Calendar
        if (event.googleEventId && accessToken) {
          try {
            const calendar = getCalendarClient(accessToken);

            // Build Google Calendar update request
            const gcalUpdate: any = {};

            if (updates.title) {
              gcalUpdate.summary = updates.title;
            }

            // Handle date/time updates
            if (updates.date !== undefined || updates.time !== undefined) {
              const finalDate = updates.date || event.date;
              const finalTime = updates.time !== undefined ? updates.time : event.time;

              if (finalTime) {
                // Timed event
                const [year, month, day] = finalDate.split('-').map(Number);
                const [hour, minute] = finalTime.split(':').map(Number);
                const startDt = new Date(year, month - 1, day, hour, minute);
                const endDt = new Date(year, month - 1, day, hour + 1, minute);

                gcalUpdate.start = { dateTime: startDt.toISOString() };
                gcalUpdate.end = { dateTime: endDt.toISOString() };
              } else {
                // All-day event
                const endDate = addDays(finalDate, 1);
                gcalUpdate.start = { date: finalDate };
                gcalUpdate.end = { date: endDate };
              }
            }

            // Update Google Calendar event
            await calendar.events.patch({
              calendarId: 'primary',
              eventId: event.googleEventId,
              requestBody: gcalUpdate,
            });
          } catch (gcalError) {
            // Log but don't fail - local update succeeded (graceful degradation)
            console.warn(`Failed to update Google Calendar event ${event.googleEventId}:`, gcalError);
          }
        }

        // Build command record for undo history
        const commandRecord = {
          id: crypto.randomUUID(),
          type: 'modify' as const,
          description: `Modified "${event.title}"`,
          beforeState: beforeState ? JSON.stringify(beforeState) : null,
          afterState: afterState ? JSON.stringify(afterState) : null,
          eventId: event.id,
          timestamp: new Date(),
          undone: false,
        };

        return NextResponse.json({
          ok: true,
          result: {
            event: updatedEvent,
          },
          commandRecord,
        });
      }

      case 'delete': {
        const { eventId, beforeState, afterState } = request;

        // Fetch event from database
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { course: true },
        });

        if (!event) {
          return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 });
        }

        // Check source - only Almanac events can be deleted
        if (event.source !== EventSource.ALMANAC) {
          return NextResponse.json(
            {
              ok: false,
              error: `Cannot delete external event "${event.title}". Only Almanac-created events can be deleted.`,
            },
            { status: 403 }
          );
        }

        // Delete from local database
        await prisma.event.delete({
          where: { id: eventId },
        });

        // If event has googleEventId, attempt to delete from Google Calendar
        if (event.googleEventId && accessToken) {
          try {
            const calendar = getCalendarClient(accessToken);
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: event.googleEventId,
            });
          } catch (gcalError) {
            // Log but don't fail - local deletion succeeded (graceful degradation)
            console.warn(`Failed to delete Google Calendar event ${event.googleEventId}:`, gcalError);
          }
        }

        // Build command record for undo history
        const commandRecord = {
          id: crypto.randomUUID(),
          type: 'delete' as const,
          description: `Deleted "${event.title}"`,
          beforeState: beforeState ? JSON.stringify(beforeState) : null,
          afterState: null,
          eventId: event.id,
          timestamp: new Date(),
          undone: false,
        };

        return NextResponse.json({
          ok: true,
          result: {
            deletedEventId: eventId,
          },
          commandRecord,
        });
      }

      case 'create': {
        const { newEvent, beforeState, afterState } = request;

        // Look up course by code
        const course = await prisma.course.findUnique({
          where: { code: newEvent.courseCode },
        });

        if (!course) {
          const availableCourses = (await prisma.course.findMany()).map((c) => c.code).join(', ');
          return NextResponse.json(
            {
              ok: false,
              error: `Course not found: "${newEvent.courseCode}". Available courses: ${availableCourses}`,
            },
            { status: 404 }
          );
        }

        // Create event in local database
        const createdEvent = await prisma.event.create({
          data: {
            title: newEvent.title,
            date: newEvent.date,
            time: newEvent.time || null,
            type: newEvent.type,
            courseId: course.id,
            source: EventSource.ALMANAC,
            editable: true,
          },
          include: { course: true },
        });

        // Attempt to create in Google Calendar if user has access token
        if (accessToken) {
          try {
            const calendar = getCalendarClient(accessToken);

            const startDate = newEvent.date;
            const endDate = addDays(newEvent.date, 1);

            const response = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: {
                summary: newEvent.title,
                description: [
                  newEvent.type,
                  `Course: ${course.name} (${course.code})`,
                ]
                  .filter(Boolean)
                  .join('\n\n'),
                start: newEvent.time
                  ? {
                      dateTime: new Date(
                        `${newEvent.date}T${newEvent.time}:00`
                      ).toISOString(),
                    }
                  : { date: startDate },
                end: newEvent.time
                  ? {
                      dateTime: new Date(
                        new Date(`${newEvent.date}T${newEvent.time}:00`).getTime() +
                          60 * 60 * 1000
                      ).toISOString(),
                    }
                  : { date: endDate },
              },
            });

            const googleEventId = response.data.id;

            // Update local event with Google Calendar ID
            if (googleEventId) {
              await prisma.event.update({
                where: { id: createdEvent.id },
                data: { googleEventId },
              });
            }
          } catch (gcalError) {
            // Log but don't fail - local creation succeeded (graceful degradation)
            console.warn('Failed to create Google Calendar event:', gcalError);
          }
        }

        // Build command record for undo history
        const commandRecord = {
          id: crypto.randomUUID(),
          type: 'create' as const,
          description: `Created "${newEvent.title}"`,
          beforeState: null,
          afterState: afterState ? JSON.stringify(afterState) : null,
          eventId: createdEvent.id,
          timestamp: new Date(),
          undone: false,
        };

        return NextResponse.json({
          ok: true,
          result: {
            event: createdEvent,
          },
          commandRecord,
        });
      }

      case 'bulk-delete': {
        const { eventIds, beforeState, afterState } = request;

        // Track results
        const deleted: string[] = [];
        const errors: string[] = [];

        // Delete each event (try-catch per event so one failure doesn't block others)
        for (const eventId of eventIds) {
          try {
            // Fetch event from database
            const event = await prisma.event.findUnique({
              where: { id: eventId },
              include: { course: true },
            });

            if (!event) {
              errors.push(`Event not found: ${eventId}`);
              continue;
            }

            // Check source - only Almanac events can be deleted
            if (event.source !== EventSource.ALMANAC) {
              errors.push(`Cannot delete external event: ${event.title}`);
              continue;
            }

            // Delete from local database
            await prisma.event.delete({
              where: { id: eventId },
            });

            deleted.push(eventId);

            // If event has googleEventId, attempt to delete from Google Calendar
            if (event.googleEventId && accessToken) {
              try {
                const calendar = getCalendarClient(accessToken);
                await calendar.events.delete({
                  calendarId: 'primary',
                  eventId: event.googleEventId,
                });
              } catch (gcalError) {
                // Log but don't fail - local deletion succeeded
                console.warn(
                  `Failed to delete Google Calendar event ${event.googleEventId}:`,
                  gcalError
                );
              }
            }
          } catch (error) {
            errors.push(
              `Failed to delete event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        // Build command record for undo history (not used in Plan 03, prepared for Plan 04)
        const commandRecord = {
          id: crypto.randomUUID(),
          type: 'delete' as const,
          description: `Bulk deleted ${deleted.length} event${deleted.length === 1 ? '' : 's'}`,
          beforeState: beforeState ? JSON.stringify(beforeState) : null,
          afterState: null,
          eventId: deleted[0] || '', // First deleted event ID
          timestamp: new Date(),
          undone: false,
        };

        return NextResponse.json({
          ok: true,
          result: {
            deleted,
            errors,
          },
          commandRecord,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: 'Invalid action type.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Execute API error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
