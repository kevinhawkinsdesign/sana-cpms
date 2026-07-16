import { NextResponse } from 'next/server';

export function ok(data: unknown, message = 'OK', init?: number) {
  return NextResponse.json({ status: 'success', message, data }, { status: init ?? 200 });
}

export function created(data: unknown, message = 'Created') {
  return ok(data, message, 201);
}

export function fail(message: string, status = 400, code = 'ERROR') {
  return NextResponse.json(
    { status: 'error', message, error: { code, details: message } },
    { status },
  );
}

export function notFound(message = 'Not found') {
  return fail(message, 404, 'NOT_FOUND');
}
