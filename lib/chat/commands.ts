import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCalendarClient } from '@/lib/google';
import { EventSource } from '@prisma/client';
import type { ChatCommand } from '@prisma/client';
import type { EventSnapshot } from '@/types/chat';

/**
 * Save a command to the undo history.
 */
export async function saveCommand(data: {
  type: string;
  description: string;
  eventId: string;
  beforeState?: string | null;
  afterState?: string | null;
}): Promise<ChatCommand> {
  return await prisma.chatCommand.create({
    data: {
      type: data.type,
      description: data.description,
      eventId: data.eventId,
      beforeState: data.beforeState || null,
      afterState: data.afterState || null,
      undone: false,
    },
  });
}

/**
 * Get recent commands from history.
 */
export async function getRecentCommands(limit: number = 20): Promise<ChatCommand[]> {
  return await prisma.chatCommand.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

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
 * Undo a command by reversing its operation.
 */
export async function undoCommand(
  commandId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Fetch the command record
    const command = await prisma.chatCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      return { ok: false, error: 'Command not found.' };
    }

    if (command.undone) {
      return { ok: false, error: 'This operation has already been undone.' };
    }

    // Get session for Google Calendar access
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;

    // Switch on command type to reverse the operation
    switch (command.type) {
      case 'modify': {
        // Undo modify: restore the beforeState
        if (!command.beforeState) {
          return { ok: false, error: 'Cannot undo: beforeState is missing.' };
        }

        const beforeState = JSON.parse(command.beforeState) as EventSnapshot;

        // Check if event still exists
        const event = await prisma.event.findUnique({
          where: { id: command.eventId },
        });

        if (!event) {
          return { ok: false, error: 'Event no longer exists.' };
        }

        // Restore event to beforeState in database
        const restoredEvent = await prisma.event.update({
          where: { id: command.eventId },
          data: {
            title: beforeState.title,
            date: beforeState.date,
            time: beforeState.time || null,
            type: beforeState.type,
          },
        });

        // If event has googleEventId, update Google Calendar too
        if (restoredEvent.googleEventId && accessToken) {
          try {
            const calendar = getCalendarClient(accessToken);

            // Build Google Calendar update request
            const gcalUpdate: any = {
              summary: beforeState.title,
            };

            // Handle date/time updates
            if (beforeState.time) {
              // Timed event
              const [year, month, day] = beforeState.date.split('-').map(Number);
              const [hour, minute] = beforeState.time.split(':').map(Number);
              const startDt = new Date(year, month - 1, day, hour, minute);
              const endDt = new Date(year, month - 1, day, hour + 1, minute);

              gcalUpdate.start = { dateTime: startDt.toISOString() };
              gcalUpdate.end = { dateTime: endDt.toISOString() };
            } else {
              // All-day event
              const endDate = addDays(beforeState.date, 1);
              gcalUpdate.start = { date: beforeState.date };
              gcalUpdate.end = { date: endDate };
            }

            // Update Google Calendar event
            await calendar.events.patch({
              calendarId: 'primary',
              eventId: restoredEvent.googleEventId,
              requestBody: gcalUpdate,
            });
          } catch (gcalError) {
            // Log but don't fail - local update succeeded (graceful degradation)
            console.warn(
              `Failed to update Google Calendar event ${restoredEvent.googleEventId} during undo:`,
              gcalError
            );
          }
        }

        break;
      }

      case 'delete': {
        // Undo delete: re-create the deleted event
        if (!command.beforeState) {
          return { ok: false, error: 'Cannot undo: beforeState is missing.' };
        }

        const beforeState = JSON.parse(command.beforeState) as EventSnapshot;

        // Look up courseId by courseName
        const course = await prisma.course.findFirst({
          where: {
            name: beforeState.courseName,
          },
        });

        if (!course) {
          return {
            ok: false,
            error: `Cannot undo: course "${beforeState.courseName}" not found.`,
          };
        }

        // Re-create event with the ORIGINAL event ID
        await prisma.event.create({
          data: {
            id: command.eventId,
            title: beforeState.title,
            date: beforeState.date,
            time: beforeState.time || null,
            type: beforeState.type,
            courseId: course.id,
            source: EventSource.ALMANAC,
            editable: true,
          },
        });

        // Note: Do NOT attempt to re-create in Google Calendar
        // The next sync will push it if needed

        break;
      }

      case 'create': {
        // Undo create: delete the created event
        const event = await prisma.event.findUnique({
          where: { id: command.eventId },
        });

        if (!event) {
          // Event already deleted, consider undo successful
          break;
        }

        // Delete from database
        await prisma.event.delete({
          where: { id: command.eventId },
        });

        // If event has googleEventId, delete from Google Calendar too
        if (event.googleEventId && accessToken) {
          try {
            const calendar = getCalendarClient(accessToken);
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: event.googleEventId,
            });
          } catch (gcalError) {
            // Log but don't fail - local deletion succeeded (graceful degradation)
            console.warn(
              `Failed to delete Google Calendar event ${event.googleEventId} during undo:`,
              gcalError
            );
          }
        }

        break;
      }

      default:
        return { ok: false, error: `Unknown command type: ${command.type}` };
    }

    // Mark command as undone
    await prisma.chatCommand.update({
      where: { id: commandId },
      data: { undone: true },
    });

    return { ok: true };
  } catch (error) {
    console.error('Error undoing command:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to undo command.',
    };
  }
}
