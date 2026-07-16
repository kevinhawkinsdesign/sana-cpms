// Plain Web-standard Response (not next/server's NextResponse) so this file
// runs identically on a real Next.js server route AND inside the browser,
// where the static-export build has no server to provide next/server at all.

export function ok(data: unknown, message = 'OK', init?: number) {
  return Response.json({ status: 'success', message, data }, { status: init ?? 200 });
}

export function created(data: unknown, message = 'Created') {
  return ok(data, message, 201);
}

export function fail(message: string, status = 400, code = 'ERROR') {
  return Response.json(
    { status: 'error', message, error: { code, details: message } },
    { status },
  );
}

export function notFound(message = 'Not found') {
  return fail(message, 404, 'NOT_FOUND');
}
