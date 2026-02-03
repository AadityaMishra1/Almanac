import { NextRequest, NextResponse } from 'next/server';
import { getRecentCommands } from '@/lib/chat/commands';

/**
 * Fetch recent command history.
 * GET /api/chat/history?limit=20
 */
export async function GET(req: NextRequest) {
  try {
    // Parse limit from query parameters
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { ok: false, error: 'Invalid limit parameter (must be 1-100)' },
        { status: 400 }
      );
    }

    // Fetch commands
    const commands = await getRecentCommands(limit);

    return NextResponse.json({ ok: true, commands });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history.',
      },
      { status: 500 }
    );
  }
}
