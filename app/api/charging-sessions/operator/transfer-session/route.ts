import { NextRequest, NextResponse } from 'next/server';
import api from '@/lib/api/api';

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

    // Call the backend API to transfer the session
    const response = await api().post('/api/charging-sessions/operator/transfer-session', {
      sessionId,
      newOperatorId
    });

    return NextResponse.json({
      status: 'success',
      message: 'Session transferred successfully',
      data: response.data
    });

  } catch (error: any) {
    console.error('Error transferring session:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error.response?.data?.message || 'Failed to transfer session',
      data: null
    }, { status: error.response?.status || 500 });
  }
}
