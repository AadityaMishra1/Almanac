import { prisma } from "@/lib/db";
import type { Event } from "@prisma/client";

type CommandState =
  | Partial<Event>
  | Partial<Event>[]
  | Record<string, unknown>
  | null;

interface LogCommandInput {
  userId: string;
  type: "create" | "modify" | "delete";
  description: string;
  eventId: string;
  beforeState: CommandState;
  afterState: CommandState;
}

/**
 * Log a chat command for undo support.
 * Fire-and-forget: callers should not await or depend on this succeeding.
 */
export async function logCommand(input: LogCommandInput): Promise<string> {
  const cmd = await prisma.chatCommand.create({
    data: {
      type: input.type,
      description: input.description,
      eventId: input.eventId,
      beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
      afterState: input.afterState ? JSON.stringify(input.afterState) : null,
      userId: input.userId,
    },
  });
  return cmd.id;
}

/**
 * Get the most recent undoable command for a user.
 * Returns null if there's nothing to undo.
 */
export async function getLastUndoableCommand(userId: string) {
  return prisma.chatCommand.findFirst({
    where: { userId, undone: false },
    orderBy: { createdAt: "desc" },
  });
}
