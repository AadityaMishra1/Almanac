import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { undoCommand } from '@/lib/chat/commands';

/**
 * Request schema for undo endpoint.
 */
const UndoRequestSchema = z.object({
  commandId: z.string(),
});

/**
 * Undo a chat command by ID.
 * POST /api/chat/undo
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = UndoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: `Invalid request: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const { commandId } = parsed.data;

    // Execute undo
    const result = await undoCommand(commandId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Undo API error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to undo command.',
      },
      { status: 500 }
    );
  }
}
