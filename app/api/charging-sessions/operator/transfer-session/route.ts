import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mock/db';

// Demo mode: transfers the session directly against the in-memory mock DB.
// (This used to proxy to the real backend at this same path — now that the
// frontend's API base URL points at itself, that would recurse forever.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, newOperatorId } = body;

    if (!sessionId || !newOperatorId) {
      return NextResponse.json({
        status: 'error',
        message: 'Session ID and new operator ID are required',
        data: null
      }, { status: 400 });
    }

    const session = db.sessions.find((s) => s.sessionId === sessionId || s.id === sessionId);
    if (!session) {
      return NextResponse.json({
        status: 'error',
        message: 'Session not found',
        data: null
      }, { status: 404 });
    }

    session.operatorId = newOperatorId;

    return NextResponse.json({
      status: 'success',
      message: 'Session transferred successfully',
      data: { session }
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to transfer session',
      data: null
    }, { status: 500 });
  }
}
