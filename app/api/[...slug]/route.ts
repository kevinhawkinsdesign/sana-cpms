import { NextRequest } from 'next/server';
import { dispatch } from '@/lib/mock/router';

/**
 * Demo-mode mock backend. sana-cpms is a self-contained demo replica with no
 * real backend service — every `/api/*` call the frontend makes (except the
 * few literal routes that already live under app/api/**) is answered here
 * from in-memory seed data. See lib/mock/ for the seed data, auth, and
 * per-domain route handlers.
 */
export async function GET(request: NextRequest) {
  return dispatch(request, 'GET');
}

export async function POST(request: NextRequest) {
  return dispatch(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return dispatch(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return dispatch(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return dispatch(request, 'DELETE');
}
